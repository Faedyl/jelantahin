import { json } from '@sveltejs/kit';
import { env as privateEnv } from '$env/dynamic/private';

/**
 * POST /api/midtrans/charge
 *
 * Creates a Midtrans Snap transaction for the given order.
 * Returns { token, redirect_url } for the frontend to open Snap popup.
 */
export async function POST({ request }) {
  const serverKey = privateEnv.MIDTRANS_SERVER_KEY;
  const isProduction = privateEnv.VITE_MIDTRANS_IS_PRODUCTION === 'true';

  // ── Key Validation ──────────────────────────────────────────
  if (!serverKey) {
    return json({
      error: '❌ MIDTRANS_SERVER_KEY belum diisi di file .env',
      hint: 'Buka https://dashboard.sandbox.midtrans.com/ → Settings → Access Keys. Copy Server Key (sandbox).'
    }, { status: 500 });
  }

  if (!serverKey.startsWith('SB-Mid-server-') && !isProduction) {
    return json({
      error: '❌ MIDTRANS_SERVER_KEY sepertinya bukan key sandbox',
      hint: `Key Anda: ${serverKey.slice(0, 15)}... Key sandbox harus diawali "SB-Mid-server-".\n\n` +
        'Cara 1: Daftar Midtrans Sandbox di https://dashboard.sandbox.midtrans.com/\n' +
        '        lalu ambil Server Key dari Settings → Access Keys\n\n' +
        'Cara 2: Atau set VITE_MIDTRANS_IS_PRODUCTION=true di .env (untuk pakai key production)'
    }, { status: 500 });
  }

  if (serverKey.startsWith('SB-Mid-server-') && isProduction) {
    return json({
      error: '❌ VITE_MIDTRANS_IS_PRODUCTION=true tapi key-nya key sandbox (SB-Mid-server-...)',
      hint: 'Set VITE_MIDTRANS_IS_PRODUCTION=false atau ganti ke key production.'
    }, { status: 500 });
  }

  // ── Proceed with transaction ────────────────────────────────
  try {
    const { order_id, gross_amount, customer } = await request.json();

    if (!order_id || !gross_amount) {
      return json({ error: 'order_id dan gross_amount wajib diisi' }, { status: 400 });
    }

    const baseUrl = isProduction
      ? 'https://app.midtrans.com/snap/v1/transactions'
      : 'https://app.sandbox.midtrans.com/snap/v1/transactions';

    const auth = Buffer.from(serverKey + ':').toString('base64');

    const payload = {
      transaction_details: {
        order_id,
        gross_amount: Number(gross_amount),
      },
      credit_card: { secure: true },
      customer_details: customer ? {
        first_name: customer.name || '',
        email: customer.email || '',
        phone: customer.phone || '',
      } : undefined,
      enabled_payments: [
        'qris', 'gopay', 'shopeepay',
        'bank_transfer', 'echannel',
        'alfamart', 'indomaret', 'akulaku',
      ],
    };

    const res = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error('[Midtrans] Charge error:', data);
      const msg = data.status_message || data.error_messages?.[0] || 'Gagal membuat transaksi';

      let hint = '';
      if (res.status === 401 || res.status === 403) {
        hint = '\n\n🔑 Tips: Pastikan:\n' +
          '  1. Server Key di .env sudah benar (cek di dashboard Midtrans)\n' +
          `  2. Mode sandbox/production cocok (VITE_MIDTRANS_IS_PRODUCTION=${isProduction})\n` +
          '  3. Untuk sandbox, daftar dulu di https://dashboard.sandbox.midtrans.com/';
      }

      return json({ error: `❌ ${msg}${hint}`, details: data }, { status: res.status });
    }

    return json({
      token: data.token,
      redirect_url: data.redirect_url,
    });
  } catch (err) {
    console.error('[Midtrans] Exception:', err);
    return json({ error: err.message }, { status: 500 });
  }
}
