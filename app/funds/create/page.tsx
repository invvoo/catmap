// @ts-nocheck
// PAGE: Create Fund (app/funds/create/page.tsx → route: /funds/create)
'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import Navbar from '../../components/Navbar';

export default function CreateFundPage() {
  const [user, setUser] = useState<any>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { window.location.href = '/login'; return; }
      setUser(data.user);
    });
  }, []);

  async function handleCreate() {
    if (!name.trim()) { setError('Fund name is required.'); return; }
    setSaving(true); setError('');
    const { data, error: err } = await supabase.from('community_funds').insert({
      name: name.trim(),
      description: description.trim(),
      created_by: user.id,
      type: 'organization',
      is_public: isPublic,
      balance: 0,
      total_raised: 0,
    }).select().single();
    if (err) { setError(err.message); setSaving(false); return; }
    window.location.href = `/funds/${data.id}`;
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f7f7f7', fontFamily: 'system-ui, sans-serif' }}>
      <Navbar />
      <div style={{ maxWidth: 520, margin: '0 auto', padding: '36px 16px' }}>
        <a href="/funds" style={{ fontSize: 13, color: '#FF6B6B', fontWeight: 600, textDecoration: 'none', display: 'inline-block', marginBottom: 20 }}>← Back to Funds</a>
        <div style={{ background: 'white', borderRadius: 16, padding: 32, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: 28, marginBottom: 8, textAlign: 'center' }}>🏢</div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#222', marginBottom: 6, textAlign: 'center' }}>Start a Fund</h1>
          <p style={{ fontSize: 14, color: '#aaa', textAlign: 'center', marginBottom: 28 }}>Create a fund your community can donate to and request bounty disbursements from.</p>

          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#666', marginBottom: 6 }}>Fund Name *</div>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Happy Paws Rescue Fund"
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14, boxSizing: 'border-box', outline: 'none' }} />
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#666', marginBottom: 6 }}>Description</div>
            <textarea value={description} onChange={e => setDescription(e.target.value)}
              placeholder="Tell donors what this fund supports..."
              rows={3}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14, boxSizing: 'border-box', outline: 'none', resize: 'vertical' }} />
          </div>

          <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
            <input type="checkbox" id="public" checked={isPublic} onChange={e => setIsPublic(e.target.checked)}
              style={{ width: 16, height: 16, cursor: 'pointer' }} />
            <label htmlFor="public" style={{ fontSize: 14, color: '#444', cursor: 'pointer' }}>
              Make this fund publicly visible on the Funds page
            </label>
          </div>

          {error && <div style={{ background: '#fff3f3', border: '1px solid #ffcdd2', borderRadius: 8, padding: '10px 12px', fontSize: 13, color: '#c62828', marginBottom: 14 }}>{error}</div>}

          <button onClick={handleCreate} disabled={saving || !name.trim()}
            style={{ width: '100%', padding: 13, borderRadius: 8, border: 'none', background: saving || !name.trim() ? '#ffccbc' : '#FF6B6B', color: 'white', fontWeight: 700, fontSize: 15, cursor: saving || !name.trim() ? 'default' : 'pointer' }}>
            {saving ? 'Creating...' : 'Create Fund'}
          </button>
        </div>
      </div>
    </div>
  );
}
