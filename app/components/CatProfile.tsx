'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Cat {
  id: string;
  name: string;
  lat: number;
  lng: number;
  status: string;
  previous_status: string | null;
  image_url: string;
  created_at: string;
  attributes?: {
    gender?: string;
    age?: string;
    coat?: string;
    eyes?: string;
    tnr?: string;
    health_status?: string;
    friendliness?: string;
    feeding_status?: string;
    spayed_neutered?: string;
    tail?: string;
    scars?: string;
    notes?: string;
  };
}

interface Sighting {
  id: string;
  cat_id: string;
  user_id: string;
  lat: number;
  lng: number;
  note: string | null;
  created_at: string;
}

interface CatProfileProps {
  cat: Cat;
  onClose: () => void;
  onStatusChange?: () => void;
}

const statusColors: Record<string, string> = {
  stray: '#FF9800',
  community: '#4CAF50',
  lost: '#F44336',
  homed: '#2196F3',
};

const statusEmoji: Record<string, string> = {
  stray: '🏚️',
  community: '🏘️',
  lost: '🚨',
  homed: '🏠',
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  if (months === 1) return '1 month ago';
  return `${months} months ago`;
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
  const [showSightingModal, setShowSightingModal] = useState(false);
  const [showLostModal, setShowLostModal] = useState(false);
  const [showFoundModal, setShowFoundModal] = useState(false);
  const [note, setNote] = useState('');
  const [gpsLoading, setGpsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sightingSuccess, setSightingSuccess] = useState(false);
  const [lostSaving, setLostSaving] = useState(false);
  const [gpsError, setGpsError] = useState('');
  const [user, setUser] = useState<any>(null);

  const date = new Date(currentCat.created_at).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  });

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    loadSightings();
  }, []);

  async function loadSightings() {
    const { data, error } = await supabase
      .from('sightings').select('*').eq('cat_id', currentCat.id)
      .order('created_at', { ascending: false });
    if (!error && data) setSightings(data);
  }

  function handleSightingClick() {
    if (!user) { alert('Please log in to log a sighting!'); return; }
    setShowSightingModal(true);
    setGpsError(''); setNote(''); setSightingSuccess(false);
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
        if (error) { setGpsError('Failed to save sighting: ' + error.message); }
        else { setSightingSuccess(true); await loadSightings(); setTimeout(() => { setShowSightingModal(false); setSightingSuccess(false); }, 2000); }
      },
      (err) => {
        setGpsLoading(false);
        setGpsError(err.code === err.PERMISSION_DENIED ? '📍 GPS permission denied.' : 'Could not get your location.');
      },
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
    setCurrentCat((prev) => ({ ...prev, previous_status: prev.status, status: 'lost' }));
    setLostSaving(false); setShowLostModal(false); onStatusChange?.();
  }

  async function handleMarkFound() {
    if (!user) { alert('Please log in first.'); return; }
    setLostSaving(true);
    const revertTo = currentCat.previous_status || 'stray';
    const { error } = await supabase.from('cats').update({ status: revertTo, previous_status: null }).eq('id', currentCat.id);
    if (error) { alert('Failed: ' + error.message); setLostSaving(false); return; }
    setCurrentCat((prev) => ({ ...prev, status: revertTo, previous_status: null }));
    setLostSaving(false); setShowFoundModal(false); onStatusChange?.();
  }

  const lastSighting = sightings[0];
  const isLost = currentCat.status === 'lost';
  const a = currentCat.attributes || {};

  // Check if there are any non-Unknown attributes to show
  const hasAttributes = Object.values(a).some(v => v && v !== 'Unknown');

  return (
    <div style={{ position: 'fixed', top: 0, right: 0, width: '100%', maxWidth: 400, height: '100vh', background: 'white', boxShadow: '-4px 0 30px rgba(0,0,0,0.15)', zIndex: 1000, overflowY: 'auto', animation: 'slideIn 0.3s ease' }}>
      <style>{`@keyframes slideIn { from { transform: translateX(100%) } to { transform: translateX(0) } }`}</style>

      {isLost && (
        <div style={{ background: '#F44336', color: 'white', textAlign: 'center', padding: '10px 16px', fontSize: 15, fontWeight: 700, letterSpacing: 0.5 }}>
          🚨 THIS CAT HAS BEEN REPORTED LOST — Please log a sighting if you see them!
        </div>
      )}

      <button onClick={onClose} style={{ position: 'absolute', top: isLost ? 52 : 16, right: 16, background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%', width: 36, height: 36, color: 'white', fontSize: 18, cursor: 'pointer', zIndex: 1 }}>✕</button>

      {currentCat.image_url ? (
        <img src={currentCat.image_url} alt={currentCat.name} style={{ width: '100%', height: 280, objectFit: 'cover' }} />
      ) : (
        <div style={{ width: '100%', height: 280, background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 80 }}>🐱</div>
      )}

      <div style={{ padding: 24 }}>

        {/* Name + status */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700 }}>{currentCat.name}</h1>
          <span style={{ background: statusColors[currentCat.status] || '#888', color: 'white', borderRadius: 20, padding: '4px 12px', fontSize: 13, fontWeight: 600 }}>
            {statusEmoji[currentCat.status]} {currentCat.status}
          </span>
        </div>

        {/* Details card */}
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

        {/* Attributes */}
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
            {a.notes && (
              <div style={{ padding: '8px 0', fontSize: 13, color: '#555', fontStyle: 'italic' }}>
                📝 {a.notes}
              </div>
            )}
          </div>
        )}

        {/* Recent sightings */}
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

        {/* Action buttons */}
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
            <button onClick={() => setShowLostModal(true)} style={{ padding: 14, borderRadius: 10, border: '1px solid #ddd', background: 'white', fontSize: 15, cursor: 'pointer' }}>
              🚨 Mark as Lost
            </button>
          )}
        </div>
      </div>

      {/* Sighting Modal */}
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
                <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. Looks healthy, near the park bench" style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #ddd', boxSizing: 'border-box', height: 80, fontSize: 14, resize: 'none', marginBottom: 16 }} />
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

      {/* Mark as Lost Modal */}
      {showLostModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
          <div style={{ background: 'white', borderRadius: 16, padding: 28, width: 340, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <h2 style={{ margin: '0 0 8px', fontSize: 20 }}>🚨 Mark as Lost</h2>
            <p style={{ color: '#555', fontSize: 14, margin: '0 0 20px', lineHeight: 1.6 }}>This will alert all community members who have previously sighted <strong>{currentCat.name}</strong>.</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowLostModal(false)} style={{ flex: 1, padding: 12, borderRadius: 8, border: '1px solid #ddd', background: 'white', cursor: 'pointer', fontSize: 14 }}>Cancel</button>
              <button onClick={handleMarkLost} disabled={lostSaving} style={{ flex: 1, padding: 12, borderRadius: 8, border: 'none', background: '#F44336', color: 'white', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>
                {lostSaving ? 'Alerting...' : 'Yes, Mark Lost'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mark as Found Modal */}
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