import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { ShoppingItem } from './models';
import { extractShoppingList } from './extract';
import { locateByIp, reverseGeocode, searchAddress as geocodeAddress, type Located } from './geo';
import { distanceMeters, nearbyStores, type Store, type StoresResult } from './places';
import { planShopping, type ShoppingPlan } from './pricing';

// Stato condiviso tra le pagine: testo, lista, posizione automatica, negozi vicini e piano di spesa.
// La lista resta in memoria; nel browser si salva solo l'ultima posizione, per ripartire subito da lì.
type ShoppingState = {
  text: string;
  setText: (text: string) => void;
  items: ShoppingItem[];
  setItems: (items: ShoppingItem[]) => void;
  addFromText: () => number;
  location: Located | null;
  locating: boolean;
  locationError: string;
  locate: () => void;
  searchAddress: (address: string) => Promise<void>;
  stores: Store[] | null;
  storesSource: StoresResult['source'] | null;
  storesLoading: boolean;
  plan: ShoppingPlan;
};

const ShoppingContext = createContext<ShoppingState | null>(null);
const STORAGE_KEY = 'shopt:posizione';
const GOOD_ACCURACY = 25; // metri: oltre questa precisione il GPS continua ad affinare
const WATCH_LIMIT = 30000;
const REFETCH_DISTANCE = 300;
const RELABEL_DISTANCE = 80;

