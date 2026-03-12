'use client';

import { useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function Home() {
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initMap&loading=async`;
    script.async = true;
    script.defer = true;

    (window as any).initMap = async function () {
      if (!mapRef.current) return;

      const map = new (window as any).google.maps.Map(mapRef.current, {
        center: { lat: 40.7128, lng: -74.0060 },
        zoom: 13,
      });

      // Fetch cats from Supabase
      const { data: cats, error } = await supabase
        .from('cats')
        .select('*');

   console.log('cats data:', cats);
console.log('cats error:', error);
if (error) {
        console.error('Error fetching cats:', error);
        return;
      }

      // Add a pin for each cat
      cats?.forEach((cat) => {
        const marker = new (window as any).google.maps.Marker({
          position: { lat: cat.lat, lng: cat.lng },
          map: map,
          title: cat.name,
        });

        const infoWindow = new (window as any).google.maps.InfoWindow({
          content: `<div><strong>🐱 ${cat.name}</strong><p>${cat.description || ''}</p><p>Status: ${cat.status}</p></div>`,
        });

        marker.addListener('click', () => {
          infoWindow.open(map, marker);
        });
      });
    };

    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, []);

  return (
    <main style={{ width: '100vw', height: '100vh' }}>
      <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
    </main>
  );
}