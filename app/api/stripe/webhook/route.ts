// API: Stripe Webhook — confirm payment and update bounty donation record
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

export async function POST(req: NextRequest) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-03-25.dahlia' });
  const body = await req.text();
  const sig = req.headers.get('stripe-signature')!;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err: any) {
    console.error('Webhook signature error:', err.message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const { bountyId, userId, amount } = session.metadata || {};

    if (bountyId && amount) {
      // Record donation
      await supabaseAdmin.from('bounty_donations').insert({
        bounty_id: bountyId,
        user_id: userId || null,
        amount: parseFloat(amount),
        stripe_payment_intent_id: session.payment_intent as string,
      });

      // Add to community_boost on bounty
      const { data: bounty } = await supabaseAdmin
        .from('bounties').select('community_boost').eq('id', bountyId).single();
      if (bounty) {
        await supabaseAdmin.from('bounties').update({
          community_boost: (bounty.community_boost || 0) + parseFloat(amount),
        }).eq('id', bountyId);
      }
    }
  }

  return NextResponse.json({ received: true });
}
