// @ts-nocheck
'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { QRCodeSVG } from 'qrcode.react';

export default function PosterPage() {
  const [cat, setCat] = useState<any>(null);
  const [sighting, setSighting] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [phone, setPhone] = useState('');
  const [editingPhone, setEditingPhone] = useState(false);
  const [catId, setCatId] = useState<string | null>(null);
  const [lastSeenAddress, setLastSeenAddress] = useState<string | null>(null);

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('catId');
    if (!id) { setError('No cat ID provided.'); setLoading(false); return; }
    setCatId(id);
    Promise.all([
      supabase.from('cats').select('*').eq('id', id).single(),
      supabase.from('sightings').select('*').eq('cat_id', id).order('created_at', { ascending: false }).limit(1),
    ]).then(([{ data: catData, error: catErr }, { data: sightings }]) => {
      if (catErr || !catData) { setError('Cat not found.'); }
      else setCat(catData);
      const s = sightings?.[0];
      if (s) {
        setSighting(s);
        if (s.address) {
          setLastSeenAddress(s.address);
        } else if (s.lat && s.lng) {
          fetch(`https://nominatim.openstreetmap.org/reverse?lat=${s.lat}&lon=${s.lng}&format=json`)
            .then(r => r.json())
            .then(data => {
              const addr = data.address || {};
              const parts = [addr.road, addr.neighbourhood || addr.suburb || addr.quarter, addr.city || addr.town || addr.village].filter(Boolean);
              setLastSeenAddress(parts.length ? parts.join(', ') : `${s.lat.toFixed(4)}, ${s.lng.toFixed(4)}`);
            })
            .catch(() => setLastSeenAddress(`${s.lat.toFixed(4)}, ${s.lng.toFixed(4)}`));
        }
      }
      setLoading(false);
    });
  }, []);

  const catUrl = catId
    ? `${typeof window !== 'undefined' ? window.location.origin : 'https://catmap-snvw.vercel.app'}/cat/${catId}`
    : '';

  async function handleShare() {
    try {
      if (navigator.share) {
        await navigator.share({ title: `LOST CAT – ${cat?.name || 'Unknown'}`, url: catUrl });
      } else {
        await navigator.clipboard.writeText(catUrl);
        alert('Link copied!');
      }
    } catch {}
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ fontSize: 48 }}>🐱</div>
    </div>
  );
  if (error || !cat) return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif', gap: 12 }}>
      <div style={{ fontSize: 48 }}>🐾</div>
      <div style={{ fontSize: 16, color: '#888' }}>{error || 'Something went wrong.'}</div>
      <a href="/" style={{ color: '#FF6B6B', textDecoration: 'none', fontWeight: 600 }}>← Back to map</a>
    </div>
  );

  const a = cat.attributes || {};
  const displayName = cat.name && cat.name !== 'Unknown' ? cat.name : 'Unknown';
  const lostDate = cat.updated_at
    ? new Date(cat.updated_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : new Date(cat.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const lastSeenLocation = lastSeenAddress;

  const details = [
    a.gender && a.gender !== 'Unknown' && ['Gender', a.gender],
    a.age && a.age !== 'Unknown' && ['Age', a.age],
    a.coat && ['Coat', a.coat],
    a.eyes && ['Eyes', a.eyes],
    a.tnr && a.tnr !== 'Unknown' && a.tnr !== 'None' && ['Ear Clip (TNR)', a.tnr],
    a.tail && a.tail !== 'Unknown' && ['Tail', a.tail],
  ].filter(Boolean);

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; margin: 0; }
          .poster-wrap { padding: 0 !important; }
          .poster-sheet { box-shadow: none !important; border-radius: 0 !important; max-width: 100% !important; margin: 0 !important; }
        }
        @media screen {
          body { background: #f0f0f0; }
        }
      `}</style>

      {/* Toolbar */}
      <div className="no-print" style={{
        position: 'sticky', top: 0, zIndex: 100, background: 'white',
        borderBottom: '1px solid #eee', padding: '10px 20px',
        display: 'flex', gap: 10, alignItems: 'center', fontFamily: 'system-ui, sans-serif',
      }}>
        <a href={`/cat/${catId}`} style={{ color: '#888', fontSize: 14, textDecoration: 'none', marginRight: 'auto' }}>← Cat profile</a>
        <button onClick={() => window.print()} style={{ padding: '8px 18px', background: '#111', color: 'white', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
          🖨️ Print / Save PDF
        </button>
        <button onClick={handleShare} style={{ padding: '8px 18px', background: '#FF6B6B', color: 'white', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
          📤 Share
        </button>
      </div>

      {/* Poster sheet */}
      <div className="poster-wrap" style={{ padding: '28px 16px 60px', display: 'flex', justifyContent: 'center' }}>
        <div className="poster-sheet" style={{
          width: '100%', maxWidth: 540,
          background: 'white',
          borderRadius: 16,
          boxShadow: '0 4px 32px rgba(0,0,0,0.14)',
          overflow: 'hidden',
          fontFamily: 'system-ui, sans-serif',
        }}>

          {/* Red header */}
          <div style={{ background: '#F44336', padding: '20px 28px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: 11, letterSpacing: 5, color: 'rgba(255,255,255,0.75)', textTransform: 'uppercase', marginBottom: 6 }}>please help find</div>
            <div style={{ fontSize: 52, fontWeight: 900, color: 'white', letterSpacing: 3, lineHeight: 1 }}>LOST CAT</div>
          </div>

          {/* Photo */}
          {cat.image_url ? (
            <img src={cat.image_url} alt={displayName}
              style={{ width: '100%', maxHeight: 340, objectFit: 'cover', display: 'block' }} />
          ) : (
            <div style={{ width: '100%', height: 200, background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 80 }}>🐱</div>
          )}

          {/* Name + lost info */}
          <div style={{ padding: '20px 28px 0', textAlign: 'center', borderBottom: '1px solid #f0f0f0', paddingBottom: 16 }}>
            <div style={{ fontSize: 40, fontWeight: 900, color: '#111', letterSpacing: -1 }}>{displayName}</div>
            <div style={{ fontSize: 13, color: '#888', marginTop: 5 }}>
              {cat.status === 'lost' ? `Missing since ${lostDate}` : `Reported ${lostDate}`}
            </div>
            {lastSeenLocation && (
              <div style={{ fontSize: 13, color: '#555', marginTop: 3 }}>📍 Last seen near {lastSeenLocation}</div>
            )}
          </div>

          {/* Details */}
          {details.length > 0 && (
            <div style={{ padding: '14px 28px 0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {details.map(([label, value]) => (
                <div key={label} style={{ background: '#fafafa', borderRadius: 8, padding: '8px 12px' }}>
                  <div style={{ fontSize: 10, color: '#bbb', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700 }}>{label}</div>
                  <div style={{ fontSize: 14, color: '#222', fontWeight: 600 }}>{value}</div>
                </div>
              ))}
            </div>
          )}

          {/* Notes */}
          {a.notes && (
            <div style={{ margin: '14px 28px 0', background: '#fff8e1', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#555', lineHeight: 1.6 }}>
              <strong>Note:</strong> {a.notes}
            </div>
          )}

          {/* Phone number */}
          <div style={{ margin: '16px 28px 0', background: '#f7f7f7', borderRadius: 10, padding: '14px 16px' }}>
            <div style={{ fontSize: 11, color: '#aaa', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700, marginBottom: 8 }}>
              If you see this cat, please contact
            </div>
            {editingPhone ? (
              <div className="no-print" style={{ display: 'flex', gap: 8 }}>
                <input
                  autoFocus
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="Your phone number"
                  style={{ flex: 1, padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 17, fontFamily: 'system-ui, sans-serif' }}
                />
                <button onClick={() => setEditingPhone(false)}
                  style={{ padding: '10px 16px', background: '#111', color: 'white', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                  Done
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ fontSize: phone ? 22 : 14, fontWeight: 700, color: phone ? '#111' : '#bbb', flex: 1, fontStyle: phone ? 'normal' : 'italic' }}>
                  {phone || 'Tap to add your phone number'}
                </div>
                <button onClick={() => setEditingPhone(true)} className="no-print"
                  style={{ background: 'none', border: '1px solid #ddd', borderRadius: 6, padding: '4px 10px', fontSize: 12, cursor: 'pointer', color: '#666', flexShrink: 0 }}>
                  {phone ? 'Edit' : '+ Add'}
                </button>
              </div>
            )}
          </div>

          {/* QR code + link */}
          <div style={{ margin: '16px 28px 28px', display: 'flex', gap: 16, alignItems: 'center', background: '#111', borderRadius: 12, padding: '16px 18px' }}>
            <div style={{ background: 'white', padding: 6, borderRadius: 6, flexShrink: 0 }}>
              <QRCodeSVG value={catUrl} size={80} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700, marginBottom: 6 }}>Scan or visit to log a sighting</div>
              <div style={{ fontSize: 12, color: '#FF6B6B', wordBreak: 'break-all', lineHeight: 1.5 }}>{catUrl}</div>
              <div style={{ fontSize: 11, color: '#555', marginTop: 6 }}>🐱 CatMap · Community Cat Tracking</div>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
