// Pengaturan pengiriman laporan
// - endpoint: isi dengan alamat Web App dari Google Apps Script (berakhiran /exec).
// - email: dipakai hanya bila pengguna menekan tombol "Kirim lewat email" setelah pengiriman gagal
//   (foto tidak ikut terkirim lewat email).
const CONFIG = {
  endpoint: 'https://script.google.com/macros/s/AKfycbxCuQizuGxTjFRb-RBzH1KGLcGHeSte8RrG6TOduUEign4cXVamvwoibbz3h4EsRIiDlQ/exec',
  email: 'admin.jayadi@gmail.com'
};
const MAX_FOTO = 3;

const form = document.getElementById('rp');
const st = document.getElementById('st');
const btn = form.querySelector('.rp-btn');
const fotoInput = document.getElementById('foto');
const prev = document.getElementById('prev');

function setNow() {
  const dt = form.querySelector('input[type=datetime-local]');
  if (dt && !dt.value) {
    const n = new Date();
    n.setMinutes(n.getMinutes() - n.getTimezoneOffset());
    dt.value = n.toISOString().slice(0, 16);
  }
}
setNow();

// Pratinjau foto yang dipilih
fotoInput.addEventListener('change', () => {
  prev.replaceChildren();
  const files = [...fotoInput.files];
  if (files.length > MAX_FOTO) {
    st.className = 'err';
    st.textContent = 'Maksimal ' + MAX_FOTO + ' foto.';
    fotoInput.value = '';
    return;
  }
  st.textContent = '';
  files.forEach((f) => {
    const i = new Image();
    i.alt = f.name;
    i.src = URL.createObjectURL(f);
    prev.append(i);
  });
});

// Perkecil foto (sisi terpanjang 1280 px, JPEG) agar cepat terkirim
function kecilkan(file) {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const s = Math.min(1, 1280 / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * s);
      c.height = Math.round(img.height * s);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      res({ name: file.name, type: 'image/jpeg', data: c.toDataURL('image/jpeg', 0.75).split(',')[1] });
    };
    img.onerror = () => rej(new Error('foto tidak dapat dibaca'));
    img.src = url;
  });
}

// Cadangan: hanya dijalankan bila pengguna menekan tombolnya
function viaEmail(title, data) {
  const text = Object.entries(data)
    .filter(([k]) => k !== 'Website')
    .map(([k, v]) => k + ': ' + (v || '-'))
    .join('\n');
  location.href = 'mailto:' + CONFIG.email + '?subject=' + encodeURIComponent(title) + '&body=' + encodeURIComponent(title + '\n\n' + text);
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(form));
  const title = form.dataset.title;

  btn.disabled = true;
  st.className = '';
  st.textContent = 'Mengirim...';

  try {
    if (!CONFIG.endpoint) throw new Error('alamat penerima (endpoint) belum diisi di laporan.js');

    const fotos = await Promise.all([...fotoInput.files].map(kecilkan));

    let r;
    try {
      r = await fetch(CONFIG.endpoint, {
        method: 'POST',
        body: JSON.stringify({ laporan: title, ...data, fotos })
      });
    } catch {
      throw new Error('tidak dapat terhubung ke Google. Periksa alamat Web App dan pastikan akses diatur "Anyone"');
    }

    let j;
    try {
      j = await r.json();
    } catch {
      throw new Error('balasan Google tidak terbaca. Pastikan deployment sudah diizinkan dan akses diatur "Anyone"');
    }
    if (!j.ok) throw new Error(j.error || 'ditolak oleh server');

    form.reset();
    prev.replaceChildren();
    setNow();
    st.className = 'ok';
    st.textContent = 'Laporan terkirim. Terima kasih sudah melapor.';
  } catch (err) {
    st.className = 'err';
    st.textContent = 'Laporan belum terkirim. Penyebab: ' + err.message + '. ';
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = 'Kirim lewat email';
    b.style.cssText = 'margin-top:8px;padding:6px 14px;border:2px solid currentColor;border-radius:999px;background:none;color:inherit;font:inherit;font-weight:700;cursor:pointer';
    b.addEventListener('click', () => viaEmail(title, data));
    st.append(b);
  } finally {
    btn.disabled = false;
  }
});
