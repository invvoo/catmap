// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

    const { fundId, userId, amount, note } = await req.json();
    if (!fundId || !amount || amount < 1) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: { name: 'Community Fund Donation', description: note || 'Supporting stray cat care' },
          unit_amount: Math.round(amount * 100),
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://catmap-snvw.vercel.app'}/funds/${fundId}?donated=1`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://catmap-snvw.vercel.app'}/funds/${fundId}`,
      metadata: { fundId, userId: userId || '', amount: String(amount), note: note || '' },
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error('Fund checkout error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
