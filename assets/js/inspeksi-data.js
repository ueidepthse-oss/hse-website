// Daftar jenis inspeksi dan butir pemeriksaannya.
// - Area Kerja (FRM-005) mengikuti isi formulir Word asli.
// - Inspeksi lain masih CONTOH UMUM sampai file Word-nya dikirim.
// Untuk menambah inspeksi baru, salin satu blok { ... } dan ubah isinya.

// ===== DATA APAR =====
// Nomor APAR dibuat otomatis: APAR-001 sampai APAR-050. Ubah JUMLAH_APAR bila jumlahnya berubah.
const JUMLAH_APAR = 50;
const DAFTAR_APAR = Array.from({ length: JUMLAH_APAR }, (_, i) => 'APAR-' + String(i + 1).padStart(3, '0'));

// Kapasitas yang tersedia untuk tiap jenis APAR
const APAR_KAPASITAS = { Powder: [6, 9], CO2: [9] };

// Data tiap APAR (opsional). Bila diisi, jenis, kapasitas, lokasi, dan tanggal expired
// terisi otomatis saat nomor APAR dipilih. Contoh baris:
//   'APAR-001': { jenis: 'Powder', kg: 6, lokasi: 'Transfer Tower lt. 1', exp: '2027-05-12' },
const APAR_DATA = {
};

// ===== BUTIR UMUM ALAT =====
const KABEL = 'Kabel dan steker tidak terkelupas';
const DASAR = [
  'Bodi alat tidak retak atau rusak',
  'Saklar berfungsi dan tidak macet',
  'Tidak ada bunyi atau getaran abnormal',
  'Label inspeksi (tag) terpasang'
];
const LAYAK = ['Layak digunakan', 'Tidak layak digunakan'];

const INSPEKSI = [
  // ---------- FRM-005: sesuai formulir Word asli ----------
  { key: 'area', ikon: '🚧', kode: 'UEI-HSE-FRM-005', pendek: 'Area Kerja', nama: 'Formulir Inspeksi Area Kerja',
    meta: { noDok: 'UEI/HSE/FRM/005', berlaku: '01 Agustus 2026', revisi: '00', departemen: 'HSE' },
    judul: 'FORMULIR INSPEKSI AREA KERJA', judulEn: 'Workplace Area Inspection Form',
    jawab: ['Ya', 'Tidak', 'N/A'], jawabPdf: ['YA', 'TDK', 'N/A'],
    info: { lokasi: 'Area/Lokasi Inspeksi', inspektor: 'Nama Inspektor', jenis: ['Rutin', 'Khusus'], waktu: true, shift: ['Pagi', 'Siang', 'Malam'] },
    bagian: [
      { judul: 'KEBERSIHAN DAN TATA LETAK AREA (5R)', item: [
        'Lantai bersih, kering, dan bebas dari tumpahan oli',
        'Jalur akses dan handrail bebas dari halangan / barang menumpuk',
        'Sampah dibuang pada tempatnya',
        'Area kerja tertata rapi (5R diterapkan)',
        'Barang tidak terpakai dikembalikan ke toolbox'
      ] },
      { judul: 'PERALATAN PEMADAM DAN KESIAPAN KEADAAN DARURAT', item: [
        'APAR tersedia, mudah dijangkau, dan tidak kadaluarsa',
        'Rambu jalur evakuasi dan titik kumpul terpasang',
        'Jalur evakuasi bebas hambatan',
        'Kotak P3K tersedia',
        'Safety device berfungsi dengan baik'
      ] },
      { judul: 'INSTALASI LISTRIK DAN MESIN/PERALATAN', item: [
        'Kabel listrik tidak terkelupas/terurai di lantai',
        'Panel listrik tertutup rapat dan tidak terhalang',
        'Mesin/peralatan dalam kondisi baik',
        'Pelindung mesin (safety guard) terpasang dengan benar',
        'Tombol darurat mudah diakses dan berfungsi dengan baik'
      ] },
      { judul: 'APD DAN RAMBU K3', item: [
        'Alat Pelindung Diri (APD) digunakan lengkap',
        'Rambu K3 terpasang di area yang sesuai'
      ] },
      { judul: 'PENYIMPANAN DAN PENANGANAN MATERIAL', item: [
        'Barang/material disusun rapi dan tidak menghalangi akses',
        'Bahan kimia/B3 disimpan sesuai label dan lokasi yang benar',
        'Tempat penyimpanan dalam kondisi aman',
        'Tidak ada penumpukan barang yang tidak terpakai'
      ] }
    ],
    temuan: true,
    ttd: [
      { peran: 'DIPERIKSA OLEH (INSPEKTOR)', jabatan: 'HSE Officer' },
      { peran: 'DIKETAHUI OLEH', jabatan: 'PJO' },
      { peran: 'DISETUJUI OLEH', jabatan: 'HSE PT CBE' }
    ] },

  // ---------- FRM-008: APAR (butir masih contoh, menunggu file Word) ----------
  { key: 'apar', ikon: '🧯', kode: 'UEI-HSE-FRM-008', pendek: 'APAR', nama: 'Formulir Inspeksi APAR',
    meta: { noDok: 'UEI/HSE/FRM/008', berlaku: '01 Oktober 2025', departemen: 'HSE' },
    judul: 'FORMULIR INSPEKSI APAR',
    jawab: ['Ya', 'Tidak', 'N/A'], jawabPdf: ['YA', 'TDK', 'N/A'],
    info: { lokasi: null },
    apar: true,
    bagian: [
      { judul: '', item: [
        { t: 'Segel dan pin pengaman utuh' },
        { t: 'Indikator tekanan pada zona hijau', jenis: 'Powder' },
        { t: 'Berat tabung sesuai (ditimbang)', jenis: 'CO2' },
        { t: 'Selang dan nozzle tidak rusak atau tersumbat', jenis: 'Powder' },
        { t: 'Horn atau corong tidak retak dan tidak tersumbat', jenis: 'CO2' },
        { t: 'Tabung tidak berkarat, penyok, atau bocor' },
        { t: 'Label dan petunjuk pemakaian terbaca' },
        { t: 'Posisi mudah dijangkau dan tidak terhalang' },
        { t: 'Tanda lokasi APAR terpasang' },
        { t: 'Masa berlaku isi ulang belum lewat', auto: 'exp' }
      ] }
    ],
    temuan: true },

  // ---------- Inspeksi alat dan kendaraan (masih contoh, menunggu file Word) ----------
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
