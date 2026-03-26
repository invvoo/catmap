// @ts-nocheck
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

export default function Navbar() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [unread, setUnread] = useState(0);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showHomeMenu, setShowHomeMenu] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      if (data.user) {
        supabase.from('profiles').select('display_name,avatar_url').eq('id', data.user.id).maybeSingle()
          .then(({ data: p }) => setProfile(p));
        supabase.from('messages').select('id', { count: 'exact' }).eq('to_id', data.user.id).eq('read', false)
          .then(({ count }) => setUnread(count || 0));
      }
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) { setProfile(null); setUnread(0); }
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  function handleMetACat() {
    if (!user) { window.location.href = '/login'; return; }
    window.location.href = '/';
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = '/';
  }

  return (
    <>
      <style>{`
        @media (max-width: 640px) {
          .catmap-nav-links { display: none !important; }
          .catmap-met-btn { font-size: 12px !important; padding: 7px 10px !important; }
        }
      `}</style>
      <div style={{ flexShrink: 0, background: 'white', padding: '10px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 2px 10px rgba(0,0,0,0.08)', zIndex: 100, position: 'sticky', top: 0 }}>

        {/* Logo with dropdown */}
        <div style={{ position: 'relative' }}>
          <div onClick={() => setShowHomeMenu(v => !v)} style={{ fontSize: 20, fontWeight: 700, color: '#222', cursor: 'pointer', userSelect: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
            🐱 CatMap <span style={{ fontSize: 10, color: '#aaa', marginTop: 2 }}>▾</span>
          </div>
          {showHomeMenu && (
            <>
              <div onClick={() => setShowHomeMenu(false)} style={{ position: 'fixed', inset: 0, zIndex: 200 }} />
              <div style={{ position: 'absolute', top: 36, left: 0, background: 'white', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', border: '1px solid #f0f0f0', minWidth: 180, zIndex: 201, overflow: 'hidden' }}>
                <a href="/" onClick={() => setShowHomeMenu(false)} style={{ display: 'block', padding: '11px 16px', fontSize: 13, fontWeight: 600, color: '#333', textDecoration: 'none', borderBottom: '1px solid #f5f5f5' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#f9f9f9')} onMouseLeave={e => (e.currentTarget.style.background = 'white')}>🏠 Home</a>
                <a href="/about" onClick={() => setShowHomeMenu(false)} style={{ display: 'block', padding: '11px 16px', fontSize: 13, fontWeight: 600, color: '#333', textDecoration: 'none', borderBottom: '1px solid #f5f5f5' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#f9f9f9')} onMouseLeave={e => (e.currentTarget.style.background = 'white')}>ℹ️ About</a>
                <a href="/care" onClick={() => setShowHomeMenu(false)} style={{ display: 'block', padding: '11px 16px', fontSize: 13, fontWeight: 600, color: '#333', textDecoration: 'none', borderBottom: '1px solid #f5f5f5' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#f9f9f9')} onMouseLeave={e => (e.currentTarget.style.background = 'white')}>🐾 Care for Strays</a>
                <a href="/bounties" onClick={() => setShowHomeMenu(false)} style={{ display: 'block', padding: '11px 16px', fontSize: 13, fontWeight: 600, color: '#333', textDecoration: 'none' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#f9f9f9')} onMouseLeave={e => (e.currentTarget.style.background = 'white')}>💰 Bounties</a>
              </div>
            </>
          )}
        </div>

        {/* Desktop links */}
        <div className="catmap-nav-links" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <a href="/about" style={{ fontSize: 13, fontWeight: 600, color: '#444', textDecoration: 'none', padding: '6px 12px', borderRadius: 8 }}
            onMouseEnter={e => (e.currentTarget.style.background = '#f5f5f5')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>About</a>
          <a href="/care" style={{ fontSize: 13, fontWeight: 600, color: '#444', textDecoration: 'none', padding: '6px 12px', borderRadius: 8 }}
            onMouseEnter={e => (e.currentTarget.style.background = '#f5f5f5')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>🐾 Care for Strays</a>
        </div>

        {/* Right side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button className="catmap-met-btn" onClick={handleMetACat}
            style={{ padding: '9px 18px', borderRadius: 8, border: 'none', background: '#FF6B6B', color: 'white', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
            🐱 I met a cat!
          </button>
          {user ? (
            <div style={{ position: 'relative' }}>
              <div onClick={() => setShowUserMenu(v => !v)}
                style={{ width: 36, height: 36, borderRadius: '50%', background: '#FF6B6B', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 15, cursor: 'pointer', border: '2px solid #ffccbc', overflow: 'hidden', flexShrink: 0 }}>
                {profile?.avatar_url
                  ? <img src={profile.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span>{user.email?.[0]?.toUpperCase() ?? '?'}</span>}
              </div>
              {showUserMenu && (
                <>
                  <div onClick={() => setShowUserMenu(false)} style={{ position: 'fixed', inset: 0, zIndex: 200 }} />
                  <div style={{ position: 'absolute', top: 44, right: 0, background: 'white', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', border: '1px solid #f0f0f0', minWidth: 190, zIndex: 201, overflow: 'hidden' }}>
                    <div style={{ padding: '12px 16px', borderBottom: '1px solid #f5f5f5' }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#222', marginBottom: 1 }}>{profile?.display_name || 'Anonymous'}</div>
                      <div style={{ fontSize: 11, color: '#aaa', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</div>
                    </div>
                    <a href={`/profile/${user.id}`} onClick={() => setShowUserMenu(false)}
                      style={{ display: 'block', padding: '11px 16px', fontSize: 13, fontWeight: 600, color: '#333', textDecoration: 'none', borderBottom: '1px solid #f5f5f5' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#f9f9f9')} onMouseLeave={e => (e.currentTarget.style.background = 'white')}>👤 View Profile</a>
                    <a href="/messages" onClick={() => setShowUserMenu(false)}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 16px', fontSize: 13, fontWeight: 600, color: '#333', textDecoration: 'none', borderBottom: '1px solid #f5f5f5' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#f9f9f9')} onMouseLeave={e => (e.currentTarget.style.background = 'white')}>
                      <span>✉️ Messages</span>
                      {unread > 0 && <span style={{ background: '#FF6B6B', color: 'white', borderRadius: 10, padding: '1px 7px', fontSize: 11, fontWeight: 800 }}>{unread > 9 ? '9+' : unread}</span>}
                    </a>
                    <a href="/notifications" onClick={() => setShowUserMenu(false)}
                      style={{ display: 'block', padding: '11px 16px', fontSize: 13, fontWeight: 600, color: '#333', textDecoration: 'none', borderBottom: '1px solid #f5f5f5' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#f9f9f9')} onMouseLeave={e => (e.currentTarget.style.background = 'white')}>🔔 Notifications</a>
                    <button onClick={handleLogout}
                      style={{ width: '100%', padding: '11px 16px', border: 'none', background: 'white', textAlign: 'left', fontSize: 13, color: '#F44336', fontWeight: 600, cursor: 'pointer' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#fff5f5')} onMouseLeave={e => (e.currentTarget.style.background = 'white')}>Sign out</button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <a href="/login" style={{ padding: '8px 20px', borderRadius: 8, background: '#333', color: 'white', textDecoration: 'none', fontWeight: 600, fontSize: 14 }}>Log in</a>
          )}
        </div>
      </div>
    </>
  );
}
