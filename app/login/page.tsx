'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const statusColors: Record<string, string> = {
  stray: '#FF9800',
  community: '#4CAF50',
  lost: '#F44336',
  homed: '#2196F3',
};

function createCatMarkerElement(cat: any): HTMLElement {
  const color = statusColors[cat.status] || '#888';
  const size = 70;
  const borderWidth = 4;

  const wrapper = document.createElement('div');
  wrapper.style.cssText = `
    width: ${size}px;
    height: ${size}px;
    border-radius: 50%;
    border: ${borderWidth}px solid ${color};
    overflow: hidden;
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    background: ${color};
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.15s ease;
  `;

  wrapper.addEventListener('mouseenter', () => {
    wrapper.style.transform = 'scale(1.1)';
  });
  wrapper.addEventListener('mouseleave', () => {
    wrapper.style.transform = 'scale(1.0)';
  });

  if (cat.image_url) {
    const img = document.createElement('img');
    img.src = cat.image_url;
    img.alt = cat.name;
    img.style.cssText = `
      width: 100%;
      height: 100%;
      object-fit: cover;
      border-radius: 50%;
    `;
    wrapper.appendChild(img);
  } else {
    const emoji = document.createElement('span');
    emoji.textContent = '🐱';
    emoji.style.cssText = `
      font-size: 32px;
      line-height: 1;
    `;
    wrapper.appendChild(emoji);
  }

  const dot = document.createElement('div');
  dot.style.cssText = `
    position: absolute;
    bottom: 2px;
    right: 2px;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: ${color};
    border: 2px solid white;
    box-shadow: 0 1px 3px rgba(0,0,0,0.3);
  `;

  const container = document.createElement('div');
  container.style.cssText = `position: relative; width: ${size}px; height: ${size}px;`;
  container.appendChild(wrapper);
  container.appendChild(dot);

  return container;
}

export default function Home() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [clickedPos, setClickedPos] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedCat, setSelectedCat] = useState<any>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const clearMarkers = useCallback(() => {
    markersRef.current.forEach((marker) => {
      marker.map = null;
    });
    markersRef.current = [];
  }, []);

  const loadCatPins = useCallback(async () => {
    if (!mapInstanceRef.current) return;
    clearMarkers();
    const { data: cats, error } = await supabase.from('cats').select('*');
    if (error) { console.error(error); return; }
    const { AdvancedMarkerElement } = await (window as any).google.maps.importLibrary('marker');
    cats?.forEach((cat) => {
      const markerElement = createCatMarkerElement(cat);
      const marker = new AdvancedMarkerElement({
        position: { lat: cat.lat, lng: cat.lng },
        map: mapInstanceRef.current,
        title: cat.name,
        content: markerElement,
      });
      marker.addListener('click', () => setSelectedCat(cat));
      markersRef.current.push(marker);
    });
  }, [clearMarkers]);

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initMap&libraries=marker&loading=async`;
    script.async = true;
    script.defer = true;

    (window as any).initMap = function () {
      if (!mapRef.current) return;
      const map = new (window as any).google.maps.Map(mapRef.current, {
        center: { lat: 40.7128, lng: -74.0060 },
        zoom: 13,
        mapId: process.env.NEXT_PUBLIC_GOOGLE_MAPS_ID,
      });
      mapInstanceRef.current = map;
      map.addListener('click', (e: any) => {
        if (!user) return alert('Please log in to report a cat!');
        setClickedPos({ lat: e.latLng.lat(), lng: e.latLng.lng() });
        setShowForm(true);
      });
      loadCatPins();
    };

    document.head.appendChild(script);
    return () => {
      document.head.removeChild(script);
      delete (window as any).initMap;
    };
  }, [loadCatPins, user]);

  async function handleLogout() {
    await supabase.auth.signOut();
    setUser(null);
  }

  return (
    <main style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100,
        background: 'white', padding: '12px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
      }}>
        <div style={{ fontSize: 20, fontWeight: 700 }}>🐱 CatMap</div>
        <div>
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 14, color: '#555' }}>{user.email}</span>
              <button onClick={handleLogout} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #ddd', background: 'white', cursor: 'pointer' }}>
                Log out
              </button>
            </div>
          ) : (
            <a href="/login" style={{ padding: '8px 20px', borderRadius: 8, background: '#FF6B6B', color: 'white', textDecoration: 'none', fontWeight: 600, fontSize: 14 }}>
              Log in
            </a>
          )}
        </div>
      </div>

      <div ref={mapRef} style={{ width: '100%', height: '100%' }} />

      {showForm && clickedPos && (
          lat={clickedPos.lat}
          lng={clickedPos.lng}
          onClose={() => setShowForm(false)}
          onSaved={() => loadCatPins()}
        />
      )}
      {selectedCat && (
          cat={selectedCat}
          onClose={() => setSelectedCat(null)}
          onStatusChange={() => loadCatPins()}
        />
      )}
    </main>
  );
}
