// @ts-nocheck
'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';

interface AddCatFormProps {
  lat: number;
  lng: number;
  onClose: () => void;
  onSaved: () => void;
}

interface AiResult {
  coat?: string;
  eyes?: string;
  tnr?: string;
  gender?: string;
  age?: string;
  health_status?: string;
  friendliness?: string;
  tail?: string;
  scars?: string;
  error?: string;
}

interface NearbyCat {
  id: string;
  name: string;
  image_url: string;
  lat: number;
  lng: number;
  attributes: any;
  distance: number;
  matchScore: number;
  matchLabel: string;
  matchedFields: string[];
}

// Haversine formula — returns distance in feet
function distanceFeet(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 20902231; // Earth radius in feet
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Fuzzy text match — checks if any words overlap between two strings
function fuzzyMatch(a?: string | null, b?: string | null): boolean {
  if (!a || !b || a === 'Unknown' || b === 'Unknown') return false;
  const wordsA = a.toLowerCase().split(/\s+/);
  const wordsB = new Set(b.toLowerCase().split(/\s+/));
  return wordsA.some(w => w.length > 2 && wordsB.has(w));
}

// Exact match — ignores Unknown values
function exactMatch(a?: string | null, b?: string | null): boolean {
  if (!a || !b || a === 'Unknown' || b === 'Unknown') return false;
  return a.toLowerCase() === b.toLowerCase();
}

// Weighted scoring: coat=3, eyes=2, gender=2, tail=1, age=1, tnr=1
// Returns score, label, and which fields matched
function scoreMatch(formAttrs: any, catAttrs: any): { score: number; label: string; fields: string[] } {
  const fields: string[] = [];
  let score = 0;

  if (fuzzyMatch(formAttrs.coat, catAttrs?.coat)) { score += 3; fields.push('Coat'); }
  if (fuzzyMatch(formAttrs.eyes, catAttrs?.eyes)) { score += 2; fields.push('Eyes'); }
  if (exactMatch(formAttrs.gender, catAttrs?.gender)) { score += 2; fields.push('Gender'); }
  if (fuzzyMatch(formAttrs.tail, catAttrs?.tail)) { score += 1; fields.push('Tail'); }
  if (exactMatch(formAttrs.age, catAttrs?.age)) { score += 1; fields.push('Age'); }
  if (exactMatch(formAttrs.tnr, catAttrs?.tnr)) { score += 1; fields.push('TNR'); }

  const label = score >= 7 ? 'Strong match' : score >= 4 ? 'Possible match' : '';
  return { score, label, fields };
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
            if (tag === 0x8825) gpsIfdOffset = view.getUint32(ifdOffset + 2 + i * 12 + 8, littleEndian) + tiffOffset;
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
          if (lat !== null && lng !== null && isFinite(lat) && isFinite(lng)) resolve({ lat: latRef === 'S' ? -lat : lat, lng: lngRef === 'W' ? -lng : lng });
          else resolve(null);
          return;
        }
        offset += view.getUint16(offset, false);
      }
      resolve(null);
    };
    reader.readAsArrayBuffer(file);
  });
}

async function fileToBase64(file: File): Promise<{ base64: string; mediaType: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const MAX = 1024;
      let { width, height } = img;
      if (width > height) {
        if (width > MAX) { height = Math.round(height * MAX / width); width = MAX; }
      } else {
        if (height > MAX) { width = Math.round(width * MAX / height); height = MAX; }
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      resolve({ base64: dataUrl.split(',')[1], mediaType: 'image/jpeg' });
    };
    img.onerror = reject;
    img.src = url;
  });
}

const inputStyle = { width: '100%', padding: 10, borderRadius: 8, border: '1px solid #ddd', marginBottom: 12, boxSizing: 'border-box' as const, fontSize: 14 };
const labelStyle = { display: 'block', marginBottom: 4, fontWeight: 600, fontSize: 13, color: '#444' } as const;

