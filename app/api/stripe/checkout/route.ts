// API: Create Stripe Checkout Session for bounty donation/boost
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-03-25.dahlia' });

export async function POST(req: NextRequest) {
  try {
    const { bountyId, amount, userId, catId, catName, bountyType } = await req.json();

    if (!bountyId || !amount || amount < 1) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: `Bounty Boost — ${catName || 'Community Cat'}`,
            description: `Supporting a ${bountyType} bounty on CatMap`,
            images: [],
          },
          unit_amount: Math.round(amount * 100), // cents
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${req.headers.get('origin')}/bounties/${bountyId}?donated=1`,
      cancel_url: `${req.headers.get('origin')}/bounties/${bountyId}`,
      metadata: {
        bountyId,
        userId: userId || '',
        catId: catId || '',
        amount: String(amount),
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error('Stripe checkout error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
