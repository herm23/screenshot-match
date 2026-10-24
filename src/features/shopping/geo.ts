// Servizi di posizione gratuiti e senza chiave, chiamati dal browser:
// - stima da IP (GeoJS, poi ipapi.co): precisione a livello di città, solo come ripiego
// - Nominatim di OpenStreetMap: nome della via e ricerca di indirizzi
import type { Coordinates } from './models';

export type Located = Coordinates & { accuracy: number | null; source: 'gps' | 'ip' | 'manual' | 'saved'; label: string };

const NOMINATIM = 'https://nominatim.openstreetmap.org';
const TIMEOUT = 8000;

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT), headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`${response.status}`);
  return response.json() as Promise<T>;
}

export async function locateByIp(): Promise<Located | null> {
  try {
    const geo = await getJson<{ latitude: string; longitude: string; city?: string }>('https://get.geojs.io/v1/ip/geo.json');
    const lat = Number(geo.latitude), lng = Number(geo.longitude);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng, accuracy: 5000, source: 'ip', label: geo.city ? `Zona di ${geo.city}` : 'Posizione approssimata' };
  } catch { /* provo il servizio successivo */ }
  try {
    const geo = await getJson<{ latitude: number; longitude: number; city?: string }>('https://ipapi.co/json/');
    if (Number.isFinite(geo.latitude)) return { lat: geo.latitude, lng: geo.longitude, accuracy: 5000, source: 'ip', label: geo.city ? `Zona di ${geo.city}` : 'Posizione approssimata' };
  } catch { /* nessuna stima disponibile */ }
  return null;
}

type NominatimAddress = { road?: string; pedestrian?: string; house_number?: string; suburb?: string; city?: string; town?: string; village?: string };

function addressLabel(address: NominatimAddress | undefined, fallback: string) {
  if (!address) return fallback;
  const street = [address.road ?? address.pedestrian, address.house_number].filter(Boolean).join(' ');
  const city = address.city ?? address.town ?? address.village;
  return [street || address.suburb, city].filter(Boolean).join(', ') || fallback;
}

/** Nome della via per delle coordinate, oppure null. */
export async function reverseGeocode({ lat, lng }: Coordinates): Promise<string | null> {
  try {
    const result = await getJson<{ address?: NominatimAddress }>(`${NOMINATIM}/reverse?format=jsonv2&zoom=18&accept-language=it&lat=${lat}&lon=${lng}`);
    return addressLabel(result.address, '') || null;
  } catch { return null; }
}

const CITIES: Record<string, Coordinates> = {
  bologna: { lat: 44.4949, lng: 11.3426 }, milano: { lat: 45.4642, lng: 9.19 }, roma: { lat: 41.9028, lng: 12.4964 },
  torino: { lat: 45.0703, lng: 7.6869 }, napoli: { lat: 40.8518, lng: 14.2681 }, firenze: { lat: 43.7696, lng: 11.2558 },
  padova: { lat: 45.4064, lng: 11.8768 }, pisa: { lat: 43.7228, lng: 10.4017 }, genova: { lat: 44.4056, lng: 8.9463 },
  venezia: { lat: 45.4408, lng: 12.3155 }, bari: { lat: 41.1171, lng: 16.8719 }, palermo: { lat: 38.1157, lng: 13.3615 },
};

/** Cerca un indirizzo in Italia; se Nominatim non risponde riconosce almeno le città principali. */
export async function searchAddress(query: string): Promise<Located> {
  try {
    const [first] = await getJson<{ lat: string; lon: string; address?: NominatimAddress; display_name: string }[]>(`${NOMINATIM}/search?format=jsonv2&addressdetails=1&limit=1&countrycodes=it&accept-language=it&q=${encodeURIComponent(query)}`);
    if (first) return { lat: Number(first.lat), lng: Number(first.lon), accuracy: null, source: 'manual', label: addressLabel(first.address, query.trim()) };
  } catch { /* uso l'elenco locale */ }
  const text = query.toLocaleLowerCase('it');
  const city = Object.keys(CITIES).find(name => text.includes(name));
  if (!city) throw new Error('Non trovo questo indirizzo. Prova ad aggiungere la città, ad esempio "Via Zamboni 33, Bologna".');
  return { ...CITIES[city]!, accuracy: null, source: 'manual', label: query.trim() };
}
