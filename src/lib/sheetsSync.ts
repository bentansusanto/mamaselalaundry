import { getAllCustomers, getAllOrders, getAllServices, getSheetsConfig, getSyncQueue, clearSyncQueue, saveSheetsConfig } from './db';

export const GOOGLE_APPS_SCRIPT_TEMPLATE = `/**
 * Google Apps Script Backend for Mama Sela Laundry PWA
 * 
 * PETUNJUK SETUP 2 MENIT:
 * 1. Di Google Sheets Anda, pastikan ada 3 tab di bawah:
 *    - Orders
 *    - Customers
 *    - Services
 * 2. Buka menu Extensions (Ekstensi) > Apps Script.
 * 3. Hapus semua tulisan di editor, lalu PASTE SELURUH KODE INI.
 * 4. Klik tombol simpan (ikon disket / Cmd+S / Ctrl+S).
 * 5. Klik tombol biru "Deploy" (Terapkan) di pojok kanan atas > "New deployment" (Penerapan baru).
 * 6. Di popup:
 *    - Pilih type: "Web app" (ikon globe).
 *    - Description: "Mama Sela Sync"
 *    - Execute as: "Me" (email Anda).
 *    - Who has access: "Anyone" (Siapa saja, PENTING!).
 * 7. Klik "Deploy", lalu jika diminta izin:
 *    - Klik "Authorize access" > pilih akun Google Anda.
 *    - Klik "Advanced" (Lanjutan) di bawah kiri > Klik "Go to Untitled project (unsafe)".
 *    - Klik "Allow" (Izinkan).
 * 8. Copy "Web app URL" (yang berakhiran /exec) dan paste ke aplikasi Mama Sela!
 */

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return ContentService.createTextOutput(JSON.stringify({
        status: 'error',
        message: 'Tidak ada data payload yang diterima.'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    var data = JSON.parse(e.postData.contents);
    var action = data.action;
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    if (!ss) {
      return ContentService.createTextOutput(JSON.stringify({
        status: 'error',
        message: 'Spreadsheet aktif tidak ditemukan. Pastikan script ini dibuat dari menu Ekstensi > Apps Script di dalam file Google Spreadsheet Anda.'
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
    var ss = SpreadsheetApp.getActiveSpreadsheet();
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
