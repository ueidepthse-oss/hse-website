// Pengaturan pengiriman laporan
// - endpoint: isi dengan alamat layanan penerima formulir (mis. Formspree) agar laporan terkirim langsung.
// - email: dipakai bila endpoint kosong; tombol Kirim akan membuka aplikasi email dengan isi laporan.
const CONFIG = {
  endpoint: '',
  email: 'hse@perusahaan.com'
};

const form = document.getElementById('rp');
const st = document.getElementById('st');
const btn = form.querySelector('.rp-btn');

function setNow() {
  const dt = form.querySelector('input[type=datetime-local]');
  if (dt && !dt.value) {
    const n = new Date();
    n.setMinutes(n.getMinutes() - n.getTimezoneOffset());
    dt.value = n.toISOString().slice(0, 16);
  }
}
setNow();

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(form));
  const title = form.dataset.title;

  if (CONFIG.endpoint) {
    btn.disabled = true;
    st.className = '';
    st.textContent = 'Mengirim...';
    fetch(CONFIG.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ laporan: title, ...data })
    })
      .then((r) => { if (!r.ok) throw new Error(); form.reset(); setNow(); st.className = 'ok'; st.textContent = 'Laporan terkirim. Terima kasih sudah melapor.'; })
      .catch(() => { st.className = 'err'; st.textContent = 'Laporan gagal dikirim. Coba lagi atau hubungi petugas HSE.'; })
      .finally(() => { btn.disabled = false; });
  } else {
    const text = Object.entries(data).map(([k, v]) => k + ': ' + (v || '-')).join('\n');
    location.href = 'mailto:' + CONFIG.email + '?subject=' + encodeURIComponent(title) + '&body=' + encodeURIComponent(title + '\n\n' + text);
    st.className = 'ok';
    st.textContent = 'Aplikasi email Anda dibuka. Periksa isinya, lalu tekan Kirim di sana.';
  }
});