export default function AddCatForm({ lat, lng, onClose, onSaved }: AddCatFormProps) {
  // Basic fields
  const [name, setName] = useState('');
  const [gender, setGender] = useState('Unknown');
  const [age, setAge] = useState('Unknown');
  const [status, setStatus] = useState('stray');
  const [coat, setCoat] = useState('');
  const [eyes, setEyes] = useState('');
  const [tnr, setTnr] = useState('Unknown');

  // Extended fields
  const [showMore, setShowMore] = useState(false);
  const [healthStatus, setHealthStatus] = useState('Unknown');
  const [friendliness, setFriendliness] = useState('Unknown');
  const [feedingStatus, setFeedingStatus] = useState('Unknown');
  const [spayedNeutered, setSpayedNeutered] = useState('Unknown');
  const [tail, setTail] = useState('');
  const [scars, setScars] = useState('');
  const [notes, setNotes] = useState('');

  // Photo + location
  const [saving, setSaving] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [extractedLat, setExtractedLat] = useState<number>(lat);
  const [extractedLng, setExtractedLng] = useState<number>(lng);
  const [locationSource, setLocationSource] = useState<'map' | 'photo'>('map');

  // AI
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [aiApplied, setAiApplied] = useState(false);

  // Nearby duplicates
  const [nearbyCats, setNearbyCats] = useState<NearbyCat[]>([]);
  const [nearbyDismissed, setNearbyDismissed] = useState(false);
  const [saveMatches, setSaveMatches] = useState<NearbyCat[]>([]);
  const [lostMatches, setLostMatches] = useState<NearbyCat[]>([]);
  const [showSaveMatchModal, setShowSaveMatchModal] = useState(false);
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [sightingLoading, setSightingLoading] = useState(false);
  const [sightingError, setSightingError] = useState('');

  // Crop state
  const [showCrop, setShowCrop] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [cropX, setCropX] = useState(0);
  const [cropY, setCropY] = useState(0);
  const [cropW, setCropW] = useState(0);
  const [cropH, setCropH] = useState(0);
  const cropRef = useRef({ x: 0, y: 0, w: 0, h: 0 });
  const dragStartRef = useRef({ x: 0, y: 0 });
  const [imgNatural, setImgNatural] = useState({ w: 0, h: 0 });
  const [imgDisplay, setImgDisplay] = useState({ w: 0, h: 0 });

  async function loadNearbyCats(checkLat: number, checkLng: number, formAttrs?: any) {
    const { data, error } = await supabase.from('cats').select('id, name, image_url, lat, lng, attributes');
    if (error || !data) return;
    const hasAttrs = formAttrs && Object.values(formAttrs).some((v: any) => v && v !== 'Unknown');
    const nearby = data
      .map((cat) => {
        const distance = distanceFeet(checkLat, checkLng, cat.lat, cat.lng);
        const { score, label, fields } = formAttrs ? scoreMatch(formAttrs, cat.attributes) : { score: 0, label: 'Nearby', fields: [] };
        return { ...cat, distance, matchScore: score, matchLabel: label, matchedFields: fields };
      })
      .filter((cat) => {
        if (cat.distance > 420) return false;
        if (hasAttrs) return cat.matchScore >= 4;
        return true; // before AI runs, show all cats within 420ft
      })
      .sort((a, b) => b.matchScore - a.matchScore || a.distance - b.distance);
    setNearbyCats(nearby);
    setNearbyDismissed(false);
  }

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAiError('');
    setAiApplied(false);
    const location = await getExifLocation(file);
    const useLat = location ? location.lat : lat;
    const useLng = location ? location.lng : lng;
    if (location) { setExtractedLat(location.lat); setExtractedLng(location.lng); setLocationSource('photo'); }
    else { setLocationSource('map'); }
    // Open crop UI
    const url = URL.createObjectURL(file);
    setCropSrc(url);
    setShowCrop(true);
    // Store original file temporarily for AI after crop
    setPhotoFile(file);
    loadNearbyCats(useLat, useLng);
  }

  const draggingRef = useRef(false);
  const cropContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onMouseUp() { draggingRef.current = false; }
    window.addEventListener('mouseup', onMouseUp);
    return () => window.removeEventListener('mouseup', onMouseUp);
  }, []);

  function handleCropMouseDown(e: React.MouseEvent<HTMLDivElement>) {
    draggingRef.current = true;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setCropX(x); setCropY(y); setCropW(0); setCropH(0);
    cropRef.current = { x, y, w: 0, h: 0 };
    dragStartRef.current = { x, y };
  }

  function handleCropMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!draggingRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const y = Math.max(0, Math.min(e.clientY - rect.top, rect.height));
    const nx = Math.min(x, dragStartRef.current.x);
    const ny = Math.min(y, dragStartRef.current.y);
    const nw = Math.abs(x - dragStartRef.current.x);
    const nh = Math.abs(y - dragStartRef.current.y);
    setCropX(nx); setCropY(ny); setCropW(nw); setCropH(nh);
    cropRef.current = { x: nx, y: ny, w: nw, h: nh };
  }

  async function applyCrop() {
    if (!cropSrc || !photoFile) return;
    const img = new Image();
    img.src = cropSrc;
    await new Promise(r => { img.onload = r; });
    const scaleX = img.naturalWidth / imgDisplay.w;
    const scaleY = img.naturalHeight / imgDisplay.h;
    const canvas = document.createElement('canvas');
    const { x: rX, y: rY, w: rW, h: rH } = cropRef.current;
    const cw = rW > 10 ? rW * scaleX : img.naturalWidth;
    const ch = rH > 10 ? rH * scaleY : img.naturalHeight;
    const cx = rW > 10 ? rX * scaleX : 0;
    const cy = rH > 10 ? rY * scaleY : 0;
    canvas.width = cw; canvas.height = ch;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, cx, cy, cw, ch, 0, 0, cw, ch);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const croppedFile = new File([blob], photoFile.name, { type: 'image/jpeg' });
      setPhotoFile(croppedFile);
      setPhotoPreview(URL.createObjectURL(croppedFile));
      setShowCrop(false);
      const useLat = extractedLat; const useLng = extractedLng;
      runAnalyse(croppedFile, useLat, useLng);
    }, 'image/jpeg', 0.9);
  }

  async function runAnalyse(file: File, useLat: number, useLng: number) {
    setAiLoading(true);
    setAiError('');
    try {
      const { base64, mediaType } = await fileToBase64(file);
      const res = await fetch('/api/analyse-cat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64, mediaType }),
      });
      const data: AiResult = await res.json();
      if (data.error) {
        setAiError(data.error);
      } else {
        const newCoat = data.coat || '';
        const newEyes = data.eyes || '';
        const newTnr = data.tnr || 'Unknown';
        const newGender = (data.gender && data.gender !== 'Unknown') ? data.gender : 'Unknown';
        const newAge = (data.age && data.age !== 'Unknown') ? data.age : 'Unknown';
        const newHealthStatus = (data.health_status && data.health_status !== 'Unknown') ? data.health_status : 'Unknown';
        const newFriendliness = (data.friendliness && data.friendliness !== 'Unknown') ? data.friendliness : 'Unknown';
        const newTail = data.tail || '';
        const newScars = data.scars || '';

        if (newCoat) setCoat(newCoat);
        if (newEyes) setEyes(newEyes);
        setTnr(newTnr);
        setGender(newGender);
        setAge(newAge);
        setHealthStatus(newHealthStatus);
        setFriendliness(newFriendliness);
        if (newTail) setTail(newTail);
        if (newScars) setScars(newScars);

        if (newHealthStatus !== 'Unknown' || newFriendliness !== 'Unknown' || newTail || newScars) {
          setShowMore(true);
        }

        loadNearbyCats(useLat, useLng, {
          coat: newCoat, eyes: newEyes, tnr: newTnr,
          gender: newGender, age: newAge, tail: newTail,
        });

        setAiApplied(true);
      }
    } catch {
      setAiError('AI analysis failed. You can still fill in fields manually.');
    } finally {
      setAiLoading(false);
    }
  }

  async function handleLogSighting() {
    if (!selectedMatchId) return;
    setSightingLoading(true);
    setSightingError('');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSightingError('You must be logged in to log a sighting.'); setSightingLoading(false); return; }
    if (!navigator.geolocation) { setSightingError('Geolocation not supported.'); setSightingLoading(false); return; }
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { error } = await supabase.from('sightings').insert({
          cat_id: selectedMatchId,
          user_id: user.id,
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          note: null,
        });
        setSightingLoading(false);
        if (error) { setSightingError('Failed to log sighting: ' + error.message); }
        else { onClose(); }
      },
      () => { setSightingError('Could not get your location. Please allow GPS access.'); setSightingLoading(false); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function handleSubmit() {
    const { data } = await supabase.from('cats').select('id, name, image_url, lat, lng, status, attributes');
    if (data) {
      const currentAttrs = { coat, eyes, tnr, gender, age, tail };
      const MATCH_RADIUS = 10560; // 2 miles in feet

      // Priority: lost cats nearby
      const lost = data
        .filter(cat => cat.status === 'lost')
        .map(cat => {
          const distance = distanceFeet(extractedLat, extractedLng, cat.lat, cat.lng);
          const { score, label, fields } = scoreMatch(currentAttrs, cat.attributes);
          return { ...cat, distance, matchScore: score, matchLabel: label, matchedFields: fields };
        })
        .filter(cat => cat.distance <= MATCH_RADIUS)
        .sort((a, b) => b.matchScore - a.matchScore || a.distance - b.distance);

      // Regular matches (non-lost)
      const matches = data
        .filter(cat => cat.status !== 'lost')
        .map(cat => {
          const distance = distanceFeet(extractedLat, extractedLng, cat.lat, cat.lng);
          const { score, label, fields } = scoreMatch(currentAttrs, cat.attributes);
          return { ...cat, distance, matchScore: score, matchLabel: label, matchedFields: fields };
        })
        .filter(cat => cat.distance <= MATCH_RADIUS && cat.matchScore >= 4)
        .sort((a, b) => b.matchScore - a.matchScore || a.distance - b.distance);

      if (lost.length > 0 || matches.length > 0) {
        setLostMatches(lost);
        setSaveMatches(matches);
        setShowSaveMatchModal(true);
        return;
      }
    }
    await doSave();
  }

  async function doSave() {
    setSaving(true);
    const catName = name.trim() || 'Unknown';

    let image_url = '';
    if (photoFile) {
      const filename = `${Date.now()}_${photoFile.name}`;
      const { error: uploadError } = await supabase.storage.from('cat-photos').upload(filename, photoFile);
      if (uploadError) { alert('Photo upload failed: ' + uploadError.message); setSaving(false); return; }
      const { data } = supabase.storage.from('cat-photos').getPublicUrl(filename);
      image_url = data.publicUrl;
    }

    const attributes = {
      gender, age, coat, eyes, tnr,
      health_status: healthStatus,
      friendliness,
      feeding_status: feedingStatus,
      spayed_neutered: spayedNeutered,
      tail: tail || null,
      scars: scars || null,
      notes: notes || null,
    };

    const safeLat = isFinite(extractedLat) ? extractedLat : lat;
    const safeLng = isFinite(extractedLng) ? extractedLng : lng;
    const { error } = await supabase.from('cats').insert({
      name: catName, status,
      lat: safeLat,
      lng: safeLng,
      image_url,
      attributes,
    });

    if (error) { alert('Error saving cat: ' + error.message); }
    else { onSaved(); onClose(); }
    setSaving(false);
  }

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: 'white', borderRadius: 16, padding: 28, width: 400, boxShadow: '0 20px 60px rgba(0,0,0,0.3)', maxHeight: '90vh', overflowY: 'auto' }}>
        <h2 style={{ margin: '0 0 20px', fontSize: 22 }}>🐱 Report a Cat</h2>

        {/* Photo */}
        <label style={labelStyle}>Photo (optional)</label>
        <input type="file" accept="image/*" onChange={handlePhotoChange} style={{ marginBottom: 8, width: '100%' }} />
        {photoPreview && (
          <div style={{ position: 'relative', marginBottom: 8 }}>
            <img src={photoPreview} alt="preview" style={{ width: '100%', borderRadius: 8, maxHeight: 180, objectFit: 'cover', display: 'block' }} />
            <button onClick={() => { setCropSrc(photoPreview); setShowCrop(true); setCropW(0); setCropH(0); }}
              style={{ position: 'absolute', bottom: 8, right: 8, background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 12, cursor: 'pointer' }}>
              ✂️ Crop
            </button>
          </div>
        )}
        {photoFile && (
          <p style={{ fontSize: 12, color: locationSource === 'photo' ? '#4CAF50' : '#FF9800', marginBottom: 8 }}>
            {locationSource === 'photo' ? '✅ GPS extracted from photo!' : '⚠️ No GPS in photo — using map location'}
          </p>
        )}

        {/* AI status */}
        {photoFile && (
          <div style={{
            width: '100%', padding: '9px 12px', borderRadius: 8, marginBottom: 12,
            background: aiLoading ? '#f3e5f5' : aiApplied ? '#e8f5e9' : '#fafafa',
            border: `1px solid ${aiLoading ? '#ce93d8' : aiApplied ? '#a5d6a7' : '#eee'}`,
            fontSize: 13, color: aiLoading ? '#7b1fa2' : aiApplied ? '#2e7d32' : '#888',
            fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8,
          }}>
            {aiLoading ? '⏳ Analysing photo...' : aiApplied ? '✅ Fields auto-filled by AI — edit if needed' : '📷 Photo uploaded'}
          </div>
        )}
        {aiError && <div style={{ background: '#fff3f3', border: '1px solid #ffcdd2', borderRadius: 8, padding: '8px 12px', marginBottom: 12, fontSize: 13, color: '#c62828' }}>⚠️ {aiError}</div>}

        {/* ── BASIC FIELDS ── */}
        <label style={labelStyle}>Cat Name <span style={{ fontWeight: 400, color: '#aaa' }}>(optional — leave blank to save as Unknown)</span></label>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Whiskers" style={inputStyle} />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 4 }}>
          <div>
            <label style={labelStyle}>Gender</label>
            <select value={gender} onChange={e => setGender(e.target.value)} style={{ ...inputStyle, marginBottom: 0 }}>
              <option>Unknown</option><option>Male</option><option>Female</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Age</label>
            <select value={age} onChange={e => setAge(e.target.value)} style={{ ...inputStyle, marginBottom: 0 }}>
              <option>Unknown</option><option>Kitten</option><option>Young</option><option>Adult</option><option>Senior</option>
            </select>
          </div>
        </div>

        <div style={{ marginBottom: 4 }} />

        <label style={labelStyle}>Status</label>
        <select value={status} onChange={e => setStatus(e.target.value)} style={inputStyle}>
          <option value="stray">Stray</option>
          <option value="community">Community Cat</option>
          <option value="lost">Lost</option>
          <option value="homed">Homed</option>
        </select>

        <label style={labelStyle}>Coat & Markings</label>
        <input value={coat} onChange={e => setCoat(e.target.value)} placeholder="e.g. Orange tabby with white chest" style={inputStyle} />

        <label style={labelStyle}>Eye Color</label>
        <input value={eyes} onChange={e => setEyes(e.target.value)} placeholder="e.g. Green" style={inputStyle} />

        <label style={labelStyle}>Clipped Ear (TNR)</label>
        <select value={tnr} onChange={e => setTnr(e.target.value)} style={inputStyle}>
          <option>Unknown</option><option>None</option><option>Left ear</option><option>Right ear</option>
        </select>

        {/* ── MORE DETAILS ── */}
        <button onClick={() => setShowMore(!showMore)} style={{
          width: '100%', padding: '8px 0', borderRadius: 8, border: '1px solid #ddd',
          background: '#fafafa', fontSize: 13, cursor: 'pointer', marginBottom: 12,
          fontWeight: 600, color: '#555',
        }}>
          {showMore ? '▲ Hide details' : '▼ More details (optional)'}
        </button>

        {showMore && (
          <div style={{ borderTop: '1px solid #eee', paddingTop: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 4 }}>
              <div>
                <label style={labelStyle}>Health</label>
                <select value={healthStatus} onChange={e => setHealthStatus(e.target.value)} style={{ ...inputStyle, marginBottom: 0 }}>
                  <option>Unknown</option><option>Healthy</option><option>Unhealthy</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Friendliness</label>
                <select value={friendliness} onChange={e => setFriendliness(e.target.value)} style={{ ...inputStyle, marginBottom: 0 }}>
                  <option>Unknown</option><option>Friendly</option><option>Shy</option><option>Hostile</option>
                </select>
              </div>
            </div>

            <div style={{ marginBottom: 4 }} />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 4 }}>
              <div>
                <label style={labelStyle}>Feeding Status</label>
                <select value={feedingStatus} onChange={e => setFeedingStatus(e.target.value)} style={{ ...inputStyle, marginBottom: 0 }}>
                  <option>Unknown</option><option>Recently Fed</option><option>Needs Food</option><option>Do Not Feed</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Spayed/Neutered</label>
                <select value={spayedNeutered} onChange={e => setSpayedNeutered(e.target.value)} style={{ ...inputStyle, marginBottom: 0 }}>
                  <option>Unknown</option><option>Yes</option><option>No</option>
                </select>
              </div>
            </div>

            <div style={{ marginBottom: 4 }} />

            <label style={labelStyle}>Tail</label>
            <input value={tail} onChange={e => setTail(e.target.value)} placeholder="e.g. Long and bushy" style={inputStyle} />

            <label style={labelStyle}>Scars / Injuries</label>
            <input value={scars} onChange={e => setScars(e.target.value)} placeholder="e.g. Small scar above left eye" style={inputStyle} />

            <label style={labelStyle}>Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any other details..." style={{ ...inputStyle, height: 70, resize: 'none' }} />
          </div>
        )}

        {nearbyCats.length > 0 && !nearbyDismissed && (
          <div style={{ background: '#FFF8E1', border: '1px solid #FFD54F', borderRadius: 10, padding: 14, marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#E65100' }}>
                ⚠️ {nearbyCats.length} potential match{nearbyCats.length > 1 ? 'es' : ''} nearby
              </div>
              <button onClick={() => setNearbyDismissed(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: '#aaa' }}>✕</button>
            </div>
            <div style={{ fontSize: 12, color: '#888', marginBottom: 10 }}>Could this be one of them? You can still save a new entry.</div>
            {nearbyCats.map((cat) => (
              <div key={cat.id} style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 8, background: 'white', borderRadius: 8, padding: 8 }}>
                {cat.image_url ? (
                  <img src={cat.image_url} alt={cat.name} style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                ) : (
                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>🐱</div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                    <span style={{ fontWeight: 700, fontSize: 14 }}>{cat.name}</span>
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: '1px 7px', borderRadius: 10,
                      background: cat.matchScore >= 7 ? '#FF6B6B' : '#FFB74D',
                      color: 'white',
                    }}>{cat.matchLabel}</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#888' }}>{Math.round(cat.distance)} ft away · Matches: {cat.matchedFields.join(', ')}</div>
                  {cat.attributes?.coat && <div style={{ fontSize: 12, color: '#555', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{cat.attributes.coat}</div>}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── BUTTONS ── */}
        <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
          <button onClick={onClose} style={{ flex: 1, padding: 12, borderRadius: 8, border: '1px solid #ddd', background: 'white', cursor: 'pointer', fontSize: 15 }}>Cancel</button>
          <button onClick={handleSubmit} disabled={saving} style={{ flex: 1, padding: 12, borderRadius: 8, border: 'none', background: '#FF6B6B', color: 'white', cursor: 'pointer', fontSize: 15, fontWeight: 600 }}>
            {saving ? 'Saving...' : 'Save Cat'}
          </button>
        </div>
      </div>

      {/* ── CROP MODAL ── */}
      {showCrop && cropSrc && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.8)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 3000 }}>
          <div style={{ background: 'white', borderRadius: 16, padding: 20, width: 460, maxWidth: '95vw' }}>
            <h2 style={{ margin: '0 0 8px', fontSize: 18 }}>✂️ Crop Photo</h2>
            <p style={{ fontSize: 13, color: '#888', margin: '0 0 12px' }}>Drag to select the area you want to keep. Leave empty to use full photo.</p>
            <div
              ref={cropContainerRef}
              style={{ position: 'relative', userSelect: 'none', cursor: 'crosshair', lineHeight: 0 }}
              onMouseDown={handleCropMouseDown}
              onMouseMove={handleCropMouseMove}
            >
              <img
                src={cropSrc} alt="crop"
                style={{ width: '100%', borderRadius: 8, display: 'block' }}
                onLoad={e => {
                  const img = e.currentTarget;
                  setImgNatural({ w: img.naturalWidth, h: img.naturalHeight });
                  setImgDisplay({ w: img.offsetWidth, h: img.offsetHeight });
                }}
              />
              {cropW > 5 && cropH > 5 && (
                <div style={{
                  position: 'absolute', left: cropX, top: cropY, width: cropW, height: cropH,
                  border: '2px solid #FF6B6B', background: 'rgba(255,107,107,0.15)', pointerEvents: 'none',
                }} />
              )}
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
              <button onClick={() => { setShowCrop(false); setCropW(0); setCropH(0); if (!photoPreview) { setPhotoFile(null); } }}
                style={{ flex: 1, padding: 11, borderRadius: 8, border: '1px solid #ddd', background: 'white', cursor: 'pointer', fontSize: 14 }}>
                Cancel
              </button>
              <button onClick={applyCrop}
                style={{ flex: 1, padding: 11, borderRadius: 8, border: 'none', background: '#FF6B6B', color: 'white', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>
                {cropRef.current.w > 5 && cropRef.current.h > 5 ? 'Apply Crop' : 'Use Full Photo'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── SAVE MATCH MODAL ── */}
      {showSaveMatchModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
          <div style={{ background: 'white', borderRadius: 16, padding: 28, width: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.4)', maxHeight: '85vh', overflowY: 'auto' }}>

            {/* Lost cat priority section */}
            {lostMatches.length > 0 && (
              <div style={{ background: '#FFF3F3', border: '2px solid #F44336', borderRadius: 12, padding: 14, marginBottom: 20 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#F44336', marginBottom: 6 }}>
                  🚨 {lostMatches.length} LOST CAT{lostMatches.length > 1 ? 'S' : ''} NEARBY — Is this them?
                </div>
                <p style={{ fontSize: 13, color: '#888', margin: '0 0 10px' }}>Please check carefully before saving a new entry.</p>
                {lostMatches.map((cat) => {
                  const isSelected = selectedMatchId === cat.id;
                  return (
                    <div key={cat.id}
                      style={{ marginBottom: 8, borderRadius: 10, border: isSelected ? '2px solid #F44336' : '2px solid #ffcdd2', background: isSelected ? '#fff0f0' : 'white', overflow: 'hidden', transition: 'all 0.15s' }}>
                      <div onClick={() => setSelectedMatchId(isSelected ? null : cat.id)}
                        style={{ display: 'flex', gap: 12, alignItems: 'center', padding: 10, cursor: 'pointer' }}>
                        {cat.image_url
                          ? <img src={cat.image_url} alt={cat.name} style={{ width: 52, height: 52, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                          : <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>🐱</div>
                        }
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                            <span style={{ fontWeight: 700, fontSize: 15 }}>{cat.name}</span>
                            <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 10, background: '#F44336', color: 'white' }}>🚨 LOST</span>
                            {isSelected && <span style={{ fontSize: 11, color: '#F44336', fontWeight: 700 }}>✓ Selected</span>}
                          </div>
                          <div style={{ fontSize: 12, color: '#888' }}>{Math.round(cat.distance)} ft away{cat.matchedFields.length > 0 ? ` · Matches: ${cat.matchedFields.join(', ')}` : ''}</div>
                        </div>
                      </div>
                      <div style={{ borderTop: '1px solid #ffcdd2', display: 'flex' }}>
                        <a href={`/cat/${cat.id}`} target="_blank" rel="noopener noreferrer"
                          style={{ flex: 1, padding: '7px 0', textAlign: 'center', fontSize: 12, fontWeight: 600, color: '#F44336', textDecoration: 'none', background: '#fff5f5' }}>
                          👁️ Inspect profile
                        </a>
                        <button onClick={() => setSelectedMatchId(isSelected ? null : cat.id)}
                          style={{ flex: 1, padding: '7px 0', border: 'none', borderLeft: '1px solid #ffcdd2', fontSize: 12, fontWeight: 700, cursor: 'pointer', background: isSelected ? '#F44336' : 'white', color: isSelected ? 'white' : '#555' }}>
                          {isSelected ? '✓ Matched' : 'Select as match'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Regular matches */}
            {saveMatches.length > 0 && (
              <>
                <h2 style={{ margin: '0 0 6px', fontSize: 20 }}>🐱 Possible duplicate?</h2>
                <p style={{ color: '#666', fontSize: 14, margin: '0 0 6px', lineHeight: 1.5 }}>
                  We found {saveMatches.length} cat{saveMatches.length > 1 ? 's' : ''} nearby that match this description.
                </p>
                <p style={{ color: '#999', fontSize: 13, margin: '0 0 16px' }}>Tap a cat to select it and log a sighting instead.</p>
                {saveMatches.map((cat) => {
                  const isSelected = selectedMatchId === cat.id;
                  return (
                    <div key={cat.id}
                      style={{ marginBottom: 10, borderRadius: 10, border: isSelected ? '2px solid #FF9800' : '2px solid #eee', background: isSelected ? '#fff8e1' : '#f9f9f9', overflow: 'hidden', transition: 'all 0.15s' }}>
                      <div style={{ display: 'flex', gap: 12, alignItems: 'center', padding: 12 }}>
                        {cat.image_url
                          ? <img src={cat.image_url} alt={cat.name} style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                          : <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>🐱</div>
                        }
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                            <span style={{ fontWeight: 700, fontSize: 15 }}>{cat.name}</span>
                            <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: cat.matchScore >= 7 ? '#F44336' : '#FF9800', color: 'white' }}>{cat.matchLabel}</span>
                          </div>
                          <div style={{ fontSize: 12, color: '#888', marginBottom: 2 }}>{Math.round(cat.distance)} ft away · Matches: {cat.matchedFields.join(', ')}</div>
                          {cat.attributes?.coat && <div style={{ fontSize: 12, color: '#777', fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cat.attributes.coat}</div>}
                        </div>
                      </div>
                      <div style={{ borderTop: '1px solid #eee', display: 'flex' }}>
                        <a href={`/cat/${cat.id}`} target="_blank" rel="noopener noreferrer"
                          style={{ flex: 1, padding: '7px 0', textAlign: 'center', fontSize: 12, fontWeight: 600, color: '#FF9800', textDecoration: 'none', background: '#fffaf0' }}>
                          👁️ Inspect profile
                        </a>
                        <button onClick={() => setSelectedMatchId(isSelected ? null : cat.id)}
                          style={{ flex: 1, padding: '7px 0', border: 'none', borderLeft: '1px solid #eee', fontSize: 12, fontWeight: 700, cursor: 'pointer', background: isSelected ? '#FF9800' : 'white', color: isSelected ? 'white' : '#555' }}>
                          {isSelected ? '✓ Matched' : 'Select as match'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </>
            )}

            {sightingError && <div style={{ background: '#fff3f3', border: '1px solid #ffcdd2', borderRadius: 8, padding: '8px 12px', marginBottom: 12, fontSize: 13, color: '#c62828' }}>⚠️ {sightingError}</div>}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
              {selectedMatchId && (
                <button onClick={handleLogSighting} disabled={sightingLoading}
                  style={{ width: '100%', padding: 13, borderRadius: 8, border: 'none', background: lostMatches.find(c => c.id === selectedMatchId) ? '#F44336' : '#FF9800', color: 'white', cursor: 'pointer', fontSize: 14, fontWeight: 700 }}>
                  {sightingLoading ? '📍 Getting GPS...' : '📍 Log sighting for this cat'}
                </button>
              )}
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => { setShowSaveMatchModal(false); setSelectedMatchId(null); setSightingError(''); }}
                  style={{ flex: 1, padding: 12, borderRadius: 8, border: '1px solid #ddd', background: 'white', cursor: 'pointer', fontSize: 14 }}>
                  ← Go back
                </button>
                <button onClick={() => { setShowSaveMatchModal(false); setSelectedMatchId(null); doSave(); }} disabled={saving}
                  style={{ flex: 1, padding: 12, borderRadius: 8, border: 'none', background: '#FF6B6B', color: 'white', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>
                  {saving ? 'Saving...' : 'Save as new cat'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  );
}

