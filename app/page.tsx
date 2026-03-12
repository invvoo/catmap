'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import AddCatForm from './components/AddCatForm';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function Home() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [clickedPos, setClickedPos] = useState<{ lat: number; lng: number } | null>(null);

  const loadCatPins = useCallback(async () => {
    if (!mapInstanceRef.current) return;

    const { data: cats, error } = await supabase.from('cats').select('*');
    if (error) { console.error(error); return; }

    cats?.forEach((cat) => {
      const marker = new (window as any).google.maps.Marker({
        position: { lat: cat.lat, lng: cat.lng },
        map: mapInstanceRef.current,
        title: cat.name,
      });

      const infoWindow = new (window as any).google.maps.InfoWindow({
        content: `<div><strong>🐱 ${cat.name}</strong><p>${cat.description || ''}</p><p>Status: ${cat.status}</p></div>`,
      });

      marker.addListener('click', () => {
        infoWindow.open(mapInstanceRef.current, marker);
      });
    });
  }, []);

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initMap&loading=async`;
    script.async = true;
    script.defer = true;

    (window as any).initMap = function () {
      if (!mapRef.current) return;

      const map = new (window as any).google.maps.Map(mapRef.current, {
        center: { lat: 40.7128, lng: -74.0060 },
        zoom: 13,
      });

      mapInstanceRef.current = map;

      map.addListener('click', (e: any) => {
        setClickedPos({ lat: e.latLng.lat(), lng: e.latLng.lng() });
        setShowForm(true);
      });

      loadCatPins();
    };

    document.head.appendChild(script);
    return () => { document.head.removeChild(script); };
  }, [loadCatPins]);

  return (
    <main style={{ width: '100vw', height: '100vh' }}>
      <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
      {showForm && clickedPos && (
        <AddCatForm
          lat={clickedPos.lat}
          lng={clickedPos.lng}
          onClose={() => setShowForm(false)}
          onSaved={() => loadCatPins()}
        />
      )}
    </main>
  );
}