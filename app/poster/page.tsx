// PAGE: Lost Cat Poster Generator (app/poster/page.tsx → route: /poster)
// @ts-nocheck
'use client';
export const dynamic = 'force-dynamic';
import { supabase } from '../../lib/supabase';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useRef } from 'react';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export default function PosterPage() {
  const [cat, setCat] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const catId = params.get('catId');
    if (!catId) { setError('No cat ID provided.'); setLoading(false); return; }
    getSupabase().from('cats').select('*').eq('id', catId).single().then(({ data, error: err }) => {
      if (err || !data) { setError('Cat not found.'); }
      else setCat(data);
      setLoading(false);
    });
  }, []);

  function handlePrint() {
    window.print();
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
  const date = new Date(cat.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/cat/${cat.id}`;

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', background: '#f5f5f5', minHeight: '100vh' }}>

      {/* Screen controls — hidden on print */}
      <div className="no-print" style={{ background: 'white', padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
        <a href="/" style={{ fontSize: 18, fontWeight: 700, textDecoration: 'none', color: '#222' }}>🐱 CatMap</a>
        <div style={{ display: 'flex', gap: 10 }}>
          <a href={`/cat/${cat.id}`} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #ddd', fontSize: 13, fontWeight: 600, color: '#444', textDecoration: 'none' }}>← Cat Profile</a>
          <button onClick={handlePrint} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: '#FF6B6B', color: 'white', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
            🖨️ Print / Save PDF
          </button>
        </div>
      </div>

      {/* A4 Poster */}
      <div ref={printRef} style={{ width: 794, margin: '32px auto', background: 'white', boxShadow: '0 4px 24px rgba(0,0,0,0.12)', padding: '48px 56px', boxSizing: 'border-box', minHeight: 1123 }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ display: 'inline-block', background: '#F44336', color: 'white', padding: '8px 32px', borderRadius: 4, fontSize: 28, fontWeight: 900, letterSpacing: 4, marginBottom: 16 }}>
            🚨 LOST CAT
          </div>
          <h1 style={{ margin: 0, fontSize: 48, fontWeight: 900, color: '#111', letterSpacing: -1 }}>{cat.name}</h1>
          <p style={{ margin: '8px 0 0', fontSize: 16, color: '#888' }}>Missing since {date} · Please help bring them home</p>
        </div>

        {/* Photo */}
        {cat.image_url && (
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <img src={cat.image_url} alt={cat.name}
              style={{ maxWidth: '100%', maxHeight: 380, objectFit: 'contain', borderRadius: 12, border: '3px solid #F44336', display: 'inline-block' }} />
          </div>
        )}

        {/* Attributes grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 28 }}>
          {[
            a.gender && ['Gender', a.gender],
            a.age && ['Age', a.age],
            a.coat && ['Coat', a.coat],
            a.eyes && ['Eyes', a.eyes],
            a.tnr && a.tnr !== 'None' && ['Ear Clip (TNR)', a.tnr],
            a.health_status && a.health_status !== 'Unknown' && ['Health', a.health_status],
          ].filter(Boolean).map(([label, value]: any) => (
            <div key={label} style={{ background: '#f9f9f9', borderRadius: 8, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: '#888', fontWeight: 600 }}>{label}</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#222' }}>{value}</span>
            </div>
          ))}
        </div>

        {/* Notes */}
        {a.notes && (
          <div style={{ background: '#fff8e1', border: '1px solid #ffe082', borderRadius: 8, padding: '12px 16px', marginBottom: 28, fontSize: 14, color: '#555', lineHeight: 1.6 }}>
            <strong>Notes:</strong> {a.notes}
          </div>
        )}

        {/* Call to action */}
        <div style={{ background: '#F44336', color: 'white', borderRadius: 10, padding: '20px 24px', marginBottom: 24, textAlign: 'center' }}>
          <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>If you see this cat, please log a sighting!</div>
          <div style={{ fontSize: 14, opacity: 0.9, marginBottom: 12 }}>Scan the QR code or visit the link below</div>
          <div style={{ background: 'white', color: '#F44336', borderRadius: 8, padding: '8px 20px', display: 'inline-block', fontWeight: 700, fontSize: 15, wordBreak: 'break-all' }}>
            {url}
          </div>
        </div>

        {/* Footer */}
        <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 13, color: '#aaa' }}>🐱 CatMap — Community Cat Tracking</div>
          <div style={{ fontSize: 12, color: '#ccc' }}>catmap.app</div>
        </div>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          div[style*="margin: 32px auto"] { margin: 0 !important; box-shadow: none !important; }
        }
      `}</style>
    </div>
  );
}

// PAGE: Lost Cat Poster Generator (app/poster/page.tsx → route: /poster)