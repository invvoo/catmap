// @ts-nocheck
'use client';
import { supabase } from '../../lib/supabase';

import { useState, useEffect } from 'react';


interface Cat {
  id: string;
  name: string;
  lat: number;
  lng: number;
  status: string;
  previous_status: string | null;
  image_url: string;
  created_at: string;
  owner_id?: string | null;
  owner_claim_image_url?: string | null;
  owner_claim_status?: string | null;
  attributes?: {
    gender?: string; age?: string; coat?: string; eyes?: string; tnr?: string;
    health_status?: string; friendliness?: string; feeding_status?: string;
    spayed_neutered?: string; tail?: string; scars?: string; notes?: string;
  };
}

interface Sighting {
  id: string; cat_id: string; user_id: string;
  lat: number; lng: number; note: string | null; created_at: string;
}

interface CatProfileProps {
  cat: Cat; onClose: () => void; onStatusChange?: () => void;
}

const statusColors: Record<string, string> = {
  stray: '#FF9800', community: '#4CAF50', lost: '#F44336', homed: '#2196F3',
};
const statusEmoji: Record<string, string> = {
  stray: '🏚️', community: '🏘️', lost: '🚨', homed: '🏠',
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  return months === 1 ? '1 month ago' : `${months} months ago`;
}

function AttrRow({ label, value }: { label: string; value?: string | null }) {
  if (!value || value === 'Unknown') return null;
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '6px 0', borderBottom: '1px solid #f0f0f0' }}>
      <span style={{ color: '#888', fontSize: 13, flexShrink: 0, marginRight: 12 }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: '#222', textAlign: 'right' }}>{value}</span>
    </div>
  );
}

