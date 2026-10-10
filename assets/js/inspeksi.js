// Alamat Web App Google Apps Script (sama dengan di laporan.js).
// Bila kosong, PDF tetap dibuat dan bisa diunduh, tetapi tidak disimpan ke Google Drive.
const ENDPOINT = 'https://script.google.com/macros/s/AKfycbxCuQizuGxTjFRb-RBzH1KGLcGHeSte8RrG6TOduUEign4cXVamvwoibbz3h4EsRIiDlQ/exec';
const PERUSAHAAN = 'PT UNGGUL EJAWANTAH INDUSTRI';
const MEM = 'hse-inspeksi-nama'; // nama inspektur dan penanda tangan diingat di perangkat ini

const $ = (id) => document.getElementById(id);
const pilih = $('pilih');
const area = $('area');
const hasil = $('hasil');
let cur = null;      // konfigurasi asli inspeksi terpilih
let F = null;        // konfigurasi yang sudah dinormalkan
let ITEMS = [];      // seluruh butir pemeriksaan (datar)
let jenisAktif = ''; // jenis APAR terpilih (khusus form APAR)

// ---------- Alat bantu ----------
function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}
function input(type, name, req) {
  const i = document.createElement('input');
  i.type = type;
  i.name = name;
  i.required = !!req;
  return i;
}
function kolom(label, ctrl, req) {
  const l = el('label');
  l.append(el('span', req ? 'req' : '', label), ctrl);
  return l;
}
function radio(name, val, req, cls) {
  const l = el('label', 'pill ' + (cls || ''));
  const r = input('radio', name, req);
  r.value = val;
  l.append(r, el('span', '', val));
  return l;
}
function seg(name, val, req) {
  const l = el('label', 'sg');
  const r = input('radio', name, req);
  r.value = val;
  l.append(r, el('span', '', val));
  return l;
}
function pilihan(name, opsi, req) {
  const s = document.createElement('select');
  s.name = name;
  s.required = !!req;
  opsi.forEach((o) => {
    const op = document.createElement('option');
    op.value = o;
    op.textContent = o;
    s.append(op);
  });
  return s;
}
function kartu(judul, isi) {
  const s = el('section', 'sec');
  const h = el('div', 'sec-h');
  h.append(el('h3', 'sec-t', judul));
  const b = el('div', 'sec-b');
  b.append(...(Array.isArray(isi) ? isi : [isi]));
  s.append(h, b);
  return s;
}
const pad2 = (n) => String(n).padStart(2, '0');
function hariIni() {
  const n = new Date();
  return n.getFullYear() + '-' + pad2(n.getMonth() + 1) + '-' + pad2(n.getDate());
}
function jamIni() {
  const n = new Date();
  return pad2(n.getHours()) + ':' + pad2(n.getMinutes());
}
function tglPanjang(iso) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
}
const ingat = () => { try { return JSON.parse(localStorage.getItem(MEM)) || {}; } catch (e) { return {}; } };
const simpanIngat = (o) => { try { localStorage.setItem(MEM, JSON.stringify(o)); } catch (e) { /* diabaikan */ } };

// Menerjemahkan pesan gagal menjadi penjelasan yang mudah dipahami
function jelaskan(err) {
  const m = String((err && err.message) || err);
  if (/Failed to fetch|NetworkError|Load failed/i.test(m)) {
    return 'tidak dapat terhubung ke Google. Pastikan akses Web App diatur "Anyone" dan alamatnya benar';
  }
  if (/JSON|Unexpected token/i.test(m)) return 'balasan Google tidak terbaca. Pastikan akses Web App diatur "Anyone"';
  if (m === 'Gagal menyimpan') return 'skrip Google gagal menyimpan. Periksa ID folder inspeksi di Apps Script';
  return m;
}

// Menyamakan bentuk konfigurasi lama (daftar datar) dan baru (bagian)
function norm(f) {
  const m = f.meta || {};
  const jawab = f.jawab || ['Baik', 'Tidak baik', 'N/A'];
  return Object.assign({}, f, {
    noDok: m.noDok || f.kode.replace(/-/g, '/'),
    berlaku: m.berlaku || '',
    revisi: m.revisi || '',
    departemen: m.departemen || 'HSE',
    judulPdf: f.judul || f.nama.toUpperCase(),
    judulEn: f.judulEn || '',
    jawab,
    jawabPdf: f.jawabPdf || jawab.map((x) => x.toUpperCase()),
    info: Object.assign({ lokasi: 'Lokasi / area', inspektor: 'Nama inspektur', waktu: false }, f.info || {}),
    bagian: (f.bagian || [{ judul: '', item: f.item }]).map((b) => ({
      judul: b.judul,
      item: b.item.map((x) => (typeof x === 'string' ? { t: x } : x))
    })),
    ttd: f.ttd || [{ peran: 'DIPERIKSA OLEH', jabatan: '' }],
    footer: f.footer || 'DOKUMEN MILIK DEPARTEMEN HSE ' + PERUSAHAAN
  });
}
function ratakan(f) {
  const list = [];
  f.bagian.forEach((b, bi) => b.item.forEach((it) => list.push({ i: list.length, b: bi, t: it.t, jenis: it.jenis, auto: it.auto, locked: false })));
  return list;
}
const aktif = (it) => !it.jenis || it.jenis === jenisAktif;

