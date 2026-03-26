// @ts-nocheck
// PAGE: Notifications (app/notifications/page.tsx → route: /notifications)
'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import Navbar from '../components/Navbar';

const TYPE_META = {
  sighting: { emoji: '📍', color: '#FF6B6B' },
  lost:     { emoji: '🚨', color: '#F44336' },
  message:  { emoji: '✉️', color: '#2196F3' },
  found:    { emoji: '✅', color: '#4CAF50' },
};

function timeAgo(dateStr) {
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
  const [user, setUser] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { window.location.href = '/login'; return; }
      setUser(data.user);
      loadNotifications(data.user.id);
    });
  }, []);

  async function loadNotifications(userId) {
    setLoading(true);
    const { data } = await supabase.from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(50);
    setNotifications(data || []);
    setLoading(false);
    await supabase.from('notifications').update({ read: true }).eq('user_id', userId).eq('read', false);
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f7f7f7', fontFamily: 'system-ui, sans-serif' }}>
      <Navbar />

      <div style={{ maxWidth: 640, margin: '0 auto', padding: '24px 16px' }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: '#222', marginBottom: 16 }}>🔔 Notifications</div>
        {loading && <div style={{ color: '#ccc', textAlign: 'center', padding: 40 }}>Loading...</div>}
        {!loading && notifications.length === 0 && (
          <div style={{ textAlign: 'center', color: '#ccc', fontSize: 14, padding: 60 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🔔</div>No notifications yet
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {notifications.map(n => {
            const meta = TYPE_META[n.type] ?? { emoji: '🔔', color: '#888' };
            const href = n.cat_id ? (n.type === 'message' ? '/messages' : `/cat/${n.cat_id}`) : (n.type === 'message' ? '/messages' : '/');
            return (
              <a key={n.id} href={href}
                style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '14px 16px', background: n.read ? 'white' : '#fff8f8', borderRadius: 12, textDecoration: 'none', border: n.read ? '1px solid #f0f0f0' : `1px solid ${meta.color}22` }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: `${meta.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>{meta.emoji}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, color: '#222', fontWeight: n.read ? 400 : 600, lineHeight: 1.4 }}>{n.message}</div>
                  <div style={{ fontSize: 11, color: '#bbb', marginTop: 4 }}>{timeAgo(n.created_at)}</div>
                </div>
                {!n.read && <div style={{ width: 8, height: 8, borderRadius: '50%', background: meta.color, flexShrink: 0, marginTop: 4 }} />}
              </a>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// PAGE: Notifications (app/notifications/page.tsx → route: /notifications)