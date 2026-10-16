import {
  getAllCustomers,
  getAllOrders,
  getAllServices,
  getSheetsConfig,
  getSyncQueue,
  clearSyncQueue,
  saveSheetsConfig,
  getDB,
} from './db';
import { parseSafeDate } from './utils';

export const GOOGLE_APPS_SCRIPT_TEMPLATE = `/**
 * Backend Google Apps Script - Mama Sela Laundry
 * Mendukung Sinkronisasi Otomatis 2 Arah (HP & Laptop)
 */

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

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return ContentService.createTextOutput(JSON.stringify({
        status: 'error',
        message: 'Tidak ada payload data.'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    var data = JSON.parse(e.postData.contents);
    var action = data.action;
    var ss = getSpreadsheet(data);

    if (!ss) {
      return ContentService.createTextOutput(JSON.stringify({
        status: 'error',
        message: 'Spreadsheet tidak ditemukan. Periksa SPREADSHEET_ID.'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'sync') {
      var incomingOrders = data.orders || [];
      var incomingCustomers = data.customers || [];
      var incomingServices = data.services || [];
      var deletedQueue = data.deletedQueue || [];

      var deletedCustomerIds = [];
      var deletedOrderIds = [];
      for (var d = 0; d < deletedQueue.length; d++) {
        var item = deletedQueue[d];
        if (item.entity === 'customers' && item.data && item.data.id) {
          deletedCustomerIds.push(item.data.id);
        } else if (item.entity === 'orders' && item.data && item.data.id) {
          deletedOrderIds.push(item.data.id);
        }
      }

      var allOrders = mergeOrders(ss, incomingOrders, deletedOrderIds);
      var allCustomers = mergeCustomers(ss, incomingCustomers, deletedCustomerIds);
      var allServices = mergeServices(ss, incomingServices);

      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        syncedAt: new Date().toISOString(),
        message: 'Data berhasil disinkronkan (' + allOrders.length + ' Order, ' + allCustomers.length + ' Pelanggan, ' + allServices.length + ' Layanan)',
        data: {
          orders: allOrders,
          customers: allCustomers,
          services: allServices
        }
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

    var orders = getSheetOrders(ss);
    var customers = getSheetCustomers(ss);
    var services = getSheetServices(ss);

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

function mergeCustomers(ss, incoming, deletedIds) {
  var sheet = ss.getSheetByName('Customers') || ss.insertSheet('Customers');
  var existing = getSheetCustomers(ss);
  var map = {};

  for (var i = 0; i < existing.length; i++) {
    var c = existing[i];
    if (c.id) map[c.id] = c;
  }

  for (var j = 0; j < (incoming || []).length; j++) {
    var inc = incoming[j];
    if (inc && inc.id) map[inc.id] = inc;
  }

  for (var k = 0; k < (deletedIds || []).length; k++) {
    delete map[deletedIds[k]];
  }

  var merged = [];
  for (var id in map) {
    merged.push(map[id]);
  }

  writeCustomers(sheet, merged);
  return merged;
}

function mergeOrders(ss, incoming, deletedIds) {
  var sheet = ss.getSheetByName('Orders') || ss.insertSheet('Orders');
  var existing = getSheetOrders(ss);
  var map = {};

  for (var i = 0; i < existing.length; i++) {
    var o = existing[i];
    if (o.id) map[o.id] = o;
  }

  for (var j = 0; j < (incoming || []).length; j++) {
    var inc = incoming[j];
    if (inc && inc.id) map[inc.id] = inc;
  }

  for (var k = 0; k < (deletedIds || []).length; k++) {
    delete map[deletedIds[k]];
  }

  var merged = [];
  for (var id in map) {
    merged.push(map[id]);
  }

  merged.sort(function(a, b) {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  writeOrders(sheet, merged);
  return merged;
}

function mergeServices(ss, incoming) {
  var sheet = ss.getSheetByName('Services') || ss.insertSheet('Services');
  var existing = getSheetServices(ss);
  var map = {};

  for (var i = 0; i < existing.length; i++) {
    var s = existing[i];
    if (s.id) map[s.id] = s;
  }

  for (var j = 0; j < (incoming || []).length; j++) {
    var inc = incoming[j];
    if (inc && inc.id) map[inc.id] = inc;
  }

  var merged = [];
  for (var id in map) {
    merged.push(map[id]);
  }

  writeServices(sheet, merged);
  return merged;
}

function writeOrders(sheet, orders) {
  sheet.clearContents();
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
        o.createdAt ? String(o.createdAt) : new Date().toISOString(),
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

function writeCustomers(sheet, customers) {
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
        c.createdAt ? String(c.createdAt) : new Date().toISOString()
      ]);
    }
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }
}

function writeServices(sheet, services) {
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

function getSheetCustomers(ss) {
  var sheet = ss.getSheetByName('Customers');
  if (!sheet) return [];
  var rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return [];
  var result = [];
  for (var i = 1; i < rows.length; i++) {
    var r = rows[i];
    if (r[0]) {
      result.push({
        id: String(r[0]),
        name: String(r[1] || ''),
        phone: String(r[2] || ''),
        address: String(r[3] || '-'),
        createdAt: r[4] ? String(r[4]) : new Date().toISOString()
      });
    }
  }
  return result;
}

function getSheetOrders(ss) {
  var sheet = ss.getSheetByName('Orders');
  if (!sheet) return [];
  var rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return [];
  var result = [];
  for (var i = 1; i < rows.length; i++) {
    var r = rows[i];
    if (r[0]) {
      result.push({
        id: String(r[0]),
        customerName: String(r[1] || ''),
        customerPhone: String(r[2] || ''),
        createdAt: r[3] ? String(r[3]) : new Date().toISOString(),
        mainService: String(r[4] || ''),
        speed: String(r[5] || 'Normal'),
        actualWeight: parseFloat(r[6]) || 0,
        billedWeight: parseFloat(r[7]) || 0,
        items: [],
        totalPrice: parseFloat(r[9]) || 0,
        paymentStatus: String(r[10] || 'Belum Bayar'),
        paymentMethod: String(r[11] || 'Cash'),
        progressStatus: String(r[12] || 'Proses'),
        cashierName: String(r[13] || 'Mama Sela')
      });
    }
  }
  return result;
}

function getSheetServices(ss) {
  var sheet = ss.getSheetByName('Services');
  if (!sheet) return [];
  var rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return [];
  var result = [];
  for (var i = 1; i < rows.length; i++) {
    var r = rows[i];
    if (r[0]) {
      result.push({
        id: String(r[0]),
        name: String(r[1] || ''),
        category: String(r[2] || 'Kiloan'),
        unit: String(r[3] || 'kg'),
        price: parseFloat(r[4]) || 0,
        hpp: parseFloat(r[5]) || 0,
        profitMarginPercent: parseFloat(r[6]) || 0
      });
    }
  }
  return result;
}
`;

