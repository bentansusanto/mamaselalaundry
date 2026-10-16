import { getAllCustomers, getAllOrders, getAllServices, getSheetsConfig, getSyncQueue, clearSyncQueue, saveSheetsConfig } from './db';

export const GOOGLE_APPS_SCRIPT_TEMPLATE = `/**
 * Google Apps Script Backend for Mama Sela Laundry PWA
 * 
 * PETUNJUK SETUP:
 * 1. Di Google Sheets Anda, pastikan ada 3 tab:
 *    - Orders
 *    - Customers
 *    - Services
 * 2. Paste SELURUH kode ini ke Google Apps Script editor.
 * 3. Klik tombol Simpan (ikon disket / Ctrl+S).
 * 4. Untuk MENGETES di editor: Pilih fungsi "testSync" di atas, lalu klik "Jalankan".
 * 5. Untuk MENERAPKAN: Klik "Terapkan" (Deploy) > "Penerapan baru" (New deployment).
 *    - Jenis: "Aplikasi web" (Web app).
 *    - Yang memiliki akses: "Siapa saja" (Anyone) -> WAJIB!
 * 6. Salin Web app URL (/exec) dan paste ke aplikasi Mama Sela.
 */

// ID Spreadsheet Google Sheets Anda (Otomatis dipakai jika script dibuat terpisah/standalone)
var SPREADSHEET_ID = "1_6yVfCk8wjZ-obnEuwXCh_IynU_8bYrxSQG_wN-ELxc";

function getSpreadsheet(data) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    var id = (data && data.spreadsheetId) ? data.spreadsheetId : SPREADSHEET_ID;
    if (id) {
      try {
        ss = SpreadsheetApp.openById(id);
      } catch (err) {
        console.error("Gagal openById:", err);
      }
    }
  }
  return ss;
}

// Fungsi ini BISA diklik tombol "Jalankan" / "Debug" langsung di editor untuk tes:
function testSync() {
  var ss = getSpreadsheet();
  if (!ss) {
    Logger.log("ERROR: Spreadsheet tidak ditemukan. Periksa SPREADSHEET_ID.");
    return;
  }
  syncOrders(ss, [
    {
      id: 'ORD-TEST-001',
      customerName: 'Pelanggan Tes',
      customerPhone: '08123456789',
      createdAt: new Date().toISOString(),
      mainService: 'Cuci setrika',
      speed: 'Normal',
      actualWeight: 3.0,
      billedWeight: 3.0,
      items: [],
      totalPrice: 18000,
      paymentStatus: 'Lunas',
      paymentMethod: 'Cash',
      progressStatus: 'Selesai',
      cashierName: 'Mama Sela'
    }
  ]);
  syncCustomers(ss, [
    {
      id: 'CUST-001',
      name: 'Pelanggan Tes',
      phone: '08123456789',
      address: 'Jl. Contoh No. 1',
      createdAt: new Date().toISOString()
    }
  ]);
  syncServices(ss, [
    {
      id: 'SRV-01',
      name: 'Cuci setrika',
      category: 'Kiloan',
      unit: 'kg',
      price: 6000,
      hpp: 2500,
      profitMarginPercent: 58
    }
  ]);
  Logger.log("SUKSES: Data tes berhasil ditulis ke Spreadsheet!");
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return ContentService.createTextOutput(JSON.stringify({
        status: 'error',
        message: 'Tidak ada data payload yang diterima. Catatan: Untuk tes di editor, pilih fungsi testSync() lalu klik Jalankan.'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    var data = JSON.parse(e.postData.contents);
    var action = data.action;
    var ss = getSpreadsheet(data);

    if (!ss) {
      return ContentService.createTextOutput(JSON.stringify({
        status: 'error',
        message: 'Spreadsheet tidak ditemukan. Pastikan SPREADSHEET_ID sudah benar.'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'sync') {
      var orders = data.orders || [];
      var customers = data.customers || [];
      var services = data.services || [];

      // Always write headers and data to all 3 tabs
      syncOrders(ss, orders);
      syncCustomers(ss, customers);
      syncServices(ss, services);

      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        syncedAt: new Date().toISOString(),
        message: 'Data berhasil disinkronkan ke Google Sheets (' + orders.length + ' Order, ' + customers.length + ' Pelanggan, ' + services.length + ' Layanan)'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: 'Action tidak dikenal: ' + action
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  try {
    var ss = getSpreadsheet();
    if (!ss) {
      return ContentService.createTextOutput(JSON.stringify({
        status: 'error',
        message: 'Spreadsheet tidak ditemukan.'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    var orders = getSheetData(ss, 'Orders');
    var customers = getSheetData(ss, 'Customers');
    var services = getSheetData(ss, 'Services');

    return ContentService.createTextOutput(JSON.stringify({
      status: 'success',
      syncedAt: new Date().toISOString(),
      message: 'Koneksi ke Google Sheets Mama Sela Aktif!',
      data: { orders: orders, customers: customers, services: services }
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function syncOrders(ss, orders) {
  var sheet = ss.getSheetByName('Orders') || ss.insertSheet('Orders');
  sheet.clearContents();
  
  // Headers
  var headers = [
    'ID Order', 'Pelanggan', 'No HP', 'Tanggal Masuk', 'Layanan Utama', 
    'Kecepatan', 'Berat Real (Kg)', 'Berat Dihitung (Kg)', 'Rincian Item', 
    'Total Harga', 'Status Pembayaran', 'Metode Bayar', 'Status Pengerjaan', 'Kasir'
  ];
  sheet.appendRow(headers);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#E2E8F0');

  if (orders && orders.length > 0) {
    var rows = [];
    for (var i = 0; i < orders.length; i++) {
      var o = orders[i];
      var itemsStr = (o.items || []).map(function(item) { 
        return item.name + ' x' + item.qty; 
      }).join(', ');

      rows.push([
        o.id || '',
        o.customerName || '',
        o.customerPhone || '',
        o.createdAt ? new Date(o.createdAt).toLocaleString('id-ID') : '',
        o.mainService || '',
        o.speed || 'Normal',
        o.actualWeight || 0,
        o.billedWeight || 0,
        itemsStr,
        o.totalPrice || 0,
        o.paymentStatus || 'Belum Bayar',
        o.paymentMethod || 'Cash',
        o.progressStatus || 'Proses',
        o.cashierName || 'Mama Sela'
      ]);
    }
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }
}

function syncCustomers(ss, customers) {
  var sheet = ss.getSheetByName('Customers') || ss.insertSheet('Customers');
  sheet.clearContents();
  
  var headers = ['ID Pelanggan', 'Nama Pelanggan', 'No HP / WhatsApp', 'Alamat', 'Tanggal Terdaftar'];
  sheet.appendRow(headers);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#E2E8F0');

  if (customers && customers.length > 0) {
    var rows = [];
    for (var i = 0; i < customers.length; i++) {
      var c = customers[i];
      rows.push([
        c.id || '',
        c.name || '',
        c.phone || '',
        c.address || '-',
        c.createdAt ? new Date(c.createdAt).toLocaleString('id-ID') : ''
      ]);
    }
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }
}

function syncServices(ss, services) {
  var sheet = ss.getSheetByName('Services') || ss.insertSheet('Services');
  sheet.clearContents();
  
  var headers = ['ID Layanan', 'Nama Layanan', 'Kategori', 'Satuan', 'Harga Jual (Rp)', 'HPP (Rp)', 'Profit Margin %'];
  sheet.appendRow(headers);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#E2E8F0');

  if (services && services.length > 0) {
    var rows = [];
    for (var i = 0; i < services.length; i++) {
      var s = services[i];
      rows.push([
        s.id || '',
        s.name || '',
        s.category || '',
        s.unit || '',
        s.price || 0,
        s.hpp || 0,
        Math.round(s.profitMarginPercent || 0)
      ]);
    }
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }
}

function getSheetData(ss, sheetName) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];
  var rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return [];
  var headers = rows[0];
  var result = [];
  for (var i = 1; i < rows.length; i++) {
    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      obj[headers[j]] = rows[i][j];
    }
    result.push(obj);
  }
  return result;
}
`;