export default function CatProfile({ cat, onClose, onStatusChange }: CatProfileProps) {
  const [currentCat, setCurrentCat] = useState<Cat>(cat);
  const [sightings, setSightings] = useState<Sighting[]>([]);
  const [user, setUser] = useState<any>(null);

  const [showSightingModal, setShowSightingModal] = useState(false);
  const [note, setNote] = useState('');
  const [gpsLoading, setGpsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sightingSuccess, setSightingSuccess] = useState(false);
  const [gpsError, setGpsError] = useState('');

  const [showLostModal, setShowLostModal] = useState(false);
  const [showFoundModal, setShowFoundModal] = useState(false);
  const [lostSaving, setLostSaving] = useState(false);

  const [nameVotes, setNameVotes] = useState<{ suggested_name: string; count: number }[]>([]);
  const [myVote, setMyVote] = useState<string | null>(null);
  const [newNameInput, setNewNameInput] = useState('');
  const [voteSaving, setVoteSaving] = useState(false);

  const [showClaimModal, setShowClaimModal] = useState(false);
  const [claimPhoto, setClaimPhoto] = useState<File | null>(null);
  const [claimPhotoPreview, setClaimPhotoPreview] = useState<string | null>(null);
  const [claimSaving, setClaimSaving] = useState(false);
  const [claimError, setClaimError] = useState('');

  const date = new Date(currentCat.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const isLost = currentCat.status === 'lost';
  const isStray = currentCat.status === 'stray' || currentCat.status === 'community';
  const a = currentCat.attributes || {};
  const hasAttributes = Object.values(a).some(v => v && v !== 'Unknown');
  const lastSighting = sightings[0];
  const leadingName = nameVotes[0]?.suggested_name || null;
  const displayName = currentCat.name === 'Unknown' && leadingName ? leadingName : currentCat.name;

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      if (data.user) loadMyVote(data.user.id);
    });
    loadSightings();
    loadNameVotes();
  }, []);

  async function loadSightings() {
    const { data } = await supabase.from('sightings').select('*').eq('cat_id', currentCat.id).order('created_at', { ascending: false });
    if (data) setSightings(data);
  }

  async function loadNameVotes() {
    const { data } = await supabase.from('cat_name_votes').select('suggested_name').eq('cat_id', currentCat.id);
    if (!data) return;
    const counts: Record<string, number> = {};
    data.forEach(({ suggested_name }) => { counts[suggested_name] = (counts[suggested_name] || 0) + 1; });
    setNameVotes(Object.entries(counts).map(([suggested_name, count]) => ({ suggested_name, count })).sort((a, b) => b.count - a.count));
  }

  async function loadMyVote(userId: string) {
    const { data } = await supabase.from('cat_name_votes').select('suggested_name')
      .eq('cat_id', currentCat.id).eq('user_id', userId).maybeSingle();
    if (data) setMyVote(data.suggested_name);
  }

  async function handleVote(name: string) {
    if (!user) return;
    setVoteSaving(true);
    const { error } = await supabase.from('cat_name_votes').upsert(
      { cat_id: currentCat.id, user_id: user.id, suggested_name: name },
      { onConflict: 'cat_id,user_id' }
    );
    if (!error) { setMyVote(name); await loadNameVotes(); }
    setVoteSaving(false);
  }

  async function handleSubmitNewName() {
    const trimmed = newNameInput.trim();
    if (!trimmed || !user) return;
    setNewNameInput('');
    await handleVote(trimmed);
  }

  function handleSightingClick() {
    if (!user) { alert('Please log in to log a sighting!'); return; }
    setGpsError(''); setNote(''); setSightingSuccess(false);
    setShowSightingModal(true);
  }

  async function handleSubmitSighting() {
    setGpsLoading(true); setGpsError('');
    if (!navigator.geolocation) { setGpsError('Geolocation not supported.'); setGpsLoading(false); return; }
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        setGpsLoading(false); setSaving(true);
        const { error } = await supabase.from('sightings').insert({
          cat_id: currentCat.id, user_id: user.id,
          lat: position.coords.latitude, lng: position.coords.longitude,
          note: note.trim() || null,
        });
        setSaving(false);
        if (error) { setGpsError('Failed to save: ' + error.message); }
        else { setSightingSuccess(true); await loadSightings(); setTimeout(() => { setShowSightingModal(false); setSightingSuccess(false); }, 2000); }
      },
      (err) => { setGpsLoading(false); setGpsError(err.code === err.PERMISSION_DENIED ? '📍 GPS permission denied.' : 'Could not get location.'); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function handleMarkLost() {
    if (!user) { alert('Please log in first.'); return; }
    setLostSaving(true);
    const { error } = await supabase.from('cats').update({ previous_status: currentCat.status, status: 'lost' }).eq('id', currentCat.id);
    if (error) { alert('Failed: ' + error.message); setLostSaving(false); return; }
    await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/notify-lost-cat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}` },
      body: JSON.stringify({ cat_id: currentCat.id, cat_name: currentCat.name }),
    });
    setCurrentCat((prev: Cat) => ({ ...prev, previous_status: prev.status, status: 'lost' }));
    setLostSaving(false); setShowLostModal(false); onStatusChange?.();
  }

  async function handleMarkFound() {
    if (!user) { alert('Please log in first.'); return; }
    setLostSaving(true);
    const revertTo = currentCat.previous_status || 'stray';
    const { error } = await supabase.from('cats').update({ status: revertTo, previous_status: null }).eq('id', currentCat.id);
    if (error) { alert('Failed: ' + error.message); setLostSaving(false); return; }
    setCurrentCat((prev: Cat) => ({ ...prev, status: revertTo, previous_status: null }));
    setLostSaving(false); setShowFoundModal(false); onStatusChange?.();
  }

  function handleClaimPhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setClaimPhoto(file);
    setClaimPhotoPreview(URL.createObjectURL(file));
    setClaimError('');
  }

  async function handleClaimOwnership() {
    if (!user || !claimPhoto) return;
    setClaimSaving(true); setClaimError('');
    const filename = `${Date.now()}_claim_${claimPhoto.name}`;
    const { error: uploadError } = await supabase.storage.from('cat-photos').upload(filename, claimPhoto);
    if (uploadError) { setClaimError('Photo upload failed: ' + uploadError.message); setClaimSaving(false); return; }
    const { data: urlData } = supabase.storage.from('cat-photos').getPublicUrl(filename);
    const { error } = await supabase.from('cats').update({
      owner_id: user.id, owner_claim_image_url: urlData.publicUrl,
      owner_claim_status: 'pending', status: 'homed', previous_status: currentCat.status,
    }).eq('id', currentCat.id);
    if (error) { setClaimError('Failed: ' + error.message); setClaimSaving(false); return; }
    setCurrentCat((prev: Cat) => ({ ...prev, owner_id: user.id, owner_claim_status: 'pending', status: 'homed', previous_status: prev.status }));
    setShowClaimModal(false); setClaimPhoto(null); setClaimPhotoPreview(null);
    setClaimSaving(false); onStatusChange?.();
  }

  return (
    <div style={{ position: 'fixed', top: 0, right: 0, width: '100%', maxWidth: 400, height: '100vh', background: 'white', boxShadow: '-4px 0 30px rgba(0,0,0,0.15)', zIndex: 1000, overflowY: 'auto', animation: 'slideIn 0.3s ease' }}>
      <style>{`@keyframes slideIn { from { transform: translateX(100%) } to { transform: translateX(0) } }`}</style>

      {isLost && (
        <div style={{ background: '#F44336', color: 'white', textAlign: 'center', padding: '10px 16px', fontSize: 15, fontWeight: 700 }}>
          🚨 THIS CAT HAS BEEN REPORTED LOST
        </div>
      )}

      <button onClick={onClose} style={{ position: 'absolute', top: isLost ? 52 : 16, right: 16, background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%', width: 36, height: 36, color: 'white', fontSize: 18, cursor: 'pointer', zIndex: 1 }}>✕</button>

      {currentCat.image_url
        ? <img src={currentCat.image_url} alt={currentCat.name} style={{ width: '100%', height: 280, objectFit: 'cover' }} />
        : <div style={{ width: '100%', height: 280, background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 80 }}>🐱</div>
      }

      <div style={{ padding: 24 }}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700 }}>{displayName}</h1>
            {currentCat.name === 'Unknown' && leadingName && (
              <div style={{ fontSize: 12, color: '#aaa', marginTop: 2 }}>community name · {nameVotes[0]?.count} vote{nameVotes[0]?.count !== 1 ? 's' : ''}</div>
            )}
          </div>
          <span style={{ background: statusColors[currentCat.status] || '#888', color: 'white', borderRadius: 20, padding: '4px 12px', fontSize: 13, fontWeight: 600 }}>
            {statusEmoji[currentCat.status]} {currentCat.status}
          </span>
        </div>

        <div style={{ background: '#f9f9f9', borderRadius: 12, padding: 16, marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ color: '#888', fontSize: 14 }}>First seen</span>
            <span style={{ fontSize: 14, fontWeight: 600 }}>{date}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ color: '#888', fontSize: 14 }}>Location</span>
            <span style={{ fontSize: 14, fontWeight: 600 }}>{currentCat.lat.toFixed(4)}, {currentCat.lng.toFixed(4)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: lastSighting ? 8 : 0 }}>
            <span style={{ color: '#888', fontSize: 14 }}>Total sightings</span>
            <span style={{ fontSize: 14, fontWeight: 600 }}>{sightings.length}</span>
          </div>
          {lastSighting && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#888', fontSize: 14 }}>Last seen</span>
              <span style={{ fontSize: 14, fontWeight: 600 }}>{timeAgo(lastSighting.created_at)}</span>
            </div>
          )}
        </div>

        {hasAttributes && (
          <div style={{ background: '#f9f9f9', borderRadius: 12, padding: '4px 16px', marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: 1, padding: '10px 0 4px' }}>Cat Details</div>
            <AttrRow label="Gender" value={a.gender} />
            <AttrRow label="Age" value={a.age} />
            <AttrRow label="Coat & Markings" value={a.coat} />
            <AttrRow label="Eye Color" value={a.eyes} />
            <AttrRow label="Clipped Ear (TNR)" value={a.tnr} />
            <AttrRow label="Health" value={a.health_status} />
            <AttrRow label="Friendliness" value={a.friendliness} />
            <AttrRow label="Feeding Status" value={a.feeding_status} />
            <AttrRow label="Spayed / Neutered" value={a.spayed_neutered} />
            <AttrRow label="Tail" value={a.tail} />
            <AttrRow label="Scars" value={a.scars} />
            {a.notes && <div style={{ padding: '8px 0', fontSize: 13, color: '#555', fontStyle: 'italic' }}>📝 {a.notes}</div>}
          </div>
        )}

        {isStray && (
          <div style={{ background: '#fafafa', borderRadius: 12, padding: 16, marginBottom: 20, border: '1px solid #f0f0f0' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>🗳️ Community Name Vote</div>
            {nameVotes.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                {nameVotes.map(({ suggested_name, count }, i) => {
                  const isVoted = myVote === suggested_name;
                  const isLeading = i === 0;
                  const pct = Math.round((count / nameVotes[0].count) * 100);
                  return (
                    <div key={suggested_name} onClick={() => !voteSaving && user && handleVote(suggested_name)}
                      style={{ marginBottom: 8, borderRadius: 8, overflow: 'hidden', border: isVoted ? '2px solid #FF6B6B' : '2px solid transparent', background: 'white', cursor: user ? 'pointer' : 'default', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                      <div style={{ position: 'relative', padding: '9px 12px' }}>
                        <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: `${pct}%`, background: isLeading ? '#fff3f3' : '#f5f5f5', borderRadius: 6 }} />
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            {isLeading && <span>👑</span>}
                            <span style={{ fontWeight: isLeading ? 700 : 500, fontSize: 14 }}>{suggested_name}</span>
                            {isVoted && <span style={{ fontSize: 11, color: '#FF6B6B', fontWeight: 700 }}>✓ your vote</span>}
                          </div>
                          <span style={{ fontSize: 13, fontWeight: 600, color: '#888' }}>{count}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {user ? (
              <div style={{ display: 'flex', gap: 8 }}>
                <input value={newNameInput} onChange={e => setNewNameInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSubmitNewName()}
                  placeholder="Suggest a name…" style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14, outline: 'none' }} />
                <button onClick={handleSubmitNewName} disabled={!newNameInput.trim() || voteSaving}
                  style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: newNameInput.trim() ? '#FF6B6B' : '#eee', color: newNameInput.trim() ? 'white' : '#aaa', fontWeight: 600, fontSize: 13, cursor: newNameInput.trim() ? 'pointer' : 'default' }}>
                  {voteSaving ? '…' : 'Vote'}
                </button>
              </div>
            ) : (
              <div style={{ fontSize: 13, color: '#aaa', textAlign: 'center', padding: '8px 0' }}>
                <a href="/login" style={{ color: '#FF6B6B', fontWeight: 600 }}>Log in</a> to suggest or vote on a name
              </div>
            )}
            {myVote && <div style={{ fontSize: 12, color: '#aaa', marginTop: 10, textAlign: 'center' }}>Tap any name to change your vote</div>}
          </div>
        )}

        {sightings.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#333', marginBottom: 10 }}>Recent Sightings</h3>
            {sightings.slice(0, 3).map((s) => (
              <div key={s.id} style={{ borderLeft: '3px solid #FF6B6B', paddingLeft: 12, marginBottom: 10 }}>
                <div style={{ fontSize: 12, color: '#aaa' }}>{timeAgo(s.created_at)} · Anonymous</div>
                {s.note && <div style={{ fontSize: 14, color: '#555', marginTop: 2 }}>{s.note}</div>}
              </div>
            ))}
          </div>
        )}

        {currentCat.owner_id && (
          <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 10, background: currentCat.owner_claim_status === 'verified' ? '#e8f5e9' : '#fff8e1', border: `1px solid ${currentCat.owner_claim_status === 'verified' ? '#a5d6a7' : '#ffe082'}`, fontSize: 13, fontWeight: 600, color: currentCat.owner_claim_status === 'verified' ? '#2e7d32' : '#e65100' }}>
            {currentCat.owner_claim_status === 'verified' ? '✅ This cat has a verified owner'
              : currentCat.owner_id === user?.id ? '⏳ Your ownership claim is pending community verification'
              : '⏳ Ownership claim pending verification'}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button onClick={handleSightingClick} style={{ padding: 14, borderRadius: 10, border: 'none', background: '#FF6B6B', color: 'white', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
            📍 I saw this cat recently!
          </button>
          {isLost ? (
            <>
              <button onClick={() => setShowFoundModal(true)} style={{ padding: 14, borderRadius: 10, border: '1px solid #4CAF50', background: 'white', color: '#4CAF50', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
                ✅ Mark as Found
              </button>
              <button onClick={() => window.open(`/poster?catId=${currentCat.id}`, '_blank')} style={{ padding: 14, borderRadius: 10, border: '1px solid #111', background: 'white', fontSize: 15, cursor: 'pointer', fontWeight: 600 }}>
                🖨️ Generate Lost Poster
              </button>
            </>
          ) : (
            (currentCat.status === 'community' || currentCat.status === 'homed') && (
              <button onClick={() => setShowLostModal(true)} style={{ padding: 14, borderRadius: 10, border: '1px solid #ddd', background: 'white', fontSize: 15, cursor: 'pointer' }}>
                🚨 Mark as Lost
              </button>
            )
          )}
          {!currentCat.owner_id && user && (
            <button onClick={() => setShowClaimModal(true)} style={{ padding: 14, borderRadius: 10, border: '1px solid #2196F3', background: 'white', color: '#2196F3', fontSize: 15, cursor: 'pointer', fontWeight: 600 }}>
              🏠 Claim as Owner
            </button>
          )}
          {!currentCat.owner_id && !user && (
            <a href="/login" style={{ padding: 14, borderRadius: 10, border: '1px solid #ddd', background: 'white', color: '#888', fontSize: 15, textAlign: 'center', textDecoration: 'none', display: 'block', fontWeight: 600 }}>
              🏠 Log in to claim as owner
            </a>
          )}
        </div>
      </div>

      {showSightingModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
          <div style={{ background: 'white', borderRadius: 16, padding: 28, width: 340, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            {sightingSuccess ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
                <div style={{ fontSize: 18, fontWeight: 700 }}>Sighting logged!</div>
                <div style={{ color: '#888', fontSize: 14, marginTop: 4 }}>Thanks for the update.</div>
              </div>
            ) : (
              <>
                <h2 style={{ margin: '0 0 6px', fontSize: 20 }}>📍 Log a Sighting</h2>
                <p style={{ color: '#888', fontSize: 14, margin: '0 0 20px' }}>Your GPS location will be recorded anonymously.</p>
                <label style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: 14 }}>Note <span style={{ color: '#aaa', fontWeight: 400 }}>(optional)</span></label>
                <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. Looks healthy, near the park bench"
                  style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #ddd', boxSizing: 'border-box', height: 80, fontSize: 14, resize: 'none', marginBottom: 16 }} />
                {gpsError && <p style={{ color: '#F44336', fontSize: 13, marginBottom: 12 }}>{gpsError}</p>}
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => setShowSightingModal(false)} style={{ flex: 1, padding: 12, borderRadius: 8, border: '1px solid #ddd', background: 'white', cursor: 'pointer', fontSize: 14 }}>Cancel</button>
                  <button onClick={handleSubmitSighting} disabled={gpsLoading || saving} style={{ flex: 1, padding: 12, borderRadius: 8, border: 'none', background: '#FF6B6B', color: 'white', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>
                    {gpsLoading ? '📍 Getting GPS...' : saving ? 'Saving...' : 'Log Sighting'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {showLostModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
          <div style={{ background: 'white', borderRadius: 16, padding: 28, width: 340, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <h2 style={{ margin: '0 0 8px', fontSize: 20 }}>🚨 Mark as Lost</h2>
            <p style={{ color: '#555', fontSize: 14, margin: '0 0 20px', lineHeight: 1.6 }}>This will alert community members who have sighted <strong>{currentCat.name}</strong>.</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowLostModal(false)} style={{ flex: 1, padding: 12, borderRadius: 8, border: '1px solid #ddd', background: 'white', cursor: 'pointer', fontSize: 14 }}>Cancel</button>
              <button onClick={handleMarkLost} disabled={lostSaving} style={{ flex: 1, padding: 12, borderRadius: 8, border: 'none', background: '#F44336', color: 'white', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>
                {lostSaving ? 'Alerting...' : 'Yes, Mark Lost'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showClaimModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
          <div style={{ background: 'white', borderRadius: 16, padding: 28, width: 360, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <h2 style={{ margin: '0 0 8px', fontSize: 20 }}>🏠 Claim as Owner</h2>
            <p style={{ color: '#666', fontSize: 14, margin: '0 0 20px', lineHeight: 1.6 }}>
              Upload a photo of <strong>{currentCat.name === 'Unknown' ? 'this cat' : currentCat.name}</strong> in your home to verify ownership.
            </p>
            <label style={{ display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 6, color: '#444' }}>Photo of cat in your home *</label>
            <input type="file" accept="image/*" onChange={handleClaimPhotoChange} style={{ width: '100%', marginBottom: 10 }} />
            {claimPhotoPreview && <img src={claimPhotoPreview} alt="preview" style={{ width: '100%', borderRadius: 8, marginBottom: 12, maxHeight: 160, objectFit: 'cover' }} />}
            {claimError && <div style={{ background: '#fff3f3', border: '1px solid #ffcdd2', borderRadius: 8, padding: '8px 12px', marginBottom: 12, fontSize: 13, color: '#c62828' }}>⚠️ {claimError}</div>}
            <div style={{ background: '#fff8e1', border: '1px solid #ffe082', borderRadius: 8, padding: '10px 12px', marginBottom: 16, fontSize: 13, color: '#e65100', lineHeight: 1.5 }}>
              ⏳ Your claim will be <strong>pending</strong> until verified by the community. The cat's status will update to <strong>Homed</strong>.
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => { setShowClaimModal(false); setClaimPhoto(null); setClaimPhotoPreview(null); setClaimError(''); }}
                style={{ flex: 1, padding: 12, borderRadius: 8, border: '1px solid #ddd', background: 'white', cursor: 'pointer', fontSize: 14 }}>Cancel</button>
              <button onClick={handleClaimOwnership} disabled={!claimPhoto || claimSaving}
                style={{ flex: 1, padding: 12, borderRadius: 8, border: 'none', background: claimPhoto ? '#2196F3' : '#eee', color: claimPhoto ? 'white' : '#aaa', cursor: claimPhoto ? 'pointer' : 'default', fontSize: 14, fontWeight: 600 }}>
                {claimSaving ? 'Submitting...' : 'Submit Claim'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showFoundModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
          <div style={{ background: 'white', borderRadius: 16, padding: 28, width: 340, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <h2 style={{ margin: '0 0 8px', fontSize: 20 }}>✅ Mark as Found</h2>
            <p style={{ color: '#555', fontSize: 14, margin: '0 0 20px', lineHeight: 1.6 }}>This will revert <strong>{currentCat.name}</strong>'s status back to <strong>{currentCat.previous_status || 'stray'}</strong>.</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowFoundModal(false)} style={{ flex: 1, padding: 12, borderRadius: 8, border: '1px solid #ddd', background: 'white', cursor: 'pointer', fontSize: 14 }}>Cancel</button>
              <button onClick={handleMarkFound} disabled={lostSaving} style={{ flex: 1, padding: 12, borderRadius: 8, border: 'none', background: '#4CAF50', color: 'white', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>
                {lostSaving ? 'Saving...' : 'Yes, Mark Found'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

