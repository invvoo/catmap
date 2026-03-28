// @ts-nocheck
// PAGE: Community Funds (app/funds/page.tsx → route: /funds)
'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import Navbar from '../components/Navbar';

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function fmtDist(km) {
  if (km < 1) return `${Math.round(km * 1000)} m away`;
  return `${km.toFixed(1)} km away`;
}

export default function FundsPage() {
  const [funds, setFunds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [sortBy, setSortBy] = useState<'top' | 'nearest'>('top');
  const [locLoading, setLocLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    load();
  }, []);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from('community_funds')
      .select('*')
      .eq('is_public', true)
      .order('type', { ascending: true })
      .order('total_raised', { ascending: false });
    setFunds(data || []);
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

  const withDist = funds.map(f => ({
    ...f,
    _km: userLoc && f.lat && f.lng ? haversineKm(userLoc.lat, userLoc.lng, f.lat, f.lng) : null,
  }));

  const sorted = [...withDist].sort((a, b) => {
    // General fund always first
    if (a.type === 'general' && b.type !== 'general') return -1;
    if (b.type === 'general' && a.type !== 'general') return 1;
    if (sortBy === 'nearest' && a._km !== null && b._km !== null) return a._km - b._km;
    return (b.total_raised || 0) - (a.total_raised || 0);
  });

  return (
    <div style={{ minHeight: '100vh', background: '#f7f7f7', fontFamily: 'system-ui, sans-serif' }}>
      <Navbar />

      {/* Hero */}
      <div style={{ background: 'linear-gradient(135deg, #1e1810, #3a2c20)', padding: '36px 20px 32px', textAlign: 'center', color: 'white' }}>
        <div style={{ fontSize: 44, marginBottom: 8 }}>💛</div>
        <h1 style={{ fontSize: 28, fontWeight: 800, margin: '0 0 8px' }}>Community Funds</h1>
        <p style={{ fontSize: 15, opacity: 0.8, margin: '0 0 20px', maxWidth: 480, marginInline: 'auto' }}>
          Donate to a fund to support stray cat care. Funds are used to pay out verified bounties.
        </p>
        {user && (
          <a href="/funds/create" style={{ display: 'inline-block', padding: '10px 24px', borderRadius: 8, background: '#FF6B6B', color: 'white', fontWeight: 700, fontSize: 14, textDecoration: 'none' }}>
            + Start a Fund
          </a>
        )}
      </div>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '20px 16px 60px' }}>

        {/* Sort controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, color: '#888', fontWeight: 600 }}>Sort:</span>
          <button onClick={() => setSortBy('top')}
            style={{ padding: '6px 14px', borderRadius: 20, border: 'none', background: sortBy === 'top' ? '#333' : '#eee', color: sortBy === 'top' ? 'white' : '#555', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
            💛 Most funded
          </button>
          <button onClick={() => { if (userLoc) setSortBy('nearest'); else requestLocation(); }}
            style={{ padding: '6px 14px', borderRadius: 20, border: 'none', background: sortBy === 'nearest' ? '#333' : '#eee', color: sortBy === 'nearest' ? 'white' : '#555', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
            {locLoading ? '📍 Getting location…' : '📍 Nearest'}
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', color: '#ccc', padding: 40 }}>Loading funds...</div>
        ) : sorted.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#bbb', padding: 40 }}>No funds yet.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {sorted.map(fund => (
              <a key={fund.id} href={`/funds/${fund.id}`} style={{ textDecoration: 'none' }}>
                <div style={{ background: 'white', borderRadius: 14, padding: '18px 20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: fund.type === 'general' ? '2px solid #7a9e7e' : '1px solid #eee', cursor: 'pointer', transition: 'box-shadow 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)')}
                  onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)')}>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ width: 52, height: 52, borderRadius: '50%', background: fund.type === 'general' ? '#edf4ee' : '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>
                      {fund.logo_url ? <img src={fund.logo_url} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} /> : fund.type === 'general' ? '🌐' : '🏢'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700, fontSize: 15, color: '#222' }}>{fund.name}</span>
                        {fund.type === 'general' && <span style={{ fontSize: 10, fontWeight: 700, background: '#edf4ee', color: '#3a7a44', borderRadius: 20, padding: '2px 8px' }}>OFFICIAL</span>}
                      </div>
                      {fund.description && (
                        <div style={{ fontSize: 13, color: '#888', marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fund.description}</div>
                      )}
                      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#2e7d32' }}>${fund.balance?.toFixed(2) ?? '0.00'} available</span>
                        <span style={{ fontSize: 12, color: '#aaa' }}>${fund.total_raised?.toFixed(2) ?? '0.00'} raised</span>
                        {fund._km !== null && <span style={{ fontSize: 12, color: '#888' }}>📍 {fmtDist(fund._km)}</span>}
                        {fund.address && fund._km === null && <span style={{ fontSize: 12, color: '#aaa', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }}>📍 {fund.address}</span>}
                      </div>
                    </div>
                    <div style={{ fontSize: 20, color: '#ddd', flexShrink: 0 }}>›</div>
                  </div>

                  {/* Criteria tags */}
                  {fund.criteria?.length > 0 && (
                    <div style={{ marginTop: 12, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {fund.criteria.map(tag => (
                        <span key={tag} style={{ fontSize: 11, fontWeight: 600, background: '#fff3e0', color: '#e65100', borderRadius: 20, padding: '3px 10px' }}>{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
