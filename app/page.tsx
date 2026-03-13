// @ts-nocheck
// PAGE: Main Map + Community Feed (app/page.tsx → route: /)
'use client';
import { supabase } from '../lib/supabase';

export const dynamic = 'force-dynamic';

import { useEffect, useRef, useState, useCallback } from 'react';
import { MarkerClusterer, SuperClusterAlgorithm } from '@googlemaps/markerclusterer';
import AddCatForm from './components/AddCatForm';

    }
    return val;
  }
});

const statusColors: Record<string, string> = {
  stray: '#FF9800', community: '#4CAF50', lost: '#F44336', homed: '#2196F3',
};
const statusEmoji: Record<string, string> = {
  stray: '🏚️', community: '🏘️', lost: '🚨', homed: '🏠',
};
const statusOrder: Record<string, number> = {
  lost: 0, stray: 1, community: 2, homed: 3,
};

function distanceFeet(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 20902231;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function distanceMiles(feet: number): string {
  if (feet < 528) return `${Math.round(feet)} ft`;
  return `${(feet / 5280).toFixed(1)} mi`;
}

function createCatMarkerElement(cat: any): HTMLElement {
  const color = statusColors[cat.status] || '#888';
  const size = 70;
  const wrapper = document.createElement('div');
  wrapper.style.cssText = `width:${size}px;height:${size}px;border-radius:50%;border:4px solid ${color};overflow:hidden;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,0.3);background:${color};display:flex;align-items:center;justify-content:center;transition:transform 0.15s ease;`;
  wrapper.addEventListener('mouseenter', () => { wrapper.style.transform = 'scale(1.1)'; });
  wrapper.addEventListener('mouseleave', () => { wrapper.style.transform = 'scale(1.0)'; });
  if (cat.image_url) {
    const img = document.createElement('img');
    img.src = cat.image_url; img.alt = cat.name;
    img.style.cssText = 'width:100%;height:100%;object-fit:cover;object-position:50% 20%;border-radius:50%;';
    wrapper.appendChild(img);
  } else {
    const emoji = document.createElement('span');
    emoji.textContent = '🐱'; emoji.style.cssText = 'font-size:32px;line-height:1;';
    wrapper.appendChild(emoji);
  }
  const dot = document.createElement('div');
  dot.style.cssText = `position:absolute;bottom:2px;right:2px;width:14px;height:14px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.3);`;
  const container = document.createElement('div');
  container.style.cssText = `position:relative;width:${size}px;height:${size}px;`;
  container.appendChild(wrapper); container.appendChild(dot);
  return container;
}

// ── MAP POPUP ──
function MapPopup({ cat, pixelPos, onClose, userLocation, mapRef }: {
  cat: any;
  pixelPos: { x: number; y: number };
  onClose: () => void;
  userLocation: { lat: number; lng: number } | null;
  mapRef: React.RefObject<HTMLDivElement | null>;
}) {
  const color = statusColors[cat.status] || '#888';
  const dist = userLocation ? distanceFeet(userLocation.lat, userLocation.lng, cat.lat, cat.lng) : null;
  const popupW = 220;
  const popupH = 180;
  const mapRect = mapRef.current?.getBoundingClientRect();
  const mapW = mapRect?.width || 800;
  const mapH = mapRect?.height || 400;

  // Anchor popup above the pin, clamp to map bounds
  let left = pixelPos.x - popupW / 2;
  let top = pixelPos.y - popupH - 48;
  left = Math.max(8, Math.min(left, mapW - popupW - 8));
  top = Math.max(8, Math.min(top, mapH - popupH - 8));

  return (
    <>
      {/* click-away */}
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, zIndex: 199 }} />
      {/* popup card */}
      <div style={{
        position: 'absolute', left, top, width: popupW, zIndex: 200,
        background: 'white', borderRadius: 14, boxShadow: '0 8px 32px rgba(0,0,0,0.22)',
        border: cat.status === 'lost' ? '2px solid #F44336' : '1px solid #eee',
        animation: 'popIn 0.18s ease',
        overflow: 'hidden',
      }}>
        <style>{`@keyframes popIn { from { transform: scale(0.85); opacity: 0 } to { transform: scale(1); opacity: 1 } }`}</style>

        {/* photo strip */}
        {cat.image_url
          ? <img src={cat.image_url} alt={cat.name} style={{ width: '100%', height: 90, objectFit: 'cover', objectPosition: '50% 20%', display: 'block' }} />
          : <div style={{ width: '100%', height: 90, background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 44 }}>🐱</div>
        }

        <div style={{ padding: '8px 12px 10px' }}>
          {/* name + status */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontWeight: 700, fontSize: 14, color: '#111' }}>{cat.name}</span>
            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 10, background: color, color: 'white' }}>
              {statusEmoji[cat.status]} {cat.status}
            </span>
          </div>

          {dist !== null && <div style={{ fontSize: 11, color: '#aaa', marginBottom: 6 }}>📍 {distanceMiles(dist)} away</div>}

          {/* buttons */}
          <div style={{ display: 'flex', gap: 6 }}>
            <a
              href={`/cat/${cat.id}`}
              style={{ flex: 1, padding: '6px 0', borderRadius: 7, background: '#FF6B6B', color: 'white', fontWeight: 700, fontSize: 12, textAlign: 'center', textDecoration: 'none', display: 'block' }}
            >
              👁️ View Profile
            </a>
          </div>
        </div>

        {/* close btn */}
        <button onClick={onClose} style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,0.45)', border: 'none', borderRadius: '50%', width: 22, height: 22, color: 'white', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>✕</button>

        {/* triangle pointer */}
        <div style={{ position: 'absolute', bottom: -8, left: '50%', transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '8px solid transparent', borderRight: '8px solid transparent', borderTop: `8px solid white` }} />
      </div>
    </>
  );
}

