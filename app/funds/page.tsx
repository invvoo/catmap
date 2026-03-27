// @ts-nocheck
// PAGE: Community Funds (app/funds/page.tsx → route: /funds)
'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import Navbar from '../components/Navbar';

function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const days = Math.floor(diff / 86400000);
  if (days < 1) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days}d ago`;
  return new Date(d).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

export default function FundsPage() {
  const [funds, setFunds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

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
      .order('type', { ascending: true }) // general first
      .order('total_raised', { ascending: false });
    setFunds(data || []);
    setLoading(false);
  }

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

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '28px 16px 60px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', color: '#ccc', padding: 40 }}>Loading funds...</div>
        ) : funds.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#bbb', padding: 40 }}>No funds yet.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {funds.map(fund => (
              <a key={fund.id} href={`/funds/${fund.id}`} style={{ textDecoration: 'none' }}>
                <div style={{ background: 'white', borderRadius: 14, padding: '20px 22px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: fund.type === 'general' ? '2px solid #7a9e7e' : '1px solid #eee', display: 'flex', alignItems: 'center', gap: 18, cursor: 'pointer', transition: 'box-shadow 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)')}
                  onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)')}>
                  <div style={{ width: 52, height: 52, borderRadius: '50%', background: fund.type === 'general' ? '#edf4ee' : '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>
                    {fund.logo_url ? <img src={fund.logo_url} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} /> : fund.type === 'general' ? '🌐' : '🏢'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontWeight: 700, fontSize: 15, color: '#222' }}>{fund.name}</span>
                      {fund.type === 'general' && <span style={{ fontSize: 10, fontWeight: 700, background: '#edf4ee', color: '#3a7a44', borderRadius: 20, padding: '2px 8px' }}>OFFICIAL</span>}
                    </div>
                    <div style={{ fontSize: 13, color: '#888', marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fund.description}</div>
                    <div style={{ display: 'flex', gap: 16 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#2e7d32' }}>${fund.balance?.toFixed(2) ?? '0.00'} available</span>
                      <span style={{ fontSize: 12, color: '#aaa' }}>${fund.total_raised?.toFixed(2) ?? '0.00'} total raised</span>
                    </div>
                  </div>
                  <div style={{ fontSize: 20, color: '#ddd' }}>›</div>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
