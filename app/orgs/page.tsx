// @ts-nocheck
// PAGE: Organizations Listing (app/orgs/page.tsx → route: /orgs)
'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import Navbar from '../components/Navbar';

const typeConfig = {
  adoption: { emoji: '🏠', color: '#4CAF50', label: 'Adoption Center' },
  vet: { emoji: '🏥', color: '#2196F3', label: 'Veterinary Clinic' },
  pound: { emoji: '🏛️', color: '#FF9800', label: 'Animal Pound' },
  rescue: { emoji: '🚨', color: '#F44336', label: 'Rescue Organization' },
};

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function fmtDist(km) {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

export default function OrgsPage() {
  const [orgs, setOrgs] = useState([]);
  const [catCounts, setCatCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'name' | 'nearest'>('name');
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [locLoading, setLocLoading] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const [{ data: orgsData }, { data: cats }] = await Promise.all([
      supabase.from('organizations').select('*').order('name', { ascending: true }),
      supabase.from('cats').select('organization_id').not('organization_id', 'is', null),
    ]);
    const counts = {};
    (cats || []).forEach(c => { counts[c.organization_id] = (counts[c.organization_id] || 0) + 1; });
    setOrgs(orgsData || []);
    setCatCounts(counts);
    setLoading(false);
  }

  function requestLocation() {
    if (!navigator.geolocation) return;
    setLocLoading(true);
    navigator.geolocation.getCurrentPosition(
      pos => { setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setLocLoading(false); setSortBy('nearest'); },
      () => setLocLoading(false),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  const withDist = orgs.map(o => ({
    ...o,
    _km: userLoc && o.lat && o.lng ? haversineKm(userLoc.lat, userLoc.lng, o.lat, o.lng) : null,
  }));

  const filtered = withDist
    .filter(o => filter === 'all' || o.type === filter)
    .sort((a, b) => {
      if (sortBy === 'nearest' && a._km !== null && b._km !== null) return a._km - b._km;
      return (a.name || '').localeCompare(b.name || '');
    });

  return (
    <div style={{ minHeight: '100vh', background: '#f7f7f7', fontFamily: 'system-ui, sans-serif' }}>
      <Navbar />

      {/* Hero */}
      <div style={{ background: 'linear-gradient(135deg, #1a237e, #3949ab)', padding: '36px 20px 32px', textAlign: 'center', color: 'white' }}>
        <div style={{ fontSize: 44, marginBottom: 8 }}>🏢</div>
        <h1 style={{ fontSize: 28, fontWeight: 800, margin: '0 0 8px' }}>Organizations</h1>
        <p style={{ fontSize: 15, opacity: 0.8, margin: '0 0 20px', maxWidth: 480, marginInline: 'auto' }}>
          Find adoption centers, vets, pounds, and rescues near you.
        </p>
        <a href="/orgs/create" style={{ display: 'inline-block', padding: '10px 24px', borderRadius: 10, background: 'white', color: '#3949ab', fontWeight: 700, fontSize: 14, textDecoration: 'none' }}>
          + Register Your Organization
        </a>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '20px 16px' }}>

        {/* Type filter tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
          {[{ value: 'all', label: '🐱 All' }, ...Object.entries(typeConfig).map(([v, c]) => ({ value: v, label: `${c.emoji} ${c.label}` }))].map(tab => (
            <button key={tab.value} onClick={() => setFilter(tab.value)}
              style={{ padding: '7px 16px', borderRadius: 20, border: 'none', background: filter === tab.value ? '#3949ab' : 'white', color: filter === tab.value ? 'white' : '#555', fontWeight: 600, fontSize: 13, cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Sort controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, color: '#888', fontWeight: 600 }}>Sort:</span>
          <button onClick={() => setSortBy('name')}
            style={{ padding: '6px 14px', borderRadius: 20, border: 'none', background: sortBy === 'name' ? '#333' : '#eee', color: sortBy === 'name' ? 'white' : '#555', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
            🔤 A–Z
          </button>
          <button onClick={() => { if (userLoc) setSortBy('nearest'); else requestLocation(); }}
            style={{ padding: '6px 14px', borderRadius: 20, border: 'none', background: sortBy === 'nearest' ? '#333' : '#eee', color: sortBy === 'nearest' ? 'white' : '#555', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
            {locLoading ? '📍 Getting location…' : '📍 Nearest'}
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#aaa', fontSize: 15 }}>Loading...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#aaa', fontSize: 15 }}>
            No organizations found.{' '}
            <a href="/orgs/create" style={{ color: '#3949ab', fontWeight: 600 }}>Register yours!</a>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
            {filtered.map(org => {
              const { emoji, color, label } = typeConfig[org.type] || { emoji: '🐱', color: '#9C27B0', label: org.type };
              const count = catCounts[org.id] || 0;
              return (
                <a key={org.id} href={`/orgs/${org.id}`} style={{ textDecoration: 'none', background: 'white', borderRadius: 14, overflow: 'hidden', border: '1px solid #eee', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ height: 6, background: color }} />
                  <div style={{ padding: '16px 18px 18px', display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      {org.logo_url
                        ? <img src={org.logo_url} style={{ width: 48, height: 48, borderRadius: 10, objectFit: 'cover', border: `2px solid ${color}`, flexShrink: 0 }} />
                        : <div style={{ width: 48, height: 48, borderRadius: 10, background: `${color}20`, border: `2px solid ${color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>{emoji}</div>
                      }
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 15, color: '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{org.name}</div>
                        <span style={{ fontSize: 11, fontWeight: 700, background: `${color}20`, color: color, borderRadius: 6, padding: '1px 7px', display: 'inline-block', marginTop: 3 }}>{emoji} {label}</span>
                      </div>
                    </div>
                    {org.address && <div style={{ fontSize: 12, color: '#777', display: 'flex', gap: 5 }}><span>📍</span><span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{org.address}</span></div>}
                    {org.phone && <div style={{ fontSize: 12, color: '#777' }}>📞 {org.phone}</div>}
                    <div style={{ fontSize: 12, color: '#888', marginTop: 'auto', paddingTop: 8, borderTop: '1px solid #f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span>🐱 {count} cat{count !== 1 ? 's' : ''}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {org._km !== null && <span style={{ color: '#888', fontWeight: 600 }}>📍 {fmtDist(org._km)}</span>}
                        {org.verified && <span style={{ fontSize: 11, color: '#4CAF50', fontWeight: 600 }}>✅ Verified</span>}
                      </div>
                    </div>
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
