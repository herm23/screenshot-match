// Negozi vicini: quelli veri da OpenStreetMap, cercati per categoria con Nominatim (gratuito e senza chiave).
// Nominatim chiede al massimo una richiesta al secondo, quindi le ricerche partono in sequenza e i
// supermercati arrivano per primi. I tipi di negozio che non vengono trovati sono completati con
// negozi dimostrativi intorno alla posizione.
import { CHAINS, chainForName, type Chain, type StoreType } from './catalog';
import { SEARCH_RADIUS, type Coordinates } from './models';

export type Store = { id: string; chain: Chain; name: string; address: string; lat: number; lng: number; distance: number; source: 'osm' | 'demo' };
export type StoresResult = { stores: Store[]; source: 'osm' | 'mixed' | 'demo'; complete: boolean };

const NOMINATIM = 'https://nominatim.openstreetmap.org/search';
// Raggio di ricerca per tipo di negozio: i supermercati devono essere vicini, gli altri possono essere più lontani
const RADIUS: Record<StoreType, number> = { supermercato: SEARCH_RADIUS, drogheria: 4000, elettronica: 10000, faidate: 10000 };
const SEARCHES: { query: string; type: StoreType }[] = [
  { query: 'supermarket', type: 'supermercato' },
  { query: 'chemist', type: 'drogheria' },
  { query: 'electronics shop', type: 'elettronica' },
  { query: 'Leroy Merlin', type: 'faidate' },
  { query: 'Bricocenter', type: 'faidate' },
];
const STORE_TYPES: StoreType[] = ['supermercato', 'drogheria', 'elettronica', 'faidate'];
const MAX_PER_CHAIN = 3;

export function distanceMeters(a: Coordinates, b: Coordinates) {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

type NominatimPlace = { osm_type: string; osm_id: number; lat: string; lon: string; name?: string; extratags?: Record<string, string> | null; address?: Record<string, string> };

async function searchShops(center: Coordinates, { query, type }: { query: string; type: StoreType }, signal: AbortSignal): Promise<Store[]> {
  const dLat = RADIUS[type] / 111320;
  const dLng = RADIUS[type] / (111320 * Math.cos(center.lat * Math.PI / 180));
  const viewbox = [center.lng - dLng, center.lat + dLat, center.lng + dLng, center.lat - dLat].join(',');
  const url = `${NOMINATIM}?format=jsonv2&q=${encodeURIComponent(query)}&viewbox=${viewbox}&bounded=1&limit=50&extratags=1&addressdetails=1&accept-language=it`;
  const response = await fetch(url, { signal: AbortSignal.any([signal, AbortSignal.timeout(8000)]), headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`Nominatim ${response.status}`);
  const places = await response.json() as NominatimPlace[];
  return places.flatMap(place => {
    const chain = chainForName(place.extratags?.['brand']) ?? chainForName(place.name);
    const lat = Number(place.lat), lng = Number(place.lon);
    if (!chain || !Number.isFinite(lat) || !Number.isFinite(lng)) return [];
    const distance = Math.round(distanceMeters(center, { lat, lng }));
    if (distance > RADIUS[chain.type]) return [];
    const street = [place.address?.['road'], place.address?.['house_number']].filter(Boolean).join(' ');
    return [{ id: `osm-${place.osm_type}-${place.osm_id}`, chain, name: place.name || chain.name, address: street || place.address?.['suburb'] || 'Indirizzo non indicato', lat, lng, distance, source: 'osm' as const }];
  });
}

const STREETS = ['Via Roma', 'Via Garibaldi', 'Via Mazzini', 'Corso Italia', 'Via Verdi', 'Viale Europa', 'Via Dante', 'Via Marconi', 'Via Matteotti', 'Viale della Repubblica'];
// Spostamenti in metri (nord, est) dalla posizione per i negozi dimostrativi
const DEMO_LAYOUT: Record<StoreType, { chains: string[]; offsets: [number, number][] }> = {
  supermercato: { chains: ['conad', 'coop', 'lidl', 'esselunga', 'eurospin', 'carrefour', 'md', 'pam'], offsets: [[220, -340], [-480, 260], [760, 610], [-150, -890], [1120, -260], [-920, -700], [450, 1350], [-1300, 520]] },
  drogheria: { chains: ['tigota', 'acquaesapone'], offsets: [[900, 1500], [-1700, -600]] },
  elettronica: { chains: ['mediaworld', 'unieuro', 'euronics'], offsets: [[3200, -2100], [-2600, 3400], [4100, 2800]] },
  faidate: { chains: ['leroymerlin', 'bricoio', 'obi'], offsets: [[-3900, -2500], [2300, 4200], [5200, -900]] },
};

export function demoStores(center: Coordinates, types: StoreType[] = STORE_TYPES): Store[] {
  let street = 0;
  return types.flatMap(type => DEMO_LAYOUT[type].offsets.map(([north, east], index) => {
    const chain = CHAINS.find(candidate => candidate.id === DEMO_LAYOUT[type].chains[index % DEMO_LAYOUT[type].chains.length])!;
    const position = { lat: center.lat + north / 111320, lng: center.lng + east / (111320 * Math.cos(center.lat * Math.PI / 180)) };
    const name = STREETS[street++ % STREETS.length]!;
    return { id: `demo-${chain.id}-${index}`, chain, name: chain.name, address: `${name} ${((index + 3) * 17) % 120 + 1}`, ...position, distance: Math.round(distanceMeters(center, position)), source: 'demo' as const };
  }));
}

function keepNearest(stores: Store[]) {
  const seen = new Set<string>();
  const perChain = new Map<string, number>();
  return stores.sort((a, b) => a.distance - b.distance).filter(store => {
    if (seen.has(store.id)) return false;
    seen.add(store.id);
    const count = perChain.get(store.chain.id) ?? 0;
    perChain.set(store.chain.id, count + 1);
    return count < MAX_PER_CHAIN;
  });
}

const wait = (ms: number, signal: AbortSignal) => new Promise<void>((resolve, reject) => {
  const timer = setTimeout(resolve, ms);
  signal.addEventListener('abort', () => { clearTimeout(timer); reject(signal.reason); }, { once: true });
});

/** Negozi delle catene note intorno alla posizione, dal più vicino. onProgress riceve i risultati parziali. */
export async function nearbyStores(center: Coordinates, signal: AbortSignal, onProgress?: (result: StoresResult) => void, gap = 1100): Promise<StoresResult> {
  let found: Store[] = [];
  for (const [index, search] of SEARCHES.entries()) {
    if (index > 0) await wait(gap, signal);
    try { found = keepNearest([...found, ...await searchShops(center, search, signal)]); }
    catch (error) { if (signal.aborted) throw error; }
    if (found.length) onProgress?.({ stores: found, source: 'osm', complete: false });
  }
  const missing = STORE_TYPES.filter(type => !found.some(store => store.chain.type === type));
  if (!missing.length) return { stores: found, source: 'osm', complete: true };
  return { stores: keepNearest([...found, ...demoStores(center, missing)]), source: found.length ? 'mixed' : 'demo', complete: true };
}
