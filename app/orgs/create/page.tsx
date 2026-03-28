// @ts-nocheck
// PAGE: Register Organization (app/orgs/create/page.tsx → route: /orgs/create)
'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import Navbar from '../../components/Navbar';

const typeOptions = [
  { value: 'adoption', label: '🏠 Adoption Center' },
  { value: 'vet', label: '🏥 Veterinary Clinic' },
  { value: 'pound', label: '🏛️ Animal Pound' },
  { value: 'rescue', label: '🚨 Rescue Organization' },
];

export default function CreateOrgPage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    type: 'adoption',
    address: '',
    phone: '',
    website: '',
    description: '',
    lat: '',
    lng: '',
  });

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { window.location.href = '/login'; return; }
      setUser(data.user);
    });
  }, []);

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!form.name.trim()) { setError('Organization name is required.'); return; }
    if (!form.type) { setError('Please select a type.'); return; }

    const lat = form.lat ? parseFloat(form.lat) : null;
    const lng = form.lng ? parseFloat(form.lng) : null;

    if (form.lat && isNaN(lat)) { setError('Latitude must be a number.'); return; }
    if (form.lng && isNaN(lng)) { setError('Longitude must be a number.'); return; }

    setLoading(true);
    const { data, error: insertError } = await supabase.from('organizations').insert({
      name: form.name.trim(),
      type: form.type,
      address: form.address.trim() || null,
      phone: form.phone.trim() || null,
      website: form.website.trim() || null,
      description: form.description.trim() || null,
      lat: lat,
      lng: lng,
      created_by: user.id,
      verified: false,
    }).select().single();

    setLoading(false);
    if (insertError) { setError(insertError.message); return; }
    window.location.href = `/orgs/${data.id}`;
  }

  const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid #e0e0e0', fontSize: 14, color: '#222', background: 'white', boxSizing: 'border-box', outline: 'none', fontFamily: 'system-ui, sans-serif' };
  const labelStyle = { fontSize: 13, fontWeight: 600, color: '#444', marginBottom: 5, display: 'block' };

  return (
    <div style={{ minHeight: '100vh', background: '#f7f7f7', fontFamily: 'system-ui, sans-serif' }}>
      <Navbar />

      {/* Hero */}
      <div style={{ background: 'linear-gradient(135deg, #1a237e, #3949ab)', padding: '32px 20px 28px', textAlign: 'center', color: 'white' }}>
        <div style={{ fontSize: 44, marginBottom: 8 }}>🏢</div>
        <h1 style={{ fontSize: 26, fontWeight: 800, margin: '0 0 6px' }}>Register Your Organization</h1>
        <p style={{ fontSize: 14, opacity: 0.8, margin: 0 }}>List your shelter, clinic, or rescue on CatMap</p>
      </div>

      <div style={{ maxWidth: 560, margin: '0 auto', padding: '28px 16px' }}>
        <form onSubmit={handleSubmit}>
          <div style={{ background: 'white', borderRadius: 14, padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #eee', display: 'flex', flexDirection: 'column', gap: 18 }}>

            <div>
              <label style={labelStyle}>Organization Name *</label>
              <input style={inputStyle} value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Happy Paws Rescue" required />
            </div>

            <div>
              <label style={labelStyle}>Type *</label>
              <select style={{ ...inputStyle, cursor: 'pointer' }} value={form.type} onChange={e => set('type', e.target.value)}>
                {typeOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>

            <div>
              <label style={labelStyle}>Address</label>
              <input style={inputStyle} value={form.address} onChange={e => set('address', e.target.value)} placeholder="123 Main St, New York, NY 10001" />
            </div>

            <div>
              <label style={labelStyle}>Phone</label>
              <input style={inputStyle} value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+1 (555) 123-4567" type="tel" />
            </div>

            <div>
              <label style={labelStyle}>Website</label>
              <input style={inputStyle} value={form.website} onChange={e => set('website', e.target.value)} placeholder="https://yourorg.com" type="url" />
            </div>

            <div>
              <label style={labelStyle}>Description</label>
              <textarea style={{ ...inputStyle, minHeight: 90, resize: 'vertical' }} value={form.description} onChange={e => set('description', e.target.value)} placeholder="Tell people about your organization..." />
            </div>

            <div>
              <label style={labelStyle}>Location (for map pin)</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ ...labelStyle, fontSize: 11, color: '#888', fontWeight: 500 }}>Latitude</label>
                  <input style={inputStyle} value={form.lat} onChange={e => set('lat', e.target.value)} placeholder="40.7128" type="number" step="any" />
                </div>
                <div>
                  <label style={{ ...labelStyle, fontSize: 11, color: '#888', fontWeight: 500 }}>Longitude</label>
                  <input style={inputStyle} value={form.lng} onChange={e => set('lng', e.target.value)} placeholder="-74.0060" type="number" step="any" />
                </div>
              </div>
              <div style={{ fontSize: 11, color: '#aaa', marginTop: 5 }}>Tip: Search your address on Google Maps and copy the coordinates from the URL.</div>
            </div>

            {error && (
              <div style={{ background: '#fff3f3', border: '1px solid #ffcccc', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#c62828' }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} style={{ padding: '13px', borderRadius: 10, border: 'none', background: loading ? '#bbb' : '#3949ab', color: 'white', fontWeight: 700, fontSize: 15, cursor: loading ? 'default' : 'pointer' }}>
              {loading ? 'Registering...' : '🏢 Register Organization'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
