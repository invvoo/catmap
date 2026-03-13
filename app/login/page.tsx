// PAGE: Login / Signup (app/login/page.tsx → route: /login)
'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignup, setIsSignup] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit() {
    setLoading(true); setError('');
    if (isSignup) {
      const { error } = await getSupabase().auth.signUp({ email, password });
      if (error) { setError(error.message); setLoading(false); return; }
      // Auto sign in after signup
      const { error: signInError } = await getSupabase().auth.signInWithPassword({ email, password });
      if (signInError) { setError(signInError.message); setLoading(false); return; }
    } else {
      const { error } = await getSupabase().auth.signInWithPassword({ email, password });
      if (error) { setError(error.message); setLoading(false); return; }
    }
    setLoading(false);
    window.location.href = '/';
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f7f7f7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ background: 'white', borderRadius: 16, padding: 36, width: 360, boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🐱</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#222' }}>CatMap</div>
          <div style={{ fontSize: 14, color: '#aaa', marginTop: 4 }}>{isSignup ? 'Create an account' : 'Sign in to continue'}</div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#666', marginBottom: 6 }}>Email</div>
          <input
            type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com"
            style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14, boxSizing: 'border-box', outline: 'none' }}
          />
        </div>

        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#666', marginBottom: 6 }}>Password</div>
          <input
            type="password" value={password} onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14, boxSizing: 'border-box', outline: 'none' }}
          />
        </div>

        {error && <div style={{ background: '#fff3f3', border: '1px solid #ffcdd2', borderRadius: 8, padding: '10px 12px', fontSize: 13, color: '#c62828', marginBottom: 14 }}>{error}</div>}

        <button onClick={handleSubmit} disabled={loading || !email || !password}
          style={{ width: '100%', padding: 12, borderRadius: 8, border: 'none', background: loading ? '#ffccbc' : '#FF6B6B', color: 'white', fontWeight: 700, fontSize: 15, cursor: loading ? 'default' : 'pointer', marginBottom: 14 }}>
          {loading ? 'Please wait...' : isSignup ? 'Create Account' : 'Sign In'}
        </button>

        <div style={{ textAlign: 'center', fontSize: 13, color: '#888' }}>
          {isSignup ? 'Already have an account? ' : "Don't have an account? "}
          <span onClick={() => { setIsSignup(v => !v); setError(''); }} style={{ color: '#FF6B6B', fontWeight: 600, cursor: 'pointer' }}>
            {isSignup ? 'Sign in' : 'Sign up'}
          </span>
        </div>
      </div>
    </div>
  );
}

// PAGE: Login / Signup (app/login/page.tsx → route: /login)