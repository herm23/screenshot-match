// Caricato solo nel browser (Leaflet usa window): importarlo tramite SupermarketMap.
import 'leaflet/dist/leaflet.css';
import { useEffect } from 'react';
import L from 'leaflet';
import { Circle, MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import { logoUrl } from './ChainLogo';
import type { Located } from './geo';
import type { Store } from './places';
import { formatDistance } from './pricing';

export type Highlight = { label: string; primary: boolean };
// Post della community: activity da 1 a 3 (quanti post ha l'utente), recent = pubblicato da poco
export type MapPost = { id: string; lat: number; lng: number; color: string; name: string; text: string; ago: string; activity: 1 | 2 | 3; recent: boolean };

const userIcon = L.divIcon({ className: '', html: '<span class="es-pin-user"></span>', iconSize: [20, 20], iconAnchor: [10, 10] });

function storeIcon(store: Store, highlight: Highlight | undefined) {
  const logo = logoUrl(store.chain);
  const inner = logo ? `<img src="${logo}" alt="" />` : `<b>${store.chain.name[0]}</b>`;
  const size = highlight?.primary ? 46 : highlight ? 40 : 32;
  return L.divIcon({
    className: '',
    html: `<span class="es-pin-store${highlight ? ' es-pin-store--best' : ''}${highlight?.primary ? ' es-pin-store--primary' : ''}" style="--chain:${store.chain.color}"><span>${inner}</span></span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size + 4],
  });
}

function postIcon(post: MapPost) {
  const size = [0, 34, 42, 50][post.activity]!;
  return L.divIcon({
    className: '',
    html: `<span class="es-pin-post${post.recent ? ' es-pin-post--recent' : ''}" style="--member:${post.color};width:${size}px;height:${size}px"><img src="/icon-192.png" alt="" /></span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
}

function FitView({ center, focus }: { center: Located; focus: { id: string; lat: number; lng: number }[] }) {
  const map = useMap();
  const key = `${center.lat.toFixed(4)},${center.lng.toFixed(4)}|${focus.map(point => point.id).join(',')}`;
  useEffect(() => {
    if (!focus.length) { map.setView(center, 15); return; }
    map.fitBounds(L.latLngBounds([center, ...focus].map(point => [point.lat, point.lng])), { padding: [48, 48], maxZoom: 16 });
  }, [map, key]);
  return null;
}

export default function LeafletMap({ center, stores, highlights, posts = [] }: { center: Located; stores: Store[]; highlights: Map<string, Highlight>; posts?: MapPost[] | undefined }) {
  const focus = [...stores.filter(store => highlights.has(store.id)), ...posts];
  return (
    <MapContainer center={center} zoom={15} scrollWheelZoom={false} className="h-full w-full" aria-label="Mappa dei negozi vicini">
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <FitView center={center} focus={focus} />
      {center.accuracy && center.accuracy < 3000 && <Circle center={center} radius={center.accuracy} pathOptions={{ className: 'es-accuracy' }} />}
      <Marker position={center} icon={userIcon} title={center.label} zIndexOffset={2000} />
      {stores.map(store => {
        const highlight = highlights.get(store.id);
        return (
          <Marker key={store.id} position={store} icon={storeIcon(store, highlight)} title={store.name} zIndexOffset={highlight?.primary ? 1500 : highlight ? 1000 : 0}>
            <Popup>
              {highlight && <><strong>{highlight.label}</strong><br /></>}
              <strong>{store.name}</strong>
              <br />{store.address} · {formatDistance(store.distance)}
              {store.source === 'demo' && <><br /><em>Negozio dimostrativo</em></>}
            </Popup>
          </Marker>
        );
      })}
      {posts.map(post => (
        <Marker key={post.id} position={post} icon={postIcon(post)} title={post.name} zIndexOffset={post.recent ? 1800 : 1200}>
          <Popup>
            <strong>{post.name}</strong> · {post.ago}
            <br />{post.text}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
