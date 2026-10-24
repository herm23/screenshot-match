import { useEffect, useRef, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { estimateIpLocation } from '@/lib/location.functions';
import { locateAddress, nearbySupermarkets, reverseLocation } from '@/lib/maps.functions';
import { GEOLOCATION_OPTIONS, LOCATION_STORAGE_KEY, locationRecordSchema, type LocationRecord, type Supermarket } from '@/features/shopping/models';

export function useShoppingLocation(userId: string | undefined) {
  const estimate = useServerFn(estimateIpLocation);
  const nearby = useServerFn(nearbySupermarkets);
  const geocode = useServerFn(locateAddress);
  const reverse = useServerFn(reverseLocation);
  const [selected, setSelected] = useState<LocationRecord | null>(null);
  const [permission, setPermission] = useState<PermissionState | 'unsupported'>('unsupported');
  const [places, setPlaces] = useState<Supermarket[]>([]);
  const [loading, setLoading] = useState(false);
  const [estimating, setEstimating] = useState(true);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState('');
  const [locationError, setLocationError] = useState('');
  const [correctionOpen, setCorrectionOpen] = useState(false);
  const choiceVersion = useRef(0);
  const nearbyVersion = useRef(0);
  const identity = useRef(userId);
  const current = useRef<LocationRecord | null>(null);
  const alive = useRef(true);
  const freshPrecise = useRef(false);
  const locationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ipPromise = useRef<ReturnType<typeof estimate> | null>(null);
  identity.current = userId;

  const commit = (record: LocationRecord) => {
    if (!alive.current) return;
    current.current = record; setSelected(record); setEstimating(false);
    try { localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(record)); } catch { /* Storage may be disabled. */ }
  };
  const ipFallback = async (version: number) => {
    if (!ipPromise.current) ipPromise.current = estimate();
    try {
      const result = await ipPromise.current;
      if (!alive.current || version !== choiceVersion.current || current.current?.source === 'manual' || freshPrecise.current) return;
      if (result.location) commit({ lat: result.location.lat, lng: result.location.lng, label: result.location.city, source: 'ip' });
      else if (!current.current) setCorrectionOpen(true);
    } catch { if (alive.current && version === choiceVersion.current && !current.current) setCorrectionOpen(true); }
    finally { if (alive.current && version === choiceVersion.current) setEstimating(false); }
  };
  const precise = (version: number) => {
    if (permission === 'denied') { setCorrectionOpen(true); return; }
    if (!navigator.geolocation) { setLocationError('La posizione non è disponibile in questo browser. Usa la città o l’indirizzo.'); void ipFallback(version); return; }
    setLocating(true);
    let finished = false;
    const failure = (reason: { code: number }) => {
      if (finished || !alive.current || version !== choiceVersion.current) return;
      finished = true;
      if (locationTimer.current) clearTimeout(locationTimer.current);
      setLocating(false);
      if (reason.code === 1) { setPermission('denied'); setCorrectionOpen(true); setLocationError('Permesso posizione negato. Puoi riattivarlo nelle impostazioni del browser, nei permessi di questo sito.'); }
      else if (reason.code === 2) setLocationError('Posizione non disponibile. Uso la stima da IP; puoi inserire città o indirizzo.');
      else setLocationError('Tempo scaduto dopo 10 secondi. Uso la stima da IP; puoi inserire città o indirizzo.');
      if (current.current?.source === 'precise') current.current = null;
      void ipFallback(version);
    };
    // Browsers may exclude time spent in the permission prompt from their timeout.
    if (locationTimer.current) clearTimeout(locationTimer.current);
    locationTimer.current = setTimeout(() => failure({ code: 3 }), GEOLOCATION_OPTIONS.timeout);
    navigator.geolocation.getCurrentPosition(position => {
      if (finished) return;
      finished = true;
      if (locationTimer.current) clearTimeout(locationTimer.current);
      if (!alive.current || version !== choiceVersion.current) return;
      setPermission('granted'); setLocating(false);
      const approximate = position.coords.accuracy > 1000;
      freshPrecise.current = !approximate;
      commit({ lat: position.coords.latitude, lng: position.coords.longitude, label: `${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`, source: approximate ? 'approximate' : 'precise', accuracy: position.coords.accuracy });
      setCorrectionOpen(approximate);
      setLocationError(approximate ? 'La posizione ha un margine superiore a 1 km. Correggila con città o indirizzo.' : '');
    }, failure, GEOLOCATION_OPTIONS);
  };

  useEffect(() => {
    alive.current = true;
    const version = choiceVersion.current;
    let status: PermissionStatus | undefined;
    let listener: (() => void) | undefined;
    try {
      const saved = localStorage.getItem(LOCATION_STORAGE_KEY);
      const parsed = locationRecordSchema.safeParse(saved ? JSON.parse(saved) : null);
      if (parsed.success) commit(parsed.data);
    } catch { /* Ignore corrupt or inaccessible storage. */ }
    if (current.current?.source !== 'manual') void ipFallback(version);
    const check = async () => {
      try {
        if (!navigator.permissions?.query) throw new Error('unsupported');
        status = await navigator.permissions.query({ name: 'geolocation' });
        if (!alive.current || version !== choiceVersion.current) return;
        setPermission(status.state);
        const handle = () => {
          if (!status || !alive.current) return;
          setPermission(status.state);
          if (status.state === 'denied') { setCorrectionOpen(true); setLocationError('Posizione bloccata. Per riattivarla, apri le impostazioni del browser e i permessi di questo sito.'); }
        };
        listener = handle; status.addEventListener?.('change', handle);
        if (status.state === 'denied') handle();
        if (status.state === 'granted' && current.current?.source !== 'manual') precise(version);
      } catch { if (alive.current) setPermission('unsupported'); }
      finally { if (alive.current && current.current) setEstimating(false); }
    };
    void check();
    return () => { alive.current = false; if (locationTimer.current) clearTimeout(locationTimer.current); if (status && listener) status.removeEventListener?.('change', listener); };
  }, [estimate]);

  // Label lookup cannot replace coordinates or overwrite a newer choice.
  useEffect(() => {
    if (!selected || !userId || (selected.source !== 'precise' && selected.source !== 'approximate')) return;
    let active = true;
    void reverse({ data: { lat: selected.lat, lng: selected.lng } }).then(result => {
      if (active && current.current === selected) commit({ ...selected, label: result.label });
    }).catch(() => { if (active) setLocationError('Nome della zona non disponibile. Uso comunque le coordinate ricevute.'); });
    return () => { active = false; };
  }, [selected?.lat, selected?.lng, selected?.source, userId, reverse]);

  useEffect(() => {
    const version = ++nearbyVersion.current;
    setPlaces([]); setError('');
    if (!selected || !userId) { setLoading(false); return; }
    setLoading(true);
    void nearby({ data: { lat: selected.lat, lng: selected.lng } }).then(result => { if (version === nearbyVersion.current) setPlaces(result); })
      .catch(reason => { if (version === nearbyVersion.current) setError(reason instanceof Error ? reason.message : 'Non riesco a cercare i supermercati. Riprova.'); })
      .finally(() => { if (version === nearbyVersion.current) setLoading(false); });
    return () => { nearbyVersion.current += 1; };
  }, [selected?.lat, selected?.lng, userId, nearby]);

  const askLocation = () => {
    if (permission === 'denied') { setCorrectionOpen(true); return; }
    freshPrecise.current = false;
    setLocationError(''); precise(++choiceVersion.current);
  };
  const searchAddress = async (address: string) => {
    if (!userId || !address.trim()) return;
    const account = userId;
    const version = ++choiceVersion.current;
    setLocating(false); setLoading(true); setLocationError('');
    try {
      const position = await geocode({ data: { address } });
      if (alive.current && version === choiceVersion.current && account === identity.current) { commit({ lat: position.lat, lng: position.lng, label: position.label, source: 'manual' }); setCorrectionOpen(false); }
    } catch (reason) { if (alive.current && version === choiceVersion.current && account === identity.current) { setLocationError(reason instanceof Error ? reason.message : 'Indirizzo non disponibile.'); setCorrectionOpen(true); } }
    finally { if (alive.current && version === choiceVersion.current) setLoading(false); }
  };
  const sourceLabel = selected?.source === 'manual' ? 'Manuale' : selected?.source === 'precise' ? 'Precisa' : selected?.source === 'ip' ? 'Stimata da IP' : selected ? 'Stimata dal browser' : '';
  return { center: selected ? { lat: selected.lat, lng: selected.lng } : null, locationLabel: selected ? `Posizione: ${selected.label}` : '', sourceLabel, estimated: selected?.source === 'ip' || selected?.source === 'approximate', permission, showPrecisionPrompt: permission === 'prompt' || permission === 'unsupported', places, loading, locating, estimating, error, locationError, correctionOpen, setCorrectionOpen, askLocation, searchAddress };
}
