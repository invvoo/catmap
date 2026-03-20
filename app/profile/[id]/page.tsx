// @ts-nocheck
// PAGE: User Profile (app/profile/[id]/page.tsx → route: /profile/[id])
'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '../../../lib/supabase';

const ROLES = {
  community:  { label: 'Community Member', emoji: '🏘️', color: '#4CAF50' },
  volunteer:  { label: 'Volunteer',         emoji: '🙋', color: '#2196F3' },
  vet:        { label: 'Vet / Medical',     emoji: '🩺', color: '#9C27B0' },
  rescue:     { label: 'Rescue Org',        emoji: '🚑', color: '#FF6B6B' },
};

const TRUST_LEVELS = [
  { min: 0,  max: 4,  label: 'New Member',  color: '#bbb' },
  { min: 5,  max: 14, label: 'Regular',     color: '#4CAF50' },
  { min: 15, max: 29, label: 'Trusted',     color: '#2196F3' },
  { min: 30, max: Infinity, label: 'Guardian', color: '#FF6B6B' },
];

function getTrustLevel(score) {
  return TRUST_LEVELS.find(l => score >= l.min && score <= l.max) ?? TRUST_LEVELS[0];
}

function timeAgo(dateStr) {
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return months === 1 ? '1 month ago' : `${months} months ago`;
}

const statusColors = { stray: '#FF9800', community: '#4CAF50', lost: '#F44336', homed: '#2196F3' };
const statusEmoji = { stray: '🏚️', community: '🏘️', lost: '🚨', homed: '🏠' };