export async function syncToGoogleSheets(): Promise<{ success: boolean; message: string }> {
  try {
    let config = await getSheetsConfig();
    const orders = await getAllOrders();
    const customers = await getAllCustomers();
    const services = await getAllServices();
    const queue = await getSyncQueue();

    let scriptUrl = config.scriptUrl ? config.scriptUrl.trim() : '';

    // If scriptUrl is empty locally, check if server proxy has remembered one
    if (!scriptUrl) {
      try {
        const checkRes = await fetch('/api/sync');
        const checkData = await checkRes.json();
        if (checkData?.scriptUrl) {
          scriptUrl = checkData.scriptUrl;
          config = { ...config, scriptUrl };
          await saveSheetsConfig(config);
        }
      } catch (err) {}
    }

    if (!scriptUrl) {
      const now = new Date().toISOString();
      await saveSheetsConfig({ ...config, lastSyncedAt: now });
      return {
        success: false,
        message: 'URL Google Apps Script belum diatur pada perangkat ini.',
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

    let proxyMessage = '';
    let returnedData: any = null;

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
          deletedQueue: queue.filter((q) => q.action === 'delete'),
        }),
      });

      const apiData = await apiRes.json();
      if (apiRes.ok && apiData.success) {
        proxyMessage = apiData.message || 'Data berhasil disinkronkan ke Google Sheets!';
        returnedData = apiData.data;
      } else {
        return {
          success: false,
          message: apiData.message || 'Gagal sinkronisasi ke Google Sheets.',
        };
      }
    } catch (apiErr) {
      console.warn('API /api/sync fallback to direct fetch:', apiErr);
      await fetch(scriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        mode: 'no-cors',
        body: JSON.stringify({
          action: 'sync',
          spreadsheetId: '1_6yVfCk8wjZ-obnEuwXCh_IynU_8bYrxSQG_wN-ELxc',
          orders,
          customers,
          services,
          deletedQueue: queue.filter((q) => q.action === 'delete'),
        }),
      });
      proxyMessage = 'Data berhasil dikirim ke Google Sheets!';
    }

    // Update local IndexedDB with merged two-way data returned from Google Sheets
    if (returnedData) {
      const db = await getDB();
      if (db) {
        if (Array.isArray(returnedData.customers)) {
          const txC = db.transaction('customers', 'readwrite');
          await txC.store.clear();
          for (const c of returnedData.customers) {
            if (c && c.id) {
              const safeD = parseSafeDate(c.createdAt);
              await txC.store.put({
                id: String(c.id),
                name: String(c.name || 'Pelanggan'),
                phone: String(c.phone || ''),
                address: String(c.address || '-'),
                createdAt: safeD ? safeD.toISOString() : (c.createdAt ? String(c.createdAt) : new Date().toISOString()),
              });
            }
          }
          await txC.done;
        }
        if (Array.isArray(returnedData.orders)) {
          const txO = db.transaction('orders', 'readwrite');
          await txO.store.clear();
          for (const o of returnedData.orders) {
            if (o && o.id) {
              const safeD = parseSafeDate(o.createdAt);
              await txO.store.put({
                id: String(o.id),
                customerId: String(o.customerId || ''),
                customerName: String(o.customerName || 'Pelanggan'),
                customerPhone: String(o.customerPhone || ''),
                createdAt: safeD ? safeD.toISOString() : (o.createdAt ? String(o.createdAt) : new Date().toISOString()),
                estimatedCompletion: o.estimatedCompletion ? String(o.estimatedCompletion) : new Date().toISOString(),
                completedAt: o.completedAt ? String(o.completedAt) : undefined,
                mainService: String(o.mainService || 'Cuci'),
                speed: o.speed || 'Normal',
                speedFee: Number(o.speedFee) || 0,
                actualWeight: Number(o.actualWeight) || 0,
                billedWeight: Number(o.billedWeight) || 0,
                items: Array.isArray(o.items) ? o.items : [],
                mainServiceTotal: Number(o.mainServiceTotal) || (Number(o.totalPrice) || 0),
                itemsTotal: Number(o.itemsTotal) || 0,
                totalPrice: Number(o.totalPrice) || 0,
                paymentStatus: o.paymentStatus || 'Belum Bayar',
                paymentMethod: o.paymentMethod || 'Cash',
                paymentDate: o.paymentDate ? String(o.paymentDate) : undefined,
                progressStatus: o.progressStatus || 'Proses',
                notes: o.notes || '',
                cashierName: o.cashierName || 'Mama Sela',
              });
            }
          }
          await txO.done;
        }
        if (Array.isArray(returnedData.services) && returnedData.services.length > 0) {
          const txS = db.transaction('services', 'readwrite');
          await txS.store.clear();
          for (const s of returnedData.services) {
            if (s && s.id) {
              await txS.store.put(s);
            }
          }
          await txS.done;
        }
      }
    }

    const now = new Date().toISOString();
    await saveSheetsConfig({ ...config, scriptUrl, lastSyncedAt: now });

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
