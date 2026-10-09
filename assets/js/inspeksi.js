// Pengaturan: isi dengan alamat Web App Google Apps Script yang SAMA dengan di laporan.js (berakhiran /exec).
// Bila kosong, PDF tetap dibuat dan bisa diunduh, tetapi tidak disimpan ke Google Drive.
const ENDPOINT = 'https://script.google.com/macros/s/AKfycbxCuQizuGxTjFRb-RBzH1KGLcGHeSte8RrG6TOduUEign4cXVamvwoibbz3h4EsRIiDlQ/exec';

const $ = (id) => document.getElementById(id);
const pilih = $('pilih');
const area = $('area');
const hasil = $('hasil');
let cur = null;

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
const hariIni = () => {
  const n = new Date();
  n.setMinutes(n.getMinutes() - n.getTimezoneOffset());
  return n.toISOString().slice(0, 10);
};

// Pilihan jenis inspeksi
INSPEKSI.forEach((f) => {
  const b = el('button', 'pick');
  b.type = 'button';
  b.dataset.key = f.key;
  b.append(el('i', '', f.ikon), el('b', '', f.pendek), el('span', '', f.kode.replace('UEI-HSE-', '')));
  b.addEventListener('click', () => buka(f.key, true));
  pilih.append(b);
});

// Tampilkan formulir untuk satu jenis inspeksi
function buka(key, gulir) {
  cur = INSPEKSI.find((x) => x.key === key);
  if (!cur) return;
  document.querySelectorAll('.pick').forEach((b) => b.classList.toggle('act', b.dataset.key === key));
  hasil.hidden = true;
  area.hidden = false;
  area.replaceChildren();
  history.replaceState(null, '', '#' + key);

  const form = el('form', 'in-form');
  form.id = 'ins';

  const h = el('div', 'in-h');
  h.append(el('h2', '', cur.nama), el('p', '', cur.kode));
  form.append(h);

  const tgl = input('date', 'tanggal', true);
  tgl.value = hariIni();
  const r1 = el('div', 'row');
  r1.append(kolom('Tanggal inspeksi', tgl, true), kolom('Nama inspektur', input('text', 'inspektur', true), true));
  form.append(r1);

  const r2 = el('div', 'row');
  r2.append(kolom('Lokasi / area', input('text', 'lokasi', true), true));
  if (cur.id) r2.append(kolom(cur.id, input('text', 'identitas', true), true));
  form.append(r2);

  if (cur.extra) {
    const r3 = el('div', 'row');
    cur.extra.forEach((x, i) => r3.append(kolom(x, input('text', 'extra' + i, false), false)));
    form.append(r3);
  }

  const daftar = el('div', 'cl');
  daftar.append(el('h3', '', 'Daftar pemeriksaan'));
  cur.item.forEach((teks, i) => {
    const it = el('div', 'it');
    it.append(el('span', 'no', String(i + 1)), el('div', 'tx', teks));
    const pl = el('div', 'pl');
    pl.append(radio('i' + i, 'Baik', true, 'p-baik'), radio('i' + i, 'Tidak baik', true, 'p-tidak'), radio('i' + i, 'N/A', true, 'p-na'));
    it.append(pl);
    const k = input('text', 'k' + i, false);
    k.className = 'ket';
    k.placeholder = 'Keterangan (wajib diisi bila tidak baik)';
    it.append(k);
    daftar.append(it);
  });
  form.append(daftar);

  const tm = document.createElement('textarea');
  tm.name = 'temuan';
  tm.placeholder = 'Tuliskan temuan dan tindak lanjut yang diperlukan';
  form.append(kolom('Temuan dan tindak lanjut', tm, false));

  if (cur.kesimpulan) {
    const g = el('div', 'grp');
    g.append(el('span', 'lbl req', 'Kesimpulan'));
    const o = el('div', 'opts');
    cur.kesimpulan.forEach((v, i) => o.append(radio('kesimpulan', v, true, i === 0 ? 'p-baik' : 'p-tidak')));
    g.append(o);
    form.append(g);
  }

  const hp = input('text', 'Website', false);
  hp.className = 'hp';
  hp.tabIndex = -1;
  hp.autocomplete = 'off';
  hp.setAttribute('aria-hidden', 'true');
  form.append(hp);

  const btn = el('button', 'in-btn', 'Buat PDF & Simpan');
  btn.type = 'submit';
  const st = el('p', '');
  st.id = 'st';
  st.setAttribute('role', 'status');
  form.append(btn, st);

  form.addEventListener('submit', (e) => { e.preventDefault(); kirim(form, btn, st); });
  area.append(form);
  if (gulir) area.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Susun PDF hasil inspeksi
function buatPdf(d) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();

  doc.setFillColor(15, 92, 58);
  doc.rect(0, 0, W, 24, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('HSE DEPARTMENT', 14, 11);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Health | Safety | Environment', 14, 17);
  doc.text(d.kode, W - 14, 11, { align: 'right' });

  doc.setTextColor(23, 51, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(d.nama.toUpperCase(), 14, 34);

  const info = [
    ['Tanggal inspeksi', d.tanggal],
    ['Nama inspektur', d.inspektur],
    ['Lokasi / area', d.lokasi]
  ];
  if (d.identitasLabel) info.push([d.identitasLabel, d.identitas]);
  d.extra.forEach((x) => info.push(x));
  doc.autoTable({
    startY: 38, theme: 'plain', body: info,
    styles: { fontSize: 9.5, cellPadding: 1.2, textColor: [23, 51, 42] },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 42 } }
  });

  doc.autoTable({
    startY: doc.lastAutoTable.finalY + 4,
    head: [['No', 'Item pemeriksaan', 'Hasil', 'Keterangan']],
    body: d.rows,
    theme: 'grid',
    headStyles: { fillColor: [15, 92, 58] },
    styles: { fontSize: 9, cellPadding: 2 },
    columnStyles: { 0: { cellWidth: 10, halign: 'center' }, 2: { cellWidth: 24, halign: 'center' } },
    didParseCell: (c) => {
      if (c.section === 'body' && c.column.index === 2) {
        if (c.cell.raw === 'Tidak baik') { c.cell.styles.textColor = [179, 38, 30]; c.cell.styles.fontStyle = 'bold'; }
        if (c.cell.raw === 'Baik') c.cell.styles.textColor = [30, 132, 73];
      }
    }
  });

  let y = doc.lastAutoTable.finalY + 8;
  const butuh = (tinggi) => { if (y + tinggi > 275) { doc.addPage(); y = 20; } };

  doc.setTextColor(23, 51, 42);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  butuh(14);
  doc.text('Temuan dan tindak lanjut', 14, y);
  doc.setFont('helvetica', 'normal');
  const baris = doc.splitTextToSize(d.temuan || '-', W - 28);
  y += 5;
  baris.forEach((t) => { butuh(5); doc.text(t, 14, y); y += 5; });

  if (d.kesimpulan) {
    y += 3;
    butuh(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Kesimpulan: ' + d.kesimpulan, 14, y);
    y += 8;
  }

  butuh(30);
  doc.setFont('helvetica', 'normal');
  doc.text('Diperiksa oleh,', W - 14, y + 4, { align: 'right' });
  doc.text(d.inspektur, W - 14, y + 24, { align: 'right' });
  doc.setFontSize(8);
  doc.setTextColor(110, 110, 110);
  doc.text('Dibuat melalui website HSE Department pada ' + d.dibuat, 14, y + 24);

  const n = doc.getNumberOfPages();
  for (let i = 1; i <= n; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text('Halaman ' + i + ' dari ' + n, W / 2, 290, { align: 'center' });
  }
  return doc;
}

// Validasi, buat PDF, simpan ke Google Drive, lalu tampilkan hasil
async function kirim(form, btn, st) {
  if (form.Website.value) return;
  if (!window.jspdf || !window.jspdf.jsPDF) {
    st.className = 'err';
    st.textContent = 'Pustaka PDF belum termuat. Periksa koneksi internet lalu muat ulang halaman.';
    return;
  }

  const rows = [];
  let baik = 0;
  let tidak = 0;
  for (let i = 0; i < cur.item.length; i++) {
    const h = form.querySelector('input[name="i' + i + '"]:checked').value;
    const k = form.elements['k' + i].value.trim();
    if (h === 'Tidak baik' && !k) {
      form.elements['k' + i].focus();
      st.className = 'err';
      st.textContent = 'Isi keterangan pada item nomor ' + (i + 1) + ' yang tidak baik.';
      return;
    }
    if (h === 'Baik') baik++;
    if (h === 'Tidak baik') tidak++;
    rows.push([String(i + 1), cur.item[i], h, k || '-']);
  }

  const kes = form.querySelector('input[name="kesimpulan"]:checked');
  const d = {
    kode: cur.kode,
    nama: cur.nama,
    tanggal: form.elements.tanggal.value,
    inspektur: form.elements.inspektur.value.trim(),
    lokasi: form.elements.lokasi.value.trim(),
    identitasLabel: cur.id || '',
    identitas: cur.id ? form.elements.identitas.value.trim() : '',
    extra: (cur.extra || []).map((x, i) => [x, form.elements['extra' + i].value.trim() || '-']),
    rows,
    temuan: form.elements.temuan.value.trim(),
    kesimpulan: kes ? kes.value : '',
    dibuat: new Date().toLocaleString('id-ID')
  };

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

  const nama = (d.kode + ' ' + cur.pendek + ' - ' + d.tanggal + ' - ' + d.inspektur).replace(/[\\/:*?"<>|]/g, '-') + '.pdf';
  const url = URL.createObjectURL(doc.output('blob'));

  let pesan = 'PDF sudah dibuat. Penyimpanan ke Google Drive belum diatur, jadi simpan file PDF di bawah secara manual.';
  let ok = false;
  if (ENDPOINT) {
    st.textContent = 'Menyimpan ke Google Drive...';
    try {
      const r = await fetch(ENDPOINT, {
        method: 'POST',
        body: JSON.stringify({
          tipe: 'inspeksi', judul: cur.pendek, kode: cur.kode, tanggal: d.tanggal, inspektur: d.inspektur,
          lokasi: d.lokasi, identitas: d.identitas, baik, tidak, kesimpulan: d.kesimpulan,
          pdf: doc.output('datauristring').split('base64,')[1]
        })
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || 'ditolak server');
      ok = true;
      pesan = 'Inspeksi tersimpan di Google Drive HSE. Anda juga dapat mengunduh salinan PDF-nya.';
    } catch (err) {
      pesan = 'PDF sudah dibuat, tetapi belum tersimpan di Google Drive (' + err.message + '). Unduh PDF di bawah dan serahkan ke petugas HSE.';
    }
  }

  area.hidden = true;
  hasil.hidden = false;
  hasil.replaceChildren();
  const box = el('div', 'res ' + (ok ? 'res-ok' : 'res-warn'));
  box.append(el('h2', '', ok ? 'Inspeksi tersimpan' : 'Inspeksi selesai'), el('p', '', pesan));
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
