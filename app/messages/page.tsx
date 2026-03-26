// @ts-nocheck
// PAGE: Messages — Lost Cat Contact (app/messages/page.tsx → route: /messages)
'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import Navbar from '../components/Navbar';

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

export default function MessagesPage() {
  const [currentUser, setCurrentUser] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profileCache, setProfileCache] = useState({});
  const threadEndRef = useRef(null);
  const channelRef = useRef(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { window.location.href = '/login'; return; }
      setCurrentUser(data.user);
      loadConversations(data.user.id);
    });
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    const params = new URLSearchParams(window.location.search);
    const withId = params.get('with');
    if (withId) openConversation(withId);
  }, [currentUser]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const catId = params.get('cat');
    const catName = params.get('name');
    if (catId && catName) {
      setNewMessage(`Hi! I think I may have spotted your lost cat ${catName}. ${window.location.origin}/cat/${catId}`);
    }
  }, []);

  async function getProfile(userId) {
    if (profileCache[userId]) return profileCache[userId];
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
    const profile = data || { id: userId, display_name: null, avatar_url: null };
    setProfileCache(c => ({ ...c, [userId]: profile }));
    return profile;
  }

  async function loadConversations(userId) {
    setLoading(true);
    const { data } = await supabase.from('messages').select('*').or(`from_id.eq.${userId},to_id.eq.${userId}`).order('created_at', { ascending: false });
    if (!data) { setLoading(false); return; }
    const convMap = {};
    for (const msg of data) {
      const otherId = msg.from_id === userId ? msg.to_id : msg.from_id;
      if (!convMap[otherId]) convMap[otherId] = { otherId, lastMsg: msg, unread: 0 };
      if (!msg.read && msg.to_id === userId) convMap[otherId].unread++;
    }
    const convList = await Promise.all(Object.values(convMap).map(async (conv) => {
      const profile = await getProfile(conv.otherId);
      return { ...conv, profile };
    }));
    convList.sort((a, b) => new Date(b.lastMsg.created_at).getTime() - new Date(a.lastMsg.created_at).getTime());
    setConversations(convList);
    setLoading(false);
  }

  async function openConversation(otherId) {
    setSelectedUserId(otherId);
    const profile = await getProfile(otherId);
    setSelectedProfile(profile);
    await loadThread(otherId);
    if (channelRef.current) supabase.removeChannel(channelRef.current);
    channelRef.current = supabase.channel(`messages-${otherId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const msg = payload.new;
        if ((msg.from_id === otherId && msg.to_id === currentUser?.id) || (msg.from_id === currentUser?.id && msg.to_id === otherId)) {
          setMessages(prev => [...prev, msg]);
        }
      }).subscribe();
  }

  async function loadThread(otherId) {
    if (!currentUser) return;
    const { data } = await supabase.from('messages').select('*')
      .or(`and(from_id.eq.${currentUser.id},to_id.eq.${otherId}),and(from_id.eq.${otherId},to_id.eq.${currentUser.id})`)
      .order('created_at', { ascending: true });
    setMessages(data || []);
    await supabase.from('messages').update({ read: true }).eq('from_id', otherId).eq('to_id', currentUser.id).eq('read', false);
    setConversations(prev => prev.map(c => c.otherId === otherId ? { ...c, unread: 0 } : c));
  }

  useEffect(() => { threadEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  async function handleSend() {
    if (!newMessage.trim() || !currentUser || !selectedUserId) return;
    setSending(true);
    const { data: msg } = await supabase.from('messages').insert({ from_id: currentUser.id, to_id: selectedUserId, content: newMessage.trim() }).select().single();
    setSending(false);
    setNewMessage('');
    if (msg) {
      setMessages(prev => [...prev, msg]);
      await supabase.from('notifications').insert({ user_id: selectedUserId, cat_id: null, type: 'message', message: '✉️ You have a new message' });
      setConversations(prev => {
        const exists = prev.find(c => c.otherId === selectedUserId);
        if (exists) return prev.map(c => c.otherId === selectedUserId ? { ...c, lastMsg: msg } : c);
        return [{ otherId: selectedUserId, lastMsg: msg, unread: 0, profile: selectedProfile }, ...prev];
      });
    }
  }

  const displayName = (profile) => profile?.display_name || 'Anonymous';
  const avatarLetter = (profile) => (profile?.display_name || profile?.id || '?')[0].toUpperCase();

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, sans-serif', background: '#f7f7f7' }}>
      <Navbar />
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        {/* Conversation list */}
        <div style={{ width: 300, flexShrink: 0, background: 'white', borderRight: '1px solid #f0f0f0', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid #f5f5f5', fontSize: 13, fontWeight: 700, color: '#888' }}>CONVERSATIONS</div>
          {loading && <div style={{ padding: 24, color: '#ccc', fontSize: 13, textAlign: 'center' }}>Loading...</div>}
          {!loading && conversations.length === 0 && <div style={{ padding: 24, color: '#ccc', fontSize: 13, textAlign: 'center', lineHeight: 1.6 }}>No messages yet.<br />Contact the owner of a lost cat to start.</div>}
          {conversations.map(conv => (
            <div key={conv.otherId} onClick={() => openConversation(conv.otherId)}
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', cursor: 'pointer', background: selectedUserId === conv.otherId ? '#fff5f5' : 'white', borderLeft: selectedUserId === conv.otherId ? '3px solid #FF6B6B' : '3px solid transparent', borderBottom: '1px solid #fafafa' }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#FF6B6B', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16, flexShrink: 0, overflow: 'hidden' }}>
                {conv.profile?.avatar_url ? <img src={conv.profile.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : avatarLetter(conv.profile)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                  <span style={{ fontWeight: conv.unread > 0 ? 700 : 600, fontSize: 13, color: '#111' }}>{displayName(conv.profile)}</span>
                  <span style={{ fontSize: 10, color: '#bbb' }}>{timeAgo(conv.lastMsg.created_at)}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 12, color: conv.unread > 0 ? '#333' : '#aaa', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, fontWeight: conv.unread > 0 ? 600 : 400 }}>
                    {conv.lastMsg.from_id === currentUser?.id ? 'You: ' : ''}{conv.lastMsg.content}
                  </span>
                  {conv.unread > 0 && <span style={{ background: '#FF6B6B', color: 'white', borderRadius: '50%', width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>{conv.unread}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Thread */}
        {selectedUserId ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <div style={{ flexShrink: 0, padding: '14px 20px', background: 'white', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#FF6B6B', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 15, overflow: 'hidden', flexShrink: 0 }}>
                {selectedProfile?.avatar_url ? <img src={selectedProfile.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : avatarLetter(selectedProfile)}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#111' }}>{displayName(selectedProfile)}</div>
                <a href={`/profile/${selectedUserId}`} style={{ fontSize: 11, color: '#FF6B6B', textDecoration: 'none' }}>View profile →</a>
              </div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 10px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {messages.length === 0 && <div style={{ textAlign: 'center', color: '#ccc', fontSize: 13, marginTop: 40 }}>No messages yet. Say hello! 👋</div>}
              {messages.map(msg => {
                const isMine = msg.from_id === currentUser?.id;
                return (
                  <div key={msg.id} style={{ display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start' }}>
                    <div style={{ maxWidth: '70%', padding: '10px 14px', borderRadius: isMine ? '18px 18px 4px 18px' : '18px 18px 18px 4px', background: isMine ? '#FF6B6B' : 'white', color: isMine ? 'white' : '#222', fontSize: 14, lineHeight: 1.5, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
                      <div>{msg.content}</div>
                      <div style={{ fontSize: 10, marginTop: 4, opacity: 0.6, textAlign: isMine ? 'right' : 'left' }}>{timeAgo(msg.created_at)}{isMine && (msg.read ? ' · ✓✓' : ' · ✓')}</div>
                    </div>
                  </div>
                );
              })}
              <div ref={threadEndRef} />
            </div>
            <div style={{ flexShrink: 0, padding: '12px 16px', background: 'white', borderTop: '1px solid #f0f0f0', display: 'flex', gap: 10, alignItems: 'flex-end' }}>
              <textarea value={newMessage} onChange={e => setNewMessage(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder="Type a message... (Enter to send)" rows={1}
                style={{ flex: 1, padding: '10px 14px', borderRadius: 20, border: '1px solid #eee', fontSize: 14, resize: 'none', fontFamily: 'inherit', outline: 'none', background: '#fafafa' }} />
              <button onClick={handleSend} disabled={sending || !newMessage.trim()}
                style={{ padding: '10px 18px', borderRadius: 20, border: 'none', background: newMessage.trim() ? '#FF6B6B' : '#eee', color: newMessage.trim() ? 'white' : '#aaa', fontWeight: 700, fontSize: 14, cursor: newMessage.trim() ? 'pointer' : 'default', flexShrink: 0 }}>
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