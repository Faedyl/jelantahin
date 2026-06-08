import { json } from '@sveltejs/kit';
import { env as privateEnv } from '$env/dynamic/private';

/**
 * POST /api/midtrans/notification
 *
 * Midtrans sends payment notification webhooks here.
 * Configure this URL in Midtrans Dashboard → Settings → Notification URL.
 */
export async function POST({ request }) {
  const serverKey = privateEnv.MIDTRANS_SERVER_KEY;
  const isProduction = privateEnv.VITE_MIDTRANS_IS_PRODUCTION === 'true';

  if (!serverKey) {
    return json({ error: 'MIDTRANS_SERVER_KEY belum dikonfigurasi' }, { status: 500 });
  }

  try {
    const notification = await request.json();

    const orderId = notification.order_id;
    const transactionStatus = notification.transaction_status;
    const paymentType = notification.payment_type;
    const grossAmount = notification.gross_amount;
    const fraudStatus = notification.fraud_status;

    console.log('[Midtrans] Notification received:', {
      order_id: orderId,
      transaction_status: transactionStatus,
      payment_type: paymentType,
      gross_amount: grossAmount,
    });

    let paymentStatus = 'pending';

    if (transactionStatus === 'capture') {
      if (fraudStatus === 'accept') {
        paymentStatus = 'paid';
      } else if (fraudStatus === 'deny') {
        paymentStatus = 'rejected';
      }
    } else if (transactionStatus === 'settlement') {
      paymentStatus = 'paid';
    } else if (transactionStatus === 'pending') {
      paymentStatus = 'pending';
    } else if (['deny', 'cancel', 'expire', 'failure'].includes(transactionStatus)) {
      paymentStatus = 'rejected';
    } else if (transactionStatus === 'refund' || transactionStatus === 'partial_refund') {
      paymentStatus = 'refunded';
    }

    // TODO: Update database when payment confirmed
    // e.g. supabase.from('payment_confirmations').update({ status: paymentStatus }).eq('transaction_id', orderId)

    return json({
      ok: true,
      status: paymentStatus,
      order_id: orderId,
    });
  } catch (err) {
    console.error('[Midtrans] Notification error:', err);
    return json({ error: err.message }, { status: 500 });
  }
}
