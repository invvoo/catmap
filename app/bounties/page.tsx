// @ts-nocheck
// PAGE: Browse Bounties (app/bounties/page.tsx → route: /bounties)
'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import Navbar from '../components/Navbar';
import { BOUNTY_TYPES, calcCurrentAmount, BountyType } from '../../lib/bountyPolicy';

function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return 'just now';
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  return `${days}d ago`;
}

export default function BountiesPage() {
  const [bounties, setBounties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    loadBounties();
  }, []);

  async function loadBounties() {
    setLoading(true);
    const { data } = await supabase
      .from('bounties')
      .select('*, cats(name, image_url, lat, lng)')
      .in('status', ['open', 'claimed'])
      .order('created_at', { ascending: false });
    setBounties(data || []);
    setLoading(false);
  }

  const filtered = filter === 'all' ? bounties : bounties.filter(b => b.type === filter);

  const typeKeys = Object.keys(BOUNTY_TYPES) as BountyType[];

  return (
    <div style={{ minHeight: '100vh', background: '#f7f7f7', fontFamily: 'system-ui, sans-serif' }}>
      <Navbar />

      <div style={{ maxWidth: 860, margin: '0 auto', padding: '32px 20px' }}>
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#222', margin: '0 0 6px' }}>🐾 Open Bounties</h1>
          <p style={{ color: '#888', fontSize: 14, margin: 0 }}>Help a cat in need and get paid for verified care.</p>
        </div>

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
          <button onClick={() => setFilter('all')}
            style={{ padding: '7px 14px', borderRadius: 20, border: 'none', background: filter === 'all' ? '#FF6B6B' : '#eee', color: filter === 'all' ? 'white' : '#555', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
            All
          </button>
          {typeKeys.map(t => (
            <button key={t} onClick={() => setFilter(t)}
              style={{ padding: '7px 14px', borderRadius: 20, border: 'none', background: filter === t ? BOUNTY_TYPES[t].color : '#eee', color: filter === t ? 'white' : '#555', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
              {BOUNTY_TYPES[t].emoji} {BOUNTY_TYPES[t].label}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#aaa' }}>Loading bounties…</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🎉</div>
            <div style={{ fontSize: 16, color: '#888' }}>No open bounties right now!</div>
            <div style={{ fontSize: 13, color: '#bbb', marginTop: 6 }}>Check back later or visit a cat's page to post one.</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {filtered.map(b => {
              const policy = BOUNTY_TYPES[b.type as BountyType];
              const current = calcCurrentAmount(b.base_amount, b.max_amount, b.type, b.created_at, b.escalation_paused, b.community_boost || 0, b.difficulty_bonus || 0);
              const pct = Math.min(100, Math.round((current / b.max_amount) * 100));
              return (
                <a key={b.id} href={`/bounties/${b.id}`} style={{ textDecoration: 'none' }}>
                  <div style={{ background: 'white', borderRadius: 14, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.07)', border: `2px solid ${b.status === 'claimed' ? '#FF9800' : policy.color}22`, transition: 'transform 0.15s, box-shadow 0.15s' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 6px 20px rgba(0,0,0,0.12)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ''; (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 12px rgba(0,0,0,0.07)'; }}>

                    {/* Cat photo strip */}
                    {b.cats?.image_url ? (
                      <img src={b.cats.image_url} alt={b.cats?.name} style={{ width: '100%', height: 120, objectFit: 'cover', display: 'block' }} />
                    ) : (
                      <div style={{ width: '100%', height: 80, background: `${policy.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36 }}>{policy.emoji}</div>
                    )}

                    <div style={{ padding: '14px 16px 16px' }}>
                      {/* Type badge + status */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                        <span style={{ background: `${policy.color}15`, color: policy.color, fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 6 }}>
                          {policy.emoji} {policy.label}
                        </span>
                        {b.status === 'claimed' && (
                          <span style={{ background: '#FFF3E0', color: '#FF9800', fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 6 }}>🔒 Claimed</span>
                        )}
                        {b.type === 'emergency' && b.status === 'open' && (
                          <span style={{ background: '#FFEBEE', color: '#F44336', fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 6 }}>🚨 Urgent</span>
                        )}
                      </div>

                      <div style={{ fontWeight: 700, fontSize: 15, color: '#222', marginBottom: 4 }}>
                        {b.cats?.name || 'Community Cat'}
                      </div>
                      {b.description && (
                        <div style={{ fontSize: 12, color: '#888', marginBottom: 10, lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{b.description}</div>
                      )}

                      {/* Amount + progress */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontSize: 22, fontWeight: 800, color: policy.color }}>${current.toFixed(2)}</span>
                        <span style={{ fontSize: 11, color: '#bbb' }}>cap ${b.max_amount}</span>
                      </div>
                      <div style={{ height: 5, background: '#f0f0f0', borderRadius: 3, overflow: 'hidden', marginBottom: 10 }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: policy.color, borderRadius: 3, transition: 'width 0.4s' }} />
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#bbb' }}>
                        <span>Posted {timeAgo(b.created_at)}</span>
                        {b.community_boost > 0 && <span style={{ color: '#4CAF50', fontWeight: 600 }}>+${b.community_boost} boost</span>}
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
