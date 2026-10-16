import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DEFAULT_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbzX_noq0WTTrRXVfSj2rbPS3XGm4CRaPmvx53mDzEJyoVUwqkj5R5DzzbgcKc445N_7/exec';

// Server-side shared script URL cache across devices
let sharedScriptUrl = process.env.GOOGLE_SCRIPT_URL || DEFAULT_SCRIPT_URL;
const CACHE_FILE = path.join('/tmp', 'mama_sela_sync_url.txt');

function getCachedUrl(): string {
  if (sharedScriptUrl) return sharedScriptUrl;
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const saved = fs.readFileSync(CACHE_FILE, 'utf-8').trim();
      if (saved) {
        sharedScriptUrl = saved;
        return saved;
      }
    }
  } catch {}
  return DEFAULT_SCRIPT_URL;
}

function saveCachedUrl(url: string) {
  sharedScriptUrl = url;
  try {
    fs.writeFileSync(CACHE_FILE, url, 'utf-8');
  } catch {}
}

export async function GET() {
  return NextResponse.json({
    success: true,
    scriptUrl: getCachedUrl(),
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    let { scriptUrl, action, orders, customers, services, deletedQueue } = body;

    const targetScriptUrl = (scriptUrl || getCachedUrl() || '').trim();

    if (!targetScriptUrl) {
      return NextResponse.json(
        { success: false, message: 'URL Google Apps Script belum diisi.' },
        { status: 400 }
      );
    }

    // Auto-fix URL: ensure it uses /exec instead of /edit or trailing slash
    let targetUrl = targetScriptUrl;
    if (targetUrl.includes('/macros/s/')) {
      if (targetUrl.includes('/edit')) {
        targetUrl = targetUrl.replace(/\/edit.*$/, '/exec');
      } else if (!targetUrl.endsWith('/exec')) {
        targetUrl = targetUrl.replace(/\/?$/, '/exec');
      }
    }

    // Remember scriptUrl across devices
    saveCachedUrl(targetUrl);

    // Server-to-server POST to Google Apps Script
    // Node.js follow 302 redirects automatically
    const payload = JSON.stringify({
      action: action || 'sync',
      spreadsheetId: body.spreadsheetId || '1_6yVfCk8wjZ-obnEuwXCh_IynU_8bYrxSQG_wN-ELxc',
      orders: orders || [],
      customers: customers || [],
      services: services || [],
      deletedQueue: deletedQueue || [],
    });

    const googleResponse = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: payload,
      redirect: 'follow',
      cache: 'no-store',
    });

    const text = await googleResponse.text();

    let data: any = null;
    try {
      data = JSON.parse(text);
    } catch {
      // If response is HTML, it might be a Google Login redirect (Permission issue)
      if (text.includes('accounts.google.com') || text.includes('Sign in')) {
        return NextResponse.json(
          {
            success: false,
            message:
              'Akses ditolak oleh Google. Pastikan saat Deploy Web App, pilihan "Who has access" diset ke "Anyone" (Siapa saja).',
          },
          { status: 403 }
        );
      }
    }

    if (data && data.status === 'success') {
      return NextResponse.json({
        success: true,
        message: data.message || 'Data berhasil disinkronkan ke Google Sheets!',
        syncedAt: data.syncedAt,
        data: data.data || null,
        scriptUrl: targetUrl,
      });
    }

    if (data && data.status === 'error') {
      return NextResponse.json(
        {
          success: false,
          message: `Google Sheets Error: ${data.message}`,
        },
        { status: 400 }
      );
    }

    // If Google returned 200 or followed redirect successfully
    if (googleResponse.ok) {
      return NextResponse.json({
        success: true,
        message: 'Data berhasil dikirim ke Google Sheets!',
        data: data?.data || null,
        scriptUrl: targetUrl,
      });
    }

    return NextResponse.json(
      {
        success: false,
        message: `Google Apps Script status ${googleResponse.status}: ${googleResponse.statusText}`,
      },
      { status: googleResponse.status }
    );
  } catch (error: any) {
    console.error('API /api/sync error:', error);
    return NextResponse.json(
      {
        success: false,
        message: `Gagal terhubung ke Google Apps Script: ${error.message || 'Koneksi bermasalah'}`,
      },
      { status: 500 }
    );
  }
}
