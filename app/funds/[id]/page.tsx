// @ts-nocheck
// PAGE: Fund Detail (app/funds/[id]/page.tsx → route: /funds/[id])
'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import Navbar from '../../components/Navbar';

function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return 'just now';
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const BOOST_AMOUNTS = [5, 10, 25];

export default function FundDetailPage() {
  const params = useParams();
  const fundId = params?.id as string;

  const [fund, setFund] = useState<any>(null);
  const [contributions, setContributions] = useState<any[]>([]);
  const [disbursements, setDisbursements] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'contributions' | 'disbursements'>('contributions');

  // Donate state
  const [showDonate, setShowDonate] = useState(false);
  const [donateAmount, setDonateAmount] = useState<number | ''>('');
  const [donateNote, setDonateNote] = useState('');
  const [donating, setDonating] = useState(false);

  const isOwner = user && fund && user.id === fund.created_by;
  const isAdmin = false; // TODO: check admin role
  const canManage = isOwner || isAdmin || fund?.type === 'general' && isAdmin;

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    load();
  }, [fundId]);

  async function load() {
    setLoading(true);
    const [{ data: f }, { data: c }, { data: d }] = await Promise.all([
      supabase.from('community_funds').select('*').eq('id', fundId).single(),
      supabase.from('fund_contributions').select('*').eq('fund_id', fundId).order('created_at', { ascending: false }),
      supabase.from('fund_disbursements').select('*,bounties(type,description)').eq('fund_id', fundId).order('created_at', { ascending: false }),
    ]);
    setFund(f);
    setContributions(c || []);
    setDisbursements(d || []);
    setLoading(false);
  }

  async function handleDonate() {
    if (!user) { window.location.href = '/login'; return; }
    if (!donateAmount || Number(donateAmount) < 1) return;
    setDonating(true);
    const res = await fetch('/api/stripe/fund-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fundId, userId: user.id, amount: Number(donateAmount), note: donateNote }),
    });
    const { url } = await res.json();
    if (url) window.location.href = url;
    else setDonating(false);
  }

  async function handleApproveDisbursement(disbId: string, amount: number) {
    if (!canManage) return;
    await supabase.from('fund_disbursements').update({ status: 'approved', approved_by: user.id, resolved_at: new Date().toISOString() }).eq('id', disbId);
    // Deduct from fund balance
    await supabase.from('community_funds').update({ balance: (fund.balance || 0) - amount }).eq('id', fundId);
    load();
  }

  async function handleRejectDisbursement(disbId: string) {
    if (!canManage) return;
    await supabase.from('fund_disbursements').update({ status: 'rejected', approved_by: user.id, resolved_at: new Date().toISOString() }).eq('id', disbId);
    load();
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#f7f7f7', fontFamily: 'system-ui, sans-serif' }}>
      <Navbar />
      <div style={{ textAlign: 'center', color: '#ccc', padding: 60 }}>Loading...</div>
    </div>
  );

  if (!fund) return (
    <div style={{ minHeight: '100vh', background: '#f7f7f7', fontFamily: 'system-ui, sans-serif' }}>
      <Navbar />
      <div style={{ textAlign: 'center', color: '#ccc', padding: 60 }}>Fund not found.</div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#f7f7f7', fontFamily: 'system-ui, sans-serif' }}>
      <Navbar />

      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #1e1810, #3a2c20)', padding: '32px 20px 28px', color: 'white' }}>
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          <a href="/funds" style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: 600, textDecoration: 'none', display: 'inline-block', marginBottom: 16 }}>← All Funds</a>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 60, height: 60, borderRadius: '50%', background: fund.type === 'general' ? '#7a9e7e' : '#555', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, flexShrink: 0 }}>
              {fund.logo_url ? <img src={fund.logo_url} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} /> : fund.type === 'general' ? '🌐' : '🏢'}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>{fund.name}</h1>
                {fund.type === 'general' && <span style={{ fontSize: 10, fontWeight: 700, background: '#7a9e7e', color: 'white', borderRadius: 20, padding: '2px 8px' }}>OFFICIAL</span>}
              </div>
              {fund.description && <p style={{ fontSize: 14, opacity: 0.75, margin: 0 }}>{fund.description}</p>}
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: 'flex', gap: 32, marginTop: 24 }}>
            <div>
              <div style={{ fontSize: 26, fontWeight: 800 }}>${fund.balance?.toFixed(2) ?? '0.00'}</div>
              <div style={{ fontSize: 12, opacity: 0.6 }}>available balance</div>
            </div>
            <div>
              <div style={{ fontSize: 26, fontWeight: 800 }}>${fund.total_raised?.toFixed(2) ?? '0.00'}</div>
              <div style={{ fontSize: 12, opacity: 0.6 }}>total raised</div>
            </div>
            <div>
              <div style={{ fontSize: 26, fontWeight: 800 }}>{contributions.length}</div>
              <div style={{ fontSize: 12, opacity: 0.6 }}>donors</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '24px 16px 60px' }}>

        {/* Donate button */}
        {!showDonate ? (
          <button onClick={() => setShowDonate(true)}
            style={{ width: '100%', padding: 14, borderRadius: 10, border: 'none', background: '#FF6B6B', color: 'white', fontWeight: 700, fontSize: 16, cursor: 'pointer', marginBottom: 24 }}>
            💛 Donate to This Fund
          </button>
        ) : (
          <div style={{ background: 'white', borderRadius: 14, padding: 24, boxShadow: '0 2px 10px rgba(0,0,0,0.07)', marginBottom: 24 }}>
            <div style={{ fontWeight: 700, fontSize: 16, color: '#222', marginBottom: 16 }}>💛 Donate to {fund.name}</div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
              {BOOST_AMOUNTS.map(amt => (
                <button key={amt} onClick={() => setDonateAmount(amt)}
                  style={{ padding: '8px 20px', borderRadius: 20, border: donateAmount === amt ? '2px solid #FF6B6B' : '1.5px solid #ddd', background: donateAmount === amt ? '#fff3f3' : 'white', fontWeight: 700, fontSize: 14, cursor: 'pointer', color: donateAmount === amt ? '#FF6B6B' : '#444' }}>
                  ${amt}
                </button>
              ))}
              <input type="number" placeholder="Custom $" value={donateAmount}
                onChange={e => setDonateAmount(e.target.value === '' ? '' : Number(e.target.value))}
                style={{ padding: '8px 12px', borderRadius: 20, border: '1.5px solid #ddd', fontSize: 14, width: 110, outline: 'none' }} />
            </div>
            <input value={donateNote} onChange={e => setDonateNote(e.target.value)} placeholder="Leave a note (optional)"
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #eee', fontSize: 13, marginBottom: 14, boxSizing: 'border-box', outline: 'none' }} />
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={handleDonate} disabled={donating || !donateAmount || Number(donateAmount) < 1}
                style={{ flex: 1, padding: 12, borderRadius: 8, border: 'none', background: donating || !donateAmount ? '#ffccbc' : '#FF6B6B', color: 'white', fontWeight: 700, fontSize: 14, cursor: donating || !donateAmount ? 'default' : 'pointer' }}>
                {donating ? 'Redirecting...' : `Donate $${donateAmount || '—'}`}
              </button>
              <button onClick={() => setShowDonate(false)}
                style={{ padding: '12px 18px', borderRadius: 8, border: '1px solid #eee', background: 'white', color: '#888', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '2px solid #eee', marginBottom: 20 }}>
          {(['contributions', 'disbursements'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{ padding: '10px 20px', border: 'none', background: 'none', fontWeight: tab === t ? 700 : 400, fontSize: 14, color: tab === t ? '#FF6B6B' : '#888', cursor: 'pointer', borderBottom: tab === t ? '2px solid #FF6B6B' : '2px solid transparent', marginBottom: -2, textTransform: 'capitalize' }}>
              {t === 'contributions' ? `💛 Contributions (${contributions.length})` : `📤 Disbursements (${disbursements.length})`}
            </button>
          ))}
        </div>

        {/* Contributions */}
        {tab === 'contributions' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {contributions.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#ccc', padding: 32 }}>No contributions yet. Be the first! 💛</div>
            ) : contributions.map(c => (
              <div key={c.id} style={{ background: 'white', borderRadius: 10, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: '#222' }}>Anonymous donor</div>
                  {c.note && <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{c.note}</div>}
                  <div style={{ fontSize: 11, color: '#bbb', marginTop: 2 }}>{timeAgo(c.created_at)}</div>
                </div>
                <div style={{ fontWeight: 800, fontSize: 16, color: '#2e7d32' }}>+${c.amount?.toFixed(2)}</div>
              </div>
            ))}
          </div>
        )}

        {/* Disbursements */}
        {tab === 'disbursements' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {disbursements.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#ccc', padding: 32 }}>No disbursement requests yet.</div>
            ) : disbursements.map(d => (
              <div key={d.id} style={{ background: 'white', borderRadius: 12, padding: '16px 18px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', border: d.status === 'pending' ? '1.5px solid #ffe082' : d.status === 'approved' ? '1.5px solid #a5d6a7' : '1.5px solid #ffcdd2' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#222', marginBottom: 2 }}>
                      {d.bounties?.type ? `${d.bounties.type.replace('_', ' ')} bounty` : 'Bounty disbursement'}
                    </div>
                    {d.notes && <div style={{ fontSize: 13, color: '#666' }}>{d.notes}</div>}
                    <div style={{ fontSize: 11, color: '#bbb', marginTop: 4 }}>{timeAgo(d.created_at)}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 800, fontSize: 15, color: d.status === 'approved' ? '#2e7d32' : d.status === 'rejected' ? '#c62828' : '#c87d2a' }}>
                      ${d.amount?.toFixed(2)}
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 12, background: d.status === 'approved' ? '#edf4ee' : d.status === 'rejected' ? '#fff0f0' : '#fff8e8', color: d.status === 'approved' ? '#2e7d32' : d.status === 'rejected' ? '#c62828' : '#c87d2a', textTransform: 'uppercase' }}>
                      {d.status}
                    </span>
                  </div>
                </div>

                {/* Approve/Reject for fund owner */}
                {canManage && d.status === 'pending' && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                    <button onClick={() => handleApproveDisbursement(d.id, d.amount)}
                      style={{ flex: 1, padding: '8px 0', borderRadius: 8, border: 'none', background: '#edf4ee', color: '#2e7d32', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                      ✓ Approve
                    </button>
                    <button onClick={() => handleRejectDisbursement(d.id)}
                      style={{ flex: 1, padding: '8px 0', borderRadius: 8, border: 'none', background: '#fff0f0', color: '#c62828', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                      ✗ Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
