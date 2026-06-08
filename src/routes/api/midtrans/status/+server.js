import { json } from '@sveltejs/kit';
import { env as privateEnv } from '$env/dynamic/private';

/**
 * GET /api/midtrans/status?order_id=xxx
 *
 * Check the transaction status from Midtrans API.
 */
export async function GET({ url }) {
  const serverKey = privateEnv.MIDTRANS_SERVER_KEY;
  const isProduction = privateEnv.VITE_MIDTRANS_IS_PRODUCTION === 'true';

  if (!serverKey) {
    return json({ error: 'MIDTRANS_SERVER_KEY belum dikonfigurasi' }, { status: 500 });
  }

  const orderId = url.searchParams.get('order_id');
  if (!orderId) {
    return json({ error: 'Parameter order_id wajib' }, { status: 400 });
  }

  try {
    const baseUrl = isProduction
      ? `https://api.midtrans.com/v2/${orderId}/status`
      : `https://api.sandbox.midtrans.com/v2/${orderId}/status`;

    const auth = Buffer.from(serverKey + ':').toString('base64');

    const res = await fetch(baseUrl, {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json',
      },
    });

    const data = await res.json();

    if (!res.ok) {
      return json({ error: data.status_message || 'Gagal cek status', details: data }, { status: res.status });
    }

    return json({
      order_id: data.order_id,
      transaction_status: data.transaction_status,
      payment_type: data.payment_type,
      gross_amount: data.gross_amount,
      transaction_time: data.transaction_time,
      settlement_time: data.settlement_time,
      status_code: data.status_code,
      status_message: data.status_message,
      normalized_status: normalizeMidtransStatus(data.transaction_status),
      raw: data,
    });
  } catch (err) {
    console.error('[Midtrans] Status error:', err);
    return json({ error: err.message }, { status: 500 });
  }
}

function normalizeMidtransStatus(status) {
  const map = {
    'capture': 'paid',
    'settlement': 'paid',
    'pending': 'pending',
    'deny': 'rejected',
    'cancel': 'rejected',
    'expire': 'rejected',
    'failure': 'rejected',
    'refund': 'refunded',
    'partial_refund': 'partial_refund',
    'authorize': 'pending',
  };
  return map[status] || 'pending';
}