export default function ProfilePage() {
  const params = useParams();
  const profileId = params?.id;

  const [profile, setProfile] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [isOwn, setIsOwn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [cats, setCats] = useState([]);
  const [sightingCount, setSightingCount] = useState(0);
  const [postCount, setPostCount] = useState(0);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editRole, setEditRole] = useState('community');
  const [saving, setSaving] = useState(false);
  const avatarInputRef = useRef(null);
  const [avatarUploading, setAvatarUploading] = useState(false);

  // Navbar state
  const [navProfile, setNavProfile] = useState(null);
  const [navUnread, setNavUnread] = useState(0);
  const [navNotifUnread, setNavNotifUnread] = useState(0);
  const [showNavMenu, setShowNavMenu] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUser(data.user);
      if (data.user?.id === profileId) setIsOwn(true);
      if (data.user) {
        supabase.from('profiles').select('display_name,avatar_url').eq('id', data.user.id).maybeSingle().then(({ data: p }) => setNavProfile(p));
        supabase.from('messages').select('id', { count: 'exact' }).eq('to_id', data.user.id).eq('read', false).then(({ count }) => setNavUnread(count || 0));
        supabase.from('notifications').select('id', { count: 'exact' }).eq('user_id', data.user.id).eq('read', false).then(({ count }) => setNavNotifUnread(count || 0));
      }
    });
    loadProfile();
    loadStats();
  }, [profileId]);

  async function loadProfile() {
    setLoading(true);
    const { data } = await supabase.from('profiles').select('*').eq('id', profileId).maybeSingle();
    if (data) { setProfile(data); setEditName(data.display_name || ''); setEditBio(data.bio || ''); setEditRole(data.role || 'community'); }
    setLoading(false);
  }

  async function loadStats() {
    const [catsRes, sightingsRes, postsRes] = await Promise.all([
      supabase.from('cats').select('*').eq('owner_id', profileId),
      supabase.from('sightings').select('id', { count: 'exact' }).eq('user_id', profileId),
      supabase.from('cat_posts').select('id', { count: 'exact' }).eq('user_id', profileId),
    ]);
    setCats(catsRes.data || []);
    setSightingCount(sightingsRes.count || 0);
    setPostCount(postsRes.count || 0);
  }

  async function handleSaveProfile() {
    setSaving(true);
    const updates = { id: profileId, display_name: editName.trim() || null, bio: editBio.trim() || null, role: editRole, trust_score: profile?.trust_score ?? 0 };
    const { data, error } = await supabase.from('profiles').upsert(updates).select().single();
    setSaving(false);
    if (!error && data) { setProfile(data); setEditing(false); }
  }

  async function handleAvatarUpload(file) {
    setAvatarUploading(true);
    const filename = `avatars/${profileId}_${Date.now()}.${file.name.split('.').pop()}`;
    const { error: upErr } = await supabase.storage.from('cat-photos').upload(filename, file, { upsert: true });
    if (!upErr) {
      const { data } = supabase.storage.from('cat-photos').getPublicUrl(filename);
      await supabase.from('profiles').upsert({ id: profileId, avatar_url: data.publicUrl });
      setProfile(p => ({ ...p, avatar_url: data.publicUrl }));
    }
    setAvatarUploading(false);
  }

  async function handleNavLogout() { await supabase.auth.signOut(); window.location.href = '/'; }

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#aaa' }}>Loading profile...</div>;

  const trustScore = profile?.trust_score ?? 0;
  const trustLevel = getTrustLevel(trustScore);
  const nextLevel = TRUST_LEVELS.find(l => l.min > trustScore);
  const progressPct = nextLevel ? Math.min(100, ((trustScore - trustLevel.min) / (nextLevel.min - trustLevel.min)) * 100) : 100;
  const role = ROLES[profile?.role || 'community'] ?? ROLES.community;
  const displayName = profile?.display_name || 'Anonymous';

  return (
    <div style={{ minHeight: '100vh', background: '#f7f7f7', fontFamily: 'system-ui, sans-serif' }}>

      {/* Navbar */}
      <div style={{ background: 'white', padding: '10px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 2px 10px rgba(0,0,0,0.08)', position: 'sticky', top: 0, zIndex: 100 }}>
        <a href="/" style={{ fontSize: 20, fontWeight: 700, textDecoration: 'none', color: '#222' }}>🐱 CatMap</a>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <a href="/about" style={{ fontSize: 13, fontWeight: 600, color: '#444', textDecoration: 'none', padding: '6px 12px', borderRadius: 8 }}>About</a>
          <a href="/care" style={{ fontSize: 13, fontWeight: 600, color: '#444', textDecoration: 'none', padding: '6px 12px', borderRadius: 8 }}>🐾 Care for Strays</a>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <a href="/" style={{ padding: '9px 18px', borderRadius: 8, border: 'none', background: '#FF6B6B', color: 'white', fontWeight: 700, fontSize: 14, textDecoration: 'none' }}>🐱 I met a cat!</a>
          {currentUser ? (
            <div style={{ position: 'relative' }}>
              <div onClick={() => setShowNavMenu(v => !v)} style={{ width: 36, height: 36, borderRadius: '50%', background: '#FF6B6B', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 15, cursor: 'pointer', border: '2px solid #ffccbc', overflow: 'hidden' }}>
                {navProfile?.avatar_url ? <img src={navProfile.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span>{currentUser.email?.[0]?.toUpperCase() ?? '?'}</span>}
              </div>
              {showNavMenu && (
                <>
                  <div onClick={() => setShowNavMenu(false)} style={{ position: 'fixed', inset: 0, zIndex: 200 }} />
                  <div style={{ position: 'absolute', top: 44, right: 0, background: 'white', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', border: '1px solid #f0f0f0', minWidth: 190, zIndex: 201, overflow: 'hidden' }}>
                    <div style={{ padding: '12px 16px', borderBottom: '1px solid #f5f5f5' }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#222' }}>{navProfile?.display_name || 'Anonymous'}</div>
                      <div style={{ fontSize: 11, color: '#aaa' }}>{currentUser.email}</div>
                    </div>
                    <a href={`/profile/${currentUser.id}`} style={{ display: 'block', padding: '11px 16px', fontSize: 13, fontWeight: 600, color: '#333', textDecoration: 'none', borderBottom: '1px solid #f5f5f5' }}>👤 View Profile</a>
                    <a href="/messages" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 16px', fontSize: 13, fontWeight: 600, color: '#333', textDecoration: 'none', borderBottom: '1px solid #f5f5f5' }}>
                      <span>✉️ Messages</span>{navUnread > 0 && <span style={{ background: '#FF6B6B', color: 'white', borderRadius: 10, padding: '1px 7px', fontSize: 11, fontWeight: 800 }}>{navUnread}</span>}
                    </a>
                    <a href="/notifications" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 16px', fontSize: 13, fontWeight: 600, color: '#333', textDecoration: 'none', borderBottom: '1px solid #f5f5f5' }}>
                      <span>🔔 Notifications</span>{navNotifUnread > 0 && <span style={{ background: '#FF6B6B', color: 'white', borderRadius: 10, padding: '1px 7px', fontSize: 11, fontWeight: 800 }}>{navNotifUnread}</span>}
                    </a>
                    <button onClick={handleNavLogout} style={{ width: '100%', padding: '11px 16px', border: 'none', background: 'white', textAlign: 'left', fontSize: 13, color: '#F44336', fontWeight: 600, cursor: 'pointer' }}>Sign out</button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <a href="/login" style={{ padding: '8px 20px', borderRadius: 8, background: '#333', color: 'white', textDecoration: 'none', fontWeight: 600, fontSize: 14 }}>Log in</a>
          )}
        </div>
      </div>

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '24px 16px' }}>

        {/* Profile card */}
        <div style={{ background: 'white', borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.07)', marginBottom: 16 }}>
          <div style={{ height: 80, background: 'linear-gradient(135deg, #FF6B6B 0%, #ff9a8b 100%)' }} />
          <div style={{ padding: '0 24px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: -36 }}>
              <div style={{ position: 'relative' }}>
                <div onClick={() => isOwn && avatarInputRef.current?.click()}
                  style={{ width: 72, height: 72, borderRadius: '50%', border: '4px solid white', background: '#FF6B6B', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', cursor: isOwn ? 'pointer' : 'default', boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}>
                  {profile?.avatar_url ? <img src={profile.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 28, color: 'white', fontWeight: 700 }}>{displayName[0]?.toUpperCase() ?? '?'}</span>}
                  {avatarUploading && <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%' }}>⏳</div>}
                </div>
                <input ref={avatarInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) handleAvatarUpload(f); }} />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {isOwn && !editing && (
                  <button onClick={() => setEditing(true)} style={{ padding: '7px 16px', borderRadius: 8, border: '1px solid #ddd', background: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#444' }}>✏️ Edit Profile</button>
                )}
              </div>
            </div>

            {editing ? (
              <div style={{ marginTop: 14 }}>
                <input value={editName} onChange={e => setEditName(e.target.value)} placeholder="Display name"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 15, fontWeight: 600, marginBottom: 10, boxSizing: 'border-box' }} />
                <textarea value={editBio} onChange={e => setEditBio(e.target.value)} placeholder="Short bio (optional)"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 13, resize: 'none', height: 70, marginBottom: 10, boxSizing: 'border-box', fontFamily: 'inherit' }} />
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#888', marginBottom: 8 }}>Role</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {Object.entries(ROLES).map(([key, r]) => (
                      <button key={key} onClick={() => setEditRole(key)}
                        style={{ padding: '6px 14px', borderRadius: 20, border: `2px solid ${editRole === key ? r.color : '#eee'}`, background: editRole === key ? r.color : 'white', color: editRole === key ? 'white' : '#555', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                        {r.emoji} {r.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => setEditing(false)} style={{ flex: 1, padding: 10, borderRadius: 8, border: '1px solid #ddd', background: 'white', cursor: 'pointer', fontSize: 13 }}>Cancel</button>
                  <button onClick={handleSaveProfile} disabled={saving} style={{ flex: 2, padding: 10, borderRadius: 8, border: 'none', background: '#FF6B6B', color: 'white', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                    {saving ? 'Saving...' : 'Save Profile'}
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#111', marginBottom: 4 }}>{displayName}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: role.color, color: 'white' }}>{role.emoji} {role.label}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: trustLevel.color, color: 'white' }}>⭐ {trustLevel.label}</span>
                </div>
                {profile?.bio && <p style={{ fontSize: 14, color: '#555', lineHeight: 1.5, margin: 0 }}>{profile.bio}</p>}
                {!profile && isOwn && <p style={{ fontSize: 13, color: '#aaa', fontStyle: 'italic' }}>Set up your profile so the community knows who you are.</p>}
              </div>
            )}
          </div>
        </div>

        {/* Trust score */}
        <div style={{ background: 'white', borderRadius: 16, padding: '20px 24px', boxShadow: '0 2px 12px rgba(0,0,0,0.07)', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#333' }}>⭐ Trust Score</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: trustLevel.color }}>{trustScore}</div>
          </div>
          <div style={{ height: 8, background: '#f0f0f0', borderRadius: 8, overflow: 'hidden', marginBottom: 8 }}>
            <div style={{ height: '100%', width: `${progressPct}%`, background: trustLevel.color, borderRadius: 8, transition: 'width 0.6s ease' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#bbb' }}>
            <span>{trustLevel.label}</span>
            {nextLevel ? <span>{nextLevel.min - trustScore} pts to {nextLevel.label}</span> : <span>Max level reached 🎉</span>}
          </div>
          <div style={{ marginTop: 14, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {[['Cat reported', '+2'], ['Sighting logged', '+1'], ['Owner verified', '+5'], ['Forum post', '+3']].map(([label, pts]) => (
              <div key={label} style={{ fontSize: 11, color: '#888', background: '#f9f9f9', padding: '4px 10px', borderRadius: 20, border: '1px solid #f0f0f0' }}>{pts} {label}</div>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 16 }}>
          {[{ label: 'Cats Reported', value: cats.length, emoji: '🐱' }, { label: 'Sightings Logged', value: sightingCount, emoji: '📍' }, { label: 'Forum Posts', value: postCount, emoji: '💬' }].map(s => (
            <div key={s.label} style={{ background: 'white', borderRadius: 12, padding: '16px 12px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
              <div style={{ fontSize: 24, marginBottom: 4 }}>{s.emoji}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#111' }}>{s.value}</div>
              <div style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Their cats */}
        {cats.length > 0 && (
          <div style={{ background: 'white', borderRadius: 16, padding: '20px 24px', boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#333', marginBottom: 14 }}>🐱 {isOwn ? 'Your' : `${displayName}'s`} Cats</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {cats.map(cat => (
                <a key={cat.id} href={`/cat/${cat.id}`}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none', padding: '8px', borderRadius: 10, border: '1px solid #f5f5f5', background: '#fafafa' }}>
                  {cat.image_url
                    ? <img src={cat.image_url} alt={cat.name} style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'cover', objectPosition: '50% 20%', flexShrink: 0 }} />
                    : <div style={{ width: 48, height: 48, borderRadius: 8, background: statusColors[cat.status] || '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>🐱</div>
                  }
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cat.name}</div>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 8, background: statusColors[cat.status] || '#eee', color: 'white' }}>{statusEmoji[cat.status]} {cat.status}</span>
                  </div>
                  <div style={{ fontSize: 11, color: '#bbb', flexShrink: 0 }}>{timeAgo(cat.created_at)}</div>
                </a>
              ))}
            </div>
          </div>
        )}

        {cats.length === 0 && <div style={{ textAlign: 'center', color: '#ccc', fontSize: 14, padding: '32px 0' }}>No cats reported yet 🐾</div>}
      </div>
    </div>
  );
}

// PAGE: User Profile (app/profile/[id]/page.tsx → route: /profile/[id])