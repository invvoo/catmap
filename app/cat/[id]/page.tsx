
// PAGE: Cat Profile (app/cat/[id]/page.tsx → route: /cat/[id])
// @ts-nocheck
'use client';
export const dynamic = 'force-dynamic';
import { supabase } from '../../../lib/supabase';
import Navbar from '../../components/Navbar';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';



const statusColors: Record<string, string> = {
  stray: '#FF9800', community: '#4CAF50', lost: '#F44336', homed: '#2196F3',
};
const statusEmoji: Record<string, string> = {
  stray: '🏚️', community: '🏘️', lost: '🚨', homed: '🏠',
};

const REACTION_EMOJIS = ['👍', '❤️', '😢', '😮'];

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return months === 1 ? '1 month ago' : `${months} months ago`;
}

function AttrRow({ label, value }: { label: string; value?: string | null }) {
  if (!value || value === 'Unknown') return null;
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
      <span style={{ color: '#888', fontSize: 14, flexShrink: 0, marginRight: 16 }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 600, color: '#222', textAlign: 'right' }}>{value}</span>
    </div>
  );
}

export default function CatPage() {
  const params = useParams();
  const catId = params?.id as string;

  const [cat, setCat] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [sightings, setSightings] = useState<any[]>([]);
  const [nameVotes, setNameVotes] = useState<{ suggested_name: string; count: number }[]>([]);
  const [myVote, setMyVote] = useState<string | null>(null);
  const [newNameInput, setNewNameInput] = useState('');
  const [voteSaving, setVoteSaving] = useState(false);

  // Sighting modal
  const [showSightingModal, setShowSightingModal] = useState(false);
  const [sightingStep, setSightingStep] = useState<1 | 2>(1);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [sightingSuccess, setSightingSuccess] = useState(false);
  const [sightingPhoto, setSightingPhoto] = useState<File | null>(null);
  const [sightingPhotoPreview, setSightingPhotoPreview] = useState<string | null>(null);
  const [sightingLat, setSightingLat] = useState<number | null>(null);
  const [sightingLng, setSightingLng] = useState<number | null>(null);
  const [sightingLocSource, setSightingLocSource] = useState('');
  const [sightingLocLoading, setSightingLocLoading] = useState(false);
  const sightingCameraRef = useRef<HTMLInputElement>(null);
  const sightingGalleryRef = useRef<HTMLInputElement>(null);
  const miniMapRef = useRef<HTMLDivElement>(null);
  const miniMapInstanceRef = useRef<any>(null);

  // Lost/Found/Claim modals
  const [showLostModal, setShowLostModal] = useState(false);
  const [showFoundModal, setShowFoundModal] = useState(false);
  const [lostSaving, setLostSaving] = useState(false);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [claimPhoto, setClaimPhoto] = useState<File | null>(null);
  const [claimPhotoPreview, setClaimPhotoPreview] = useState<string | null>(null);
  const [claimSaving, setClaimSaving] = useState(false);
  const [claimError, setClaimError] = useState('');

  // Gallery
  const [galleryPhotos, setGalleryPhotos] = useState<string[]>([]);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Community posts
  const [posts, setPosts] = useState<any[]>([]);
  const [postReactions, setPostReactions] = useState<Record<string, any[]>>({});
  const [myReactions, setMyReactions] = useState<Record<string, string>>({});
  const [newPost, setNewPost] = useState('');
  const [postSaving, setPostSaving] = useState(false);

  // Adopt modal
  const [showAdoptModal, setShowAdoptModal] = useState(false);

  // Owner notes
  const [ownerNotes, setOwnerNotes] = useState('');
  const [notesSaving, setNotesSaving] = useState(false);
  const [notesSaved, setNotesSaved] = useState(false);
  const [ownerNameInput, setOwnerNameInput] = useState('');
  const [nameSaving, setNameSaving] = useState(false);
  const [nameSaved, setNameSaved] = useState(false);


  useEffect(() => {
    if (!catId) return;
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      if (data.user) loadMyVote(data.user.id);
    });
    loadCat();
    loadSightings();
    loadNameVotes();
    loadGallery();
    loadPosts();
  }, [catId]);

  async function loadCat() {
    setLoading(true);
    const { data } = await supabase.from('cats').select('*').eq('id', catId).single();
    if (data) { setCat(data); setOwnerNotes(data.attributes?.notes || ''); setOwnerNameInput(data.name === 'Unknown' ? '' : data.name); }
    setLoading(false);
  }

  async function loadSightings() {
    const { data } = await supabase.from('sightings').select('*').eq('cat_id', catId).order('created_at', { ascending: false });
    if (data) setSightings(data);
  }

  // Re-render mini map when sightings or cat loads
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (cat && sightings.length > 0 && miniMapRef.current) {
      loadMiniMap(cat, sightings);
    }
  }, [cat?.id, sightings.length]);

  async function loadNameVotes() {
    const { data } = await supabase.from('cat_name_votes').select('suggested_name').eq('cat_id', catId);
    if (!data) return;
    const counts: Record<string, number> = {};
    data.forEach(({ suggested_name }) => { counts[suggested_name] = (counts[suggested_name] || 0) + 1; });
    setNameVotes(Object.entries(counts).map(([suggested_name, count]) => ({ suggested_name, count })).sort((a, b) => b.count - a.count));
  }

  async function loadMyVote(userId: string) {
    const { data } = await supabase.from('cat_name_votes').select('suggested_name').eq('cat_id', catId).eq('user_id', userId).maybeSingle();
    if (data) setMyVote(data.suggested_name);
  }

  async function loadGallery() {
    const { data: uploaded } = await supabase.from('cat_photos').select('url').eq('cat_id', catId).order('created_at', { ascending: false });
    const { data: sightingPhotos } = await supabase.from('sightings').select('photo_url').eq('cat_id', catId).not('photo_url', 'is', null);
    const urls = [
      ...(uploaded || []).map((p: any) => p.url),
      ...(sightingPhotos || []).map((p: any) => p.photo_url).filter(Boolean),
    ];
    setGalleryPhotos(urls);
  }

  async function loadMiniMap(catData: any, sightingsData: any[]) {
    if (!miniMapRef.current || sightingsData.length < 1) return;
    // Destroy existing map instance
    if (miniMapInstanceRef.current) {
      miniMapInstanceRef.current = null;
      miniMapRef.current.innerHTML = '';
    }
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
    const mapId = process.env.NEXT_PUBLIC_GOOGLE_MAPS_ID;

    // Load Maps script using callback pattern (same as main page.tsx)
    await new Promise<void>((resolve) => {
      if ((window as any).google?.maps?.Map) { resolve(); return; }
      const cbName = '__miniMapReady__';
      (window as any)[cbName] = () => { delete (window as any)[cbName]; resolve(); };
      if (!document.querySelector('script[data-catmap-minimap]')) {
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=${cbName}&libraries=marker`;
        script.async = true;
        script.defer = true;
        script.setAttribute('data-catmap-minimap', 'true');
        document.head.appendChild(script);
      }
    });

    const google = (window as any).google;
    const { AdvancedMarkerElement } = await google.maps.importLibrary('marker');
    const Map = google.maps.Map;
    const Polyline = google.maps.Polyline;
    const LatLngBounds = google.maps.LatLngBounds;

    const allPoints = [
      { lat: catData.lat, lng: catData.lng },
      ...sightingsData.filter((s: any) => s.lat && s.lng),
    ];
    if (allPoints.length < 1) return;

    const bounds = new LatLngBounds();
    allPoints.forEach(p => bounds.extend({ lat: p.lat, lng: p.lng }));

    const map = new Map(miniMapRef.current, {
      center: bounds.getCenter(),
      zoom: 15,
      mapId: process.env.NEXT_PUBLIC_GOOGLE_MAPS_ID,
      disableDefaultUI: true,
      zoomControl: true,
      gestureHandling: 'cooperative',
    });
    miniMapInstanceRef.current = map;
    map.fitBounds(bounds, 40);

    // Polyline in chronological order
    const sorted = [...sightingsData]
      .filter((s: any) => s.lat && s.lng)
      .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    if (sorted.length >= 2) {
      new Polyline({
        path: sorted.map((s: any) => ({ lat: s.lat, lng: s.lng })),
        geodesic: true,
        strokeColor: '#FF6B6B',
        strokeOpacity: 0.7,
        strokeWeight: 2,
        map,
      });
    }

    // Sighting dots — brighter = more recent
    sorted.forEach((s: any) => {
      const age = (Date.now() - new Date(s.created_at).getTime()) / (1000 * 60 * 60 * 24);
      const opacity = Math.max(0.3, 1 - age / 30);
      const dot = document.createElement('div');
      dot.style.cssText = `width:12px;height:12px;border-radius:50%;background:rgba(255,107,107,${opacity.toFixed(2)});border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.3);`;
      new AdvancedMarkerElement({ position: { lat: s.lat, lng: s.lng }, map, content: dot });
    });

    // Cat home pin
    const homeEl = document.createElement('div');
    homeEl.style.cssText = 'font-size:22px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.4));';
    homeEl.textContent = '🐱';
    new AdvancedMarkerElement({ position: { lat: catData.lat, lng: catData.lng }, map, content: homeEl });
  }

  async function loadPosts() {
    const { data } = await supabase.from('cat_posts').select('*').eq('cat_id', catId).order('created_at', { ascending: false });
    if (!data) return;
    setPosts(data);
    // load reactions for all posts
    const postIds = data.map((p: any) => p.id);
    if (postIds.length === 0) return;
    const { data: reactions } = await supabase.from('cat_post_reactions').select('*').in('post_id', postIds);
    if (reactions) {
      const grouped: Record<string, any[]> = {};
      reactions.forEach((r: any) => { grouped[r.post_id] = [...(grouped[r.post_id] || []), r]; });
      setPostReactions(grouped);
      // my reactions
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const mine: Record<string, string> = {};
        reactions.filter((r: any) => r.user_id === user.id).forEach((r: any) => { mine[r.post_id] = r.emoji; });
        setMyReactions(mine);
      }
    }
  }

  async function handleVote(name: string) {
    if (!user) return;
    setVoteSaving(true);
    await supabase.from('cat_name_votes').upsert({ cat_id: catId, user_id: user.id, suggested_name: name }, { onConflict: 'cat_id,user_id' });
    setMyVote(name); await loadNameVotes(); setVoteSaving(false);
  }

  async function handleSubmitNewName() {
    const trimmed = newNameInput.trim();
    if (!trimmed || !user) return;
    setNewNameInput(''); await handleVote(trimmed);
  }

  async function getExifLocation(file: File): Promise<{ lat: number; lng: number } | null> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const view = new DataView(e.target?.result as ArrayBuffer);
        if (view.getUint16(0, false) !== 0xFFD8) return resolve(null);
        let offset = 2;
        while (offset < view.byteLength) {
          const marker = view.getUint16(offset, false); offset += 2;
          if (marker === 0xFFE1) {
            if (view.getUint32(offset + 2, false) !== 0x45786966) return resolve(null);
            const tiffOffset = offset + 2 + 6;
            const le = view.getUint16(tiffOffset, false) === 0x4949;
            const ifdOffset = view.getUint32(tiffOffset + 4, le) + tiffOffset;
            const entries = view.getUint16(ifdOffset, le);
            let gpsOff = null;
            for (let i = 0; i < entries; i++) {
              if (view.getUint16(ifdOffset + 2 + i * 12, le) === 0x8825)
                gpsOff = view.getUint32(ifdOffset + 2 + i * 12 + 8, le) + tiffOffset;
            }
            if (!gpsOff) return resolve(null);
            const gpsEntries = view.getUint16(gpsOff, le);
            let latRef = '', latVal = null, lngRef = '', lngVal = null;
            for (let i = 0; i < gpsEntries; i++) {
              const tag = view.getUint16(gpsOff + 2 + i * 12, le);
              const vo = gpsOff + 2 + i * 12 + 8;
              if (tag === 1) latRef = String.fromCharCode(view.getUint8(vo));
              if (tag === 3) lngRef = String.fromCharCode(view.getUint8(vo));
              if (tag === 2 || tag === 4) {
                const dmsOff = view.getUint32(vo, le) + tiffOffset;
                const d = view.getUint32(dmsOff, le) / view.getUint32(dmsOff + 4, le);
                const m = view.getUint32(dmsOff + 8, le) / view.getUint32(dmsOff + 12, le);
                const s = view.getUint32(dmsOff + 16, le) / view.getUint32(dmsOff + 20, le);
                const dec = d + m / 60 + s / 3600;
                if (tag === 2) latVal = dec; if (tag === 4) lngVal = dec;
              }
            }
            if (latVal !== null && lngVal !== null && isFinite(latVal) && isFinite(lngVal))
              return resolve({ lat: latRef === 'S' ? -latVal : latVal, lng: lngRef === 'W' ? -lngVal : lngVal });
            return resolve(null);
          }
          if ((marker & 0xFF00) !== 0xFF00) break;
          offset += view.getUint16(offset, false);
        }
        resolve(null);
      };
      reader.readAsArrayBuffer(file);
    });
  }

  function openSightingModal() {
    if (!user) { window.location.href = '/login'; return; }
    setNote(''); setSightingSuccess(false); setSightingPhoto(null);
    setSightingPhotoPreview(null); setSightingLat(null); setSightingLng(null);
    setSightingLocSource(''); setSightingStep(1); setShowSightingModal(true);
  }

  async function handlePickCamera(file: File) {
    setSightingPhoto(file);
    setSightingPhotoPreview(URL.createObjectURL(file));
    setSightingLocLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setSightingLat(pos.coords.latitude); setSightingLng(pos.coords.longitude);
        setSightingLocSource('📍 GPS from device'); setSightingLocLoading(false); setSightingStep(2);
      },
      () => { setSightingLocSource('⚠️ Location unavailable'); setSightingLocLoading(false); setSightingStep(2); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function handlePickGallery(file: File) {
    setSightingPhoto(file);
    setSightingPhotoPreview(URL.createObjectURL(file));
    setSightingLocLoading(true);
    const exif = await getExifLocation(file);
    if (exif) {
      setSightingLat(exif.lat); setSightingLng(exif.lng);
      setSightingLocSource('✅ GPS from photo'); setSightingLocLoading(false); setSightingStep(2);
    } else {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setSightingLat(pos.coords.latitude); setSightingLng(pos.coords.longitude);
          setSightingLocSource('📍 GPS from device'); setSightingLocLoading(false); setSightingStep(2);
        },
        () => { setSightingLocSource('⚠️ Location unavailable'); setSightingLocLoading(false); setSightingStep(2); },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  }

  async function handleSubmitSighting() {
    if (!sightingPhoto) return;
    setSaving(true);
    let photoUrl: string | null = null;
    const filename = `${Date.now()}_sighting_${catId}_${sightingPhoto.name}`;
    const { error: upErr } = await supabase.storage.from('cat-photos').upload(filename, sightingPhoto);
    if (!upErr) {
      const { data } = supabase.storage.from('cat-photos').getPublicUrl(filename);
      photoUrl = data.publicUrl;
    }
    const { error } = await supabase.from('sightings').insert({
      cat_id: catId, user_id: user.id,
      lat: sightingLat, lng: sightingLng,
      note: note.trim() || null,
      photo_url: photoUrl,
    });
    setSaving(false);
    if (!error) {
      setSightingSuccess(true);
      if (cat.owner_id && cat.owner_id !== user.id) {
        await supabase.from('notifications').insert({
          user_id: cat.owner_id, cat_id: catId, type: 'sighting',
          message: `📍 Someone spotted ${cat.name}!`,
        });
      }
      await loadSightings(); await loadGallery();
      setTimeout(() => { setShowSightingModal(false); setSightingSuccess(false); }, 2000);
    }
  }

  async function handleMarkLost() {
    setLostSaving(true);
    await supabase.from('cats').update({ previous_status: cat.status, status: 'lost' }).eq('id', catId);
    await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/notify-lost-cat`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}` },
      body: JSON.stringify({ cat_id: catId, cat_name: cat.name }),
    });
    // Notify all unique previous sighters
    const { data: sighters } = await supabase.from('sightings').select('user_id').eq('cat_id', catId);
    const uniqueSighters = [...new Set((sighters || []).map((s: any) => s.user_id))].filter(id => id !== user?.id);
    if (uniqueSighters.length > 0) {
      await supabase.from('notifications').insert(
        uniqueSighters.map(uid => ({
          user_id: uid, cat_id: catId, type: 'lost',
          message: `🚨 ${cat.name} has been marked as lost! You've spotted this cat before.`,
        }))
      );
    }
    setCat((prev: any) => ({ ...prev, previous_status: prev.status, status: 'lost' }));
    setLostSaving(false); setShowLostModal(false);
  }

  async function handleMarkFound() {
    setLostSaving(true);
    const revertTo = cat.previous_status || 'stray';
    await supabase.from('cats').update({ status: revertTo, previous_status: null }).eq('id', catId);
    setCat((prev: any) => ({ ...prev, status: revertTo, previous_status: null }));
    setLostSaving(false); setShowFoundModal(false);
  }

  async function handleClaimOwnership() {
    if (!user || !claimPhoto) return;
    setClaimSaving(true); setClaimError('');
    const filename = `${Date.now()}_claim_${claimPhoto.name}`;
    const { error: uploadError } = await supabase.storage.from('cat-photos').upload(filename, claimPhoto);
    if (uploadError) { setClaimError('Upload failed: ' + uploadError.message); setClaimSaving(false); return; }
    const { data: urlData } = supabase.storage.from('cat-photos').getPublicUrl(filename);
    await supabase.from('cats').update({ owner_id: user.id, owner_claim_image_url: urlData.publicUrl, owner_claim_status: 'verified', status: 'homed', previous_status: cat.status }).eq('id', catId);
    setCat((prev: any) => ({ ...prev, owner_id: user.id, owner_claim_status: 'verified', status: 'homed', previous_status: prev.status }));
    setShowClaimModal(false); setClaimPhoto(null); setClaimPhotoPreview(null); setClaimSaving(false);
  }

  async function handleAddPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setPhotoUploading(true);
    const filename = `${Date.now()}_cat_${catId}_${file.name}`;
    const { error } = await supabase.storage.from('cat-photos').upload(filename, file);
    if (!error) {
      const { data } = supabase.storage.from('cat-photos').getPublicUrl(filename);
      await supabase.from('cat_photos').insert({ cat_id: catId, user_id: user.id, url: data.publicUrl });
      await loadGallery();
    }
    setPhotoUploading(false);
    if (photoInputRef.current) photoInputRef.current.value = '';
  }

  async function handlePostReaction(postId: string, emoji: string) {
    if (!user) return;
    const current = myReactions[postId];
    if (current === emoji) {
      // remove
      await supabase.from('cat_post_reactions').delete().eq('post_id', postId).eq('user_id', user.id);
      setMyReactions(prev => { const n = { ...prev }; delete n[postId]; return n; });
    } else {
      // upsert
      await supabase.from('cat_post_reactions').upsert({ post_id: postId, user_id: user.id, emoji }, { onConflict: 'post_id,user_id' });
      setMyReactions(prev => ({ ...prev, [postId]: emoji }));
    }
    await loadPosts();
  }

  async function handleSubmitPost() {
    if (!newPost.trim() || !user) return;
    setPostSaving(true);
    await supabase.from('cat_posts').insert({ cat_id: catId, user_id: user.id, content: newPost.trim() });
    setNewPost(''); await loadPosts(); setPostSaving(false);
  }

  async function handleSaveOwnerNotes() {
    setNotesSaving(true);
    await supabase.from('cats').update({ attributes: { ...cat.attributes, notes: ownerNotes } }).eq('id', catId);
    setCat((prev: any) => ({ ...prev, attributes: { ...prev.attributes, notes: ownerNotes } }));
    setNotesSaving(false); setNotesSaved(true);
    setTimeout(() => setNotesSaved(false), 2000);
  }

  async function handleSaveName() {
    if (!ownerNameInput.trim()) return;
    setNameSaving(true);
    await supabase.from('cats').update({ name: ownerNameInput.trim() }).eq('id', catId);
    setCat((prev: any) => ({ ...prev, name: ownerNameInput.trim() }));
    setNameSaving(false); setNameSaved(true);
    setTimeout(() => setNameSaved(false), 2000);
  }

  async function handleAdoptInterest() {
    if (!user) { window.location.href = '/login'; return; }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        await supabase.from('sightings').insert({ cat_id: catId, user_id: user.id, lat: pos.coords.latitude, lng: pos.coords.longitude, note: '🏠 Interested in adopting this cat' });
        setGpsLoading(false); setShowAdoptModal(false);
        alert('Your interest has been noted! The community will be able to connect you with this cat.');
      },
      () => { setGpsLoading(false); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontSize: 48, animation: 'spin 1s linear infinite' }}>🐱</div>
      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  );

  if (!cat) return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
      <div style={{ fontSize: 48 }}>🐾</div>
      <div style={{ fontSize: 18, fontWeight: 700 }}>Cat not found</div>
      <a href="/" style={{ color: '#FF6B6B', textDecoration: 'none', fontWeight: 600 }}>← Back to map</a>
    </div>
  );

  const a = cat.attributes || {};
  const hasAttributes = Object.values(a).some((v: any) => v && v !== 'Unknown');
  const isLost = cat.status === 'lost';
  const isStray = cat.status === 'stray' || cat.status === 'community';
  const isOwner = user?.id === cat.owner_id;
  const color = statusColors[cat.status] || '#888';
  const leadingName = nameVotes[0]?.suggested_name || null;
  const displayName = cat.name && cat.name !== 'Unknown' ? cat.name : leadingName || 'Unknown';
  const lastSighting = sightings[0];
  const date = new Date(cat.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const allPhotos = [cat.image_url, ...galleryPhotos].filter(Boolean);

  const sectionCard = { background: 'white', borderRadius: 12, padding: '4px 16px 12px', marginBottom: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' };
  const sectionLabel = { fontSize: 11, fontWeight: 700, color: '#aaa', textTransform: 'uppercase' as const, letterSpacing: 1, padding: '12px 0 6px', display: 'block' };

  return (
    <div style={{ minHeight: '100vh', background: '#f7f7f7' }}>

      <Navbar />

      {isLost && (
        <div style={{ background: '#F44336', color: 'white', textAlign: 'center', padding: '12px 16px', fontSize: 15, fontWeight: 700 }}>
          🚨 THIS CAT HAS BEEN REPORTED LOST — Please log a sighting if you see them!
        </div>
      )}

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '0 0 80px' }}>

        {/* Hero photo */}
        <div style={{ position: 'relative', height: 300, background: '#111', cursor: cat.image_url ? 'zoom-in' : 'default' }} onClick={() => cat.image_url && setLightboxSrc(cat.image_url)}>
          {cat.image_url
            ? <img src={cat.image_url} alt={cat.name} style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
            : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 100 }}>🐱</div>
          }
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(transparent, rgba(0,0,0,0.6))', padding: '40px 20px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
              <div>
                <h1 style={{ margin: 0, fontSize: 30, fontWeight: 800, color: 'white', textShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>{displayName}</h1>
                {cat.name === 'Unknown' && leadingName && !isOwner && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>community name · {nameVotes[0]?.count} votes</div>}
              </div>
              <span style={{ background: color, color: 'white', borderRadius: 20, padding: '5px 14px', fontSize: 13, fontWeight: 700 }}>
                {statusEmoji[cat.status]} {cat.status}
              </span>
            </div>
          </div>
        </div>

        {/* ── PHOTO GALLERY ── */}
        {(allPhotos.length > 0) && (
          <div style={{ background: 'white', marginBottom: 14, padding: '10px 16px 12px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={sectionLabel}>📷 Photos ({allPhotos.length})</span>
              {isOwner && (
                <>
                  <button onClick={() => photoInputRef.current?.click()} disabled={photoUploading}
                    style={{ fontSize: 12, fontWeight: 600, color: '#FF6B6B', background: '#fff3f3', border: 'none', borderRadius: 7, padding: '4px 10px', cursor: 'pointer' }}>
                    {photoUploading ? 'Uploading...' : '➕ Add Photo'}
                  </button>
                  <input ref={photoInputRef} type="file" accept="image/*" onChange={handleAddPhoto} style={{ display: 'none' }} />
                </>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
              {allPhotos.map((url, i) => (
                <img key={i} src={url} alt={`photo ${i + 1}`} onClick={() => setLightboxSrc(url)}
                  style={{ width: 80, height: 80, borderRadius: 8, objectFit: 'cover', flexShrink: 0, cursor: 'zoom-in', border: '1px solid #f0f0f0' }} />
              ))}
              {allPhotos.length === 0 && <div style={{ fontSize: 13, color: '#ccc', padding: '20px 0' }}>No photos yet</div>}
            </div>
          </div>
        )}

        <div style={{ padding: '0 16px' }}>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 14 }}>
            {[
              { label: 'First seen', value: date },
              { label: 'Sightings', value: sightings.length.toString() },
              { label: 'Last seen', value: lastSighting ? timeAgo(lastSighting.created_at) : 'Unknown' },
            ].map(({ label, value }) => (
              <div key={label} style={{ background: 'white', borderRadius: 10, padding: '12px 10px', textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                <div style={{ fontSize: 11, color: '#aaa', marginBottom: 4 }}>{label}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#222' }}>{value}</div>
              </div>
            ))}
          </div>

          {/* Attributes */}
          {hasAttributes && (
            <div style={sectionCard}>
              <span style={sectionLabel}>Cat Details</span>
              <AttrRow label="Gender" value={a.gender} />
              <AttrRow label="Age" value={a.age} />
              <AttrRow label="Coat & Markings" value={a.coat} />
              <AttrRow label="Eye Color" value={a.eyes} />
              <AttrRow label="Clipped Ear (TNR)" value={a.tnr} />
              <AttrRow label="Health" value={a.health_status} />
              <AttrRow label="Friendliness" value={a.friendliness} />
              <AttrRow label="Feeding Status" value={a.feeding_status} />
              <AttrRow label="Spayed / Neutered" value={a.spayed_neutered} />
              <AttrRow label="Tail" value={a.tail} />
              <AttrRow label="Scars" value={a.scars} />
            </div>
          )}

          {/* Owner badge */}
          {cat.owner_id && (
            <div style={{ marginBottom: 14, padding: '10px 14px', borderRadius: 10, background: '#e8f5e9', border: '1px solid #a5d6a7', fontSize: 13, fontWeight: 600, color: '#2e7d32' }}>
              {isOwner ? '✅ You are the verified owner of this cat' : '✅ This cat has a verified owner'}
            </div>
          )}

          {/* Owner notes */}
          {cat.status === 'homed' && isOwner && (
            <div style={sectionCard}>
              <span style={sectionLabel}>📝 Owner Notes</span>
              <textarea
                value={ownerNotes}
                onChange={e => setOwnerNotes(e.target.value)}
                placeholder="Share anything about this cat — their personality, routine, favourite spots..."
                style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 8, border: '1px solid #eee', fontSize: 14, resize: 'none', height: 90, outline: 'none', marginBottom: 8, fontFamily: 'inherit' }}
              />
              <button onClick={handleSaveOwnerNotes} disabled={notesSaving}
                style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: notesSaved ? '#4CAF50' : '#2196F3', color: 'white', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                {notesSaved ? '✅ Saved!' : notesSaving ? 'Saving...' : 'Save Notes'}
              </button>
            </div>
          )}

          {/* Owner notes display (non-owner) */}
          {cat.status === 'homed' && !isOwner && a.notes && (
            <div style={sectionCard}>
              <span style={sectionLabel}>📝 Owner Notes</span>
              <p style={{ fontSize: 14, color: '#555', margin: '4px 0 8px', fontStyle: 'italic', lineHeight: 1.6 }}>{a.notes}</p>
            </div>
          )}

          {/* Care fund — strays only */}
          {isStray && (
            <div style={{ background: 'white', borderRadius: 12, padding: '14px 16px', marginBottom: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #f0f0f0' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#444', marginBottom: 10 }}>💛 Community Care</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <a href="/care#food" style={{ display: 'block', padding: '10px 12px', borderRadius: 9, background: '#fff8e1', border: '1px solid #ffe082', textDecoration: 'none', textAlign: 'center' }}>
                  <div style={{ fontSize: 20, marginBottom: 4 }}>🍖</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#e65100' }}>Food Fund</div>
                  <div style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>Help feed this cat</div>
                </a>
                <a href="/care#vet" style={{ display: 'block', padding: '10px 12px', borderRadius: 9, background: '#e8f5e9', border: '1px solid #a5d6a7', textDecoration: 'none', textAlign: 'center' }}>
                  <div style={{ fontSize: 20, marginBottom: 4 }}>💉</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#2e7d32' }}>Vet / TNR Fund</div>
                  <div style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>Support their care</div>
                </a>
              </div>
            </div>
          )}

          {/* Name voting — strays only */}
          {isStray && (
            <div style={sectionCard}>
              {isOwner ? (
                <>
                  <span style={sectionLabel}>✏️ Set Cat Name</span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input value={ownerNameInput} onChange={e => setOwnerNameInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleSaveName()}
                      placeholder="Enter official name…"
                      style={{ flex: 1, padding: '9px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14, outline: 'none' }} />
                    <button onClick={handleSaveName} disabled={!ownerNameInput.trim() || nameSaving}
                      style={{ padding: '9px 16px', borderRadius: 8, border: 'none', background: nameSaved ? '#4CAF50' : ownerNameInput.trim() ? '#FF6B6B' : '#eee', color: ownerNameInput.trim() ? 'white' : '#aaa', fontWeight: 600, fontSize: 13, cursor: ownerNameInput.trim() ? 'pointer' : 'default' }}>
                      {nameSaved ? '✅ Saved!' : nameSaving ? '…' : 'Set Name'}
                    </button>
                  </div>
                  <div style={{ fontSize: 11, color: '#aaa', marginTop: 8 }}>As the owner, your name overrides the community vote.</div>
                </>
              ) : (
                <>
                  <span style={sectionLabel}>🗳️ Community Name Vote</span>
                  {nameVotes.length > 0 && (
                    <div style={{ marginBottom: 12 }}>
                      {nameVotes.map(({ suggested_name, count }, i) => {
                        const isVoted = myVote === suggested_name;
                        const isLeading = i === 0;
                        const pct = Math.round((count / nameVotes[0].count) * 100);
                        return (
                          <div key={suggested_name} onClick={() => !voteSaving && user && handleVote(suggested_name)}
                            style={{ marginBottom: 7, borderRadius: 8, overflow: 'hidden', border: isVoted ? '2px solid #FF6B6B' : '2px solid transparent', background: '#fafafa', cursor: user ? 'pointer' : 'default' }}>
                            <div style={{ position: 'relative', padding: '9px 12px' }}>
                              <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: `${pct}%`, background: isLeading ? '#fff3f3' : '#f5f5f5', borderRadius: 6 }} />
                              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  {isLeading && <span>👑</span>}
                                  <span style={{ fontWeight: isLeading ? 700 : 500, fontSize: 14 }}>{suggested_name}</span>
                                  {isVoted && <span style={{ fontSize: 11, color: '#FF6B6B', fontWeight: 700 }}>✓ your vote</span>}
                                </div>
                                <span style={{ fontSize: 13, fontWeight: 600, color: '#888' }}>{count}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {user ? (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input value={newNameInput} onChange={e => setNewNameInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSubmitNewName()}
                        placeholder="Suggest a name…" style={{ flex: 1, padding: '9px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14, outline: 'none' }} />
                      <button onClick={handleSubmitNewName} disabled={!newNameInput.trim() || voteSaving}
                        style={{ padding: '9px 16px', borderRadius: 8, border: 'none', background: newNameInput.trim() ? '#FF6B6B' : '#eee', color: newNameInput.trim() ? 'white' : '#aaa', fontWeight: 600, fontSize: 13, cursor: newNameInput.trim() ? 'pointer' : 'default' }}>
                        {voteSaving ? '…' : 'Vote'}
                      </button>
                    </div>
                  ) : (
                    <div style={{ fontSize: 13, color: '#aaa', textAlign: 'center', padding: '4px 0' }}>
                      <a href="/login" style={{ color: '#FF6B6B', fontWeight: 600 }}>Log in</a> to vote
                    </div>
                  )}
                  {myVote && <div style={{ fontSize: 11, color: '#ccc', marginTop: 8, textAlign: 'center' }}>Tap any name to change your vote</div>}
                </>
              )}
            </div>
          )}

          {/* Recent sightings */}
          {sightings.length > 0 && (
            <div style={sectionCard}>
              <span style={sectionLabel}>Recent Sightings</span>
              {sightings.slice(0, 5).map((s: any) => (
                <div key={s.id} style={{ borderLeft: '3px solid #FF6B6B', paddingLeft: 12, marginBottom: 12 }}>
                  <div style={{ fontSize: 12, color: '#aaa' }}>{timeAgo(s.created_at)} · Anonymous</div>
                  {s.note && <div style={{ fontSize: 14, color: '#555', marginTop: 2 }}>{s.note}</div>}
                  {s.photo_url && (
                    <img src={s.photo_url} alt="sighting" onClick={() => setLightboxSrc(s.photo_url)}
                      style={{ marginTop: 6, width: 80, height: 80, objectFit: 'cover', objectPosition: '50% 20%', borderRadius: 8, cursor: 'zoom-in', border: '1px solid #f0f0f0' }} />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ── SIGHTING TRAIL MAP ── */}
          {sightings.length > 0 && (
            <div style={sectionCard}>
              <span style={sectionLabel}>🗺️ Sighting Trail</span>
              <div ref={miniMapRef} style={{ width: '100%', height: 220, borderRadius: 8, overflow: 'hidden', background: '#f0f0f0' }} />
              <div style={{ fontSize: 11, color: '#bbb', marginTop: 6 }}>
                🐱 = reported location · 🔴 dots = sightings (brighter = more recent)
              </div>
            </div>
          )}

          {/* ── COMMUNITY FORUM ── */}
          <div style={sectionCard}>
            <span style={sectionLabel}>💬 Community ({posts.length})</span>

            {user ? (
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <textarea value={newPost} onChange={e => setNewPost(e.target.value)}
                  placeholder="Share a sighting, update, or note about this cat..."
                  style={{ flex: 1, padding: '9px 12px', borderRadius: 8, border: '1px solid #eee', fontSize: 13, resize: 'none', height: 64, outline: 'none', fontFamily: 'inherit' }} />
                <button onClick={handleSubmitPost} disabled={!newPost.trim() || postSaving}
                  style={{ padding: '0 14px', borderRadius: 8, border: 'none', background: newPost.trim() ? '#FF6B6B' : '#eee', color: newPost.trim() ? 'white' : '#aaa', fontWeight: 700, fontSize: 13, cursor: newPost.trim() ? 'pointer' : 'default', alignSelf: 'stretch' }}>
                  {postSaving ? '...' : 'Post'}
                </button>
              </div>
            ) : (
              <div style={{ fontSize: 13, color: '#aaa', marginBottom: 14, textAlign: 'center' }}>
                <a href="/login" style={{ color: '#FF6B6B', fontWeight: 600 }}>Log in</a> to post a community update
              </div>
            )}

            {posts.length === 0 && <div style={{ fontSize: 13, color: '#ccc', textAlign: 'center', padding: '10px 0 4px' }}>No posts yet — be the first!</div>}

            {posts.map((post: any) => {
              const reactions = postReactions[post.id] || [];
              const reactionCounts: Record<string, number> = {};
              reactions.forEach((r: any) => { reactionCounts[r.emoji] = (reactionCounts[r.emoji] || 0) + 1; });
              const myEmoji = myReactions[post.id];
              const authorLabel = post.user_id === user?.id ? 'You' : 'Community member';
              return (
                <div key={post.id} style={{ borderBottom: '1px solid #f5f5f5', paddingBottom: 12, marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>🐾</div>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#555' }}>{authorLabel}</span>
                    <span style={{ fontSize: 11, color: '#ccc' }}>{timeAgo(post.created_at)}</span>
                  </div>
                  <p style={{ margin: '0 0 8px', fontSize: 14, color: '#333', lineHeight: 1.5 }}>{post.content}</p>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {REACTION_EMOJIS.map(emoji => {
                      const count = reactionCounts[emoji] || 0;
                      const active = myEmoji === emoji;
                      return (
                        <button key={emoji} onClick={() => handlePostReaction(post.id, emoji)}
                          style={{ padding: '3px 9px', borderRadius: 20, border: active ? '1.5px solid #FF6B6B' : '1.5px solid #eee', background: active ? '#fff3f3' : 'white', fontSize: 13, cursor: user ? 'pointer' : 'default', display: 'flex', alignItems: 'center', gap: 4, fontWeight: active ? 700 : 400 }}>
                          {emoji}{count > 0 && <span style={{ fontSize: 11, color: '#888' }}>{count}</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── ACTIONS ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
            <button onClick={openSightingModal}
              style={{ padding: 14, borderRadius: 10, border: 'none', background: '#FF6B6B', color: 'white', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
              📍 I saw this cat recently!
            </button>

            {/* Contact owner — only for lost cats with verified owner */}
            {cat.status === 'lost' && cat.owner_claim_status === 'verified' && cat.owner_id && user && user.id !== cat.owner_id && (
              <a href={`/messages?with=${cat.owner_id}&cat=${catId}&name=${encodeURIComponent(cat.name)}`}
                style={{ display: 'block', padding: 14, borderRadius: 10, border: '2px solid #FF6B6B', background: 'white', color: '#FF6B6B', fontWeight: 600, fontSize: 15, cursor: 'pointer', textAlign: 'center', textDecoration: 'none' }}>
                ✉️ Contact Owner
              </a>
            )}

            {isStray && (
              <button onClick={() => setShowAdoptModal(true)}
                style={{ padding: 14, borderRadius: 10, border: '1px solid #4CAF50', background: 'white', color: '#4CAF50', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
                🏠 I'm Interested in Adopting
              </button>
            )}

            {isLost ? (
              <>
                <button onClick={() => setShowFoundModal(true)} style={{ padding: 14, borderRadius: 10, border: '1px solid #4CAF50', background: 'white', color: '#4CAF50', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>✅ Mark as Found</button>
                <button onClick={() => window.open(`/poster?catId=${cat.id}`, '_blank')} style={{ padding: 14, borderRadius: 10, border: '1px solid #111', background: 'white', fontSize: 15, cursor: 'pointer', fontWeight: 600 }}>🖨️ Generate Lost Poster</button>
              </>
            ) : (
              (cat.status === 'community' || (cat.status === 'homed' && isOwner)) && (
                <button onClick={() => setShowLostModal(true)} style={{ padding: 14, borderRadius: 10, border: '1px solid #ddd', background: 'white', fontSize: 15, cursor: 'pointer' }}>
                  🚨 Mark as Lost
                </button>
              )
            )}

            {!cat.owner_id && user && (
              <button onClick={() => setShowClaimModal(true)} style={{ padding: 14, borderRadius: 10, border: '1px solid #2196F3', background: 'white', color: '#2196F3', fontSize: 15, cursor: 'pointer', fontWeight: 600 }}>
                🏠 Claim as Owner
              </button>
            )}
            {!cat.owner_id && !user && (
              <a href="/login" style={{ padding: 14, borderRadius: 10, border: '1px solid #ddd', background: 'white', color: '#888', fontSize: 15, textAlign: 'center', textDecoration: 'none', display: 'block', fontWeight: 600 }}>
                🏠 Log in to claim as owner
              </a>
            )}
          </div>
        </div>
      </div>

      {/* ── LIGHTBOX ── */}
      {lightboxSrc && (
        <div onClick={() => setLightboxSrc(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, cursor: 'zoom-out' }}>
          <img src={lightboxSrc} alt="full" style={{ maxWidth: '95vw', maxHeight: '92vh', borderRadius: 8, objectFit: 'contain' }} />
          <button onClick={() => setLightboxSrc(null)} style={{ position: 'fixed', top: 16, right: 16, background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: 36, height: 36, color: 'white', fontSize: 18, cursor: 'pointer' }}>✕</button>
        </div>
      )}

      {/* ── ADOPT MODAL ── */}
      {showAdoptModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', borderRadius: 16, padding: 28, width: 340, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <h2 style={{ margin: '0 0 8px' }}>🏠 Interested in Adopting</h2>
            <p style={{ color: '#555', fontSize: 14, margin: '0 0 20px', lineHeight: 1.6 }}>
              Your interest will be logged and visible to the community. Someone who knows this cat may reach out. Your GPS location will be recorded.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowAdoptModal(false)} style={{ flex: 1, padding: 12, borderRadius: 8, border: '1px solid #ddd', background: 'white', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleAdoptInterest} disabled={gpsLoading} style={{ flex: 1, padding: 12, borderRadius: 8, border: 'none', background: '#4CAF50', color: 'white', cursor: 'pointer', fontWeight: 600 }}>
                {gpsLoading ? 'Logging...' : "Yes, I'm Interested"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── SIGHTING MODAL ── */}
      {showSightingModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', borderRadius: '20px 20px 0 0', padding: '28px 24px', paddingBottom: 'calc(36px + env(safe-area-inset-bottom))', width: '100%', maxWidth: 480, boxShadow: '0 -8px 40px rgba(0,0,0,0.2)' }}>

            {sightingSuccess ? (
              <div style={{ textAlign: 'center', padding: '28px 0' }}>
                <div style={{ fontSize: 52, marginBottom: 12 }}>✅</div>
                <div style={{ fontSize: 20, fontWeight: 700 }}>Sighting logged!</div>
                <div style={{ fontSize: 14, color: '#888', marginTop: 6 }}>Thank you for the update!</div>
              </div>

            ) : sightingStep === 1 ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <h2 style={{ margin: 0, fontSize: 20 }}>📍 I saw this cat!</h2>
                  <button onClick={() => setShowSightingModal(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#aaa' }}>✕</button>
                </div>
                <p style={{ color: '#888', fontSize: 13, margin: '0 0 24px' }}>A photo is required to log a sighting.</p>

                <button onClick={() => sightingCameraRef.current?.click()}
                  style={{ width: '100%', padding: 18, borderRadius: 14, border: 'none', background: '#FF6B6B', color: 'white', fontSize: 17, fontWeight: 700, cursor: 'pointer', marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                  📷 Take a Photo
                </button>
                <button onClick={() => sightingGalleryRef.current?.click()}
                  style={{ width: '100%', padding: 18, borderRadius: 14, border: '2px solid #FF6B6B', background: 'white', color: '#FF6B6B', fontSize: 17, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                  🖼️ Upload from Gallery
                </button>

                <input ref={sightingCameraRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }}
                  onChange={e => { const f = e.target.files?.[0]; if (f) handlePickCamera(f); }} />
                <input ref={sightingGalleryRef} type="file" accept="image/*" style={{ display: 'none' }}
                  onChange={e => { const f = e.target.files?.[0]; if (f) handlePickGallery(f); }} />

                {sightingLocLoading && (
                  <div style={{ textAlign: 'center', marginTop: 16, color: '#888', fontSize: 13 }}>📍 Getting location...</div>
                )}
              </>

            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <button onClick={() => setSightingStep(1)} style={{ background: 'none', border: 'none', fontSize: 14, color: '#FF6B6B', fontWeight: 600, cursor: 'pointer', padding: 0 }}>← Back</button>
                  <h2 style={{ margin: 0, fontSize: 18 }}>📍 Confirm Sighting</h2>
                  <button onClick={() => setShowSightingModal(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#aaa' }}>✕</button>
                </div>

                {sightingPhotoPreview && (
                  <img src={sightingPhotoPreview} alt="sighting" style={{ width: '100%', height: 180, objectFit: 'cover', borderRadius: 12, marginBottom: 12, display: 'block' }} />
                )}

                {sightingLocSource && (
                  <div style={{ fontSize: 12, color: sightingLocSource.startsWith('✅') ? '#4CAF50' : '#FF9800', marginBottom: 10, fontWeight: 600 }}>{sightingLocSource}</div>
                )}

                <div style={{ fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 6 }}>📝 Note (optional)</div>
                <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. Looks healthy, near the park bench"
                  style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #ddd', boxSizing: 'border-box', height: 70, fontSize: 14, resize: 'none', marginBottom: 14, fontFamily: 'inherit', outline: 'none' }} />

                <button onClick={handleSubmitSighting} disabled={saving}
                  style={{ width: '100%', padding: 14, borderRadius: 12, border: 'none', background: '#FF6B6B', color: 'white', cursor: saving ? 'default' : 'pointer', fontWeight: 700, fontSize: 16, opacity: saving ? 0.7 : 1 }}>
                  {saving ? 'Saving...' : '📍 Log Sighting'}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── LOST MODAL ── */}
      {showLostModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', borderRadius: 16, padding: 28, width: 340, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <h2 style={{ margin: '0 0 8px' }}>🚨 Mark as Lost</h2>
            <p style={{ color: '#555', fontSize: 14, margin: '0 0 20px', lineHeight: 1.6 }}>This will alert community members who have sighted <strong>{cat.name}</strong>.</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowLostModal(false)} style={{ flex: 1, padding: 12, borderRadius: 8, border: '1px solid #ddd', background: 'white', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleMarkLost} disabled={lostSaving} style={{ flex: 1, padding: 12, borderRadius: 8, border: 'none', background: '#F44336', color: 'white', cursor: 'pointer', fontWeight: 600 }}>
                {lostSaving ? 'Alerting...' : 'Yes, Mark Lost'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── FOUND MODAL ── */}
      {showFoundModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', borderRadius: 16, padding: 28, width: 340, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <h2 style={{ margin: '0 0 8px' }}>✅ Mark as Found</h2>
            <p style={{ color: '#555', fontSize: 14, margin: '0 0 20px', lineHeight: 1.6 }}>Revert <strong>{cat.name}</strong> back to <strong>{cat.previous_status || 'stray'}</strong>.</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowFoundModal(false)} style={{ flex: 1, padding: 12, borderRadius: 8, border: '1px solid #ddd', background: 'white', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleMarkFound} disabled={lostSaving} style={{ flex: 1, padding: 12, borderRadius: 8, border: 'none', background: '#4CAF50', color: 'white', cursor: 'pointer', fontWeight: 600 }}>
                {lostSaving ? 'Saving...' : 'Yes, Mark Found'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CLAIM MODAL ── */}
      {showClaimModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', borderRadius: 16, padding: 28, width: 360, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <h2 style={{ margin: '0 0 8px' }}>🏠 Claim as Owner</h2>
            <p style={{ color: '#666', fontSize: 14, margin: '0 0 16px', lineHeight: 1.6 }}>Upload a photo of <strong>{cat.name === 'Unknown' ? 'this cat' : cat.name}</strong> in your home to instantly verify ownership.</p>
            <input type="file" accept="image/*" onChange={e => { const f = e.target.files?.[0]; if (f) { setClaimPhoto(f); setClaimPhotoPreview(URL.createObjectURL(f)); }}} style={{ width: '100%', marginBottom: 10 }} />
            {claimPhotoPreview && <img src={claimPhotoPreview} alt="preview" style={{ width: '100%', borderRadius: 8, marginBottom: 12, maxHeight: 160, objectFit: 'cover' }} />}
            {claimError && <div style={{ background: '#fff3f3', borderRadius: 8, padding: '8px 12px', marginBottom: 12, fontSize: 13, color: '#c62828' }}>⚠️ {claimError}</div>}
            <div style={{ background: '#e8f5e9', border: '1px solid #a5d6a7', borderRadius: 8, padding: '10px 12px', marginBottom: 16, fontSize: 13, color: '#2e7d32' }}>
              ✅ Photo upload instantly verifies your ownership. Status → <strong>Homed</strong>.
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => { setShowClaimModal(false); setClaimPhoto(null); setClaimPhotoPreview(null); setClaimError(''); }} style={{ flex: 1, padding: 12, borderRadius: 8, border: '1px solid #ddd', background: 'white', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleClaimOwnership} disabled={!claimPhoto || claimSaving} style={{ flex: 1, padding: 12, borderRadius: 8, border: 'none', background: claimPhoto ? '#2196F3' : '#eee', color: claimPhoto ? 'white' : '#aaa', cursor: claimPhoto ? 'pointer' : 'default', fontWeight: 600 }}>
                {claimSaving ? 'Submitting...' : 'Submit Claim'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// PAGE: Cat Profile (app/cat/[id]/page.tsx → route: /cat/[id])
