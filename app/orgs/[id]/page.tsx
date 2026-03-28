// @ts-nocheck
// PAGE: Organization Profile (app/orgs/[id]/page.tsx → route: /orgs/[id])
'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../lib/supabase';
import Navbar from '../../components/Navbar';

const typeConfig = {
  adoption: { emoji: '🏠', color: '#4CAF50', label: 'Adoption Center' },
  vet: { emoji: '🏥', color: '#2196F3', label: 'Veterinary Clinic' },
  pound: { emoji: '🏛️', color: '#FF9800', label: 'Animal Pound' },
  rescue: { emoji: '🚨', color: '#F44336', label: 'Rescue Organization' },
};

export default function OrgProfilePage({ params }) {
  const orgId = params.id;
  const [org, setOrg] = useState(null);
  const [cats, setCats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  // Location fix
  const [resolvedLat, setResolvedLat] = useState(null);
  const [resolvedLng, setResolvedLng] = useState(null);
  const [resolvedAddress, setResolvedAddress] = useState('');
  const [locationSaving, setLocationSaving] = useState(false);
  const [locationSaved, setLocationSaved] = useState(false);
  const autocompleteInputRef = useRef(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    load();
  }, [orgId]);

  // Init Places Autocomplete for location fix
  useEffect(() => {
    if (!org || org.lat) return; // only if location is missing

    function initAC() {
      if (!autocompleteInputRef.current || !window.google?.maps?.places) return;
      const ac = new window.google.maps.places.Autocomplete(autocompleteInputRef.current, {
        types: ['address'],
        fields: ['formatted_address', 'geometry'],
      });
      ac.addListener('place_changed', () => {
        const place = ac.getPlace();
        if (!place.geometry) return;
        setResolvedLat(place.geometry.location.lat());
        setResolvedLng(place.geometry.location.lng());
        setResolvedAddress(place.formatted_address || '');
      });
    }

    if (window.google?.maps?.places) { initAC(); return; }

    const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
    const existing = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existing) { existing.addEventListener('load', initAC); return; }
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places`;
    script.async = true;
    script.onload = initAC;
    document.head.appendChild(script);
  }, [org]);

  async function load() {
    setLoading(true);
    const [{ data: orgData }, { data: catsData }] = await Promise.all([
      supabase.from('organizations').select('*').eq('id', orgId).maybeSingle(),
      supabase.from('cats').select('*').eq('organization_id', orgId),
    ]);
    setOrg(orgData);
    setCats(catsData || []);
    setLoading(false);
  }

  async function saveLocation() {
    if (!resolvedLat || !resolvedLng) return;
    setLocationSaving(true);
    await supabase.from('organizations').update({
      lat: resolvedLat,
      lng: resolvedLng,
      address: resolvedAddress || org.address,
    }).eq('id', orgId);
    setLocationSaving(false);
    setLocationSaved(true);
    await load();
    setTimeout(() => setLocationSaved(false), 3000);
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#f7f7f7', fontFamily: 'system-ui, sans-serif' }}>
        <Navbar />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 80, color: '#aaa', fontSize: 15 }}>Loading...</div>
      </div>
    );
  }

  if (!org) {
    return (
      <div style={{ minHeight: '100vh', background: '#f7f7f7', fontFamily: 'system-ui, sans-serif' }}>
        <Navbar />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 80, color: '#aaa', fontSize: 15 }}>Organization not found.</div>
      </div>
    );
  }

  const { emoji, color, label } = typeConfig[org.type] || { emoji: '🐱', color: '#9C27B0', label: org.type };
  const statusColors = { stray: '#FF9800', community: '#4CAF50', lost: '#F44336', homed: '#2196F3' };
  const statusEmoji = { stray: '🏚️', community: '🏘️', lost: '🚨', homed: '🏠' };
  const isOwner = user && org.created_by === user.id;
  const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid #e0e0e0', fontSize: 14, color: '#222', background: 'white', boxSizing: 'border-box', outline: 'none', fontFamily: 'system-ui, sans-serif' };

  return (
    <div style={{ minHeight: '100vh', background: '#f7f7f7', fontFamily: 'system-ui, sans-serif' }}>
      <Navbar />

      {/* Missing location warning for owner */}
      {isOwner && !org.lat && (
        <div style={{ background: '#FFF3E0', borderBottom: '2px solid #FF9800', padding: '16px 20px' }}>
          <div style={{ maxWidth: 720, margin: '0 auto' }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#E65100', marginBottom: 8 }}>
              ⚠️ Your organization is not on the map yet — location is missing
            </div>
            <p style={{ fontSize: 13, color: '#BF360C', margin: '0 0 12px' }}>
              Search for your address below to place it on the map.
            </p>
            <input
              ref={autocompleteInputRef}
              style={{ ...inputStyle, borderColor: resolvedLat ? '#4CAF50' : '#FF9800', marginBottom: 8 }}
              placeholder="Search your address…"
            />
            {resolvedAddress && (
              <div style={{ fontSize: 12, color: '#4CAF50', fontWeight: 600, marginBottom: 10 }}>
                ✓ {resolvedAddress}
              </div>
            )}
            {locationSaved ? (
              <div style={{ fontSize: 13, color: '#2E7D32', fontWeight: 700 }}>✅ Location saved! Your org will now appear on the map.</div>
            ) : (
              <button
                onClick={saveLocation}
                disabled={!resolvedLat || locationSaving}
                style={{ padding: '10px 20px', borderRadius: 8, border: 'none', background: resolvedLat ? '#FF9800' : '#ddd', color: resolvedLat ? 'white' : '#aaa', fontWeight: 700, fontSize: 14, cursor: resolvedLat ? 'pointer' : 'default' }}>
                {locationSaving ? 'Saving...' : '📍 Save Location'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Hero */}
      <div style={{ background: `linear-gradient(135deg, ${color}cc, ${color})`, padding: '36px 20px 32px', textAlign: 'center', color: 'white' }}>
        {org.logo_url
          ? <img src={org.logo_url} style={{ width: 80, height: 80, borderRadius: 16, objectFit: 'cover', border: '3px solid rgba(255,255,255,0.6)', marginBottom: 12 }} />
          : <div style={{ fontSize: 56, marginBottom: 8 }}>{emoji}</div>
        }
        <h1 style={{ fontSize: 28, fontWeight: 800, margin: '0 0 6px' }}>{org.name}</h1>
        <span style={{ fontSize: 13, fontWeight: 700, background: 'rgba(255,255,255,0.25)', color: 'white', borderRadius: 10, padding: '3px 12px' }}>{emoji} {label}</span>
        {org.verified && <div style={{ marginTop: 8, fontSize: 12, opacity: 0.9 }}>✅ Verified Organization</div>}
      </div>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px' }}>

        {/* Info Card */}
        <div style={{ background: 'white', borderRadius: 14, padding: '20px 24px', marginBottom: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #eee' }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#222', margin: '0 0 14px' }}>Contact & Info</h2>
          {org.address && (
            <div style={{ display: 'flex', gap: 10, marginBottom: 10, fontSize: 14, color: '#444' }}>
              <span>📍</span><span>{org.address}</span>
            </div>
          )}
          {org.phone && (
            <div style={{ display: 'flex', gap: 10, marginBottom: 10, fontSize: 14, color: '#444' }}>
              <span>📞</span><a href={`tel:${org.phone}`} style={{ color: '#444', textDecoration: 'none' }}>{org.phone}</a>
            </div>
          )}
          {org.website && (
            <div style={{ display: 'flex', gap: 10, marginBottom: 10, fontSize: 14 }}>
              <span>🌐</span><a href={org.website} target="_blank" rel="noreferrer" style={{ color: '#2196F3', textDecoration: 'none', wordBreak: 'break-all' }}>{org.website}</a>
            </div>
          )}
          {org.description && (
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #f0f0f0', fontSize: 14, color: '#555', lineHeight: 1.6 }}>
              {org.description}
            </div>
          )}
        </div>

        {/* Cats Section */}
        <h2 style={{ fontSize: 17, fontWeight: 700, color: '#222', margin: '0 0 14px' }}>
          🐱 Cats at this Organization ({cats.length})
        </h2>

        {cats.length === 0 ? (
          <div style={{ background: 'white', borderRadius: 12, padding: '32px 20px', textAlign: 'center', color: '#bbb', fontSize: 14, border: '1px solid #eee' }}>
            No cats listed yet.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 14 }}>
            {cats.map(cat => {
              const catColor = statusColors[cat.status] || '#888';
              return (
                <a key={cat.id} href={`/cat/${cat.id}`} style={{ textDecoration: 'none', background: 'white', borderRadius: 12, overflow: 'hidden', border: `1px solid #eee`, boxShadow: '0 2px 6px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column' }}>
                  {cat.image_url
                    ? <img src={cat.image_url} alt={cat.name} style={{ width: '100%', height: 110, objectFit: 'cover', objectPosition: '50% 20%', display: 'block', borderBottom: `3px solid ${catColor}` }} />
                    : <div style={{ width: '100%', height: 110, background: catColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40 }}>🐱</div>
                  }
                  <div style={{ padding: '8px 10px 10px' }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: '#111', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cat.name || 'Unknown'}</div>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 8, background: catColor, color: 'white' }}>{statusEmoji[cat.status] || '🐱'} {cat.status}</span>
                  </div>
                </a>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
