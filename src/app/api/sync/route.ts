import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    let { scriptUrl, action, orders, customers, services } = body;

    if (!scriptUrl || typeof scriptUrl !== 'string' || scriptUrl.trim() === '') {
      return NextResponse.json(
        { success: false, message: 'URL Google Apps Script belum diisi.' },
        { status: 400 }
      );
    }

    // Auto-fix URL: ensure it uses /exec instead of /edit or trailing slash
    let targetUrl = scriptUrl.trim();
    if (targetUrl.includes('/macros/s/')) {
      if (targetUrl.includes('/edit')) {
        targetUrl = targetUrl.replace(/\/edit.*$/, '/exec');
      } else if (!targetUrl.endsWith('/exec')) {
        targetUrl = targetUrl.replace(/\/?$/, '/exec');
      }
    }

    // Server-to-server POST to Google Apps Script
    // Node.js follow 302 redirects automatically
    const payload = JSON.stringify({
      action: action || 'sync',
      orders: orders || [],
      customers: customers || [],
      services: services || [],
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