export function ShoppingProvider({ children }: { children: ReactNode }) {
  const [text, setText] = useState('');
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [location, setLocation] = useState<Located | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [storesResult, setStoresResult] = useState<StoresResult & { center: Located } | null>(null);
  const [storesLoading, setStoresLoading] = useState(false);
  const locationRef = useRef<Located | null>(null);
  const watchId = useRef<number | null>(null);
  const watchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const manual = useRef(false);
  const labelled = useRef<Located | null>(null);
  const storesRequest = useRef<{ center: Located; controller: AbortController } | null>(null);

  const apply = (next: Located) => {
    locationRef.current = next;
    setLocation(next);
    if (next.source === 'gps' || next.source === 'manual') {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ lat: next.lat, lng: next.lng, accuracy: next.accuracy, label: next.label })); } catch { /* posizione non salvata */ }
    }
  };

  const stopWatch = () => {
    if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
    if (watchTimer.current) clearTimeout(watchTimer.current);
    watchId.current = null; watchTimer.current = null;
  };

  const ipFallback = async () => {
    if (locationRef.current) return;
    const estimate = await locateByIp();
    if (locationRef.current) return;
    if (estimate) apply(estimate);
    else setLocationError('Non riesco a stabilire la posizione. Scrivi un indirizzo o una città.');
  };

  const locate = () => {
    if (!('geolocation' in navigator)) { setLocationError('Il browser non dà accesso alla posizione: uso una stima dalla rete.'); void ipFallback(); return; }
    stopWatch();
    manual.current = false;
    setLocating(true); setLocationError('');
    let best: number | null = null;
    const finish = () => { stopWatch(); setLocating(false); };
    // watchPosition invece di getCurrentPosition: la prima lettura arriva presto (spesso dal Wi-Fi),
    // le successive dal GPS sono più precise. Tengo solo quelle che migliorano la precisione.
    watchId.current = navigator.geolocation.watchPosition(position => {
      const { latitude: lat, longitude: lng, accuracy } = position.coords;
      if (best !== null && accuracy >= best) return;
      best = accuracy;
      if (manual.current) return;
      apply({ lat, lng, accuracy, source: 'gps', label: locationRef.current?.source === 'gps' ? locationRef.current.label : 'La tua posizione' });
      if (accuracy <= GOOD_ACCURACY) finish();
    }, error => {
      if (best !== null) { finish(); return; }
      finish();
      setLocationError(error.code === error.PERMISSION_DENIED
        ? 'Permesso posizione negato: uso una stima dalla rete. Puoi riattivarlo nelle impostazioni del sito o scrivere un indirizzo.'
        : 'GPS non disponibile: uso una stima dalla rete.');
      void ipFallback();
    }, { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 });
    watchTimer.current = setTimeout(() => { finish(); if (best === null) void ipFallback(); }, WATCH_LIMIT);
  };

  const searchAddress = async (address: string) => {
    if (!address.trim()) return;
    manual.current = true;
    stopWatch();
    setLocating(true); setLocationError('');
    try { apply(await geocodeAddress(address)); }
    catch (error) { setLocationError(error instanceof Error ? error.message : 'Indirizzo non trovato.'); }
    finally { setLocating(false); }
  };

  // Posizione automatica all'apertura: ultima posizione salvata, stima da IP mentre si aspetta il GPS, poi GPS
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as { lat: number; lng: number; accuracy: number | null; label: string } | null;
      if (saved && Number.isFinite(saved.lat) && Number.isFinite(saved.lng)) apply({ ...saved, source: 'saved' });
    } catch { /* nessuna posizione salvata */ }
    if (!locationRef.current) void locateByIp().then(estimate => { if (estimate && !locationRef.current) apply(estimate); });
    void (async () => {
      try {
        const status = await navigator.permissions?.query({ name: 'geolocation' });
        if (status?.state === 'denied') { setLocationError('La posizione è bloccata per questo sito: uso una stima dalla rete. Puoi riattivarla nelle impostazioni del browser.'); void ipFallback(); return; }
      } catch { /* Permissions API non disponibile: provo comunque */ }
      locate();
    })();
    return stopWatch;
  }, []);

  // Nome della via per la posizione GPS (Nominatim), solo quando ci si sposta davvero
  useEffect(() => {
    if (!location || location.source !== 'gps') return;
    if (labelled.current && distanceMeters(labelled.current, location) < RELABEL_DISTANCE) return;
    const timer = setTimeout(() => {
      labelled.current = location;
      void reverseGeocode(location).then(label => {
        if (!label) return;
        const current = locationRef.current;
        if (current && current.source === 'gps' && distanceMeters(current, location) < RELABEL_DISTANCE) apply({ ...current, label });
      });
    }, 1200);
    return () => clearTimeout(timer);
  }, [location]);

  // Negozi vicini: ricaricati solo se ci si sposta di più di REFETCH_DISTANCE dall'ultima ricerca
  // (anche se è ancora in corso), così le piccole correzioni del GPS non rifanno la richiesta
  useEffect(() => {
    if (!location) return;
    const reference = storesRequest.current?.center ?? storesResult?.center;
    if (reference && distanceMeters(reference, location) < REFETCH_DISTANCE) return;
    storesRequest.current?.controller.abort();
    const controller = new AbortController();
    storesRequest.current = { center: location, controller };
    setStoresLoading(true);
    const show = (result: StoresResult) => { if (!controller.signal.aborted) setStoresResult({ ...result, center: location }); };
    void nearbyStores(location, controller.signal, show)
      .then(show)
      .catch(() => { /* richiesta superata da una posizione più recente */ })
      .finally(() => {
        if (storesRequest.current?.controller !== controller) return;
        storesRequest.current = null;
        setStoresLoading(false);
      });
  }, [location]);
  useEffect(() => () => storesRequest.current?.controller.abort(), []);

  // Distanze sempre rispetto alla posizione attuale
  const stores = useMemo(() => {
    if (!storesResult || !location) return null;
    return storesResult.stores.map(store => ({ ...store, distance: Math.round(distanceMeters(location, store)) })).sort((a, b) => a.distance - b.distance);
  }, [storesResult, location]);

  const plan = useMemo(() => planShopping(items, stores), [items, stores]);

  const addFromText = () => {
    const extracted = extractShoppingList(text);
    const known = new Set(items.map(item => item.name.toLocaleLowerCase('it')));
    const fresh = extracted.filter(item => !known.has(item.name.toLocaleLowerCase('it')));
    if (extracted.length) { setItems([...items, ...fresh]); setText(''); }
    return extracted.length;
  };

  return (
    <ShoppingContext.Provider value={{ text, setText, items, setItems, addFromText, location, locating, locationError, locate, searchAddress, stores, storesSource: storesResult?.source ?? null, storesLoading, plan }}>
      {children}
    </ShoppingContext.Provider>
  );
}

export function useShopping() {
  const context = useContext(ShoppingContext);
  if (!context) throw new Error('useShopping va usato dentro ShoppingProvider');
  return context;
}
