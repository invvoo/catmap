// @ts-nocheck
// PAGE: Create Fund (app/funds/create/page.tsx → route: /funds/create)
'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import Navbar from '../../components/Navbar';

const PRESET_CRITERIA = [
  'Kittens', 'Senior cats', 'Black cats', 'Female cats', 'Male cats',
  'Injured / sick cats', 'TNR (trap-neuter-return)', 'Stray cats only',
];

export default function CreateFundPage() {
  const [user, setUser] = useState<any>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [geocoding, setGeocoding] = useState(false);
  const [geocodeError, setGeocodeError] = useState('');
  const [criteria, setCriteria] = useState<string[]>([]);
  const [customCriteria, setCustomCriteria] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { window.location.href = '/login'; return; }
      setUser(data.user);
    });
  }, []);

  function toggleCriteria(tag: string) {
    setCriteria(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  }

  async function geocodeAddress(addr: string) {
    const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
    const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(addr)}&key=${key}`);
    const json = await res.json();
    if (json.status !== 'OK' || !json.results[0]) return null;
    const { lat, lng } = json.results[0].geometry.location;
    return { lat, lng, formatted: json.results[0].formatted_address };
  }

  async function handleCreate() {
    if (!name.trim()) { setError('Fund name is required.'); return; }
    setSaving(true); setError(''); setGeocodeError('');

    let lat = null, lng = null, formattedAddress = address.trim() || null;

    if (address.trim()) {
      setGeocoding(true);
      const geo = await geocodeAddress(address.trim());
      setGeocoding(false);
      if (!geo) { setGeocodeError('Could not find that address. Please check and try again.'); setSaving(false); return; }
      lat = geo.lat; lng = geo.lng; formattedAddress = geo.formatted;
    }

    const allCriteria = [...criteria];
    if (customCriteria.trim()) allCriteria.push(customCriteria.trim());

    const { data, error: err } = await supabase.from('community_funds').insert({
      name: name.trim(),
      description: description.trim(),
      created_by: user.id,
      type: 'organization',
      is_public: isPublic,
      balance: 0,
      total_raised: 0,
      lat,
      lng,
      address: formattedAddress,
      criteria: allCriteria,
    }).select().single();
    if (err) { setError(err.message); setSaving(false); return; }
    window.location.href = `/funds/${data.id}`;
  }

  const label = (text: string) => (
    <div style={{ fontSize: 12, fontWeight: 600, color: '#666', marginBottom: 6 }}>{text}</div>
  );
  const input = (props: any) => (
    <input {...props} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14, boxSizing: 'border-box', outline: 'none', ...props.style }} />
  );

  return (
    <div style={{ minHeight: '100vh', background: '#f7f7f7', fontFamily: 'system-ui, sans-serif' }}>
      <Navbar />
      <div style={{ maxWidth: 520, margin: '0 auto', padding: '36px 16px 60px' }}>
        <a href="/funds" style={{ fontSize: 13, color: '#FF6B6B', fontWeight: 600, textDecoration: 'none', display: 'inline-block', marginBottom: 20 }}>← Back to Funds</a>
        <div style={{ background: 'white', borderRadius: 16, padding: 32, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: 28, marginBottom: 8, textAlign: 'center' }}>💛</div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#222', marginBottom: 6, textAlign: 'center' }}>Start a Fund</h1>
          <p style={{ fontSize: 14, color: '#aaa', textAlign: 'center', marginBottom: 28 }}>Create a fund your community can donate to and request bounty disbursements from.</p>

          <div style={{ marginBottom: 16 }}>
            {label('Fund Name *')}
            {input({ value: name, onChange: e => setName(e.target.value), placeholder: 'e.g. Happy Paws Rescue Fund' })}
          </div>

          <div style={{ marginBottom: 16 }}>
            {label('Description')}
            <textarea value={description} onChange={e => setDescription(e.target.value)}
              placeholder="Tell donors what this fund supports..."
              rows={3}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14, boxSizing: 'border-box', outline: 'none', resize: 'vertical' }} />
          </div>

          <div style={{ marginBottom: 16 }}>
            {label('Location (optional)')}
            {input({ value: address, onChange: e => setAddress(e.target.value), placeholder: 'e.g. 123 Main St, Brooklyn, NY 11201' })}
            {geocodeError && <div style={{ fontSize: 12, color: '#F44336', marginTop: 4 }}>{geocodeError}</div>}
            <div style={{ fontSize: 12, color: '#aaa', marginTop: 4 }}>Helps donors find funds near them.</div>
          </div>

          <div style={{ marginBottom: 20 }}>
            {label('Allocation Criteria (optional)')}
            <div style={{ fontSize: 12, color: '#aaa', marginBottom: 10 }}>Specify which cats or situations this fund prioritises.</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
              {PRESET_CRITERIA.map(tag => {
                const active = criteria.includes(tag);
                return (
                  <button key={tag} type="button" onClick={() => toggleCriteria(tag)}
                    style={{ padding: '5px 12px', borderRadius: 20, border: `1.5px solid ${active ? '#FF6B6B' : '#ddd'}`, background: active ? '#fff3f3' : 'white', color: active ? '#FF6B6B' : '#555', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                    {tag}
                  </button>
                );
              })}
            </div>
            {input({
              value: customCriteria,
              onChange: e => setCustomCriteria(e.target.value),
              placeholder: 'Add custom criteria (e.g. "cats in Bushwick")',
              style: { marginTop: 4 },
            })}
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
            {geocoding ? '📍 Finding location...' : saving ? 'Creating...' : 'Create Fund'}
          </button>
        </div>
      </div>
    </div>
  );
}
