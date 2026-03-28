// @ts-nocheck
// PAGE: Lost Kitties (app/lost/page.tsx → route: /lost)
'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { fetchTopVotedNames, resolveDisplayName } from '../../lib/catName';
import Navbar from '../components/Navbar';

function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return 'just now';
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function LostPage() {
  const [cats, setCats] = useState<any[]>([]);
  const [topVoted, setTopVoted] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from('cats')
      .select('*')
      .eq('status', 'lost')
      .order('created_at', { ascending: false });
    const catsData = data || [];
    setCats(catsData);
    const tv = await fetchTopVotedNames(catsData.map(c => c.id));
    setTopVoted(tv);
    setLoading(false);
  }

  const filtered = cats.filter(c => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const displayName = resolveDisplayName(c, topVoted);
    return (
      displayName.toLowerCase().includes(q) ||
      c.description?.toLowerCase().includes(q) ||
      c.attributes?.coat?.toLowerCase().includes(q) ||
      c.attributes?.color?.toLowerCase().includes(q)
    );
  });

  return (
    <div style={{ minHeight: '100vh', background: '#f7f7f7', fontFamily: 'system-ui, sans-serif' }}>
      <Navbar />

      {/* Hero banner */}
      <div style={{ background: 'linear-gradient(135deg, #F44336, #c62828)', padding: '36px 20px 32px', textAlign: 'center', color: 'white' }}>
        <div style={{ fontSize: 44, marginBottom: 8 }}>🚨</div>
        <h1 style={{ fontSize: 28, fontWeight: 800, margin: '0 0 8px' }}>Lost Kitties</h1>
        <p style={{ fontSize: 15, opacity: 0.85, margin: '0 0 20px', maxWidth: 480, marginLeft: 'auto', marginRight: 'auto' }}>
          These cats are missing and their owners are searching. Spotted one? Log a sighting on their profile.
        </p>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, coat colour, description…"
          style={{ width: '100%', maxWidth: 400, padding: '11px 16px', borderRadius: 24, border: 'none', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
        />
      </div>

      <div style={{ maxWidth: 860, margin: '0 auto', padding: '28px 20px 60px' }}>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#aaa' }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#333', marginBottom: 6 }}>
              {search ? 'No matches found' : 'No lost cats right now!'}
            </div>
            <div style={{ fontSize: 14, color: '#aaa' }}>
              {search ? 'Try a different search term.' : 'Check back later — hopefully it stays this way.'}
            </div>
          </div>
        ) : (
          <>
            <div style={{ fontSize: 13, color: '#aaa', marginBottom: 16 }}>
              {filtered.length} lost cat{filtered.length !== 1 ? 's' : ''} {search ? `matching "${search}"` : 'reported missing'}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
              {filtered.map(cat => {
                const a = cat.attributes || {};
                const details = [a.coat, a.gender, a.age].filter(v => v && v !== 'Unknown').join(' · ');
                return (
                  <a key={cat.id} href={`/cat/${cat.id}`} style={{ textDecoration: 'none' }}>
                    <div style={{ background: 'white', borderRadius: 14, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.07)', border: '2px solid #FFEBEE', transition: 'transform 0.15s, box-shadow 0.15s' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 6px 20px rgba(0,0,0,0.12)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ''; (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 12px rgba(0,0,0,0.07)'; }}>

                      {/* Photo */}
                      <div style={{ position: 'relative', height: 180, background: '#111' }}>
                        {cat.image_url
                          ? <img src={cat.image_url} alt={resolveDisplayName(cat, topVoted)} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                          : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 60, background: '#f5f5f5' }}>🐱</div>
                        }
                        <div style={{ position: 'absolute', top: 10, left: 10, background: '#F44336', color: 'white', fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 20 }}>
                          🚨 LOST
                        </div>
                      </div>

                      {/* Info */}
                      <div style={{ padding: '14px 16px 16px' }}>
                        <div style={{ fontWeight: 800, fontSize: 17, color: '#222', marginBottom: 4 }}>
                          {resolveDisplayName(cat, topVoted)}
                        </div>
                        {details && (
                          <div style={{ fontSize: 12, color: '#888', marginBottom: 6 }}>{details}</div>
                        )}
                        {cat.description && (
                          <div style={{ fontSize: 13, color: '#555', lineHeight: 1.5, marginBottom: 10, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {cat.description}
                          </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: 11, color: '#bbb' }}>Lost {timeAgo(cat.updated_at || cat.created_at)}</span>
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#F44336' }}>View & Report →</span>
                        </div>
                      </div>
                    </div>
                  </a>
                );
              })}
            </div>
          </>
        )}

        {/* CTA for owners */}
        <div style={{ marginTop: 40, background: 'white', borderRadius: 14, padding: '24px 20px', textAlign: 'center', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>😿</div>
          <div style={{ fontWeight: 700, fontSize: 16, color: '#333', marginBottom: 6 }}>Lost your cat?</div>
          <div style={{ fontSize: 13, color: '#888', marginBottom: 16 }}>
            Find your cat's profile on the map and mark them as lost. The community will be alerted.
          </div>
          <a href="/" style={{ display: 'inline-block', padding: '11px 24px', borderRadius: 10, background: '#F44336', color: 'white', fontWeight: 700, fontSize: 14, textDecoration: 'none' }}>
            🗺️ Open the Map
          </a>
        </div>
      </div>
    </div>
  );
}