// Papan tanda tangan (digambar dengan jari atau mouse)
function padTtd() {
  const wrap = el('div', 'sig');
  const c = document.createElement('canvas');
  c.width = 600;
  c.height = 200;
  c.setAttribute('aria-label', 'Area tanda tangan inspektor');
  const ctx = c.getContext('2d');
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#0b2a1f';
  let gambar = false;
  let ada = false;
  const pos = (e) => {
    const r = c.getBoundingClientRect();
    return [(e.clientX - r.left) * c.width / r.width, (e.clientY - r.top) * c.height / r.height];
  };
  c.addEventListener('pointerdown', (e) => {
    gambar = true;
    ada = true;
    c.setPointerCapture(e.pointerId);
    ctx.beginPath();
    const p = pos(e);
    ctx.moveTo(p[0], p[1]);
    ctx.lineTo(p[0] + 0.1, p[1]);
    ctx.stroke();
    e.preventDefault();
  });
  c.addEventListener('pointermove', (e) => {
    if (!gambar) return;
    const p = pos(e);
    ctx.lineTo(p[0], p[1]);
    ctx.stroke();
    e.preventDefault();
  });
  const stop = () => { gambar = false; };
  c.addEventListener('pointerup', stop);
  c.addEventListener('pointercancel', stop);
  const hapus = el('button', 'sig-x', 'Hapus tanda tangan');
  hapus.type = 'button';
  hapus.addEventListener('click', () => { ctx.clearRect(0, 0, c.width, c.height); ada = false; });
  wrap.append(c, hapus);
  return { el: wrap, data: () => (ada ? c.toDataURL('image/png') : '') };
}

// ---------- Pilihan jenis inspeksi ----------
INSPEKSI.forEach((f) => {
  const b = el('button', 'pick');
  b.type = 'button';
  b.dataset.key = f.key;
  b.append(el('i', '', f.ikon), el('b', '', f.pendek), el('span', '', f.kode.replace('UEI-HSE-', '')));
  b.addEventListener('click', () => buka(f.key, true));
  pilih.append(b);
});

