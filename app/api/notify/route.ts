// @ts-nocheck
// API: Send in-app notification + email
// POST /api/notify
// Body: { userId, type, message, catId?, catName? }

import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { userId, type, message, catId, catName } = await req.json();
    if (!userId || !message) return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Insert notification row
    await supabaseAdmin.from('notifications').insert({ user_id: userId, cat_id: catId || null, type, message });

    // Get user email
    const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(userId);
    const email = user?.email;
    if (!email) return NextResponse.json({ ok: true, email: false });

    // Skip email if no Resend key configured
    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) return NextResponse.json({ ok: true, email: false });

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://catmap-snvw.vercel.app';
    const catLink = catId ? `${siteUrl}/cat/${catId}` : siteUrl;

    const emailBody = {
      from: 'CatMap <noreply@catmap.app>',
      to: email,
      subject: `CatMap: ${catName ? `${catName} — ` : ''}${typeLabel(type)}`,
      html: `
        <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:24px;">
          <div style="font-size:22px;font-weight:800;color:#FF6B6B;margin-bottom:16px;">🐱 CatMap</div>
          <div style="font-size:16px;color:#222;margin-bottom:20px;">${message}</div>
          ${catId ? `<a href="${catLink}" style="display:inline-block;padding:11px 22px;background:#FF6B6B;color:white;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;">View on CatMap →</a>` : ''}
          <div style="margin-top:24px;font-size:12px;color:#aaa;">You're receiving this because you have an account on CatMap.<br/><a href="${siteUrl}/notifications" style="color:#FF6B6B;">Manage notifications</a></div>
        </div>
      `,
    };

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(emailBody),
    });

    return NextResponse.json({ ok: true, email: res.ok });
  } catch (err) {
    console.error('/api/notify error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

function typeLabel(type: string) {
  const labels: Record<string, string> = {
    sighting: 'New sighting reported',
    lost: 'Cat marked as lost',
    message: 'New message',
    comment: 'New comment',
    bounty: 'Bounty update',
  };
  return labels[type] || 'New notification';
}
