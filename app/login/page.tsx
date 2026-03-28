// PAGE: Login / Signup (app/login/page.tsx → route: /login)
// @ts-nocheck
'use client';
export const dynamic = 'force-dynamic';
import { supabase } from '../../lib/supabase';


import { useState } from 'react';



export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignup, setIsSignup] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleGoogleSignIn() {
    setLoading(true); setError('');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/auth/callback' },
    });
    if (error) { setError(error.message); setLoading(false); }
  }

  async function handleSubmit() {
    setLoading(true); setError('');
    if (isSignup) {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) { setError(error.message); setLoading(false); return; }
      // Auto sign in after signup
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) { setError(signInError.message); setLoading(false); return; }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
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

        <button onClick={handleGoogleSignIn} disabled={loading}
          style={{ width: '100%', padding: '11px 12px', borderRadius: 8, border: '1px solid #ddd', background: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 20, color: '#333' }}>
          <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.08 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-3.59-13.46-8.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
          Continue with Google
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <div style={{ flex: 1, height: 1, background: '#eee' }} />
          <div style={{ fontSize: 12, color: '#bbb' }}>or</div>
          <div style={{ flex: 1, height: 1, background: '#eee' }} />
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
