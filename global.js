// Menu mobile
const burger = document.querySelector('.burger');
const nav = document.querySelector('.nav');
if (burger && nav) {
  burger.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    burger.setAttribute('aria-expanded', open);
  });
}

// Safe Days otomatis: hitung hari sejak tanggal kecelakaan terakhir (YYYY-MM-DD)
document.querySelectorAll('[data-safe-since]').forEach((el) => {
  const since = new Date(el.dataset.safeSince + 'T00:00:00');
  const days = Math.floor((Date.now() - since.getTime()) / 86400000);
  if (days >= 0) el.textContent = days;
});
