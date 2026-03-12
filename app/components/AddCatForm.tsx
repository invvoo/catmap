'use client';

import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface AddCatFormProps {
  lat: number;
  lng: number;
  onClose: () => void;
  onSaved: () => void;
}

async function getExifLocation(file: File): Promise<{ lat: number; lng: number } | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const view = new DataView(e.target?.result as ArrayBuffer);
      if (view.getUint16(0, false) !== 0xFFD8) return resolve(null);

      let offset = 2;
      while (offset < view.byteLength) {
        const marker = view.getUint16(offset, false);
        offset += 2;
        if (marker === 0xFFE1) {
          const exifHeader = view.getUint32(offset + 2, false);
          if (exifHeader !== 0x45786966) return resolve(null);

          const tiffOffset = offset + 2 + 6;
          const littleEndian = view.getUint16(tiffOffset, false) === 0x4949;
          const ifdOffset = view.getUint32(tiffOffset + 4, littleEndian) + tiffOffset;
          const entries = view.getUint16(ifdOffset, littleEndian);

          let gpsIfdOffset = null;
          for (let i = 0; i < entries; i++) {
            const tag = view.getUint16(ifdOffset + 2 + i * 12, littleEndian);
            if (tag === 0x8825) {
              gpsIfdOffset = view.getUint32(ifdOffset + 2 + i * 12 + 8, littleEndian) + tiffOffset;
            }
          }

          if (!gpsIfdOffset) return resolve(null);

          const gpsEntries = view.getUint16(gpsIfdOffset, littleEndian);
          let latRef = '', lat = null, lngRef = '', lng = null;

          for (let i = 0; i < gpsEntries; i++) {
            const tag = view.getUint16(gpsIfdOffset + 2 + i * 12, littleEndian);
            const valOffset = gpsIfdOffset + 2 + i * 12 + 8;

            if (tag === 1) latRef = String.fromCharCode(view.getUint8(valOffset));
            if (tag === 3) lngRef = String.fromCharCode(view.getUint8(valOffset));

            if (tag === 2 || tag === 4) {
              const dmsOffset = view.getUint32(valOffset, littleEndian) + tiffOffset;
              const d = view.getUint32(dmsOffset, littleEndian) / view.getUint32(dmsOffset + 4, littleEndian);
              const m = view.getUint32(dmsOffset + 8, littleEndian) / view.getUint32(dmsOffset + 12, littleEndian);
              const s = view.getUint32(dmsOffset + 16, littleEndian) / view.getUint32(dmsOffset + 20, littleEndian);
              const decimal = d + m / 60 + s / 3600;
              if (tag === 2) lat = decimal;
              if (tag === 4) lng = decimal;
            }
          }

          if (lat !== null && lng !== null) {
            resolve({
              lat: latRef === 'S' ? -lat : lat,
              lng: lngRef === 'W' ? -lng : lng,
            });
          } else {
            resolve(null);
          }
          return;
        }
        offset += view.getUint16(offset, false);
      }
      resolve(null);
    };
    reader.readAsArrayBuffer(file);
  });
}

export default function AddCatForm({ lat, lng, onClose, onSaved }: AddCatFormProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('stray');
  const [saving, setSaving] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [extractedLat, setExtractedLat] = useState<number>(lat);
  const [extractedLng, setExtractedLng] = useState<number>(lng);
  const [locationSource, setLocationSource] = useState<'map' | 'photo'>('map');

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));

    const location = await getExifLocation(file);
    if (location) {
      setExtractedLat(location.lat);
      setExtractedLng(location.lng);
      setLocationSource('photo');
    } else {
      setLocationSource('map');
    }
  }

  async function handleSubmit() {
    if (!name) return alert('Please enter a name!');
    setSaving(true);

    let image_url = '';

    if (photoFile) {
      const filename = `${Date.now()}_${photoFile.name}`;
      const { error: uploadError } = await supabase.storage
        .from('cat-photos')
        .upload(filename, photoFile);

      if (uploadError) {
        alert('Photo upload failed: ' + uploadError.message);
        setSaving(false);
        return;
      }

      const { data } = supabase.storage.from('cat-photos').getPublicUrl(filename);
      image_url = data.publicUrl;
    }

    const { error } = await supabase.from('cats').insert({
      name,
      description,
      status,
      lat: extractedLat,
      lng: extractedLng,
      image_url,
    });

    if (error) {
      alert('Error saving cat: ' + error.message);
    } else {
      onSaved();
      onClose();
    }
    setSaving(false);
  }

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
      background: 'rgba(0,0,0,0.5)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', zIndex: 1000
    }}>
      <div style={{
        background: 'white', borderRadius: 16, padding: 32,
        width: 380, boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        maxHeight: '90vh', overflowY: 'auto'
      }}>
        <h2 style={{ margin: '0 0 20px', fontSize: 22 }}>🐱 Report a Cat</h2>

        <label style={{ display: 'block', marginBottom: 4, fontWeight: 600 }}>Photo (optional)</label>
        <input
          type="file"
          accept="image/*"
          onChange={handlePhotoChange}
          style={{ marginBottom: 8, width: '100%' }}
        />
        {photoPreview && (
          <img src={photoPreview} alt="preview" style={{ width: '100%', borderRadius: 8, marginBottom: 8, maxHeight: 200, objectFit: 'cover' }} />
        )}
        {photoFile && (
          <p style={{ fontSize: 12, color: locationSource === 'photo' ? '#4CAF50' : '#FF9800', marginBottom: 16 }}>
            {locationSource === 'photo'
              ? '✅ GPS location extracted from photo!'
              : '⚠️ No GPS in photo — using map click location'}
          </p>
        )}

        <label style={{ display: 'block', marginBottom: 4, fontWeight: 600 }}>Cat Name *</label>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="e.g. Whiskers"
          style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #ddd', marginBottom: 16, boxSizing: 'border-box' }}
        />

        <label style={{ display: 'block', marginBottom: 4, fontWeight: 600 }}>Description</label>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="e.g. Orange tabby, very friendly"
          style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #ddd', marginBottom: 16, boxSizing: 'border-box', height: 80 }}
        />

        <label style={{ display: 'block', marginBottom: 4, fontWeight: 600 }}>Status</label>
        <select
          value={status}
          onChange={e => setStatus(e.target.value)}
          style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #ddd', marginBottom: 24, boxSizing: 'border-box' }}
        >
          <option value="stray">Stray</option>
          <option value="community">Community Cat</option>
          <option value="lost">Lost</option>
          <option value="homed">Homed</option>
        </select>

        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={onClose}
            style={{ flex: 1, padding: 12, borderRadius: 8, border: '1px solid #ddd', background: 'white', cursor: 'pointer', fontSize: 15 }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            style={{ flex: 1, padding: 12, borderRadius: 8, border: 'none', background: '#FF6B6B', color: 'white', cursor: 'pointer', fontSize: 15, fontWeight: 600 }}
          >
            {saving ? 'Saving...' : 'Save Cat'}
          </button>
        </div>
      </div>
    </div>
  );
}