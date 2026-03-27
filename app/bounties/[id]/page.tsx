// @ts-nocheck
// PAGE: Bounty Detail (app/bounties/[id]/page.tsx → route: /bounties/[id])
'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import Navbar from '../../components/Navbar';
import { BOUNTY_TYPES, calcCurrentAmount, getClaimWindowLabel, BountyType } from '../../../lib/bountyPolicy';

function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return 'just now';
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const BOOST_AMOUNTS = [5, 10, 25];

export default function BountyDetailPage() {
  const { id } = useParams();
  const [bounty, setBounty] = useState<any>(null);
  const [cat, setCat] = useState<any>(null);
  const [claims, setClaims] = useState<any[]>([]);
  const [donations, setDonations] = useState<any[]>([]);
  const [votes, setVotes] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Claim flow
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [claimStep, setClaimStep] = useState<'confirm' | 'proof'>('confirm');
  const [proofFiles, setProofFiles] = useState<File[]>([]);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [claimNotes, setClaimNotes] = useState('');
  const [claiming, setClaiming] = useState(false);
  const [claimSuccess, setClaimSuccess] = useState(false);
  const proofRef = useRef<HTMLInputElement>(null);
  const receiptRef = useRef<HTMLInputElement>(null);
  const [myActiveClaim, setMyActiveClaim] = useState<any>(null);

  // Boost
  const [showBoostModal, setShowBoostModal] = useState(false);
  const [boostAmount, setBoostAmount] = useState<number>(10);
  const [customBoost, setCustomBoost] = useState('');
  const [boostLoading, setBoostLoading] = useState(false);

  // Vote
  const [myVote, setMyVote] = useState<string | null>(null);
  const [voting, setVoting] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    load();
    // Check for donation success
    if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('donated')) {
      window.history.replaceState({}, '', `/bounties/${id}`);
    }
  }, [id]);

  async function load() {
    setLoading(true);
    const [{ data: b }, { data: cl }, { data: don }] = await Promise.all([
      supabase.from('bounties').select('*, cats(*)').eq('id', id).single(),
      supabase.from('bounty_claims').select('*').eq('bounty_id', id).order('claimed_at', { ascending: false }),
      supabase.from('bounty_donations').select('*').eq('bounty_id', id).order('created_at', { ascending: false }),
    ]);
    if (b) { setBounty(b); setCat(b.cats); }
    const claimsData = cl || [];
    // Enrich claims with profile data
    if (claimsData.length > 0) {
      const userIds = [...new Set(claimsData.map(c => c.user_id).filter(Boolean))];
      const { data: profilesData } = await supabase.from('profiles').select('id,display_name,avatar_url').in('id', userIds);
      const profileMap = Object.fromEntries((profilesData || []).map(p => [p.id, p]));
      claimsData.forEach(c => { c.profiles = profileMap[c.user_id] || null; });
    }
    setClaims(claimsData);
    setDonations(don || []);

    // Load votes for submitted claims
    if (cl && cl.length > 0) {
      const claimIds = cl.filter(c => c.status === 'submitted' || c.status === 'approved').map(c => c.id);
      if (claimIds.length > 0) {
        const { data: v } = await supabase.from('bounty_votes').select('*').in('claim_id', claimIds);
        setVotes(v || []);
      }
    }
    setLoading(false);
  }

  useEffect(() => {
    if (user && claims.length > 0) {
      const mine = claims.find(c => c.user_id === user.id && (c.status === 'active' || c.status === 'submitted'));
      setMyActiveClaim(mine || null);
      // Check my vote
      if (votes.length > 0) {
        const mv = votes.find(v => v.user_id === user.id);
        setMyVote(mv?.vote || null);
      }
    }
  }, [user, claims, votes]);

  async function handleClaim() {
    if (!user) { window.location.href = '/login'; return; }
    setClaiming(true);
    const policy = BOUNTY_TYPES[bounty.type as BountyType];
    const expiresAt = new Date(Date.now() + policy.claimWindowHours * 3600000).toISOString();
    const { error } = await supabase.from('bounty_claims').insert({
      bounty_id: bounty.id, user_id: user.id, status: 'active', expires_at: expiresAt,
    });
    if (!error) {
      await supabase.from('bounties').update({ status: 'claimed' }).eq('id', bounty.id);
      await load();
      setClaimStep('proof');
    }
    setClaiming(false);
  }

  async function handleSubmitProof() {
    if (!myActiveClaim || proofFiles.length === 0) return;
    setClaiming(true);
    const proofUrls: string[] = [];

    for (const file of proofFiles) {
      const filename = `bounty_proof/${bounty.id}/${Date.now()}_${file.name}`;
      const { error } = await supabase.storage.from('cat-photos').upload(filename, file);
      if (!error) {
        const { data } = supabase.storage.from('cat-photos').getPublicUrl(filename);
        proofUrls.push(data.publicUrl);
      }
    }

    let receiptUrl = null;
    if (receiptFile) {
      const rname = `bounty_receipts/${bounty.id}/${Date.now()}_${receiptFile.name}`;
      const { error } = await supabase.storage.from('cat-photos').upload(rname, receiptFile);
      if (!error) {
        const { data } = supabase.storage.from('cat-photos').getPublicUrl(rname);
        receiptUrl = data.publicUrl;
      }
    }

    await supabase.from('bounty_claims').update({
      status: 'submitted', proof_urls: proofUrls, receipt_url: receiptUrl,
      notes: claimNotes.trim() || null, completed_at: new Date().toISOString(),
    }).eq('id', myActiveClaim.id);

    setClaimSuccess(true);
    await load();
    setClaiming(false);
    setTimeout(() => { setShowClaimModal(false); setClaimSuccess(false); }, 2500);
  }

  async function handleVote(claimId: string, vote: 'approve' | 'reject') {
    if (!user) return;
    setVoting(true);
    await supabase.from('bounty_votes').upsert({ claim_id: claimId, user_id: user.id, vote });
    setMyVote(vote);
    await load();
    setVoting(false);
  }

  async function handleBoost() {
    if (!user) { window.location.href = '/login'; return; }
    setBoostLoading(true);
    const amount = customBoost ? parseFloat(customBoost) : boostAmount;
    if (!amount || amount < 1) { setBoostLoading(false); return; }
    const res = await fetch('/api/stripe/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bountyId: bounty.id, amount, userId: user.id, catId: cat?.id, catName: cat?.name, bountyType: bounty.type }),
    });
    const { url } = await res.json();
    if (url) window.location.href = url;
    setBoostLoading(false);
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#f7f7f7', fontFamily: 'system-ui, sans-serif' }}>
      <Navbar />
      <div style={{ textAlign: 'center', padding: 80, color: '#aaa' }}>Loading…</div>
    </div>
  );

  if (!bounty) return (
    <div style={{ minHeight: '100vh', background: '#f7f7f7', fontFamily: 'system-ui, sans-serif' }}>
      <Navbar />
      <div style={{ textAlign: 'center', padding: 80, color: '#aaa' }}>Bounty not found.</div>
    </div>
  );

  const policy = BOUNTY_TYPES[bounty.type as BountyType];
  const current = calcCurrentAmount(bounty.base_amount, bounty.max_amount, bounty.type, bounty.created_at, bounty.escalation_paused, bounty.community_boost || 0, bounty.difficulty_bonus || 0);
  const pct = Math.min(100, Math.round((current / bounty.max_amount) * 100));
  const submittedClaims = claims.filter(c => c.status === 'submitted');
  const activeClaim = claims.find(c => c.status === 'active');
  const canClaim = bounty.status === 'open' && !myActiveClaim && user;

  return (
    <div style={{ minHeight: '100vh', background: '#f7f7f7', fontFamily: 'system-ui, sans-serif' }}>
      <Navbar />

      <div style={{ maxWidth: 700, margin: '0 auto', padding: '28px 20px 60px' }}>
        {/* Back */}
        <a href="/bounties" style={{ fontSize: 13, color: '#888', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 20 }}>← All Bounties</a>

        {/* Cat + bounty header */}
        <div style={{ background: 'white', borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.07)', marginBottom: 16 }}>
          {cat?.image_url && <img src={cat.image_url} alt={cat.name} style={{ width: '100%', height: 200, objectFit: 'cover', display: 'block' }} />}
          <div style={{ padding: '20px 24px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
              <div>
                <span style={{ background: `${policy.color}15`, color: policy.color, fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 8 }}>
                  {policy.emoji} {policy.label}
                </span>
                <h1 style={{ fontSize: 22, fontWeight: 800, color: '#222', margin: '8px 0 4px' }}>
                  {cat?.name || 'Community Cat'}
                </h1>
                {cat?.id && <a href={`/cat/${cat.id}`} style={{ fontSize: 12, color: '#FF6B6B', textDecoration: 'none' }}>View cat profile →</a>}
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 32, fontWeight: 900, color: policy.color }}>${current.toFixed(2)}</div>
                <div style={{ fontSize: 11, color: '#bbb' }}>cap ${bounty.max_amount}</div>
              </div>
            </div>

            {/* Progress bar */}
            <div style={{ height: 8, background: '#f0f0f0', borderRadius: 4, overflow: 'hidden', marginBottom: 8 }}>
              <div style={{ height: '100%', width: `${pct}%`, background: policy.color, borderRadius: 4 }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#bbb', marginBottom: 16 }}>
              <span>Base: ${bounty.base_amount} · Escalation + boosts applied</span>
              {bounty.community_boost > 0 && <span style={{ color: '#4CAF50', fontWeight: 700 }}>+${bounty.community_boost} community boost</span>}
            </div>

            {bounty.description && (
              <p style={{ fontSize: 14, color: '#555', lineHeight: 1.6, margin: '0 0 16px' }}>{bounty.description}</p>
            )}

            {/* Status badge */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
              <span style={{ background: bounty.status === 'open' ? '#E8F5E9' : bounty.status === 'claimed' ? '#FFF3E0' : '#f5f5f5', color: bounty.status === 'open' ? '#2E7D32' : bounty.status === 'claimed' ? '#E65100' : '#888', fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 8 }}>
                {bounty.status === 'open' ? '🟢 Open' : bounty.status === 'claimed' ? '🟡 Claimed' : bounty.status === 'completed' ? '✅ Completed' : bounty.status}
              </span>
              <span style={{ background: '#f5f5f5', color: '#888', fontSize: 12, padding: '4px 10px', borderRadius: 8 }}>
                ⏱ Claim window: {getClaimWindowLabel(bounty.type as BountyType)}
              </span>
              <span style={{ background: '#f5f5f5', color: '#888', fontSize: 12, padding: '4px 10px', borderRadius: 8 }}>
                Posted {timeAgo(bounty.created_at)}
              </span>
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {canClaim && (
                <button onClick={() => { setClaimStep('confirm'); setShowClaimModal(true); }}
                  style={{ flex: 1, minWidth: 140, padding: '12px 20px', borderRadius: 10, border: 'none', background: policy.color, color: 'white', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
                  🙋 Claim Bounty
                </button>
              )}
              {myActiveClaim?.status === 'active' && (
                <button onClick={() => { setClaimStep('proof'); setShowClaimModal(true); }}
                  style={{ flex: 1, minWidth: 140, padding: '12px 20px', borderRadius: 10, border: 'none', background: '#FF9800', color: 'white', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
                  📤 Submit Proof
                </button>
              )}
              {myActiveClaim?.status === 'submitted' && (
                <div style={{ flex: 1, padding: '12px 20px', borderRadius: 10, background: '#E8F5E9', color: '#2E7D32', fontWeight: 700, fontSize: 14, textAlign: 'center' }}>
                  ✅ Proof submitted — awaiting review
                </div>
              )}
              {!user && (
                <a href="/login" style={{ flex: 1, minWidth: 140, padding: '12px 20px', borderRadius: 10, background: '#333', color: 'white', fontWeight: 700, fontSize: 15, textAlign: 'center', textDecoration: 'none' }}>
                  Log in to claim
                </a>
              )}
              <button onClick={() => setShowBoostModal(true)}
                style={{ padding: '12px 20px', borderRadius: 10, border: `2px solid ${policy.color}`, background: 'white', color: policy.color, fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
                💰 Boost
              </button>
            </div>
          </div>
        </div>

        {/* Proof requirements */}
        <div style={{ background: 'white', borderRadius: 14, padding: '18px 20px', marginBottom: 16, boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#333', marginBottom: 10 }}>📋 Proof Requirements</div>
          {policy.proofRequirements.map((r, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 6 }}>
              <span style={{ color: policy.color, fontWeight: 700, flexShrink: 0 }}>✓</span>
              <span style={{ fontSize: 13, color: '#555' }}>{r}</span>
            </div>
          ))}
        </div>

        {/* Submitted claims waiting for vote */}
        {submittedClaims.length > 0 && (
          <div style={{ background: 'white', borderRadius: 14, padding: '18px 20px', marginBottom: 16, boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#333', marginBottom: 14 }}>🗳️ Pending Review</div>
            {submittedClaims.map(claim => {
              const claimVotes = votes.filter(v => v.claim_id === claim.id);
              const approvals = claimVotes.filter(v => v.vote === 'approve').length;
              const rejections = claimVotes.filter(v => v.vote === 'reject').length;
              return (
                <div key={claim.id} style={{ borderTop: '1px solid #f5f5f5', paddingTop: 14, marginTop: 14 }}>
                  <div style={{ fontSize: 12, color: '#aaa', marginBottom: 8 }}>
                    Submitted {timeAgo(claim.completed_at || claim.claimed_at)}
                  </div>
                  {claim.notes && <p style={{ fontSize: 13, color: '#555', margin: '0 0 10px' }}>{claim.notes}</p>}
                  {claim.proof_urls?.length > 0 && (
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                      {claim.proof_urls.map((url: string, i: number) => (
                        <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                          <img src={url} alt="proof" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8, border: '1px solid #eee' }} />
                        </a>
                      ))}
                    </div>
                  )}
                  {claim.receipt_url && (
                    <a href={claim.receipt_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: '#2196F3', display: 'inline-block', marginBottom: 10 }}>🧾 View Receipt</a>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 12, color: '#4CAF50', fontWeight: 600 }}>👍 {approvals}</span>
                    <span style={{ fontSize: 12, color: '#F44336', fontWeight: 600 }}>👎 {rejections}</span>
                    {user && claim.user_id !== user.id && (
                      <>
                        <button onClick={() => handleVote(claim.id, 'approve')} disabled={voting}
                          style={{ padding: '5px 12px', borderRadius: 6, border: 'none', background: myVote === 'approve' ? '#4CAF50' : '#E8F5E9', color: myVote === 'approve' ? 'white' : '#2E7D32', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
                          ✅ Approve
                        </button>
                        <button onClick={() => handleVote(claim.id, 'reject')} disabled={voting}
                          style={{ padding: '5px 12px', borderRadius: 6, border: 'none', background: myVote === 'reject' ? '#F44336' : '#FFEBEE', color: myVote === 'reject' ? 'white' : '#C62828', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
                          ❌ Reject
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Donations log */}
        {donations.length > 0 && (
          <div style={{ background: 'white', borderRadius: 14, padding: '18px 20px', boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#333', marginBottom: 12 }}>💚 Community Boosts</div>
            {donations.map(d => (
              <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f5f5f5' }}>
                <span style={{ fontSize: 13, color: '#555' }}>Anonymous supporter</span>
                <span style={{ fontWeight: 700, color: '#4CAF50', fontSize: 14 }}>+${d.amount.toFixed(2)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── CLAIM MODAL ── */}
      {showClaimModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', borderRadius: '20px 20px 0 0', padding: '28px 24px', paddingBottom: 'calc(36px + env(safe-area-inset-bottom))', width: '100%', maxWidth: 480, maxHeight: '90dvh', overflowY: 'auto' }}>

            {claimSuccess ? (
              <div style={{ textAlign: 'center', padding: '28px 0' }}>
                <div style={{ fontSize: 52, marginBottom: 12 }}>✅</div>
                <div style={{ fontSize: 20, fontWeight: 700 }}>Proof submitted!</div>
                <div style={{ fontSize: 14, color: '#888', marginTop: 6 }}>The community will review your submission.</div>
              </div>

            ) : claimStep === 'confirm' ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <h2 style={{ margin: 0, fontSize: 20 }}>🙋 Claim This Bounty</h2>
                  <button onClick={() => setShowClaimModal(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#aaa' }}>✕</button>
                </div>
                <div style={{ background: `${policy.color}10`, borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
                  <div style={{ fontSize: 24, fontWeight: 900, color: policy.color, marginBottom: 4 }}>${current.toFixed(2)} payout</div>
                  <div style={{ fontSize: 13, color: '#555' }}>Claim window: {getClaimWindowLabel(bounty.type as BountyType)}</div>
                </div>
                <div style={{ fontSize: 13, color: '#666', marginBottom: 16, lineHeight: 1.6 }}>
                  By claiming this bounty, you commit to completing the task within the time window and uploading valid proof. Failure to complete will expire your claim.
                </div>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#333', marginBottom: 8 }}>Required proof:</div>
                  {policy.proofRequirements.map((r, i) => (
                    <div key={i} style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>• {r}</div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => setShowClaimModal(false)} style={{ flex: 1, padding: 13, borderRadius: 10, border: '1px solid #ddd', background: 'white', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
                  <button onClick={handleClaim} disabled={claiming}
                    style={{ flex: 2, padding: 13, borderRadius: 10, border: 'none', background: policy.color, color: 'white', fontWeight: 700, fontSize: 15, cursor: claiming ? 'default' : 'pointer', opacity: claiming ? 0.7 : 1 }}>
                    {claiming ? 'Claiming…' : '✅ Yes, I\'ll do this'}
                  </button>
                </div>
              </>

            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <h2 style={{ margin: 0, fontSize: 20 }}>📤 Submit Proof</h2>
                  <button onClick={() => setShowClaimModal(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#aaa' }}>✕</button>
                </div>

                <div style={{ fontSize: 12, fontWeight: 700, color: '#333', marginBottom: 8 }}>📷 Photo / Video Proof *</div>
                <input ref={proofRef} type="file" accept="image/*,video/*" multiple style={{ display: 'none' }}
                  onChange={e => setProofFiles(Array.from(e.target.files || []))} />
                {proofFiles.length > 0 ? (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                    {proofFiles.map((f, i) => (
                      <div key={i} style={{ background: '#f5f5f5', borderRadius: 8, padding: '6px 10px', fontSize: 12, color: '#555' }}>{f.name}</div>
                    ))}
                    <button onClick={() => setProofFiles([])} style={{ fontSize: 12, color: '#F44336', background: 'none', border: 'none', cursor: 'pointer' }}>✕ Clear</button>
                  </div>
                ) : (
                  <div onClick={() => proofRef.current?.click()} style={{ border: '2px dashed #ddd', borderRadius: 10, padding: '20px', textAlign: 'center', cursor: 'pointer', color: '#aaa', fontSize: 13, marginBottom: 12 }}>
                    📷 Tap to upload photo or video
                  </div>
                )}

                <div style={{ fontSize: 12, fontWeight: 700, color: '#333', marginBottom: 8 }}>🧾 Receipt (if applicable)</div>
                <input ref={receiptRef} type="file" accept="image/*,.pdf" style={{ display: 'none' }}
                  onChange={e => setReceiptFile(e.target.files?.[0] || null)} />
                {receiptFile ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <span style={{ fontSize: 12, color: '#555', background: '#f5f5f5', borderRadius: 8, padding: '6px 10px' }}>{receiptFile.name}</span>
                    <button onClick={() => setReceiptFile(null)} style={{ fontSize: 12, color: '#F44336', background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
                  </div>
                ) : (
                  <div onClick={() => receiptRef.current?.click()} style={{ border: '2px dashed #ddd', borderRadius: 10, padding: '14px', textAlign: 'center', cursor: 'pointer', color: '#aaa', fontSize: 13, marginBottom: 12 }}>
                    🧾 Upload receipt / invoice
                  </div>
                )}

                <div style={{ fontSize: 12, fontWeight: 700, color: '#333', marginBottom: 8 }}>📝 Notes (optional)</div>
                <textarea value={claimNotes} onChange={e => setClaimNotes(e.target.value)} placeholder="Any details about what you did..."
                  style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #ddd', boxSizing: 'border-box', height: 70, fontSize: 13, resize: 'none', outline: 'none', fontFamily: 'inherit', marginBottom: 14 }} />

                <button onClick={handleSubmitProof} disabled={claiming || proofFiles.length === 0}
                  style={{ width: '100%', padding: 14, borderRadius: 12, border: 'none', background: proofFiles.length === 0 ? '#ddd' : policy.color, color: proofFiles.length === 0 ? '#aaa' : 'white', fontWeight: 700, fontSize: 16, cursor: proofFiles.length === 0 ? 'default' : 'pointer', opacity: claiming ? 0.7 : 1 }}>
                  {claiming ? 'Uploading…' : '📤 Submit for Review'}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── BOOST MODAL ── */}
      {showBoostModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', borderRadius: '20px 20px 0 0', padding: '28px 24px', paddingBottom: 'calc(36px + env(safe-area-inset-bottom))', width: '100%', maxWidth: 480 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ margin: 0, fontSize: 20 }}>💰 Boost This Bounty</h2>
              <button onClick={() => setShowBoostModal(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#aaa' }}>✕</button>
            </div>
            <p style={{ fontSize: 13, color: '#888', margin: '0 0 20px' }}>Add money to increase the payout and attract help faster.</p>
            <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
              {BOOST_AMOUNTS.map(a => (
                <button key={a} onClick={() => { setBoostAmount(a); setCustomBoost(''); }}
                  style={{ flex: 1, padding: '12px 0', borderRadius: 10, border: `2px solid ${boostAmount === a && !customBoost ? policy.color : '#ddd'}`, background: boostAmount === a && !customBoost ? `${policy.color}15` : 'white', color: boostAmount === a && !customBoost ? policy.color : '#555', fontWeight: 700, fontSize: 16, cursor: 'pointer' }}>
                  ${a}
                </button>
              ))}
            </div>
            <input type="number" value={customBoost} onChange={e => { setCustomBoost(e.target.value); setBoostAmount(0); }}
              placeholder="Custom amount ($)"
              style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: '1px solid #ddd', fontSize: 15, boxSizing: 'border-box', outline: 'none', marginBottom: 16 }} />
            <button onClick={handleBoost} disabled={boostLoading || (!boostAmount && !customBoost)}
              style={{ width: '100%', padding: 14, borderRadius: 12, border: 'none', background: policy.color, color: 'white', fontWeight: 700, fontSize: 16, cursor: 'pointer', opacity: boostLoading ? 0.7 : 1 }}>
              {boostLoading ? 'Redirecting to payment…' : `💳 Boost by $${customBoost || boostAmount}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
