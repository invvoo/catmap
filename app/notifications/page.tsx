// @ts-nocheck
// PAGE: Notifications (app/notifications/page.tsx → route: /notifications)
'use client';
import { supabase } from '../../lib/supabase';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';

    }
    return val;
  }
});

const TYPE_META: Record<string, { emoji: string; color: string }> = {
  sighting: { emoji: '📍', color: '#FF6B6B' },
  lost:     { emoji: '🚨', color: '#F44336' },
  message:  { emoji: '✉️', color: '#2196F3' },
  found:    { emoji: '✅', color: '#4CAF50' },
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export default function NotificationsPage() {
  const [user, setUser] = useState<any>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Shared navbar state
  const [navProfile, setNavProfile] = useState<any>(null);
  const [navUnread, setNavUnread] = useState(0);
  const [navNotifUnread, setNavNotifUnread] = useState(0);
  const [showNavMenu, setShowNavMenu] = useState(false);
  const [navGpsLoading, setNavGpsLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { window.location.href = '/login'; return; }
      setUser(data.user);
      loadNotifications(data.user.id);
      supabase.from('profiles').select('display_name,avatar_url').eq('id', data.user.id).maybeSingle()
        .then(({ data: p }) => setNavProfile(p));
      supabase.from('messages').select('id', { count: 'exact' }).eq('to_id', data.user.id).eq('read', false)
        .then(({ count }) => setNavUnread(count || 0));
    });
  }, []);

  async function loadNotifications(userId: string) {
    setLoading(true);
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);
    setNotifications(data || []);
    setNavNotifUnread((data || []).filter((n: any) => !n.read).length);
    setLoading(false);
    // Mark all as read
    await supabase.from('notifications').update({ read: true }).eq('user_id', userId).eq('read', false);
  }

  async function handleNavLogout() {
    await supabase.auth.signOut();
    window.location.href = '/';
  }

  function handleNavMetACat() {
    if (!user) { window.location.href = '/login'; return; }
    setNavGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      () => { setNavGpsLoading(false); window.location.href = '/'; },
      () => { setNavGpsLoading(false); window.location.href = '/'; },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f7f7f7', fontFamily: 'system-ui, sans-serif' }}>

      {/* ── NAVBAR ── */}
      <div style={{ background: 'white', padding: '10px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 2px 10px rgba(0,0,0,0.08)', position: 'sticky', top: 0, zIndex: 100 }}>
        <a href="/" style={{ fontSize: 20, fontWeight: 700, textDecoration: 'none', color: '#222' }}>🐱 CatMap</a>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <a href="/about" style={{ fontSize: 13, fontWeight: 600, color: '#444', textDecoration: 'none', padding: '6px 12px', borderRadius: 8 }}
            onMouseEnter={e => (e.currentTarget.style.background = '#f5f5f5')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>About</a>
          <a href="/care" style={{ fontSize: 13, fontWeight: 600, color: '#444', textDecoration: 'none', padding: '6px 12px', borderRadius: 8 }}
            onMouseEnter={e => (e.currentTarget.style.background = '#f5f5f5')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>🐾 Care for Strays</a>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={handleNavMetACat} disabled={navGpsLoading}
            style={{ padding: '9px 18px', borderRadius: 8, border: 'none', background: navGpsLoading ? '#ffccbc' : '#FF6B6B', color: 'white', fontWeight: 700, fontSize: 14, cursor: navGpsLoading ? 'default' : 'pointer' }}>
            {navGpsLoading ? '📍 Getting location...' : '🐱 I met a cat!'}
          </button>
          {user ? (
            <div style={{ position: 'relative' }}>
              <div onClick={() => setShowNavMenu(v => !v)}
                style={{ width: 36, height: 36, borderRadius: '50%', background: '#FF6B6B', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 15, cursor: 'pointer', border: '2px solid #ffccbc', overflow: 'hidden', flexShrink: 0 }}>
                {navProfile?.avatar_url
                  ? <img src={navProfile.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span>{user.email?.[0]?.toUpperCase() ?? '?'}</span>}
              </div>
              {showNavMenu && (
                <>
                  <div onClick={() => setShowNavMenu(false)} style={{ position: 'fixed', inset: 0, zIndex: 200 }} />
                  <div style={{ position: 'absolute', top: 44, right: 0, background: 'white', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', border: '1px solid #f0f0f0', minWidth: 190, zIndex: 201, overflow: 'hidden' }}>
                    <div style={{ padding: '12px 16px', borderBottom: '1px solid #f5f5f5' }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#222', marginBottom: 1 }}>{navProfile?.display_name || 'Anonymous'}</div>
                      <div style={{ fontSize: 11, color: '#aaa', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</div>
                    </div>
                    <a href={`/profile/${user.id}`} onClick={() => setShowNavMenu(false)}
                      style={{ display: 'block', padding: '11px 16px', fontSize: 13, fontWeight: 600, color: '#333', textDecoration: 'none', borderBottom: '1px solid #f5f5f5' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#f9f9f9')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'white')}>👤 View Profile</a>
                    <a href="/messages" onClick={() => setShowNavMenu(false)}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 16px', fontSize: 13, fontWeight: 600, color: '#333', textDecoration: 'none', borderBottom: '1px solid #f5f5f5' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#f9f9f9')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'white')}>
                      <span>✉️ Messages</span>
                      {navUnread > 0 && <span style={{ background: '#FF6B6B', color: 'white', borderRadius: 10, padding: '1px 7px', fontSize: 11, fontWeight: 800 }}>{navUnread > 9 ? '9+' : navUnread}</span>}
                    </a>
                    <a href="/notifications" onClick={() => setShowNavMenu(false)}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 16px', fontSize: 13, fontWeight: 600, color: '#333', textDecoration: 'none', borderBottom: '1px solid #f5f5f5' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#f9f9f9')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'white')}>
                      <span>🔔 Notifications</span>
                      {navNotifUnread > 0 && <span style={{ background: '#FF6B6B', color: 'white', borderRadius: 10, padding: '1px 7px', fontSize: 11, fontWeight: 800 }}>{navNotifUnread > 9 ? '9+' : navNotifUnread}</span>}
                    </a>
                    <button onClick={handleNavLogout}
                      style={{ width: '100%', padding: '11px 16px', border: 'none', background: 'white', textAlign: 'left', fontSize: 13, color: '#F44336', fontWeight: 600, cursor: 'pointer' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#fff5f5')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'white')}>Sign out</button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <a href="/login" style={{ padding: '8px 20px', borderRadius: 8, background: '#333', color: 'white', textDecoration: 'none', fontWeight: 600, fontSize: 14 }}>Log in</a>
          )}
        </div>
      </div>

      <div style={{ maxWidth: 640, margin: '0 auto', padding: '24px 16px' }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: '#222', marginBottom: 16 }}>🔔 Notifications</div>

        {loading && <div style={{ color: '#ccc', textAlign: 'center', padding: 40 }}>Loading...</div>}

        {!loading && notifications.length === 0 && (
          <div style={{ textAlign: 'center', color: '#ccc', fontSize: 14, padding: 60 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🔔</div>
            No notifications yet
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {notifications.map((n: any) => {
            const meta = TYPE_META[n.type] ?? { emoji: '🔔', color: '#888' };
            const href = n.cat_id
              ? (n.type === 'message' ? '/messages' : `/cat/${n.cat_id}`)
              : (n.type === 'message' ? '/messages' : '/');
            return (
              <a key={n.id} href={href}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 14, padding: '14px 16px',
                  background: n.read ? 'white' : '#fff8f8',
                  borderRadius: 12, textDecoration: 'none',
                  border: n.read ? '1px solid #f0f0f0' : `1px solid ${meta.color}22`,
                  boxShadow: n.read ? 'none' : '0 2px 8px rgba(255,107,107,0.07)',
                }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: `${meta.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                  {meta.emoji}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, color: '#222', fontWeight: n.read ? 400 : 600, lineHeight: 1.4 }}>{n.message}</div>
                  <div style={{ fontSize: 11, color: '#bbb', marginTop: 4 }}>{timeAgo(n.created_at)}</div>
                </div>
                {!n.read && (
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: meta.color, flexShrink: 0, marginTop: 4 }} />
                )}
              </a>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// PAGE: Notifications (app/notifications/page.tsx → route: /notifications)
