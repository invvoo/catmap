// @ts-nocheck
// PAGE: Register Organization (app/orgs/create/page.tsx → route: /orgs/create)
'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect, useRef } from 'react';
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
    street: '',
    city: '',
    state: '',
    zip: '',
    country: '',
    phone: '',
    website: '',
    description: '',
  });
  const [resolvedAddress, setResolvedAddress] = useState(''); // formatted address from Places
  const [resolvedLat, setResolvedLat] = useState(null);
  const [resolvedLng, setResolvedLng] = useState(null);

  const autocompleteInputRef = useRef(null);
  const autocompleteRef = useRef(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { window.location.href = '/login'; return; }
      setUser(data.user);
    });
  }, []);

  // Load Google Places Autocomplete once Maps script is available
  useEffect(() => {
    function initAutocomplete() {
      if (!autocompleteInputRef.current || !window.google?.maps?.places) return;
      const ac = new window.google.maps.places.Autocomplete(autocompleteInputRef.current, {
        types: ['address'],
        fields: ['formatted_address', 'geometry', 'address_components'],
      });
      ac.addListener('place_changed', () => {
        const place = ac.getPlace();
        if (!place.geometry) return;

        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        setResolvedLat(lat);
        setResolvedLng(lng);
        setResolvedAddress(place.formatted_address || '');

        // Parse address_components into individual fields
        const get = (type) => {
          const comp = place.address_components?.find(c => c.types.includes(type));
          return comp?.long_name || '';
        };
        const streetNumber = get('street_number');
        const route = get('route');
        setForm(f => ({
          ...f,
          street: [streetNumber, route].filter(Boolean).join(' '),
          city: get('locality') || get('sublocality') || get('administrative_area_level_2'),
          state: get('administrative_area_level_1'),
          zip: get('postal_code'),
          country: get('country'),
        }));
      });
      autocompleteRef.current = ac;
    }

    // If Maps already loaded
    if (window.google?.maps?.places) {
      initAutocomplete();
      return;
    }

    // Wait for Maps script
    const existing = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existing) {
      existing.addEventListener('load', initAutocomplete);
      return () => existing.removeEventListener('load', initAutocomplete);
    }

    // Load it ourselves with places library
    const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places`;
    script.async = true;
    script.onload = initAutocomplete;
    document.head.appendChild(script);
  }, []);

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }));
    // If user manually edits a field after autocomplete, clear the resolved coords
    // so we know we need to re-validate
    if (['street', 'city', 'state', 'zip', 'country'].includes(field)) {
      setResolvedLat(null);
      setResolvedLng(null);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!form.name.trim()) { setError('Organization name is required.'); return; }
    if (!form.street.trim() || !form.city.trim()) {
      setError('Please search for your address using the search field above.');
      return;
    }

    setLoading(true);

    let lat = resolvedLat;
    let lng = resolvedLng;
    let formattedAddress = resolvedAddress;

    // If no resolved coords (user typed manually), fall back to geocode
    if (!lat || !lng) {
      const fullAddress = [form.street, form.city, form.state, form.zip, form.country].filter(Boolean).join(', ');
      const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
      const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(fullAddress)}&key=${key}`);
      const json = await res.json();
      if (json.status === 'OK' && json.results[0]) {
        lat = json.results[0].geometry.location.lat;
        lng = json.results[0].geometry.location.lng;
        formattedAddress = json.results[0].formatted_address;
      } else {
        setError('Could not find that address. Please use the address search field to select your address from the dropdown.');
        setLoading(false);
        return;
      }
    }

    const { data, error: insertError } = await supabase.from('organizations').insert({
      name: form.name.trim(),
      type: form.type,
      address: formattedAddress,
      phone: form.phone.trim() || null,
      website: form.website.trim() || null,
      description: form.description.trim() || null,
      lat,
      lng,
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

            {/* Address search */}
            <div>
              <label style={labelStyle}>🔍 Search Address *</label>
              <input
                ref={autocompleteInputRef}
                style={{ ...inputStyle, borderColor: resolvedLat ? '#4CAF50' : '#e0e0e0' }}
                placeholder="Start typing your address…"
                defaultValue=""
              />
              {resolvedLat && (
                <div style={{ fontSize: 11, color: '#4CAF50', marginTop: 5, fontWeight: 600 }}>
                  ✓ Address confirmed — {resolvedAddress}
                </div>
              )}
              {!resolvedLat && (
                <div style={{ fontSize: 11, color: '#aaa', marginTop: 5 }}>
                  Type your address and select from the dropdown to confirm location.
                </div>
              )}
            </div>

            {/* Auto-filled address fields (editable) */}
            {(form.street || form.city) && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <input style={{ ...inputStyle, background: '#fafafa' }} value={form.street} onChange={e => set('street', e.target.value)} placeholder="Street address" />
                <input style={{ ...inputStyle, background: '#fafafa' }} value={form.city} onChange={e => set('city', e.target.value)} placeholder="City" />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <input style={{ ...inputStyle, background: '#fafafa' }} value={form.state} onChange={e => set('state', e.target.value)} placeholder="State / Province" />
                  <input style={{ ...inputStyle, background: '#fafafa' }} value={form.zip} onChange={e => set('zip', e.target.value)} placeholder="ZIP / Postal code" />
                </div>
                <input style={{ ...inputStyle, background: '#fafafa' }} value={form.country} onChange={e => set('country', e.target.value)} placeholder="Country" />
              </div>
            )}

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
              {loading ? '📍 Saving...' : '🏢 Register Organization'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
