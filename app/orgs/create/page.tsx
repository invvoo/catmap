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

  async function geocodeAddress(address) {
    const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
    const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${key}`);
    const json = await res.json();
    if (json.status === 'OK' && json.results[0]) {
      const { lat, lng } = json.results[0].geometry.location;
      return { lat, lng, formatted: json.results[0].formatted_address };
    }
    return null;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!form.name.trim()) { setError('Organization name is required.'); return; }
    if (!form.address.trim()) { setError('Full address is required to place your organization on the map.'); return; }

    setLoading(true);

    // Geocode the address
    const geo = await geocodeAddress(form.address.trim());
    if (!geo) {
      setError('Could not find that address. Please enter a full address including city, state, and country.');
      setLoading(false);
      return;
    }

    const { data, error: insertError } = await supabase.from('organizations').insert({
      name: form.name.trim(),
      type: form.type,
      address: geo.formatted, // use the cleaned-up address from Google
      phone: form.phone.trim() || null,
      website: form.website.trim() || null,
      description: form.description.trim() || null,
      lat: geo.lat,
      lng: geo.lng,
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
              <label style={labelStyle}>Full Address *</label>
              <input
                style={inputStyle}
                value={form.address}
                onChange={e => set('address', e.target.value)}
                placeholder="123 Main St, Brooklyn, NY 11201, USA"
              />
              <div style={{ fontSize: 11, color: '#aaa', marginTop: 5 }}>Include street, city, state, zip, and country. This is used to place your organization on the map.</div>
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
              <textarea style={{ ...inputStyle, minHeight: 90, resize: 'vertical' }} value={form.description} onChange={e => set('description', e.target.value)} placeholder="Tell people about your organization, what you do, and how to adopt or get help..." />
            </div>

            {error && (
              <div style={{ background: '#fff3f3', border: '1px solid #ffcccc', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#c62828' }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} style={{ padding: '13px', borderRadius: 10, border: 'none', background: loading ? '#bbb' : '#3949ab', color: 'white', fontWeight: 700, fontSize: 15, cursor: loading ? 'default' : 'pointer' }}>
              {loading ? '📍 Finding location...' : '🏢 Register Organization'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
