// Caricato solo nel browser (Leaflet usa window): importarlo tramite SupermarketMap.
import 'leaflet/dist/leaflet.css';
import { useEffect } from 'react';
import L from 'leaflet';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import type { Coordinates } from './models';
import { formatDistance, type NearbySupermarket } from './fake-data';

const userIcon = L.divIcon({ className: '', html: '<span class="es-pin-user"></span>', iconSize: [20, 20], iconAnchor: [10, 10] });

function storeIcon(place: NearbySupermarket, highlighted: boolean) {
  return L.divIcon({
    className: '',
    html: `<span class="es-pin-store${highlighted ? ' es-pin-store--best' : ''}" style="--chain:${place.chain.color}"><span>${place.chain.name[0]}</span></span>`,
    iconSize: [34, 34],
    iconAnchor: [17, 34],
    popupAnchor: [0, -30],
  });
}

function Recenter({ center }: { center: Coordinates }) {
  const map = useMap();
  useEffect(() => { map.setView(center, 14); }, [map, center]);
  return null;
}

export default function LeafletMap({ center, places, locationLabel, bestChainId }: { center: Coordinates; places: NearbySupermarket[]; locationLabel: string; bestChainId: string | null }) {
  return (
    <MapContainer center={center} zoom={14} scrollWheelZoom={false} className="h-full w-full" aria-label="Mappa dei supermercati vicini">
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <Recenter center={center} />
      <Marker position={center} icon={userIcon} title={locationLabel || 'La tua posizione'} zIndexOffset={1000} />
      {places.map(place => (
        <Marker key={place.id} position={place} icon={storeIcon(place, place.chain.id === bestChainId)} title={place.name}>
          <Popup>
            <strong>{place.name}</strong>
            <br />{place.address} · {formatDistance(place.distance)}
            <br />{place.openNow ? 'Aperto ora' : 'Chiuso ora'}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