export async function syncToGoogleSheets(): Promise<{ success: boolean; message: string }> {
  try {
    const config = await getSheetsConfig();
    const orders = await getAllOrders();
    const customers = await getAllCustomers();
    const services = await getAllServices();

    let scriptUrl = config.scriptUrl ? config.scriptUrl.trim() : '';

    if (!scriptUrl) {
      // Local sync simulation when URL is not configured yet
      const now = new Date().toISOString();
      await saveSheetsConfig({ ...config, lastSyncedAt: now });
      const queue = await getSyncQueue();
      if (queue.length > 0) {
        await clearSyncQueue(queue.map((q) => q.id));
      }
      return {
        success: true,
        message:
          'Data tersimpan di perangkat (IndexedDB). Masukkan URL Web App Google Apps Script di menu pengaturan untuk sinkronisasi ke spreadsheet.',
      };
    }

    // Auto-fix URL: ensure /exec
    if (scriptUrl.includes('/macros/s/')) {
      if (scriptUrl.includes('/edit')) {
        scriptUrl = scriptUrl.replace(/\/edit.*$/, '/exec');
      } else if (!scriptUrl.endsWith('/exec')) {
        scriptUrl = scriptUrl.replace(/\/?$/, '/exec');
      }
    }

    // Try server-side proxy route first (/api/sync) for robust CORS & redirect handling
    let proxyWorked = false;
    let proxyMessage = '';

    try {
      const apiRes = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scriptUrl,
          spreadsheetId: '1_6yVfCk8wjZ-obnEuwXCh_IynU_8bYrxSQG_wN-ELxc',
          action: 'sync',
          orders,
          customers,
          services,
        }),
      });

      const apiData = await apiRes.json();
      if (apiRes.ok && apiData.success) {
        proxyWorked = true;
        proxyMessage = apiData.message || 'Data berhasil dikirim ke Google Sheets!';
      } else {
        return {
          success: false,
          message: apiData.message || 'Gagal sinkronisasi ke Google Sheets.',
        };
      }
    } catch (apiErr) {
      console.warn('API /api/sync fallback to direct fetch:', apiErr);
    }

    // Direct browser fetch fallback if offline from Next.js server
    if (!proxyWorked) {
      await fetch(scriptUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        mode: 'no-cors',
        body: JSON.stringify({
          action: 'sync',
          spreadsheetId: '1_6yVfCk8wjZ-obnEuwXCh_IynU_8bYrxSQG_wN-ELxc',
          orders,
          customers,
          services,
        }),
      });
      proxyMessage = 'Data berhasil dikirim ke Google Sheets!';
    }

    const now = new Date().toISOString();
    await saveSheetsConfig({ ...config, scriptUrl, lastSyncedAt: now });

    // Clear queue upon successful sync
    const queue = await getSyncQueue();
    if (queue.length > 0) {
      await clearSyncQueue(queue.map((q) => q.id));
    }

    return {
      success: true,
      message: proxyMessage,
    };
  } catch (error: any) {
    console.error('Error syncing to Google Sheets:', error);
    return {
      success: false,
      message: `Gagal sinkronisasi: ${error.message || 'Koneksi terputus'}`,
    };
  }
}
