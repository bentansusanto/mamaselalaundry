# Mama Sela - Laundry POS & Management (Mobile-First PWA)

Aplikasi POS & Management Laundry berbasis Progressive Web App (PWA) yang dioptimalkan khusus untuk perangkat mobile (smartphone viewport), dilengkapi offline storage dengan **IndexedDB** dan kemampuan sinkronisasi ke **Google Sheets** via Google Apps Script Web App.

---

## 🚀 Fitur Utama & Kepatuhan Spesifikasi

1. **Mobile-Only Responsive Layout (`max-w-md mx-auto`)**
   - Tampilan dibatasi pada layar smartphone dengan navigasi *Bottom Bar* (Beranda, Kasir POS, Pesanan, Pelanggan, Menu).
   - Touch-friendly UI dengan palet warna resmi: Biru (`#2563EB`), Kuning (`#EAB308`), Hijau (`#22C55E`), Merah (`#EF4444`), Hitam (`#0F172A`), dan Slate Background.

2. **Aturan Bisnis Laundry (Strict Business Logic)**
   - **Layanan Kiloan:**
     - Cuci setrika = Rp 6.000 / kg
     - Setrika = Rp 5.000 / kg
     - Cuci lipat = Rp 5.000 / kg
     - **Ketentuan Minimum Berat:** Minimum 3 kg (berat di bawah 3 kg otomatis dihitung tarif setara 3 kg).
   - **Layanan Satuan:**
     - Bedcover (S/M/L): Rp 10.000 / Rp 15.000 / Rp 25.000
     - Selimut (S/M/L): Rp 10.000 / Rp 15.000 / Rp 25.000
   - **Kecepatan Pengerjaan:**
     - Normal: +Rp 0
     - Express: +Rp 8.000
     - Kilat: +Rp 13.000
   - **Alur Kerja (Workflow):**
     Customer -> Timbang & Pilih Layanan -> Pilih Kecepatan -> Pembayaran (Bayar Sekarang / Bayar Nanti) -> Kasir Proses -> Packing -> Selesai & Diterima.

3. **Point of Sales (Kasir POS)**
   - Kasir cepat 3 langkah.
   - Pilihan bayar Lunas / Belum Bayar (Bayar Nanti saat ambil).
   - Metode Tunai (Cash dengan kalkulator kembalian otomatis) dan QRIS.
   - Struk digital dapat langsung dicetak (Print) atau dikirim ke WhatsApp pelanggan dengan format nota lengkap.

4. **Dashboard & Grafik Penjualan**
   - KPI Ringkasan Pendapatan (Revenue) & Pelanggan Aktif.
   - Grafik Penjualan interaktif (Recharts) dengan filter: **Month (Bulan)**, **Quarter (Kuartal)**, dan **Years (Tahun)**.
   - Layanan paling banyak di-order (*Top Services*).
   - Aktivitas transaksi realtime terbaru.

5. **Customer Management**
   - Tambah, edit, cari nama/telepon pelanggan, dan lihat riwayat pesanan per pelanggan.

6. **Service Management**
   - Kelola layanan, input Harga Jual dan HPP (Harga Pokok Penjualan).
   - Kalkulasi otomatis persentase profit margin (`((Harga Jual - HPP) / Harga Jual) * 100`).

7. **Laporan Penjualan (Reports)**
   - Filter Month, Quarter, Years.
   - Estimasi Keuntungan Bersih (Revenue - Est. HPP).
   - Breakdown Cash vs QRIS & Pilihan Kecepatan.
   - Ekspor data laporan transaksi ke format **CSV**.

8. **User Management**
   - Manajemen akun Admin & Kasir dengan toggle status aktif dan switch kasir aktif langsung dari navbar.

9. **Offline Storage (IndexedDB) & Google Sheets Sync**
   - Penyimpanan lokal penuh di client-side menggunakan IndexedDB melalui library `idb`.
   - Indikator status Online / Offline realtime.
   - Antrian sinkronisasi (*Sync Queue*).
   - Template kode Google Apps Script siap pakai 1-klik di menu *Pengaturan Sync* untuk integrasi Google Sheets.

---

## 🛠️ Menjalankan Aplikasi

Aplikasi dibangun menggunakan **Next.js (App Router)** dan dikelola dengan **Bun**.

### 1. Jalankan Mode Development
```bash
bun run dev
```
Buka browser pada `http://localhost:3000`.

### 2. Build untuk Produksi
```bash
bun run build
bun run start
```
Aplikasi siap dideploy ke **Vercel** secara langsung.

---

## 📄 Cara Menghubungkan Google Sheets

1. Buka Google Sheets baru di Google Drive Anda.
2. Buat 3 lembar tab: `Orders`, `Customers`, `Services`.
3. Buka menu **Extensions > Apps Script**.
4. Di aplikasi Laundry PWA, buka menu **Menu > Google Sheets & Offline Sync**, lalu klik **Salin Kode**.
5. Tempelkan kode ke Google Apps Script dan klik **Deploy > New deployment > Web app**.
6. Set *Who has access* ke **Anyone**.
7. Salin URL Web app yang dihasilkan dan simpan di kolom URL pada aplikasi Laundry PWA.
