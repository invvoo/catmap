// @ts-nocheck
// PAGE: Organization Profile (app/orgs/[id]/page.tsx → route: /orgs/[id])
'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
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

  useEffect(() => {
    load();
  }, [orgId]);

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

  return (
    <div style={{ minHeight: '100vh', background: '#f7f7f7', fontFamily: 'system-ui, sans-serif' }}>
      <Navbar />

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
