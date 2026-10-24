import { useEffect, useRef, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { estimateIpLocation } from '@/lib/location.functions';
import { locateAddress, nearbySupermarkets } from '@/lib/maps.functions';
import type { Coordinates, Supermarket } from '@/features/shopping/models';

export function useShoppingLocation(userId: string | undefined) {
  const estimate = useServerFn(estimateIpLocation);
  const nearby = useServerFn(nearbySupermarkets);
  const geocode = useServerFn(locateAddress);
  const [center, setCenter] = useState<Coordinates | null>(null);
  const [locationLabel, setLocationLabel] = useState('');
  const [estimated, setEstimated] = useState(false);
  const [places, setPlaces] = useState<Supermarket[]>([]);
  const [loading, setLoading] = useState(false);
  const [estimating, setEstimating] = useState(true);
  const [error, setError] = useState('');
  const [correctionOpen, setCorrectionOpen] = useState(false);
  const choiceVersion = useRef(0);
  const nearbyVersion = useRef(0);
  const identity = useRef(userId);
  identity.current = userId;

  useEffect(() => {
    let active = true;
    const version = choiceVersion.current;
    void estimate().then(result => {
      if (!active || version !== choiceVersion.current) return;
      if (result.location) {
        setCenter({ lat: result.location.lat, lng: result.location.lng });
        setLocationLabel(`Posizione stimata: ${result.location.city}`); setEstimated(true);
      } else setCorrectionOpen(true);
    }).catch(() => { if (active && version === choiceVersion.current) setCorrectionOpen(true); })
      .finally(() => { if (active) setEstimating(false); });
    return () => { active = false; };
  }, [estimate]);

  useEffect(() => {
    const version = ++nearbyVersion.current;
    setPlaces([]); setError('');
    if (!center || !userId) { setLoading(false); return; }
    setLoading(true);
    void nearby({ data: center }).then(result => { if (version === nearbyVersion.current) setPlaces(result); })
      .catch(reason => { if (version === nearbyVersion.current) setError(reason instanceof Error ? reason.message : 'Non riesco a cercare i supermercati. Riprova.'); })
      .finally(() => { if (version === nearbyVersion.current) setLoading(false); });
    return () => { nearbyVersion.current += 1; };
  }, [center, userId, nearby]);

  const beginCorrection = () => {
    const version = ++choiceVersion.current;
    nearbyVersion.current += 1;
    setError(''); setLoading(true); setEstimating(false);
    return version;
  };
  const selectPosition = (position: Coordinates, label: string, version: number) => {
    if (version !== choiceVersion.current) return;
    setCenter(position); setLocationLabel(label); setEstimated(false); setLoading(false); setCorrectionOpen(false);
  };
  const askLocation = () => {
    const version = beginCorrection();
    if (!('geolocation' in navigator)) { setLoading(false); setCorrectionOpen(true); setError('La posizione non è disponibile in questo browser. Inserisci una città o un indirizzo.'); return; }
    navigator.geolocation.getCurrentPosition(
      position => selectPosition({ lat: position.coords.latitude, lng: position.coords.longitude }, 'La tua posizione', version),
      reason => { if (version === choiceVersion.current) { setLoading(false); setCorrectionOpen(true); setError(reason.code === 1 ? 'Permesso posizione negato. Inserisci una città o un indirizzo.' : 'Non riesco a trovare la tua posizione. Inserisci una città o un indirizzo.'); } },
      { timeout: 12000, maximumAge: 60000 },
    );
  };
  const searchAddress = async (address: string) => {
    if (!userId || !address.trim()) return;
    const account = userId;
    const version = beginCorrection();
    try {
      const position = await geocode({ data: { address } });
      if (account === identity.current) selectPosition({ lat: position.lat, lng: position.lng }, position.label, version);
    } catch (reason) { if (version === choiceVersion.current && account === identity.current) { setError(reason instanceof Error ? reason.message : 'Indirizzo non disponibile.'); setLoading(false); setCorrectionOpen(true); } }
  };
  return { center, locationLabel, estimated, places, loading, estimating, error, correctionOpen, setCorrectionOpen, askLocation, searchAddress };
}