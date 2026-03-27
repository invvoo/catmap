// @ts-nocheck
// PAGE: Main Map + Community Feed (app/page.tsx → route: /)
'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useRef, useState, useCallback } from 'react';
import { MarkerClusterer, SuperClusterAlgorithm } from '@googlemaps/markerclusterer';
import { supabase } from '../lib/supabase';
import AddCatForm from './components/AddCatForm';

const statusColors = { stray: '#FF9800', community: '#4CAF50', lost: '#F44336', homed: '#2196F3' };
const statusEmoji = { stray: '🏚️', community: '🏘️', lost: '🚨', homed: '🏠' };
const statusOrder = { lost: 0, stray: 1, community: 2, homed: 3 };

function distanceFeet(lat1, lng1, lat2, lng2) {
  const R = 20902231;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function distanceMiles(feet) {
  if (feet < 528) return `${Math.round(feet)} ft`;
  return `${(feet / 5280).toFixed(1)} mi`;
}

function createCatMarkerElement(cat) {
  const color = statusColors[cat.status] || '#888';
  const size = 70;
  const wrapper = document.createElement('div');
  wrapper.style.cssText = `width:${size}px;height:${size}px;border-radius:50%;border:4px solid ${color};overflow:hidden;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,0.3);background:${color};display:flex;align-items:center;justify-content:center;`;
  if (cat.image_url) {
    const img = document.createElement('img');
    img.src = cat.image_url; img.alt = cat.name;
    img.style.cssText = 'width:100%;height:100%;object-fit:cover;object-position:50% 20%;';
    wrapper.appendChild(img);
  } else {
    const emoji = document.createElement('span');
    emoji.textContent = '🐱'; emoji.style.cssText = 'font-size:32px;line-height:1;';
    wrapper.appendChild(emoji);
  }
  const tri = document.createElement('div');
  tri.style.cssText = 'position:absolute;bottom:-7px;left:50%;transform:translateX(-50%);width:0;height:0;border-left:7px solid transparent;border-right:7px solid transparent;border-top:7px solid white;';
  const container = document.createElement('div');
  container.style.cssText = `position:relative;width:${size}px;height:${size}px;`;
  container.appendChild(wrapper); container.appendChild(tri);
  return container;
}

function MapPopup({ cat, pixelPos, onClose, userLocation, mapRef }) {
  const color = statusColors[cat.status] || '#888';
  const dist = userLocation ? distanceFeet(userLocation.lat, userLocation.lng, cat.lat, cat.lng) : null;
  const popupW = 220, popupH = 180;
  const mapRect = mapRef.current?.getBoundingClientRect();
  const mapW = mapRect?.width || 800, mapH = mapRect?.height || 400;
  let left = Math.max(8, Math.min(pixelPos.x - popupW / 2, mapW - popupW - 8));
  let top = Math.max(8, Math.min(pixelPos.y - popupH - 48, mapH - popupH - 8));
  return (
    <>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, zIndex: 199 }} />
      <div style={{ position: 'absolute', left, top, width: popupW, zIndex: 200, background: 'white', borderRadius: 14, boxShadow: '0 8px 32px rgba(0,0,0,0.22)', border: cat.status === 'lost' ? '2px solid #F44336' : '1px solid #eee', overflow: 'hidden' }}>
        {cat.image_url
          ? <img src={cat.image_url} alt={cat.name} style={{ width: '100%', height: 90, objectFit: 'cover', objectPosition: '50% 20%', display: 'block' }} />
          : <div style={{ width: '100%', height: 90, background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 44 }}>🐱</div>
        }
        <div style={{ padding: '8px 12px 10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontWeight: 700, fontSize: 14, color: '#111' }}>{cat.name}</span>
            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 10, background: color, color: 'white' }}>{statusEmoji[cat.status]} {cat.status}</span>
          </div>
          {dist !== null && <div style={{ fontSize: 11, color: '#aaa', marginBottom: 6 }}>📍 {distanceMiles(dist)} away</div>}
          <a href={`/cat/${cat.id}`} style={{ display: 'block', padding: '6px 0', borderRadius: 7, background: '#FF6B6B', color: 'white', fontWeight: 700, fontSize: 12, textAlign: 'center', textDecoration: 'none' }}>👁️ View Profile</a>
        </div>
        <button onClick={onClose} style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,0.45)', border: 'none', borderRadius: '50%', width: 22, height: 22, color: 'white', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        <div style={{ position: 'absolute', bottom: -8, left: '50%', transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '8px solid transparent', borderRight: '8px solid transparent', borderTop: '8px solid white' }} />
      </div>
    </>
  );
}

