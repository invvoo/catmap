// @ts-nocheck
// PAGE: Messages — Lost Cat Contact (app/messages/page.tsx → route: /messages)
'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase = new Proxy({} as ReturnType<typeof createClient>, {
  get(_target, prop) {
    const client = getSupabase() as any;
    const val = client[prop];
    if (typeof val === 'function') return val.bind(client);
    if (typeof val === 'object' && val !== null) {
      return new Proxy(val, {
        get(_t2, prop2) {
          const val2 = val[prop2];
          return typeof val2 === 'function' ? val2.bind(val) : val2;
        }
      });
    }
    return val;
  }
});

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

export default function MessagesPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profileCache, setProfileCache] = useState<Record<string, any>>({});
  const threadEndRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<any>(null);


  // ── NAVBAR STATE ──
  const [navUser, setNavUser] = useState<any>(null);
  const [navProfile, setNavProfile] = useState<any>(null);
  const [navUnread, setNavUnread] = useState(0);
  const [showNavMenu, setShowNavMenu] = useState(false);
  const [navGpsLoading, setNavGpsLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setNavUser(data.user);
      if (data.user) {
        supabase.from('profiles').select('display_name,avatar_url').eq('id', data.user.id).maybeSingle()
          .then(({ data: p }) => setNavProfile(p));
        supabase.from('messages').select('id', { count: 'exact' }).eq('to_id', data.user.id).eq('read', false)
          .then(({ count }) => setNavUnread(count || 0));
      }
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      setNavUser(session?.user ?? null);
      if (!session?.user) { setNavProfile(null); setNavUnread(0); }
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  function handleNavMetACat() {
    if (!navUser) { window.location.href = '/login'; return; }
    setNavGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setNavGpsLoading(false); window.location.href = '/'; },
      () => { setNavGpsLoading(false); window.location.href = '/'; },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function handleNavLogout() {
    await supabase.auth.signOut();
    window.location.href = '/';
  }

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { window.location.href = '/login'; return; }
      setCurrentUser(data.user);
      loadConversations(data.user.id);
    });
  }, []);

  // Check for ?with= param to open a specific conversation
  useEffect(() => {
    if (!currentUser) return;
    const params = new URLSearchParams(window.location.search);
    const withId = params.get('with');
    if (withId) openConversation(withId);
  }, [currentUser]);

  // Pre-fill message with lost cat context if ?cat= and ?name= present
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const catId = params.get('cat');
    const catName = params.get('name');
    if (catId && catName) {
      setNewMessage(`Hi! I think I may have spotted your lost cat ${catName}. ${window.location.origin}/cat/${catId}`);
    }
  }, []);

  async function getProfile(userId: string) {
    if (profileCache[userId]) return profileCache[userId];
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
    const profile = data || { id: userId, display_name: null, avatar_url: null };
    setProfileCache(c => ({ ...c, [userId]: profile }));
    return profile;
  }

  async function loadConversations(userId: string) {
    setLoading(true);
    const { data } = await supabase
      .from('messages')
      .select('*')
      .or(`from_id.eq.${userId},to_id.eq.${userId}`)
      .order('created_at', { ascending: false });

    if (!data) { setLoading(false); return; }

    // Group by the other person
    const convMap: Record<string, any> = {};
    for (const msg of data) {
      const otherId = msg.from_id === userId ? msg.to_id : msg.from_id;
      if (!convMap[otherId]) {
        convMap[otherId] = { otherId, lastMsg: msg, unread: 0 };
      }
      if (!msg.read && msg.to_id === userId) convMap[otherId].unread++;
    }

    // Load profiles for all conversation partners
    const convList = await Promise.all(
      Object.values(convMap).map(async (conv: any) => {
        const profile = await getProfile(conv.otherId);
        return { ...conv, profile };
      })
    );
    convList.sort((a, b) => new Date(b.lastMsg.created_at).getTime() - new Date(a.lastMsg.created_at).getTime());
    setConversations(convList);
    setLoading(false);
  }

  async function openConversation(otherId: string) {
    setSelectedUserId(otherId);
    const profile = await getProfile(otherId);
    setSelectedProfile(profile);
    await loadThread(otherId);
    // Subscribe to real-time
    if (channelRef.current) supabase.removeChannel(channelRef.current);
    channelRef.current = supabase
      .channel(`messages-${otherId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const msg = payload.new as any;
        if (
          (msg.from_id === otherId && msg.to_id === currentUser?.id) ||
          (msg.from_id === currentUser?.id && msg.to_id === otherId)
        ) {
          setMessages(prev => [...prev, msg]);
        }
      })
      .subscribe();
  }

  async function loadThread(otherId: string) {
    if (!currentUser) return;
    const { data } = await supabase
      .from('messages')
      .select('*')
      .or(
        `and(from_id.eq.${currentUser.id},to_id.eq.${otherId}),and(from_id.eq.${otherId},to_id.eq.${currentUser.id})`
      )
      .order('created_at', { ascending: true });
    setMessages(data || []);
    // Mark received messages as read
    await supabase
      .from('messages')
      .update({ read: true })
      .eq('from_id', otherId)
      .eq('to_id', currentUser.id)
      .eq('read', false);
    // Update unread count in conv list
    setConversations(prev => prev.map(c => c.otherId === otherId ? { ...c, unread: 0 } : c));
  }

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSend() {
    if (!newMessage.trim() || !currentUser || !selectedUserId) return;
    setSending(true);
    const { data: msg } = await supabase.from('messages').insert({
      from_id: currentUser.id,
      to_id: selectedUserId,
      content: newMessage.trim(),
    }).select().single();
    setSending(false);
    setNewMessage('');
    if (msg) {
      setMessages(prev => [...prev, msg]);
      // Notify recipient
      await supabase.from('notifications').insert({
        user_id: selectedUserId, cat_id: null, type: 'message',
        message: `✉️ You have a new message`,
      });
      // Update/add conversation in list
      setConversations(prev => {
        const exists = prev.find(c => c.otherId === selectedUserId);
        if (exists) return prev.map(c => c.otherId === selectedUserId ? { ...c, lastMsg: msg } : c);
        return [{ otherId: selectedUserId, lastMsg: msg, unread: 0, profile: selectedProfile }, ...prev];
      });
    }
  }

  const displayName = (profile: any) => profile?.display_name || 'Anonymous';
  const avatarLetter = (profile: any) => (profile?.display_name || profile?.id || '?')[0].toUpperCase();

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, sans-serif', background: '#f7f7f7' }}>

      {/* ── NAVBAR ── */}
      <div style={{ flexShrink: 0, background: 'white', padding: '10px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 2px 10px rgba(0,0,0,0.08)', zIndex: 100, position: 'sticky', top: 0 }}>
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
          {navUser ? (
            <div style={{ position: 'relative' }}>
              <div onClick={() => setShowNavMenu(v => !v)}
                style={{ width: 36, height: 36, borderRadius: '50%', background: '#FF6B6B', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 15, cursor: 'pointer', border: '2px solid #ffccbc', overflow: 'hidden', flexShrink: 0 }}>
                {navProfile?.avatar_url
                  ? <img src={navProfile.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span>{navUser.email?.[0]?.toUpperCase() ?? '?'}</span>}
              </div>
              {showNavMenu && (
                <>
                  <div onClick={() => setShowNavMenu(false)} style={{ position: 'fixed', inset: 0, zIndex: 200 }} />
                  <div style={{ position: 'absolute', top: 44, right: 0, background: 'white', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', border: '1px solid #f0f0f0', minWidth: 190, zIndex: 201, overflow: 'hidden' }}>
                    <div style={{ padding: '12px 16px', borderBottom: '1px solid #f5f5f5' }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#222', marginBottom: 1 }}>{navProfile?.display_name || 'Anonymous'}</div>
                      <div style={{ fontSize: 11, color: '#aaa', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{navUser.email}</div>
                    </div>
                    <a href={`/profile/${navUser.id}`} onClick={() => setShowNavMenu(false)}
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

      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>

        {/* ── CONVERSATION LIST ── */}
        <div style={{ width: 300, flexShrink: 0, background: 'white', borderRight: '1px solid #f0f0f0', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid #f5f5f5', fontSize: 13, fontWeight: 700, color: '#888', letterSpacing: '0.05em' }}>
            CONVERSATIONS
          </div>

          {loading && (
            <div style={{ padding: 24, color: '#ccc', fontSize: 13, textAlign: 'center' }}>Loading...</div>
          )}

          {!loading && conversations.length === 0 && (
            <div style={{ padding: 24, color: '#ccc', fontSize: 13, textAlign: 'center', lineHeight: 1.6 }}>
              No messages yet.<br />Visit someone's profile to start a conversation.
            </div>
          )}

          {conversations.map(conv => (
            <div key={conv.otherId} onClick={() => openConversation(conv.otherId)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', cursor: 'pointer',
                background: selectedUserId === conv.otherId ? '#fff5f5' : 'white',
                borderLeft: selectedUserId === conv.otherId ? '3px solid #FF6B6B' : '3px solid transparent',
                borderBottom: '1px solid #fafafa',
              }}
              onMouseEnter={e => { if (selectedUserId !== conv.otherId) e.currentTarget.style.background = '#fafafa'; }}
              onMouseLeave={e => { if (selectedUserId !== conv.otherId) e.currentTarget.style.background = 'white'; }}>
              {/* Avatar */}
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#FF6B6B', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16, flexShrink: 0, overflow: 'hidden' }}>
                {conv.profile?.avatar_url
                  ? <img src={conv.profile.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : avatarLetter(conv.profile)
                }
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                  <span style={{ fontWeight: conv.unread > 0 ? 700 : 600, fontSize: 13, color: '#111' }}>{displayName(conv.profile)}</span>
                  <span style={{ fontSize: 10, color: '#bbb' }}>{timeAgo(conv.lastMsg.created_at)}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 12, color: conv.unread > 0 ? '#333' : '#aaa', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, fontWeight: conv.unread > 0 ? 600 : 400 }}>
                    {conv.lastMsg.from_id === currentUser?.id ? 'You: ' : ''}{conv.lastMsg.content}
                  </span>
                  {conv.unread > 0 && (
                    <span style={{ background: '#FF6B6B', color: 'white', borderRadius: '50%', width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
                      {conv.unread}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ── MESSAGE THREAD ── */}
        {selectedUserId ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            {/* Thread header */}
            <div style={{ flexShrink: 0, padding: '14px 20px', background: 'white', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#FF6B6B', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 15, overflow: 'hidden', flexShrink: 0 }}>
                {selectedProfile?.avatar_url
                  ? <img src={selectedProfile.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : avatarLetter(selectedProfile)
                }
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#111' }}>{displayName(selectedProfile)}</div>
                <a href={`/profile/${selectedUserId}`} style={{ fontSize: 11, color: '#FF6B6B', textDecoration: 'none' }}>View profile →</a>
              </div>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 10px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {messages.length === 0 && (
                <div style={{ textAlign: 'center', color: '#ccc', fontSize: 13, marginTop: 40 }}>
                  No messages yet. Say hello! 👋
                </div>
              )}
              {messages.map(msg => {
                const isMine = msg.from_id === currentUser?.id;
                return (
                  <div key={msg.id} style={{ display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start' }}>
                    <div style={{
                      maxWidth: '70%', padding: '10px 14px', borderRadius: isMine ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                      background: isMine ? '#FF6B6B' : 'white',
                      color: isMine ? 'white' : '#222',
                      fontSize: 14, lineHeight: 1.5,
                      boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                    }}>
                      <div>{msg.content}</div>
                      <div style={{ fontSize: 10, marginTop: 4, opacity: 0.6, textAlign: isMine ? 'right' : 'left' }}>
                        {timeAgo(msg.created_at)}{isMine && (msg.read ? ' · ✓✓' : ' · ✓')}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={threadEndRef} />
            </div>

            {/* Send box */}
            <div style={{ flexShrink: 0, padding: '12px 16px', background: 'white', borderTop: '1px solid #f0f0f0', display: 'flex', gap: 10, alignItems: 'flex-end' }}>
              <textarea
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder="Type a message... (Enter to send)"
                rows={1}
                style={{ flex: 1, padding: '10px 14px', borderRadius: 20, border: '1px solid #eee', fontSize: 14, resize: 'none', fontFamily: 'inherit', outline: 'none', background: '#fafafa', maxHeight: 100, overflowY: 'auto' }}
              />
              <button onClick={handleSend} disabled={sending || !newMessage.trim()}
                style={{ padding: '10px 18px', borderRadius: 20, border: 'none', background: newMessage.trim() ? '#FF6B6B' : '#eee', color: newMessage.trim() ? 'white' : '#aaa', fontWeight: 700, fontSize: 14, cursor: newMessage.trim() ? 'pointer' : 'default', flexShrink: 0, transition: 'background 0.15s' }}>
                {sending ? '...' : '↑'}
              </button>
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ccc', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontSize: 48 }}>✉️</div>
            <div style={{ fontSize: 15, color: '#bbb' }}>Select a conversation</div>
          </div>
        )}
      </div>
    </div>
  );
}

// PAGE: Messages — Lost Cat Contact (app/messages/page.tsx → route: /messages)