export default function Home() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const clustererRef = useRef<any>(null);
  const catsDataRef = useRef<any[]>([]);
  const reclusterRef = useRef<(() => void) | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [formPos, setFormPos] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedCat, setSelectedCat] = useState<any>(null);
  const [popupPixel, setPopupPixel] = useState<{ x: number; y: number } | null>(null);
  const [user, setUser] = useState<any>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifUnread, setNotifUnread] = useState(0);
  const [allCats, setAllCats] = useState<any[]>([]);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [feedCats, setFeedCats] = useState<any[]>([]);
  const [visibleCount, setVisibleCount] = useState<number>(0);

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

  async function loadNotifUnread(userId: string) {
    const { count } = await supabase
      .from('notifications')
      .select('id', { count: 'exact' })
      .eq('user_id', userId)
      .eq('read', false);
    setNotifUnread(count || 0);
  }

  async function loadUnreadCount(userId: string) {
    const { count } = await supabase
      .from('messages')
      .select('id', { count: 'exact' })
      .eq('to_id', userId)
      .eq('read', false);
    setUnreadCount(count || 0);
  }

  async function loadUserProfile(userId: string) {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
    setUserProfile(data);
    // Recompute trust score from activity
    const [catsRes, sightingsRes, postsRes, claimRes] = await Promise.all([
      supabase.from('cats').select('id', { count: 'exact' }).eq('owner_id', userId),
      supabase.from('sightings').select('id', { count: 'exact' }).eq('user_id', userId),
      supabase.from('cat_posts').select('id', { count: 'exact' }).eq('user_id', userId),
      supabase.from('cats').select('id', { count: 'exact' }).eq('owner_id', userId).eq('owner_claim_status', 'verified'),
    ]);
    const score =
      (catsRes.count || 0) * 2 +
      (sightingsRes.count || 0) * 1 +
      (postsRes.count || 0) * 3 +
      (claimRes.count || 0) * 5;
    await supabase.from('profiles').upsert({ id: userId, trust_score: score });
  }

  const clearMarkers = useCallback(() => {
    if (clustererRef.current) {
      clustererRef.current.clearMarkers();
      clustererRef.current = null;
    }
    markersRef.current.forEach(m => { m.map = null; });
    markersRef.current = [];
  }, []);

  // Convert lat/lng to pixel position on map div
  function latLngToPixel(lat: number, lng: number): { x: number; y: number } | null {
    const map = mapInstanceRef.current;
    if (!map || !mapRef.current) return null;
    const projection = map.getProjection();
    if (!projection) return null;
    const bounds = map.getBounds();
    if (!bounds) return null;
    const ne = projection.fromLatLngToPoint(bounds.getNorthEast());
    const sw = projection.fromLatLngToPoint(bounds.getSouthWest());
    const scale = Math.pow(2, map.getZoom());
    const worldPoint = projection.fromLatLngToPoint(new (window as any).google.maps.LatLng(lat, lng));
    const x = (worldPoint.x - sw.x) * scale;
    const y = (worldPoint.y - ne.y) * scale;
    return { x, y };
  }

  function openPopup(cat: any) {
    setSelectedCat(cat);
    const pixel = latLngToPixel(cat.lat, cat.lng);
    setPopupPixel(pixel);
  }

  const loadCatPins = useCallback(async () => {
    if (!mapInstanceRef.current) return;
    clearMarkers();
    const { data: cats, error } = await supabase.from('cats').select('*');
    if (error) { console.error(error); return; }
    setAllCats(cats || []);
    catsDataRef.current = cats || [];
    // Update visible count for current bounds
    const bounds = mapInstanceRef.current?.getBounds();
    if (bounds) {
      setVisibleCount((cats || []).filter((c: any) => bounds.contains({ lat: c.lat, lng: c.lng })).length);
    }
    renderClusters(cats || []);
  }, [clearMarkers]);

  function latLngToWorld(lat: number, lng: number) {
    const map = mapInstanceRef.current;
    const proj = map?.getProjection();
    if (!proj) return null;
    return proj.fromLatLngToPoint(new (window as any).google.maps.LatLng(lat, lng));
  }

  function clusterCats(cats: any[]) {
    const map = mapInstanceRef.current;
    if (!map) return cats.map(c => ({ cats: [c], lat: c.lat, lng: c.lng }));
    const zoom = map.getZoom();
    const PIXEL_RADIUS = 56; // px — cluster if pins within this distance
    const scale = Math.pow(2, zoom);

    // Convert all cats to pixel coords
    const points = cats.map(cat => {
      const w = latLngToWorld(cat.lat, cat.lng);
      return { cat, wx: w ? w.x * scale : 0, wy: w ? w.y * scale : 0, clustered: false };
    });

    const clusters: { cats: any[]; lat: number; lng: number }[] = [];
    for (let i = 0; i < points.length; i++) {
      if (points[i].clustered) continue;
      const group = [points[i].cat];
      let sumLat = points[i].cat.lat, sumLng = points[i].cat.lng;
      for (let j = i + 1; j < points.length; j++) {
        if (points[j].clustered) continue;
        const dx = points[i].wx - points[j].wx;
        const dy = points[i].wy - points[j].wy;
        if (Math.sqrt(dx * dx + dy * dy) < PIXEL_RADIUS) {
          group.push(points[j].cat);
          sumLat += points[j].cat.lat;
          sumLng += points[j].cat.lng;
          points[j].clustered = true;
        }
      }
      points[i].clustered = true;
      clusters.push({ cats: group, lat: sumLat / group.length, lng: sumLng / group.length });
    }
    return clusters;
  }

  function createClusterElement(cluster: { cats: any[]; lat: number; lng: number }): HTMLElement {
    const { cats } = cluster;
    const size = 72;
    const wrapper = document.createElement('div');
    wrapper.style.cssText = `position:relative;width:${size}px;height:${size}px;cursor:pointer;`;

    if (cats.length === 1) {
      // Single cat — normal pin
      const inner = createCatMarkerElement(cats[0]);
      wrapper.appendChild(inner);
    } else {
      // Cluster bubble — stacked photos
      const bubble = document.createElement('div');
      bubble.style.cssText = `width:${size}px;height:${size}px;border-radius:50%;border:3px solid white;overflow:hidden;box-shadow:0 3px 12px rgba(0,0,0,0.35);background:#FF6B6B;display:flex;align-items:center;justify-content:center;position:relative;`;

      // Show up to 2 photos side by side or a count
      const photoCats = cats.filter(c => c.image_url).slice(0, 2);
      if (photoCats.length >= 2) {
        photoCats.forEach((cat, idx) => {
          const img = document.createElement('img');
          img.src = cat.image_url;
          img.style.cssText = `width:50%;height:100%;object-fit:cover;object-position:50% 20%;display:block;flex-shrink:0;`;
          bubble.appendChild(img);
        });
        bubble.style.display = 'flex';
        bubble.style.flexDirection = 'row';
      } else if (photoCats.length === 1) {
        const img = document.createElement('img');
        img.src = photoCats[0].image_url;
        img.style.cssText = `width:100%;height:100%;object-fit:cover;object-position:50% 20%;`;
        bubble.appendChild(img);
      } else {
        const emoji = document.createElement('span');
        emoji.textContent = '🐱';
        emoji.style.cssText = 'font-size:28px;';
        bubble.appendChild(emoji);
      }

      // Count badge
      const badge = document.createElement('div');
      badge.textContent = String(cats.length);
      badge.style.cssText = `position:absolute;top:-4px;right:-4px;background:#FF6B6B;color:white;border-radius:50%;width:22px;height:22px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.2);z-index:2;`;

      // Check for lost cat in cluster
      const hasLost = cats.some(c => c.status === 'lost');
      if (hasLost) {
        bubble.style.border = '3px solid #F44336';
        badge.style.background = '#F44336';
      }

      wrapper.appendChild(bubble);
      wrapper.appendChild(badge);

      // Pointer triangle
      const tri = document.createElement('div');
      tri.style.cssText = `position:absolute;bottom:-7px;left:50%;transform:translateX(-50%);width:0;height:0;border-left:7px solid transparent;border-right:7px solid transparent;border-top:7px solid white;filter:drop-shadow(0 2px 2px rgba(0,0,0,0.15));`;
      wrapper.appendChild(tri);

      return wrapper;
    }

    // Single pin triangle
    const tri = document.createElement('div');
    tri.style.cssText = `position:absolute;bottom:-7px;left:50%;transform:translateX(-50%);width:0;height:0;border-left:7px solid transparent;border-right:7px solid transparent;border-top:7px solid white;filter:drop-shadow(0 2px 2px rgba(0,0,0,0.15));`;
    wrapper.appendChild(tri);
    return wrapper;
  }

  async function renderClusters(cats?: any[]) {
    const map = mapInstanceRef.current;
    if (!map) return;
    const useCats = cats ?? catsDataRef.current;
    clearMarkers();
    if (!useCats.length) return;
    const { AdvancedMarkerElement } = await (window as any).google.maps.importLibrary('marker');

    // Create individual markers (no map assignment — clusterer manages that)
    // Build a lookup map by id so the cluster renderer can find cats reliably
    const catById: Record<string, any> = {};
    useCats.forEach((cat: any) => { catById[cat.id] = cat; });

    // Deduplicate positions — jitter cats that share exact lat/lng so both are visible when zoomed in
    const positionCount: Record<string, number> = {};
    const jitteredCats = useCats.map((cat: any) => {
      const key = `${cat.lat},${cat.lng}`;
      const count = positionCount[key] || 0;
      positionCount[key] = count + 1;
      if (count === 0) return cat;
      // Offset ~3 meters per duplicate in a small circle
      const angle = (count * 137.5 * Math.PI) / 180; // golden angle spread
      const offset = 0.000025 * Math.ceil(count / 6);
      return { ...cat, lat: cat.lat + offset * Math.cos(angle), lng: cat.lng + offset * Math.sin(angle) };
    });

    const markers = jitteredCats.map((cat: any) => {
      const marker = new AdvancedMarkerElement({
        position: { lat: cat.lat, lng: cat.lng },
        title: cat.name,
        content: createCatMarkerElement(cat),
      });
      (marker as any)._catId = cat.id;
      marker.addListener('click', () => openPopup(cat));
      return marker;
    });
    markersRef.current = markers;

    // Custom cluster renderer — cat-themed bubbles
    const renderer = {
      render: ({ count, position, markers: clusterMarkers }: any) => {
        const cats = clusterMarkers
          .map((m: any) => catById[m._catId])
          .filter(Boolean);

        const el = document.createElement('div');
        el.style.cssText = 'position:relative;width:72px;height:72px;cursor:pointer;';

        const bubble = document.createElement('div');
        const hasLost = cats.some((c: any) => c?.status === 'lost');
        bubble.style.cssText = `width:72px;height:72px;border-radius:50%;border:3px solid ${hasLost ? '#F44336' : 'white'};overflow:hidden;box-shadow:0 3px 12px rgba(0,0,0,0.35);background:#FF6B6B;display:flex;align-items:center;justify-content:center;`;

        const photoCats = cats.filter((c: any) => c?.image_url).slice(0, 2);
        if (photoCats.length >= 2) {
          bubble.style.flexDirection = 'row';
          photoCats.forEach((cat: any) => {
            const img = document.createElement('img');
            img.src = cat.image_url;
            img.style.cssText = 'width:50%;height:100%;object-fit:cover;object-position:50% 20%;';
            bubble.appendChild(img);
          });
        } else if (photoCats.length === 1) {
          const img = document.createElement('img');
          img.src = photoCats[0].image_url;
          img.style.cssText = 'width:100%;height:100%;object-fit:cover;object-position:50% 20%;';
          bubble.appendChild(img);
        } else {
          const emoji = document.createElement('span');
          emoji.textContent = '🐱';
          emoji.style.fontSize = '28px';
          bubble.appendChild(emoji);
        }

        const badge = document.createElement('div');
        badge.textContent = String(count);
        badge.style.cssText = `position:absolute;top:-4px;right:-4px;background:${hasLost ? '#F44336' : '#FF6B6B'};color:white;border-radius:50%;width:22px;height:22px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.2);`;

        const tri = document.createElement('div');
        tri.style.cssText = 'position:absolute;bottom:-7px;left:50%;transform:translateX(-50%);width:0;height:0;border-left:7px solid transparent;border-right:7px solid transparent;border-top:7px solid white;filter:drop-shadow(0 2px 2px rgba(0,0,0,0.15));';

        el.appendChild(bubble);
        el.appendChild(badge);
        el.appendChild(tri);

        return new AdvancedMarkerElement({ position, content: el });
      },
    };

    clustererRef.current = new MarkerClusterer({
      map,
      markers,
      algorithm: new SuperClusterAlgorithm({ radius: 80, maxZoom: 16 }),
      renderer,
    });
  }

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initMap&libraries=marker&loading=async`;
    script.async = true; script.defer = true;
    (window as any).initMap = function () {
      if (!mapRef.current) return;
      const map = new (window as any).google.maps.Map(mapRef.current, {
        center: { lat: 40.7128, lng: -74.0060 },
        zoom: 15,
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
      loadCatPins().then(() => {
        reclusterRef.current = () => renderClusters();
      });
      let reclusterTimer: any = null;
      const debouncedRecluster = () => {
        clearTimeout(reclusterTimer);
        reclusterTimer = setTimeout(() => {
          if (reclusterRef.current) reclusterRef.current();
        }, 150);
      };
      map.addListener('zoom_changed', debouncedRecluster);
      map.addListener('bounds_changed', () => {
        const bounds = map.getBounds();
        if (!bounds || !catsDataRef.current.length) return;
        const count = catsDataRef.current.filter((c: any) =>
          bounds.contains({ lat: c.lat, lng: c.lng })
        ).length;
        setVisibleCount(count);
      });
    };
    document.head.appendChild(script);
    return () => { document.head.removeChild(script); delete (window as any).initMap; };
  }, [loadCatPins]);

  async function handleLogout() {
    await supabase.auth.signOut(); setUser(null);
  }

  function handleMetACat() {
    if (!user) { window.location.href = '/login'; return; }
    setGpsError(''); setGpsLoading(true);
    if (!navigator.geolocation) { setGpsError('GPS not supported.'); setGpsLoading(false); return; }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGpsLoading(false);
        setFormPos({ lat: position.coords.latitude, lng: position.coords.longitude });
        setShowForm(true);
        mapInstanceRef.current?.panTo({ lat: position.coords.latitude, lng: position.coords.longitude });
      },
      () => { setGpsLoading(false); setGpsError('Could not get your location. Please allow GPS access.'); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  function handleFeedCardClick(cat: any) {
    // Pan map to pin, then open popup
    setSelectedCat(null); setPopupPixel(null);
    mapInstanceRef.current?.panTo({ lat: cat.lat, lng: cat.lng });
    // Wait for pan to settle then compute pixel
    setTimeout(() => openPopup(cat), 350);
  }

  return (
    <main style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* ── NAVBAR ── */}
      <div style={{ flexShrink: 0, background: 'white', padding: '10px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 2px 10px rgba(0,0,0,0.08)', zIndex: 100 }}>
        <div style={{ fontSize: 20, fontWeight: 700 }}>🐱 CatMap</div>

        {/* Centre nav links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <a href="/about" style={{ fontSize: 13, fontWeight: 600, color: '#444', textDecoration: 'none', padding: '6px 12px', borderRadius: 8, transition: 'background 0.15s' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#f5f5f5')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>About</a>
          <a href="/care" style={{ fontSize: 13, fontWeight: 600, color: '#444', textDecoration: 'none', padding: '6px 12px', borderRadius: 8, transition: 'background 0.15s' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#f5f5f5')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>🐾 Care for Strays</a>
        </div>

        {/* Right side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {gpsError && <span style={{ fontSize: 13, color: '#F44336', maxWidth: 200 }}>{gpsError}</span>}
          <button onClick={handleMetACat} disabled={gpsLoading} style={{ padding: '9px 18px', borderRadius: 8, border: 'none', background: gpsLoading ? '#ffccbc' : '#FF6B6B', color: 'white', fontWeight: 700, fontSize: 14, cursor: gpsLoading ? 'default' : 'pointer' }}>
            {gpsLoading ? '📍 Getting location...' : '🐱 I met a cat!'}
          </button>
          {user ? (
            <div style={{ position: 'relative' }}>
              {/* Avatar button */}
              <div onClick={() => setShowUserMenu(v => !v)}
                style={{ width: 36, height: 36, borderRadius: '50%', background: '#FF6B6B', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 15, cursor: 'pointer', userSelect: 'none', border: '2px solid #ffccbc', overflow: 'hidden', flexShrink: 0 }}>
                {userProfile?.avatar_url
                  ? <img src={userProfile.avatar_url} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span>{user.email?.[0]?.toUpperCase() ?? '?'}</span>
                }
              </div>
              {/* Dropdown */}
              {showUserMenu && (
                <>
                  <div onClick={() => setShowUserMenu(false)} style={{ position: 'fixed', inset: 0, zIndex: 200 }} />
                  <div style={{ position: 'absolute', top: 44, right: 0, background: 'white', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', border: '1px solid #f0f0f0', minWidth: 190, zIndex: 201, overflow: 'hidden' }}>
                    <div style={{ padding: '12px 16px', borderBottom: '1px solid #f5f5f5' }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#222', marginBottom: 1 }}>{userProfile?.display_name || 'Anonymous'}</div>
                      <div style={{ fontSize: 11, color: '#aaa', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</div>
                    </div>
                    <a href={`/profile/${user.id}`} onClick={() => setShowUserMenu(false)}
                      style={{ display: 'block', padding: '11px 16px', fontSize: 13, fontWeight: 600, color: '#333', textDecoration: 'none', borderBottom: '1px solid #f5f5f5' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#f9f9f9')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'white')}>
                      👤 View Profile
                    </a>
                    <a href="/messages" onClick={() => setShowUserMenu(false)}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 16px', fontSize: 13, fontWeight: 600, color: '#333', textDecoration: 'none', borderBottom: '1px solid #f5f5f5' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#f9f9f9')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'white')}>
                      <span>✉️ Messages</span>
                      {unreadCount > 0 && (
                        <span style={{ background: '#FF6B6B', color: 'white', borderRadius: 10, padding: '1px 7px', fontSize: 11, fontWeight: 800 }}>
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                      )}
                    </a>
                    <a href="/notifications" onClick={() => setShowUserMenu(false)}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 16px', fontSize: 13, fontWeight: 600, color: '#333', textDecoration: 'none', borderBottom: '1px solid #f5f5f5' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#f9f9f9')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'white')}>
                      <span>🔔 Notifications</span>
                      {notifUnread > 0 && (
                        <span style={{ background: '#FF6B6B', color: 'white', borderRadius: 10, padding: '1px 7px', fontSize: 11, fontWeight: 800 }}>
                          {notifUnread > 9 ? '9+' : notifUnread}
                        </span>
                      )}
                    </a>
                    <button onClick={handleLogout} style={{ width: '100%', padding: '11px 16px', border: 'none', background: 'white', textAlign: 'left', fontSize: 13, color: '#F44336', fontWeight: 600, cursor: 'pointer' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#fff5f5')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'white')}>
                      Sign out
                    </button>
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
      <div style={{ flex: '0 0 70%', minHeight: 0, position: 'relative' }}>
        <div ref={mapRef} style={{ width: '100%', height: '100%' }} />

        {/* Map popup */}
        {selectedCat && popupPixel && (
          <MapPopup
            cat={selectedCat}
            pixelPos={popupPixel}
            onClose={() => { setSelectedCat(null); setPopupPixel(null); }}
            userLocation={userLocation}
            mapRef={mapRef}
          />
        )}
      </div>

      {/* ── FEED ── */}
      <div style={{ flex: '0 0 30%', minHeight: 0, background: 'white', borderTop: '2px solid #f0f0f0', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ flexShrink: 0, padding: '8px 16px 4px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#555', display: 'flex', alignItems: 'center', gap: 6 }}>🐾 CATS NEAR YOU{visibleCount > 0 && <span style={{ fontSize: 11, color: '#bbb', fontWeight: 400 }}>{visibleCount} in view</span>}</span>
          {!userLocation && <span style={{ fontSize: 11, color: '#bbb' }}>Enable GPS for local results</span>}
        </div>
        <div style={{ flex: 1, overflowX: 'auto', overflowY: 'hidden', display: 'flex', alignItems: 'flex-start', paddingTop: 6, padding: '6px 12px 8px', gap: 10 }}>
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
                  style={{
                    flexShrink: 0, width: 115, height: 160,
                    cursor: 'pointer', background: '#fafafa',
                    borderRadius: 10, overflow: 'hidden',
                    border: isLost ? '2px solid #F44336' : '1px solid #efefef',
                    boxShadow: isLost ? '0 2px 8px rgba(244,67,54,0.12)' : '0 1px 3px rgba(0,0,0,0.06)',
                    display: 'flex', flexDirection: 'column',
                  }}>
                  {/* photo */}
                  {cat.image_url
                    ? <img src={cat.image_url} alt={cat.name} style={{ width: '100%', height: 76, objectFit: 'cover', objectPosition: '50% 20%', display: 'block', borderBottom: `2px solid ${color}` }} />
                    : <div style={{ width: '100%', height: 76, background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>🐱</div>
                  }
                  {/* info */}
                  <div style={{ padding: '6px 8px 4px', flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <div style={{ fontWeight: 700, fontSize: 12, color: '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cat.name}</div>
                    <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 8, background: color, color: 'white', alignSelf: 'flex-start' }}>
                      {statusEmoji[cat.status]} {cat.status}
                    </span>
                    {dist !== null && <div style={{ fontSize: 10, color: '#bbb', marginTop: 'auto' }}>📍 {distanceMiles(dist)}</div>}
                  </div>
                  {/* view profile footer */}
                  <a
                    href={`/cat/${cat.id}`}
                    onClick={e => e.stopPropagation()}
                    style={{ display: 'block', textAlign: 'center', fontSize: 10, fontWeight: 700, color: '#FF6B6B', textDecoration: 'none', background: '#fff3f3', borderTop: '1px solid #ffe0e0', padding: '5px 0' }}
                  >
                    👁️ View Profile
                  </a>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── ADD CAT FORM ── */}
      {showForm && formPos && (
        <AddCatForm
          lat={formPos.lat} lng={formPos.lng}
          onClose={() => { setShowForm(false); setFormPos(null); }}
          onSaved={() => loadCatPins()}
        />
      )}
    </main>
  );
}

// PAGE: Main Map + Community Feed (app/page.tsx → route: /)