export default function Home() {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const clustererRef = useRef(null);
  const catsDataRef = useRef([]);
  const reclusterRef = useRef(null);

  const [showForm, setShowForm] = useState(false);
  const [formPos, setFormPos] = useState(null);
  const [selectedCat, setSelectedCat] = useState(null);
  const [popupPixel, setPopupPixel] = useState(null);
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifUnread, setNotifUnread] = useState(0);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showHomeMenu, setShowHomeMenu] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState('');
  const [allCats, setAllCats] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [feedCats, setFeedCats] = useState([]);
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      if (data.user) { loadUserProfile(data.user.id); loadUnreadCount(data.user.id); loadNotifUnread(data.user.id); }
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) { loadUserProfile(session.user.id); loadUnreadCount(session.user.id); loadNotifUnread(session.user.id); }
      else setUserProfile(null);
    });
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {}, { enableHighAccuracy: true, timeout: 10000 }
      );
    }
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!userLocation || allCats.length === 0) { setFeedCats(allCats.slice(0, 30)); return; }
    const TWO_MILES = 10560;
    const nearby = allCats
      .map(cat => ({ ...cat, _dist: distanceFeet(userLocation.lat, userLocation.lng, cat.lat, cat.lng) }))
      .filter(cat => cat._dist <= TWO_MILES)
      .sort((a, b) => (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9) || a._dist - b._dist);
    setFeedCats(nearby);
  }, [allCats, userLocation]);

  async function loadNotifUnread(userId) {
    const { count } = await supabase.from('notifications').select('id', { count: 'exact' }).eq('user_id', userId).eq('read', false);
    setNotifUnread(count || 0);
  }

  async function loadUnreadCount(userId) {
    const { count } = await supabase.from('messages').select('id', { count: 'exact' }).eq('to_id', userId).eq('read', false);
    setUnreadCount(count || 0);
  }

  async function loadUserProfile(userId) {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
    setUserProfile(data);
  }

  const clearMarkers = useCallback(() => {
    if (clustererRef.current) { clustererRef.current.clearMarkers(); clustererRef.current = null; }
    markersRef.current.forEach(m => { m.map = null; });
    markersRef.current = [];
  }, []);

  function latLngToPixel(lat, lng) {
    const map = mapInstanceRef.current;
    if (!map || !mapRef.current) return null;
    const projection = map.getProjection();
    if (!projection) return null;
    const bounds = map.getBounds();
    if (!bounds) return null;
    const ne = projection.fromLatLngToPoint(bounds.getNorthEast());
    const sw = projection.fromLatLngToPoint(bounds.getSouthWest());
    const scale = Math.pow(2, map.getZoom());
    const worldPoint = projection.fromLatLngToPoint(new window.google.maps.LatLng(lat, lng));
    return { x: (worldPoint.x - sw.x) * scale, y: (worldPoint.y - ne.y) * scale };
  }

  function openPopup(cat) {
    setSelectedCat(cat);
    setPopupPixel(latLngToPixel(cat.lat, cat.lng));
  }

  const loadCatPins = useCallback(async () => {
    if (!mapInstanceRef.current) return;
    clearMarkers();
    const { data: cats, error } = await supabase.from('cats').select('*');
    if (error) { console.error(error); return; }
    setAllCats(cats || []);
    catsDataRef.current = (cats || []).filter(c => typeof c.lat === 'number' && typeof c.lng === 'number' && !isNaN(c.lat) && !isNaN(c.lng));
    const bounds = mapInstanceRef.current?.getBounds();
    if (bounds) setVisibleCount((cats || []).filter(c => bounds.contains({ lat: c.lat, lng: c.lng })).length);
    await renderClusters(cats || []);
    reclusterRef.current = () => renderClusters();
  }, [clearMarkers]);

  async function renderClusters(cats) {
    const map = mapInstanceRef.current;
    if (!map) return;
    const useCats = cats ?? catsDataRef.current;
    clearMarkers();
    if (!useCats.length) return;
    const { AdvancedMarkerElement } = await window.google.maps.importLibrary('marker');
    const catById = {};
    useCats.forEach(cat => { catById[cat.id] = cat; });
    const posCount = {};
    const jittered = useCats.map(cat => {
      const key = `${cat.lat},${cat.lng}`;
      const n = posCount[key] || 0; posCount[key] = n + 1;
      if (n === 0) return cat;
      const angle = (n * 137.5 * Math.PI) / 180;
      const offset = 0.000025 * Math.ceil(n / 6);
      return { ...cat, lat: cat.lat + offset * Math.cos(angle), lng: cat.lng + offset * Math.sin(angle) };
    });
    const markers = jittered.map(cat => {
      const marker = new AdvancedMarkerElement({ position: { lat: cat.lat, lng: cat.lng }, title: cat.name, content: createCatMarkerElement(cat) });
      marker._catId = cat.id;
      marker.addListener('gmp-click', () => openPopup(catById[cat.id] || cat));
      return marker;
    });
    markersRef.current = markers;
    const renderer = {
      render: ({ count, position, markers: cm }) => {
        const clusterCats = cm.map(m => catById[m._catId]).filter(Boolean);
        const el = document.createElement('div');
        el.style.cssText = 'position:relative;width:72px;height:72px;cursor:pointer;';
        const bubble = document.createElement('div');
        const hasLost = clusterCats.some(c => c?.status === 'lost');
        bubble.style.cssText = `width:72px;height:72px;border-radius:50%;border:3px solid ${hasLost ? '#F44336' : 'white'};overflow:hidden;box-shadow:0 3px 12px rgba(0,0,0,0.35);background:#FF6B6B;display:flex;align-items:center;justify-content:center;`;
        const photos = clusterCats.filter(c => c?.image_url).slice(0, 2);
        if (photos.length >= 2) {
          bubble.style.flexDirection = 'row';
          photos.forEach(cat => { const img = document.createElement('img'); img.src = cat.image_url; img.style.cssText = 'width:50%;height:100%;object-fit:cover;object-position:50% 20%;'; bubble.appendChild(img); });
        } else if (photos.length === 1) {
          const img = document.createElement('img'); img.src = photos[0].image_url; img.style.cssText = 'width:100%;height:100%;object-fit:cover;object-position:50% 20%;'; bubble.appendChild(img);
        } else {
          const e = document.createElement('span'); e.textContent = '🐱'; e.style.fontSize = '28px'; bubble.appendChild(e);
        }
        const badge = document.createElement('div');
        badge.textContent = String(count);
        badge.style.cssText = `position:absolute;top:-4px;right:-4px;background:${hasLost ? '#F44336' : '#FF6B6B'};color:white;border-radius:50%;width:22px;height:22px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;border:2px solid white;`;
        const tri = document.createElement('div');
        tri.style.cssText = 'position:absolute;bottom:-7px;left:50%;transform:translateX(-50%);width:0;height:0;border-left:7px solid transparent;border-right:7px solid transparent;border-top:7px solid white;';
        el.appendChild(bubble); el.appendChild(badge); el.appendChild(tri);
        return new AdvancedMarkerElement({ position, content: el });
      },
    };
    clustererRef.current = new MarkerClusterer({ map, markers, algorithm: new SuperClusterAlgorithm({ radius: 80, maxZoom: 16 }), renderer });
  }

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initMap&libraries=marker&loading=async`;
    script.async = true; script.defer = true;
    window.initMap = function () {
      if (!mapRef.current) return;
      const map = new window.google.maps.Map(mapRef.current, {
        center: { lat: 40.7128, lng: -74.0060 }, zoom: 15,
        mapId: process.env.NEXT_PUBLIC_GOOGLE_MAPS_ID,
        zoomControl: true, streetViewControl: false, mapTypeControl: false, fullscreenControl: false,
      });
      mapInstanceRef.current = map;
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => { map.panTo({ lat: pos.coords.latitude, lng: pos.coords.longitude }); map.setZoom(16); },
          () => {}
        );
      }
      loadCatPins().then(() => { reclusterRef.current = () => renderClusters(); });
      let timer = null;
      map.addListener('zoom_changed', () => { clearTimeout(timer); timer = setTimeout(() => { if (reclusterRef.current) reclusterRef.current(); }, 150); });
      map.addListener('bounds_changed', () => {
        const b = map.getBounds();
        if (!b || !catsDataRef.current.length) return;
        setVisibleCount(catsDataRef.current.filter(c => b.contains({ lat: c.lat, lng: c.lng })).length);
      });
    };
    document.head.appendChild(script);
    return () => { document.head.removeChild(script); delete window.initMap; };
  }, [loadCatPins]);

  async function handleLogout() { await supabase.auth.signOut(); setUser(null); setUserProfile(null); }

  function handleMetACat() {
    if (!user) { window.location.href = '/login'; return; }
    setGpsError(''); setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setGpsLoading(false); setFormPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setShowForm(true); mapInstanceRef.current?.panTo({ lat: pos.coords.latitude, lng: pos.coords.longitude }); },
      () => { setGpsLoading(false); setGpsError('Could not get your location.'); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  function handleFeedCardClick(cat) {
    setSelectedCat(null); setPopupPixel(null);
    mapInstanceRef.current?.panTo({ lat: cat.lat, lng: cat.lng });
    setTimeout(() => openPopup(cat), 350);
  }

  return (
    <main style={{ width: '100vw', height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <style>{`
        @media (max-width: 640px) {
          .catmap-map { flex: 1 1 0% !important; min-height: 0 !important; }
          .catmap-feed { flex: 0 0 210px !important; }
          .catmap-feed-cards { overflow-y: auto !important; flex-wrap: wrap !important; align-content: flex-start !important; }
          .catmap-navbar { padding: 8px 12px !important; }
          .catmap-navbar-links { display: none !important; }
          .catmap-met-btn { font-size: 12px !important; padding: 7px 12px !important; }
        }
      `}</style>

      {/* ── NAVBAR ── */}
      <div className="catmap-navbar" style={{ flexShrink: 0, background: 'white', padding: '10px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 2px 10px rgba(0,0,0,0.08)', zIndex: 100 }}>
        <div style={{ position: 'relative' }}>
          <div onClick={() => setShowHomeMenu(v => !v)} style={{ fontSize: 20, fontWeight: 700, color: '#222', cursor: 'pointer', userSelect: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
            🐱 CatMap <span style={{ fontSize: 10, color: '#aaa', marginTop: 2 }}>▾</span>
          </div>
          {showHomeMenu && (
            <>
              <div onClick={() => setShowHomeMenu(false)} style={{ position: 'fixed', inset: 0, zIndex: 200 }} />
              <div style={{ position: 'absolute', top: 36, left: 0, background: 'white', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', border: '1px solid #f0f0f0', minWidth: 180, zIndex: 201, overflow: 'hidden' }}>
                <a href="/" onClick={() => setShowHomeMenu(false)} style={{ display: 'block', padding: '11px 16px', fontSize: 13, fontWeight: 600, color: '#333', textDecoration: 'none', borderBottom: '1px solid #f5f5f5' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#f9f9f9')} onMouseLeave={e => (e.currentTarget.style.background = 'white')}>🏠 Home</a>
                <a href="/lost" onClick={() => setShowHomeMenu(false)} style={{ display: 'block', padding: '11px 16px', fontSize: 13, fontWeight: 600, color: '#F44336', textDecoration: 'none', borderBottom: '1px solid #f5f5f5' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#f9f9f9')} onMouseLeave={e => (e.currentTarget.style.background = 'white')}>🚨 Lost Kitties</a>
                <a href="/bounties" onClick={() => setShowHomeMenu(false)} style={{ display: 'block', padding: '11px 16px', fontSize: 13, fontWeight: 600, color: '#333', textDecoration: 'none', borderBottom: '1px solid #f5f5f5' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#f9f9f9')} onMouseLeave={e => (e.currentTarget.style.background = 'white')}>💰 Bounties</a>
                <a href="/care" onClick={() => setShowHomeMenu(false)} style={{ display: 'block', padding: '11px 16px', fontSize: 13, fontWeight: 600, color: '#333', textDecoration: 'none', borderBottom: '1px solid #f5f5f5' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#f9f9f9')} onMouseLeave={e => (e.currentTarget.style.background = 'white')}>🐾 Care for Strays</a>
                <a href="/about" onClick={() => setShowHomeMenu(false)} style={{ display: 'block', padding: '11px 16px', fontSize: 13, fontWeight: 600, color: '#333', textDecoration: 'none' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#f9f9f9')} onMouseLeave={e => (e.currentTarget.style.background = 'white')}>ℹ️ About</a>
              </div>
            </>
          )}
        </div>
        <div className="catmap-navbar-links" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <a href="/lost" style={{ fontSize: 13, fontWeight: 600, color: '#F44336', textDecoration: 'none', padding: '6px 12px', borderRadius: 8 }}
            onMouseEnter={e => (e.currentTarget.style.background = '#f5f5f5')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>🚨 Lost Kitties</a>
          <a href="/bounties" style={{ fontSize: 13, fontWeight: 600, color: '#444', textDecoration: 'none', padding: '6px 12px', borderRadius: 8 }}
            onMouseEnter={e => (e.currentTarget.style.background = '#f5f5f5')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>💰 Bounties</a>
          <a href="/care" style={{ fontSize: 13, fontWeight: 600, color: '#444', textDecoration: 'none', padding: '6px 12px', borderRadius: 8 }}
            onMouseEnter={e => (e.currentTarget.style.background = '#f5f5f5')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>🐾 Care for Strays</a>
          <a href="/about" style={{ fontSize: 13, fontWeight: 600, color: '#444', textDecoration: 'none', padding: '6px 12px', borderRadius: 8 }}
            onMouseEnter={e => (e.currentTarget.style.background = '#f5f5f5')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>About</a>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {gpsError && <span style={{ fontSize: 13, color: '#F44336', maxWidth: 200 }}>{gpsError}</span>}
          <button className="catmap-met-btn" onClick={handleMetACat} disabled={gpsLoading} style={{ padding: '9px 18px', borderRadius: 8, border: 'none', background: gpsLoading ? '#ffccbc' : '#FF6B6B', color: 'white', fontWeight: 700, fontSize: 14, cursor: gpsLoading ? 'default' : 'pointer' }}>
            {gpsLoading ? '📍 Getting location...' : '🐱 I met a cat!'}
          </button>
          {user ? (
            <div style={{ position: 'relative' }}>
              <div onClick={() => setShowUserMenu(v => !v)} style={{ width: 36, height: 36, borderRadius: '50%', background: '#FF6B6B', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 15, cursor: 'pointer', border: '2px solid #ffccbc', overflow: 'hidden', flexShrink: 0 }}>
                {userProfile?.avatar_url ? <img src={userProfile.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span>{user.email?.[0]?.toUpperCase() ?? '?'}</span>}
              </div>
              {showUserMenu && (
                <>
                  <div onClick={() => setShowUserMenu(false)} style={{ position: 'fixed', inset: 0, zIndex: 200 }} />
                  <div style={{ position: 'absolute', top: 44, right: 0, background: 'white', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', border: '1px solid #f0f0f0', minWidth: 190, zIndex: 201, overflow: 'hidden' }}>
                    <div style={{ padding: '12px 16px', borderBottom: '1px solid #f5f5f5' }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#222', marginBottom: 1 }}>{userProfile?.display_name || 'Anonymous'}</div>
                      <div style={{ fontSize: 11, color: '#aaa', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</div>
                    </div>
                    <a href={`/profile/${user.id}`} onClick={() => setShowUserMenu(false)} style={{ display: 'block', padding: '11px 16px', fontSize: 13, fontWeight: 600, color: '#333', textDecoration: 'none', borderBottom: '1px solid #f5f5f5' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#f9f9f9')} onMouseLeave={e => (e.currentTarget.style.background = 'white')}>👤 View Profile</a>
                    <a href="/messages" onClick={() => setShowUserMenu(false)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 16px', fontSize: 13, fontWeight: 600, color: '#333', textDecoration: 'none', borderBottom: '1px solid #f5f5f5' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#f9f9f9')} onMouseLeave={e => (e.currentTarget.style.background = 'white')}>
                      <span>✉️ Messages</span>
                      {unreadCount > 0 && <span style={{ background: '#FF6B6B', color: 'white', borderRadius: 10, padding: '1px 7px', fontSize: 11, fontWeight: 800 }}>{unreadCount > 9 ? '9+' : unreadCount}</span>}
                    </a>
                    <a href="/notifications" onClick={() => setShowUserMenu(false)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 16px', fontSize: 13, fontWeight: 600, color: '#333', textDecoration: 'none', borderBottom: '1px solid #f5f5f5' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#f9f9f9')} onMouseLeave={e => (e.currentTarget.style.background = 'white')}>
                      <span>🔔 Notifications</span>
                      {notifUnread > 0 && <span style={{ background: '#FF6B6B', color: 'white', borderRadius: 10, padding: '1px 7px', fontSize: 11, fontWeight: 800 }}>{notifUnread > 9 ? '9+' : notifUnread}</span>}
                    </a>
                    <button onClick={handleLogout} style={{ width: '100%', padding: '11px 16px', border: 'none', background: 'white', textAlign: 'left', fontSize: 13, color: '#F44336', fontWeight: 600, cursor: 'pointer' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#fff5f5')} onMouseLeave={e => (e.currentTarget.style.background = 'white')}>Sign out</button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <a href="/login" style={{ padding: '8px 20px', borderRadius: 8, background: '#333', color: 'white', textDecoration: 'none', fontWeight: 600, fontSize: 14 }}>Log in</a>
          )}
        </div>
      </div>

      {/* ── MAP ── */}
      <div className="catmap-map" style={{ flex: '0 0 70%', minHeight: 0, position: 'relative' }}>
        <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
        {selectedCat && popupPixel && (
          <MapPopup cat={selectedCat} pixelPos={popupPixel} onClose={() => { setSelectedCat(null); setPopupPixel(null); }} userLocation={userLocation} mapRef={mapRef} />
        )}
      </div>

      {/* ── FEED ── */}
      <div className="catmap-feed" style={{ flex: '0 0 30%', minHeight: 0, background: 'white', borderTop: '2px solid #f0f0f0', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ flexShrink: 0, padding: '8px 16px 4px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#555', display: 'flex', alignItems: 'center', gap: 6 }}>
            🐾 CATS NEAR YOU{visibleCount > 0 && <span style={{ fontSize: 11, color: '#bbb', fontWeight: 400 }}>{visibleCount} in view</span>}
          </span>
          {!userLocation && <span style={{ fontSize: 11, color: '#bbb' }}>Enable GPS for local results</span>}
        </div>
        <div className="catmap-feed-cards" style={{ flex: 1, overflowX: 'auto', overflowY: 'hidden', display: 'flex', alignItems: 'flex-start', padding: '6px 12px 8px', gap: 10 }}>
          {feedCats.length === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', color: '#ccc', fontSize: 13, whiteSpace: 'nowrap', paddingLeft: 4 }}>
              {userLocation ? 'No cats spotted within 2 miles yet 🐾' : 'Loading...'}
            </div>
          ) : (
            feedCats.map(cat => {
              const color = statusColors[cat.status] || '#888';
              const dist = userLocation ? distanceFeet(userLocation.lat, userLocation.lng, cat.lat, cat.lng) : null;
              const isLost = cat.status === 'lost';
              return (
                <div key={cat.id} onClick={() => handleFeedCardClick(cat)}
                  style={{ flexShrink: 0, width: 115, height: 160, cursor: 'pointer', background: '#fafafa', borderRadius: 10, overflow: 'hidden', border: isLost ? '2px solid #F44336' : '1px solid #efefef', boxShadow: isLost ? '0 2px 8px rgba(244,67,54,0.12)' : '0 1px 3px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column' }}>
                  {cat.image_url
                    ? <img src={cat.image_url} alt={cat.name} style={{ width: '100%', height: 76, objectFit: 'cover', objectPosition: '50% 20%', display: 'block', borderBottom: `2px solid ${color}` }} />
                    : <div style={{ width: '100%', height: 76, background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>🐱</div>
                  }
                  <div style={{ padding: '6px 8px 4px', flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <div style={{ fontWeight: 700, fontSize: 12, color: '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cat.name}</div>
                    <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 8, background: color, color: 'white', alignSelf: 'flex-start' }}>{statusEmoji[cat.status]} {cat.status}</span>
                    {dist !== null && <div style={{ fontSize: 10, color: '#bbb', marginTop: 'auto' }}>📍 {distanceMiles(dist)}</div>}
                  </div>
                  <a href={`/cat/${cat.id}`} onClick={e => e.stopPropagation()}
                    style={{ display: 'block', textAlign: 'center', fontSize: 10, fontWeight: 700, color: '#FF6B6B', textDecoration: 'none', background: '#fff3f3', borderTop: '1px solid #ffe0e0', padding: '5px 0' }}>
                    👁️ View Profile
                  </a>
                </div>
              );
            })
          )}
        </div>
      </div>

      {showForm && formPos && (
        <AddCatForm lat={formPos.lat} lng={formPos.lng} onClose={() => { setShowForm(false); setFormPos(null); }} onSaved={() => loadCatPins()} />
      )}
    </main>
  );
}

// PAGE: Main Map + Community Feed (app/page.tsx → route: /)
