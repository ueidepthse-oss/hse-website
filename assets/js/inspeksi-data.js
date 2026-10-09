// Daftar jenis inspeksi dan butir pemeriksaannya.
// CATATAN: butir di bawah adalah CONTOH UMUM. Ganti dengan isi formulir resmi (file .docx) perusahaan.
// Untuk menambah inspeksi baru, cukup salin satu blok { ... } dan ubah isinya.

const KABEL = 'Kabel dan steker tidak terkelupas';
const DASAR = [
  'Bodi alat tidak retak atau rusak',
  'Saklar berfungsi dan tidak macet',
  'Tidak ada bunyi atau getaran abnormal',
  'Label inspeksi (tag) terpasang'
];
const LAYAK = ['Layak digunakan', 'Tidak layak digunakan'];

const INSPEKSI = [
  { key: 'area', ikon: '🚧', kode: 'UEI-HSE-FRM-005', pendek: 'Area Kerja', nama: 'Formulir Inspeksi Area Kerja',
    id: null, kesimpulan: null,
    item: [
      'Kebersihan dan kerapian area (housekeeping)',
      'Jalur jalan dan akses bebas hambatan',
      'Rambu keselamatan terpasang dan terbaca',
      'Penerangan memadai',
      'Penyimpanan material tertata dan aman',
      'APAR tersedia dan mudah dijangkau',
      'Kotak P3K tersedia dan lengkap',
      'Pekerja memakai APD sesuai area',
      'Tempat sampah dan pemilahan limbah sesuai'
    ] },
  { key: 'apar', ikon: '🧯', kode: 'UEI-HSE-FRM-008', pendek: 'APAR', nama: 'Formulir Inspeksi APAR',
    id: 'No. / kode APAR', kesimpulan: LAYAK,
    item: [
      'Segel dan pin pengaman utuh',
      'Indikator tekanan pada zona hijau',
      'Selang dan nozzle tidak rusak atau tersumbat',
      'Tabung tidak berkarat, penyok, atau bocor',
      'Label dan petunjuk pemakaian terbaca',
      'Masa berlaku isi ulang belum lewat',
      'Posisi mudah dijangkau dan tidak terhalang',
      'Tanda lokasi APAR terpasang'
    ] },
  { key: 'gerinda', ikon: '⚙️', kode: 'UEI-HSE-FRM-009', pendek: 'Gerinda Tangan', nama: 'Formulir Inspeksi Gerinda Tangan',
    id: 'No. / kode alat', kesimpulan: LAYAK,
    item: ['Pelindung (guard) terpasang dengan benar', 'Cakram sesuai ukuran dan tidak retak', 'Side handle terpasang kencang', KABEL, ...DASAR] },
  { key: 'borlistrik', ikon: '🔌', kode: 'UEI-HSE-FRM-010', pendek: 'Bor Listrik', nama: 'Formulir Inspeksi Bor Listrik',
    id: 'No. / kode alat', kesimpulan: LAYAK,
    item: ['Chuck dan mata bor terpasang kencang', 'Handle samping terpasang', 'Ventilasi bersih dan tidak tersumbat', KABEL, ...DASAR] },
  { key: 'borbaterai', ikon: '🔋', kode: 'UEI-HSE-FRM-011', pendek: 'Bor Baterai', nama: 'Formulir Inspeksi Bor Baterai',
    id: 'No. / kode alat', kesimpulan: LAYAK,
    item: ['Baterai tidak menggembung atau bocor', 'Charger dan kabelnya dalam kondisi baik', 'Chuck dan mata bor terpasang kencang', 'Tombol arah putar berfungsi', ...DASAR] },
  { key: 'jigsaw', ikon: '🪚', kode: 'UEI-HSE-FRM-012', pendek: 'Jig Saw', nama: 'Formulir Inspeksi Jig Saw',
    id: 'No. / kode alat', kesimpulan: LAYAK,
    item: ['Mata gergaji (blade) kencang dan tidak aus', 'Pelindung (guard) terpasang', 'Base plate rata dan tidak longgar', KABEL, ...DASAR] },
  { key: 'circular', ikon: '🔧', kode: 'UEI-HSE-FRM-013', pendek: 'Circular Saw', nama: 'Formulir Inspeksi Circular Saw',
    id: 'No. / kode alat', kesimpulan: LAYAK,
    item: ['Mata gergaji tidak retak, tumpul, atau aus', 'Pelindung bawah (lower guard) bergerak bebas', 'Pengunci kedalaman dan sudut potong berfungsi', KABEL, ...DASAR] },
  { key: 'heatgun', ikon: '🔥', kode: 'UEI-HSE-FRM-014', pendek: 'Heat Gun', nama: 'Formulir Inspeksi Heat Gun',
    id: 'No. / kode alat', kesimpulan: LAYAK,
    item: ['Nozzle terpasang dan tidak rusak', 'Saluran udara masuk tidak tertutup', 'Pengatur suhu berfungsi', 'Tidak ada bau gosong atau panas berlebih pada bodi', KABEL, ...DASAR] },
  { key: 'cutting', ikon: '💿', kode: 'UEI-HSE-FRM-015', pendek: 'Cutting Wheel', nama: 'Formulir Inspeksi Cutting Wheel',
    id: 'No. / kode cakram', kesimpulan: LAYAK,
    item: [
      'Cakram tidak retak, cuil, atau lembap',
      'Ukuran dan RPM maksimum sesuai mesin',
      'Masa berlaku cakram belum lewat',
      'Label spesifikasi terbaca',
      'Penyimpanan kering, rata, dan tidak tertekan',
      'Flens dan mur pengunci sesuai'
    ] },
  { key: 'bormagnet', ikon: '🧲', kode: 'UEI-HSE-FRM-016', pendek: 'Bor Magnet', nama: 'Formulir Inspeksi Bor Magnet',
    id: 'No. / kode alat', kesimpulan: LAYAK,
    item: ['Magnet menempel kuat pada permukaan', 'Mata bor / annular cutter tidak aus atau retak', 'Tali pengaman (safety strap) terpasang', 'Sistem pendingin / pelumas tersedia', 'Pelindung dan handle terpasang', KABEL, ...DASAR] },
  { key: 'p2h', ikon: '🚙', kode: 'UEI-HSE-FRM-019', pendek: 'P2H Light Vehicle', nama: 'Formulir P2H Light Vehicle',
    id: 'No. polisi / No. lambung', extra: ['KM / HM awal'], kesimpulan: ['Layak operasi', 'Tidak layak operasi'],
    item: [
      'Ban: kondisi dan tekanan',
      'Lampu depan dan belakang',
      'Lampu sein dan lampu rem',
      'Rem kaki dan rem tangan',
      'Klakson',
      'Wiper dan kaca depan',
      'Spion',
      'Sabuk pengaman',
      'Level oli mesin',
      'Level air radiator',
      'Level minyak rem',
      'Bahan bakar',
      'APAR dan P3K di kendaraan',
      'Segitiga pengaman dan dongkrak',
      'Kebersihan kabin dan bodi'
    ] }
];
