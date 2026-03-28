// @ts-nocheck
'use client';
export const dynamic = 'force-dynamic';
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function AuthCallbackPage() {
  useEffect(() => {
    // Supabase automatically exchanges the code in the URL for a session.
    // We just wait for it then redirect home.
    supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        window.location.href = '/';
      }
    });
    // Also handle the case where the session is already set
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) window.location.href = '/';
    });
  }, []);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif', flexDirection: 'column', gap: 12 }}>
      <div style={{ fontSize: 40 }}>🐱</div>
      <div style={{ fontSize: 16, color: '#888' }}>Signing you in…</div>
    </div>
  );
}
