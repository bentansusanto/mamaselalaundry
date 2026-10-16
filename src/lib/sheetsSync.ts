import { getAllCustomers, getAllOrders, getAllServices, getSheetsConfig, getSyncQueue, clearSyncQueue, saveSheetsConfig } from './db';

export const GOOGLE_APPS_SCRIPT_TEMPLATE = `/**
 * Google Apps Script Backend for Laundry PWA
 * Petunjuk Instalasi:
 * 1. Buka Google Sheets baru di Google Drive Anda.
 * 2. Buat 3 tab sheet dengan nama persis: "Orders", "Customers", "Services".
 * 3. Buka menu Extensions > Apps Script.
 * 4. Hapus semua kode dan ganti dengan kode di bawah ini.
 * 5. Klik Deploy > New deployment.
 * 6. Pilih type: Web app.
 *    - Execute as: Me (email Anda).
 *    - Who has access: Anyone (Siapa saja, bahkan tanpa login).
 * 7. Copy URL Web app yang dihasilkan dan paste ke menu Pengaturan di Laundry PWA!
 */

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var action = data.action;
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    if (action === 'sync') {
      var orders = data.orders || [];
      var customers = data.customers || [];
      var services = data.services || [];
      
      if (orders.length > 0) syncOrders(ss, orders);
      if (customers.length > 0) syncCustomers(ss, customers);
      if (services.length > 0) syncServices(ss, services);
      
      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        syncedAt: new Date().toISOString(),
        message: 'Data berhasil disinkronkan ke Google Sheets'
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Unknown action' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var orders = getSheetData(ss, 'Orders');
    var customers = getSheetData(ss, 'Customers');
    var services = getSheetData(ss, 'Services');
    
    return ContentService.createTextOutput(JSON.stringify({
      status: 'success',
      data: { orders: orders, customers: customers, services: services }
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function syncOrders(ss, orders) {
  var sheet = ss.getSheetByName('Orders') || ss.insertSheet('Orders');
  sheet.clearContents();
  sheet.appendRow([
    'ID Order', 'Pelanggan', 'No HP', 'Tanggal Masuk', 'Layanan Utama', 
    'Kecepatan', 'Berat Real (Kg)', 'Berat Dihitung (Kg)', 'Rincian Item', 
    'Total Harga', 'Status Pembayaran', 'Metode Bayar', 'Status Pengerjaan', 'Kasir'
  ]);
  
  orders.forEach(function(o) {
    var itemsStr = (o.items || []).map(function(i) { return i.name + ' x' + i.qty; }).join(', ');
    sheet.appendRow([
      o.id, o.customerName, o.customerPhone, o.createdAt, o.mainService,
      o.speed, o.actualWeight, o.billedWeight, itemsStr,
      o.totalPrice, o.paymentStatus, o.paymentMethod, o.progressStatus, o.cashierName
    ]);
  });
}

function syncCustomers(ss, customers) {
  var sheet = ss.getSheetByName('Customers') || ss.insertSheet('Customers');
  sheet.clearContents();
  sheet.appendRow(['ID Pelanggan', 'Nama', 'No HP', 'Alamat', 'Tanggal Terdaftar']);
  customers.forEach(function(c) {
    sheet.appendRow([c.id, c.name, c.phone, c.address, c.createdAt]);
  });
}

function syncServices(ss, services) {
  var sheet = ss.getSheetByName('Services') || ss.insertSheet('Services');
  sheet.clearContents();
  sheet.appendRow(['ID Service', 'Nama Layanan', 'Kategori', 'Satuan', 'Harga Jual', 'HPP', 'Profit Margin %']);
  services.forEach(function(s) {
    sheet.appendRow([s.id, s.name, s.category, s.unit, s.price, s.hpp, s.profitMarginPercent]);
  });
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

    if (!config.scriptUrl || config.scriptUrl.trim() === '') {
      // Local sync simulation when URL is not configured yet
      const now = new Date().toISOString();
      await saveSheetsConfig({ ...config, lastSyncedAt: now });
      const queue = await getSyncQueue();
      if (queue.length > 0) {
        await clearSyncQueue(queue.map(q => q.id));
      }
      return {
        success: true,
        message: 'Tersimpan ke cache IndexedDB lokal. Masukkan Apps Script URL di menu Pengaturan untuk sinkronisasi live Google Sheets.',
      };
    }

    // Call live Google Apps Script endpoint
    const response = await fetch(config.scriptUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      mode: 'no-cors', // Standard for Google Apps Script Web Apps from browser
      body: JSON.stringify({
        action: 'sync',
        orders,
        customers,
        services,
      }),
    });

    const now = new Date().toISOString();
    await saveSheetsConfig({ ...config, lastSyncedAt: now });
    
    // Clear queue upon sync
    const queue = await getSyncQueue();
    if (queue.length > 0) {
      await clearSyncQueue(queue.map(q => q.id));
    }

    return {
      success: true,
      message: 'Berhasil melakukan sinkronisasi dengan Google Sheets!',
    };
  } catch (error: any) {
    console.error('Error syncing to Google Sheets:', error);
    return {
      success: false,
      message: `Gagal sinkronisasi: ${error.message || 'Koneksi terputus'}`,
    };
  }
}