// ---------- Formulir ----------
function buka(key, gulir) {
  const f = INSPEKSI.find((x) => x.key === key);
  if (!f) return;
  cur = f;
  F = norm(f);
  ITEMS = ratakan(F);
  jenisAktif = '';
  document.querySelectorAll('.pick').forEach((b) => b.classList.toggle('act', b.dataset.key === key));
  hasil.hidden = true;
  area.hidden = false;
  area.replaceChildren();
  history.replaceState(null, '', '#' + key);
  const mem = ingat();

  const form = el('form', 'in-form');
  form.id = 'ins';

  // Identitas dokumen
  const idc = el('div', 'docid');
  idc.append(el('div', 'docid-t', F.judulPdf));
  if (F.judulEn) idc.append(el('div', 'docid-e', '(' + F.judulEn + ')'));
  const chips = el('div', 'docid-c');
  [['No. Dokumen', F.noDok], ['Tanggal Berlaku', F.berlaku], ['No. Revisi', F.revisi], ['Departemen', F.departemen]].forEach((p) => {
    if (!p[1]) return;
    const s = el('span');
    s.append(el('small', '', p[0]), el('b', '', p[1]));
    chips.append(s);
  });
  idc.append(chips);
  const isi = el('div', 'in-pad');
  form.append(idc, isi);

  // Progres
  const prog = el('div', 'prog');
  const lbl = el('span', 'prog-t');
  const bar = el('div', 'pbar');
  const fill = el('i');
  bar.append(fill);
  prog.append(lbl, bar);
  isi.append(prog);

  // Identitas inspeksi
  const gr = el('div', 'gr');
  const tgl = input('date', 'tanggal', true);
  tgl.value = hariIni();
  const insp = input('text', 'inspektor', true);
  insp.value = mem.inspektor || '';
  insp.placeholder = 'Nama lengkap';
  if (F.info.lokasi) gr.append(kolom(F.info.lokasi, input('text', 'lokasi', true), true));
  gr.append(kolom('Tanggal Inspeksi', tgl, true), kolom(F.info.inspektor, insp, true));
  if (F.info.jenis) gr.append(kolom('Jenis Inspeksi', pilihan('jenisinspeksi', F.info.jenis, true), true));
  if (F.info.waktu) {
    const w = input('time', 'waktu', true);
    w.value = jamIni();
    gr.append(kolom('Waktu Inspeksi', w, true));
  }
  if (F.info.shift) gr.append(kolom('Shift', pilihan('shift', F.info.shift, true), true));
  if (F.id) gr.append(kolom(F.id, input('text', 'identitas', true), true));
  (F.extra || []).forEach((x, i) => gr.append(kolom(x, input('text', 'extra' + i, false), false)));
  isi.append(kartu('Identitas inspeksi', gr));

  // Identitas APAR (khusus form APAR)
  let kapHelp = null;
  if (F.apar) {
    const dl = document.createElement('datalist');
    dl.id = 'daftar-apar';
    DAFTAR_APAR.forEach((n) => { const o = document.createElement('option'); o.value = n; dl.append(o); });
    const no = input('text', 'noapar', true);
    no.setAttribute('list', 'daftar-apar');
    no.autocomplete = 'off';
    no.placeholder = 'Contoh: APAR-017';
    const kNo = el('div', 'grp');
    kNo.append(kolom('No. APAR', no, true), el('p', 'help', 'Ketik nomor atau pilih dari daftar ' + DAFTAR_APAR.length + ' APAR. Data yang sudah terdaftar terisi otomatis dan tetap bisa diubah.'), dl);

    const kLok = el('div', 'grp');
    kLok.append(kolom('Lokasi terpasang', input('text', 'lokasi', true), true));

    const gj = el('div', 'grp');
    gj.append(el('span', 'lbl req', 'Jenis APAR'));
    const sj = el('div', 'seg');
    Object.keys(APAR_KAPASITAS).forEach((j) => sj.append(seg('jenis', j, true)));
    gj.append(sj);

    const gk = el('div', 'grp');
    gk.append(el('span', 'lbl req', 'Kapasitas'));
    const sk = el('div', 'seg');
    [...new Set(Object.values(APAR_KAPASITAS).flat())].sort((a, b) => a - b).forEach((n) => sk.append(seg('kg', n + ' kg', true)));
    kapHelp = el('p', 'help', 'Pilih jenis APAR terlebih dahulu.');
    gk.append(sk, kapHelp);

    const gx = el('div', 'grp');
    const st = el('div', 'st');
    st.hidden = true;
    gx.append(kolom('Tanggal expired', input('date', 'exp', true), true), st, el('p', 'help', 'Peringatan kuning muncul bila kurang dari 30 hari.'));

    isi.append(kartu('Identitas APAR', [kNo, kLok, gj, gk, gx]));
  }

  // Daftar pemeriksaan
  let tDaftar = null;
  const daftar = el('div', 'cl');
  function barisItem(it) {
    const row = el('div', 'it');
    row.id = 'r' + it.i;
    const tx = el('div', 'tx', it.t);
    if (it.auto) tx.append(el('span', 'tag', 'Otomatis dari tanggal expired'));
    const pl = el('div', 'pl');
    F.jawab.forEach((v, k) => pl.append(radio('i' + it.i, v, true, k === 0 ? 'p-baik' : k === 1 ? 'p-tidak' : 'p-na')));
    const ct = input('text', 'k' + it.i, false);
    ct.className = 'ket';
    ct.hidden = true;
    row.append(el('span', 'no', ''), tx, pl, ct);
    return row;
  }
  F.bagian.forEach((b, bi) => {
    const sec = el('section', 'sec');
    const hd = el('div', 'sec-h');
    const h3 = el('h3', 'sec-t', b.judul || 'Daftar pemeriksaan');
    if (!b.judul) tDaftar = h3;
    const semua = el('button', 'sec-all', 'Semua ' + F.jawab[0]);
    semua.type = 'button';
    semua.addEventListener('click', () => {
      ITEMS.filter((it) => it.b === bi && aktif(it)).forEach((it) => {
        const r = form.querySelector('input[name="i' + it.i + '"][value="' + F.jawab[0] + '"]');
        if (r && !r.disabled) {
          r.checked = true;
          r.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });
    });
    hd.append(h3, semua);
    sec.append(hd);
    ITEMS.filter((it) => it.b === bi).forEach((it) => sec.append(barisItem(it)));
    daftar.append(sec);
  });
  isi.append(daftar);

  // Temuan dan rekomendasi
  let tmList = null;
  let tmHint = null;
  function barisTemuan(i) {
    const row = el('div', 'tm');
    if (i !== null) {
      row.id = 't' + i;
      row.append(el('p', 'tm-ref', 'Dari item: ' + ITEMS[i].t));
    }
    const t = document.createElement('textarea');
    t.className = 'tm-t';
    t.required = true;
    t.rows = 2;
    t.placeholder = 'Uraikan temuan';
    if (i !== null) t.value = form.elements['k' + i].value;
    const r = document.createElement('textarea');
    r.className = 'tm-r';
    r.required = true;
    r.rows = 2;
    r.placeholder = 'Rekomendasi perbaikan';
    const p = document.createElement('input');
    p.type = 'text';
    p.className = 'tm-p';
    p.required = true;
    p.placeholder = 'PIC';
    const g = el('div', 'tm-g');
    g.append(kolom('Temuan', t, true), kolom('Rekomendasi perbaikan', r, true), kolom('PIC', p, true));
    row.append(g);
    if (i === null) {
      const x = el('button', 'tm-x', 'Hapus temuan ini');
      x.type = 'button';
      x.addEventListener('click', () => { row.remove(); tmHint.hidden = tmList.children.length > 0; });
      row.append(x);
    }
    return row;
  }
  function aturTemuan(i, ada) {
    const row = $('t' + i);
    if (ada && !row) tmList.append(barisTemuan(i));
    if (!ada && row) row.remove();
    tmHint.hidden = tmList.children.length > 0;
  }
  if (F.temuan) {
    const sec = el('section', 'sec sec-tm');
    const hd = el('div', 'sec-h');
    hd.append(el('h3', 'sec-t', 'Temuan dan rekomendasi perbaikan'));
    const b = el('div', 'sec-b');
    tmList = el('div', 'tm-list');
    tmHint = el('p', 'tm-hint', 'Belum ada temuan. Temuan muncul otomatis saat ada item yang dijawab ' + F.jawab[1] + '.');
    const tambah = el('button', 'tm-add', '+ Tambah temuan lain');
    tambah.type = 'button';
    tambah.addEventListener('click', () => { tmList.append(barisTemuan(null)); tmHint.hidden = true; });
    b.append(tmHint, tmList, tambah);
    sec.append(hd, b);
    isi.append(sec);
  }

  // Kesimpulan
  if (F.kesimpulan) {
    const g = el('div', 'grp');
    g.append(el('span', 'lbl req', 'Kesimpulan'));
    const o = el('div', 'opts');
    F.kesimpulan.forEach((v, i) => o.append(radio('kesimpulan', v, true, i === 0 ? 'p-baik' : 'p-tidak')));
    g.append(o);
    isi.append(kartu('Kesimpulan', g));
  }

  // Pengesahan
  let ttdPad = null;
  const tg = el('div', 'tg');
  F.ttd.forEach((s, k) => {
    const c = el('div', 'tc');
    c.append(el('h4', '', s.peran));
    if (k === 0) {
      ttdPad = padTtd();
      c.append(ttdPad.el);
    }
    const nm = input('text', 'ttd' + k, false);
    nm.value = mem['ttd' + k] || '';
    nm.placeholder = k === 0 ? 'Kosongkan bila sama dengan nama inspektor' : 'Nama (boleh dikosongkan)';
    const jb = input('text', 'jab' + k, false);
    jb.value = s.jabatan || '';
    jb.placeholder = 'Jabatan';
    c.append(kolom('Nama', nm, false), kolom('Jabatan', jb, false));
    tg.append(c);
  });
  isi.append(kartu('Pengesahan', tg));

  // Jebakan spam, tombol, status
  const hp = input('text', 'Website', false);
  hp.className = 'hp';
  hp.tabIndex = -1;
  hp.autocomplete = 'off';
  hp.setAttribute('aria-hidden', 'true');
  const btn = el('button', 'in-btn', 'Buat PDF & Simpan');
  btn.type = 'submit';
  const st = el('p', '');
  st.id = 'st';
  st.setAttribute('role', 'status');
  isi.append(hp, btn, st);

  // ---------- Perilaku formulir ----------
  function hitung() {
    const akt = ITEMS.filter(aktif);
    const jaw = akt.filter((it) => form.querySelector('input[name="i' + it.i + '"]:checked')).length;
    lbl.textContent = 'Terjawab ' + jaw + ' dari ' + akt.length;
    fill.style.width = (akt.length ? (jaw / akt.length) * 100 : 0) + '%';
  }
  function nomori() {
    F.bagian.forEach((b, bi) => {
      let n = 0;
      ITEMS.filter((it) => it.b === bi && aktif(it)).forEach((it) => {
        n++;
        $('r' + it.i).querySelector('.no').textContent = n;
      });
    });
  }
  function kunci(it, on) {
    it.locked = on;
    form.querySelectorAll('input[name="i' + it.i + '"]').forEach((r) => { r.disabled = on || !aktif(it); });
  }
  function pasangItem() {
    ITEMS.forEach((it) => {
      const on = aktif(it);
      $('r' + it.i).hidden = !on;
      form.querySelectorAll('input[name="i' + it.i + '"]').forEach((r) => { r.disabled = !on || it.locked; });
      form.elements['k' + it.i].disabled = !on;
      if (!on && tmList) aturTemuan(it.i, false);
    });
    if (tDaftar && F.apar) tDaftar.textContent = 'Daftar pemeriksaan' + (jenisAktif ? ': APAR ' + jenisAktif : '');
    nomori();
    hitung();
  }

  // Status tanggal expired + jawaban otomatis
  function setAuto(it, kedaluwarsa, v) {
    const val = kedaluwarsa ? F.jawab[1] : F.jawab[0];
    const r = form.querySelector('input[name="i' + it.i + '"][value="' + val + '"]');
    if (!r) return;
    r.disabled = false;
    r.checked = true;
    r.dispatchEvent(new Event('change', { bubbles: true }));
    const ct = form.elements['k' + it.i];
    ct.value = kedaluwarsa ? 'Kedaluwarsa sejak ' + tglPanjang(v) : '';
    ct.dispatchEvent(new Event('input', { bubbles: true }));
    kunci(it, true);
  }
  function terapkanExpired() {
    if (!F.apar) return;
    const box = form.querySelector('.st');
    const v = form.elements.exp.value;
    const it = ITEMS.find((x) => x.auto === 'exp');
    if (!v) {
      box.hidden = true;
      if (it) kunci(it, false);
      return;
    }
    const hari = Math.round((new Date(v + 'T00:00:00') - new Date(hariIni() + 'T00:00:00')) / 86400000);
    box.hidden = false;
    if (hari < 0) {
      box.className = 'st bad';
      box.textContent = 'Sudah kedaluwarsa, ' + (-hari) + ' hari lalu';
    } else if (hari === 0) {
      box.className = 'st warn';
      box.textContent = 'Kedaluwarsa hari ini';
    } else if (hari <= 30) {
      box.className = 'st warn';
      box.textContent = 'Segera kedaluwarsa, ' + hari + ' hari lagi';
    } else {
      box.className = 'st ok';
      box.textContent = 'Masih berlaku, ' + hari + ' hari lagi';
    }
    if (it) setAuto(it, hari < 0, v);
  }

  // Jenis APAR -> kapasitas yang boleh + butir yang tampil
  function jenisBerubah() {
    jenisAktif = form.elements.jenis.value || '';
    const boleh = (APAR_KAPASITAS[jenisAktif] || []).map((x) => x + ' kg');
    form.querySelectorAll('input[name="kg"]').forEach((r) => {
      r.disabled = !!jenisAktif && !boleh.includes(r.value);
      if (r.disabled && r.checked) r.checked = false;
    });
    if (boleh.length === 1) {
      form.querySelector('input[name="kg"][value="' + boleh[0] + '"]').checked = true;
    }
    kapHelp.textContent = !jenisAktif ? 'Pilih jenis APAR terlebih dahulu.'
      : jenisAktif + ' tersedia ' + boleh.join(' dan ') + '.';
    pasangItem();
    terapkanExpired();
  }

  // Isi otomatis dari data APAR bila nomor sudah terdaftar
  function isiDariData() {
    const no = form.elements.noapar.value.trim().toUpperCase();
    form.elements.noapar.value = no;
    const d = APAR_DATA[no];
    if (!d) return;
    const j = form.querySelector('input[name="jenis"][value="' + d.jenis + '"]');
    if (j) {
      j.checked = true;
      jenisBerubah();
    }
    const k = form.querySelector('input[name="kg"][value="' + d.kg + ' kg"]');
    if (k && !k.disabled) k.checked = true;
    if (d.lokasi) form.elements.lokasi.value = d.lokasi;
    if (d.exp) {
      form.elements.exp.value = d.exp;
      terapkanExpired();
    }
  }

  form.addEventListener('change', (e) => {
    const n = e.target.name || '';
    const m = /^i(\d+)$/.exec(n);
    if (m) {
      const i = Number(m[1]);
      const v = e.target.value;
      const ct = form.elements['k' + i];
      const neg = v === F.jawab[1];
      const na = v === F.jawab[2];
      ct.hidden = !(neg || na);
      ct.required = neg;
      ct.placeholder = neg ? 'Catatan (wajib diisi)' : 'Alasan ' + F.jawab[2] + ' (opsional)';
      if (!neg && !na) ct.value = '';
      if (tmList) aturTemuan(i, neg);
      hitung();
      return;
    }
    if (F.apar && n === 'jenis') jenisBerubah();
    else if (F.apar && n === 'noapar') isiDariData();
    else if (F.apar && n === 'exp') terapkanExpired();
  });
  // Catatan item ikut menjadi isi temuan selama temuan belum diubah manual
  form.addEventListener('input', (e) => {
    const m = /^k(\d+)$/.exec(e.target.name || '');
    if (m) {
      const r = $('t' + m[1]);
      if (r) {
        const t = r.querySelector('.tm-t');
        if (!t.dataset.edit) t.value = e.target.value;
      }
    }
    if (e.target.classList && e.target.classList.contains('tm-t')) e.target.dataset.edit = '1';
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    kirim(form, btn, st, ttdPad);
  });

  area.append(form);
  pasangItem();
  if (F.apar) jenisBerubah();
  if (gulir) area.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ---------- PDF ----------
function buatPdf(d) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = 210;
  const M = 12;
  const TOP = 44;
  const HIJAU = [15, 92, 58];
  const PUTIH = [255, 255, 255];
  const GELAP = [23, 51, 42];
  const TEPI = [190, 205, 196];
  const margin = { top: TOP, left: M, right: M, bottom: 18 };

  // Judul
  doc.setTextColor(...GELAP);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(F.judulPdf, W / 2, TOP + 2, { align: 'center' });
  let y = TOP + 6;
  if (F.judulEn) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9.5);
    doc.text('(' + F.judulEn + ')', W / 2, y, { align: 'center' });
    y += 3;
  }

  // Identitas inspeksi (dua pasang per baris)
  const baris = [];
  for (let k = 0; k < d.pairs.length; k += 2) {
    const a = d.pairs[k];
    const b = d.pairs[k + 1] || ['', ''];
    baris.push([a[0], a[1], b[0], b[1]]);
  }
  doc.autoTable({
    startY: y, margin, theme: 'grid', body: baris,
    styles: { fontSize: 8.5, cellPadding: 1.6, lineColor: TEPI, lineWidth: 0.2, textColor: GELAP },
    columnStyles: {
      0: { fontStyle: 'bold', fillColor: [232, 243, 236], cellWidth: 34 },
      1: { cellWidth: 59 },
      2: { fontStyle: 'bold', fillColor: [232, 243, 236], cellWidth: 34 },
      3: { cellWidth: 59 }
    }
  });

  // Daftar pemeriksaan
  const body = [];
  d.rows.forEach((r) => {
    if (r.judul !== undefined) {
      if (r.judul) body.push([{ content: r.judul, colSpan: 6, styles: { fillColor: [232, 243, 236], textColor: HIJAU, fontStyle: 'bold', halign: 'left' } }]);
    } else {
      const k = F.jawab.indexOf(r.v);
      body.push([String(r.n), r.t, k === 0 ? 'X' : '', k === 1 ? 'X' : '', k === 2 ? 'X' : '', r.k || '']);
    }
  });
  doc.autoTable({
    startY: doc.lastAutoTable.finalY + 5, margin, theme: 'grid',
    head: [['NO', 'ITEM PEMERIKSAAN', F.jawabPdf[0], F.jawabPdf[1], F.jawabPdf[2], 'CATATAN']],
    body,
    headStyles: { fillColor: HIJAU, textColor: PUTIH, halign: 'center', fontSize: 8 },
    styles: { fontSize: 8.5, cellPadding: 1.6, lineColor: TEPI, lineWidth: 0.2, textColor: GELAP, valign: 'middle' },
    columnStyles: {
      0: { cellWidth: 9, halign: 'center' },
      1: { cellWidth: 98, halign: 'left' },
      2: { cellWidth: 12, halign: 'center' },
      3: { cellWidth: 12, halign: 'center' },
      4: { cellWidth: 12, halign: 'center' },
      5: { cellWidth: 43 }
    },
    didParseCell: (c) => {
      if (c.section === 'head' && c.column.index === 1) c.cell.styles.halign = 'left';
      if (c.section === 'body' && c.column.index >= 2 && c.column.index <= 4 && c.cell.raw === 'X') {
        c.cell.styles.fontStyle = 'bold';
        c.cell.styles.fontSize = 10;
        c.cell.styles.textColor = c.column.index === 3 ? [179, 38, 30] : [30, 132, 73];
      }
    }
  });

  // Temuan dan rekomendasi
  if (F.temuan) {
    const tb = d.temuan.length
      ? d.temuan.map((t, k) => [String(k + 1), t.t, t.r, t.p])
      : [['-', 'Tidak ada temuan', '-', '-']];
    doc.autoTable({
      startY: doc.lastAutoTable.finalY + 6, margin, theme: 'grid',
      head: [['NO', 'TEMUAN', 'REKOMENDASI PERBAIKAN', 'PIC']],
      body: tb,
      headStyles: { fillColor: HIJAU, textColor: PUTIH, halign: 'center', fontSize: 8 },
      styles: { fontSize: 8.5, cellPadding: 1.8, lineColor: TEPI, lineWidth: 0.2, textColor: GELAP },
      columnStyles: { 0: { cellWidth: 9, halign: 'center' }, 1: { cellWidth: 70 }, 2: { cellWidth: 70 }, 3: { cellWidth: 37 } }
    });
  }

  let yy = doc.lastAutoTable.finalY + 7;
  if (d.kesimpulan) {
    if (yy > 262) { doc.addPage(); yy = TOP; }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...GELAP);
    doc.text('Kesimpulan: ' + d.kesimpulan, M, yy);
    yy += 7;
  }

  // Pengesahan: satu penanda tangan = kotak persegi di sisi kanan; lebih dari satu = deret kolom
  const satu = d.ttd.length === 1;
  if (yy + (satu ? 60 : 52) > 279) { doc.addPage(); yy = TOP; }
  const lebarKol = satu ? 58 : (W - 2 * M) / d.ttd.length;
  doc.autoTable({
    startY: yy,
    margin: { top: TOP, left: satu ? W - M - lebarKol : M, right: M, bottom: 18 },
    theme: 'grid', rowPageBreak: 'avoid',
    head: [d.ttd.map((s) => s.peran)],
    body: [
      d.ttd.map(() => ({ content: '', styles: { minCellHeight: satu ? 35 : 26 } })),
      d.ttd.map((s) => ({ content: s.nama || ' ', styles: { fontStyle: 'bold' } })),
      d.ttd.map((s) => s.jabatan || ' ')
    ],
    headStyles: { fillColor: HIJAU, textColor: PUTIH, halign: 'center', fontSize: 8 },
    styles: { fontSize: 9, cellPadding: 1.8, lineColor: TEPI, lineWidth: 0.2, textColor: GELAP, halign: 'center' },
    columnStyles: Object.fromEntries(d.ttd.map((_, k) => [k, { cellWidth: lebarKol }])),
    didDrawCell: (c) => {
      if (c.section === 'body' && c.row.index === 0 && c.column.index === 0 && d.ttdImg) {
        const h = Math.min(c.cell.height - 4, (c.cell.width - 12) / 3);
        const w = h * 3;
        doc.addImage(d.ttdImg, 'PNG', c.cell.x + (c.cell.width - w) / 2, c.cell.y + (c.cell.height - h) / 2, w, h);
      }
    }
  });

  // Kepala dan kaki dokumen di setiap halaman
  const n = doc.getNumberOfPages();
  for (let p = 1; p <= n; p++) {
    doc.setPage(p);

    // Kotak identitas dokumen (kiri, ringkas)
    const wI = 70;
    const rows = [['No. Dokumen', F.noDok], ['Tanggal Berlaku', F.berlaku], ['No. Revisi', F.revisi], ['Halaman', p + ' dari ' + n], ['Departemen', F.departemen]].filter((r) => r[1]);
    const rh = 28 / rows.length;
    doc.setDrawColor(...TEPI);
    doc.setLineWidth(0.3);
    doc.rect(M, 10, wI, 28);
    rows.forEach((r, k) => {
      const ya = 10 + k * rh;
      if (k) doc.line(M, ya, M + wI, ya);
      doc.setTextColor(...GELAP);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text(r[0], M + 2, ya + rh / 2 + 1.1);
      doc.text(':', M + 29, ya + rh / 2 + 1.1);
      doc.setFont('helvetica', 'normal');
      doc.text(String(r[1]), M + 32, ya + rh / 2 + 1.1);
    });

    // Blok HSE DEPARTMENT (kanan, panjang)
    const xH = M + wI + 3;
    const wH = W - M - xH;
    doc.setFillColor(...HIJAU);
    doc.rect(xH, 10, wH, 28, 'F');
    doc.setTextColor(...PUTIH);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text('HSE DEPARTMENT', xH + wH / 2, 22, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('Health | Safety | Environment', xH + wH / 2, 28.5, { align: 'center' });
    doc.setFontSize(7.5);
    doc.text(PERUSAHAAN, xH + wH / 2, 34, { align: 'center' });

    // Kaki dokumen
    doc.setDrawColor(...TEPI);
    doc.line(M, 285, W - M, 285);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(90, 110, 100);
    doc.text(F.footer, W / 2, 289, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.text('Dibuat melalui website HSE Department pada ' + d.dibuat, W / 2, 293, { align: 'center' });
  }
  return doc;
}

// ---------- Kirim: susun data, buat PDF, simpan ke Google Drive ----------
async function kirim(form, btn, st, ttdPad) {
  if (form.Website.value) return;
  if (!window.jspdf || !window.jspdf.jsPDF) {
    st.className = 'err';
    st.textContent = 'Pustaka PDF belum termuat. Periksa koneksi internet lalu muat ulang halaman.';
    return;
  }
  const val = (n) => (form.elements[n] ? form.elements[n].value.trim() : '');
  const dipilih = (i) => form.querySelector('input[name="i' + i + '"]:checked');

  // Daftar pemeriksaan
  const rows = [];
  let pos = 0;
  let neg = 0;
  const akt = ITEMS.filter(aktif);
  for (const it of akt) {
    if (!dipilih(it.i)) {
      st.className = 'err';
      st.textContent = 'Masih ada item pemeriksaan yang belum dijawab.';
      return;
    }
  }
  F.bagian.forEach((b, bi) => {
    const list = akt.filter((it) => it.b === bi);
    if (!list.length) return;
    rows.push({ judul: b.judul });
    list.forEach((it, n) => {
      const v = dipilih(it.i).value;
      if (v === F.jawab[0]) pos++;
      if (v === F.jawab[1]) neg++;
      rows.push({ n: n + 1, t: it.t, v, k: val('k' + it.i) });
    });
  });

  // Temuan (urut sesuai nomor item, temuan manual di akhir)
  const temuan = [...form.querySelectorAll('.tm')]
    .map((r) => ({
      o: r.id ? Number(r.id.slice(1)) : 1e6,
      t: r.querySelector('.tm-t').value.trim(),
      r: r.querySelector('.tm-r').value.trim(),
      p: r.querySelector('.tm-p').value.trim()
    }))
    .sort((a, b) => a.o - b.o);

  // Identitas yang dicetak di PDF
  const tglIso = val('tanggal');
  const tglP = tglPanjang(tglIso);
  const inspektor = val('inspektor');
  const pairs = [];
  let identitas = val('identitas');
  if (F.apar) {
    const exp = val('exp');
    identitas = [val('noapar'), val('jenis') + ' ' + val('kg'), 'Exp ' + tglPanjang(exp)].join(' | ');
    pairs.push(['No. APAR', val('noapar')], ['Lokasi terpasang', val('lokasi')], ['Jenis APAR', val('jenis')], ['Kapasitas', val('kg')],
      ['Tanggal Expired', tglPanjang(exp)], ['Status Expired', form.querySelector('.st').textContent],
      ['Tanggal Inspeksi', tglP], [F.info.inspektor, inspektor]);
  } else {
    pairs.push([F.info.lokasi, val('lokasi')], [F.info.inspektor, inspektor], ['Tanggal Inspeksi', tglP]);
    if (F.info.jenis) pairs.push(['Jenis Inspeksi', val('jenisinspeksi')]);
    if (F.info.waktu) pairs.push(['Waktu Inspeksi', val('waktu').replace(':', '.') + ' WIB']);
    if (F.info.shift) pairs.push(['Shift', val('shift')]);
    if (F.id) pairs.push([F.id, val('identitas')]);
    (F.extra || []).forEach((x, i) => pairs.push([x, val('extra' + i) || '-']));
  }

  const kes = form.querySelector('input[name="kesimpulan"]:checked');
  const d = {
    pairs, rows, temuan,
    kesimpulan: kes ? kes.value : '',
    ttd: F.ttd.map((s, k) => ({ peran: s.peran, nama: val('ttd' + k) || (k === 0 ? inspektor : ''), jabatan: val('jab' + k) })),
    ttdImg: ttdPad ? ttdPad.data() : '',
    dibuat: new Date().toLocaleString('id-ID')
  };

  // Ingat nama untuk pengisian berikutnya di perangkat ini
  const ingatan = { inspektor };
  F.ttd.forEach((s, k) => { ingatan['ttd' + k] = val('ttd' + k); });
  simpanIngat(ingatan);

  btn.disabled = true;
  st.className = '';
  st.textContent = 'Membuat PDF...';

  let doc;
  try {
    doc = buatPdf(d);
  } catch (err) {
    btn.disabled = false;
    st.className = 'err';
    st.textContent = 'PDF gagal dibuat. Muat ulang halaman lalu coba lagi.';
    return;
  }

  const nama = (cur.kode + ' ' + cur.pendek + ' - ' + tglIso + ' - ' + inspektor).replace(/[\\/:*?"<>|]/g, '-') + '.pdf';
  const url = URL.createObjectURL(doc.output('blob'));

  let pesan = 'PDF sudah dibuat. Penyimpanan ke Google Drive belum diatur, jadi simpan file PDF di bawah secara manual.';
  let ok = false;
  if (ENDPOINT) {
    st.textContent = 'Menyimpan ke Google Drive...';
    try {
      const r = await fetch(ENDPOINT, {
        method: 'POST',
        body: JSON.stringify({
          tipe: 'inspeksi', judul: cur.pendek, kode: cur.kode, tanggal: tglIso, inspektur: inspektor,
          lokasi: val('lokasi'), identitas, baik: pos, tidak: neg,
          kesimpulan: d.kesimpulan || (neg ? neg + ' temuan' : 'Tidak ada temuan'),
          pdf: doc.output('datauristring').split('base64,')[1]
        })
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || 'ditolak server');
      ok = true;
      pesan = 'Inspeksi tersimpan di Google Drive HSE. Anda juga dapat mengunduh salinan PDF-nya.';
    } catch (err) {
      pesan = 'PDF sudah dibuat, tetapi belum tersimpan di Google Drive: ' + jelaskan(err) + '. Unduh PDF di bawah dan serahkan ke petugas HSE.';
    }
  }

  area.hidden = true;
  hasil.hidden = false;
  hasil.replaceChildren();
  const box = el('div', 'res ' + (ok ? 'res-ok' : 'res-warn'));
  box.append(el('h2', '', ok ? 'Inspeksi tersimpan' : 'Inspeksi selesai'), el('p', '', pesan),
    el('p', 'res-sum', pos + ' item ' + F.jawab[0] + ', ' + neg + ' item ' + F.jawab[1] + ', ' + temuan.length + ' temuan.'));
  const aksi = el('div', 'res-act');
  const a = el('a', 'in-btn', 'Unduh PDF');
  a.href = url;
  a.download = nama;
  const lagi = el('button', 'in-btn alt', 'Isi inspeksi lagi');
  lagi.type = 'button';
  lagi.addEventListener('click', () => buka(cur.key, true));
  aksi.append(a, lagi);
  box.append(aksi);
  hasil.append(box);
  hasil.scrollIntoView({ behavior: 'smooth', block: 'start' });
  btn.disabled = false;
}

// Buka langsung bila alamat memuat #jenis (mis. inspeksi.html#apar)
const awal = location.hash.slice(1);
if (INSPEKSI.some((x) => x.key === awal)) buka(awal, false);
