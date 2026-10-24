import { useEffect, useRef, useState } from 'react';
import { LoaderCircle, MapPin, Store } from 'lucide-react';
import type { Coordinates, Supermarket } from './models';

declare global { interface Window { initEasyShopMap?: () => void } }
let mapsPromise: Promise<void> | undefined;
function loadMaps() {
  if (mapsPromise) return mapsPromise;
  mapsPromise = new Promise<void>((resolve, reject) => {
    const key = import.meta.env['VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY'];
    const channel = import.meta.env['VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID'];
    if (!key) { reject(new Error('Google Maps non è ancora collegato.')); return; }
    window.initEasyShopMap = () => resolve();
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&loading=async&callback=initEasyShopMap&channel=${encodeURIComponent(channel ?? '')}&language=it`;
    script.onerror = () => { mapsPromise = undefined; script.remove(); reject(new Error('Non riesco a caricare Google Maps. Controlla la connessione.')); };
    document.head.appendChild(script);
  });
  return mapsPromise;
}

export function SupermarketMap({ center, places, loading, locationLabel }: { center: Coordinates | null; places: Supermarket[]; loading: boolean; locationLabel: string }) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<google.maps.Map | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!center) return;
    // Maps is intentionally not requested on the agent sandbox's unauthorized origin.
    if (window.location.hostname === 'localhost') { setError('La mappa è disponibile sul sito autorizzato.'); return; }
    let cancelled = false;
    void loadMaps().then(() => {
      if (cancelled || !container.current) return;
      if (!map.current) map.current = new google.maps.Map(container.current, { center, zoom: 14, clickableIcons: false, mapTypeControl: false, streetViewControl: false, fullscreenControl: true, styles: [{ featureType: 'poi', stylers: [{ visibility: 'off' }] }] });
      setReady(true);
    }).catch((reason: unknown) => { if (!cancelled) setError(reason instanceof Error ? reason.message : 'Mappa non disponibile.'); });
    return () => { cancelled = true; };
  }, [center]);
  useEffect(() => {
    if (!ready || !map.current || !center) return;
    const currentMap = map.current;
    currentMap.setCenter(center);
    const primary = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim();
    const userMarker = new google.maps.Marker({ map: currentMap, position: center, title: locationLabel || 'La tua posizione', zIndex: 100, icon: { path: google.maps.SymbolPath.CIRCLE, scale: 9, fillColor: primary, fillOpacity: 1, strokeWeight: 3, strokeColor: getComputedStyle(document.body).backgroundColor } });
    const info = new google.maps.InfoWindow();
    const markers = places.map(place => {
      const marker = new google.maps.Marker({ map: currentMap, position: { lat: place.lat, lng: place.lng }, title: place.name, label: { text: 'S', fontWeight: '700' } });
      marker.addListener('click', () => {
        const content = document.createElement('div');
        const name = document.createElement('strong'); name.textContent = place.name;
        const address = document.createElement('p'); address.textContent = place.address;
        const status = document.createElement('p'); status.textContent = place.openNow === null ? 'Orari non disponibili' : place.openNow ? 'Aperto ora' : 'Chiuso ora';
        content.append(name, address, status);
        info.setContent(content); info.open({ map: currentMap, anchor: marker });
      });
      return marker;
    });
    return () => { info.close(); userMarker.setMap(null); markers.forEach(marker => { google.maps.event.clearInstanceListeners(marker); marker.setMap(null); }); };
  }, [ready, center, places, locationLabel]);
  return <div className="overflow-hidden rounded-md border bg-surface">
    <div className="relative h-[360px] sm:h-[420px]">
      <div ref={container} className="h-full w-full" aria-label="Mappa dei supermercati vicini" />
      {(!center || error || !ready) && <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-muted px-6 text-center text-muted-foreground">
        {loading || (center && !error) ? <LoaderCircle className="size-7 animate-spin" /> : <MapPin className="size-8" />}
        <p className="max-w-xs text-sm">{error || (loading ? 'Cerco la posizione e i supermercati…' : center ? 'Carico la mappa…' : 'Scegli la tua posizione o inserisci una città.')}</p>
      </div>}
      {loading && ready && <div className="absolute left-3 top-3 flex items-center gap-2 rounded-md border bg-surface px-3 py-2 text-sm"><LoaderCircle className="size-4 animate-spin" />Cerco supermercati…</div>}
    </div>
    <div className="flex items-center gap-2 border-t px-4 py-3 text-sm text-muted-foreground"><Store className="size-4 shrink-0" /><span>{places.length ? `${places.length} supermercati · entro 2 km` : center && !loading ? 'Nessun supermercato trovato entro 2 km' : 'Supermercati vicini · 2 km'}</span></div>
  </div>;
}