import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { SEARCH_RADIUS } from '@/features/shopping/models';

const coordsSchema = z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) });
const placeSchema = z.object({ id: z.string(), displayName: z.object({ text: z.string() }), formattedAddress: z.string().optional(), location: z.object({ latitude: z.number(), longitude: z.number() }), currentOpeningHours: z.object({ openNow: z.boolean().optional() }).optional() });
const GATEWAY = 'https://connector-gateway.lovable.dev/google_maps';

export const nearbySupermarkets = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).inputValidator((data: unknown) => coordsSchema.parse(data)).handler(async ({ data, context }) => {
  const key = process.env['GOOGLE_MAPS_API_KEY'];
  const lovableKey = process.env['LOVABLE_API_KEY'];
  if (!key || !lovableKey) throw new Error('Collega Google Maps per cercare i supermercati.');
  const cacheKey = `nearby:${data.lat.toFixed(4)}:${data.lng.toFixed(4)}`;
  const cached = await context.supabase.from('maps_cache').select('result, expires_at').eq('user_id', context.userId).eq('cache_key', cacheKey).maybeSingle();
  const resultSchema = z.array(z.object({ id: z.string(), name: z.string(), address: z.string(), lat: z.number(), lng: z.number(), openNow: z.boolean().nullable() }));
  if (cached.data && new Date(cached.data.expires_at).getTime() > Date.now()) return resultSchema.parse(cached.data.result);
  const response = await fetch(`${GATEWAY}/places/v1/places:searchNearby`, {
    method: 'POST', headers: { Authorization: `Bearer ${lovableKey}`, 'X-Connection-Api-Key': key, 'Content-Type': 'application/json', 'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.currentOpeningHours.openNow' },
    body: JSON.stringify({ includedTypes: ['supermarket'], maxResultCount: 20, languageCode: 'it', rankPreference: 'DISTANCE', locationRestriction: { circle: { center: { latitude: data.lat, longitude: data.lng }, radius: SEARCH_RADIUS } } }),
  });
  if (!response.ok) {
    const body = await response.text();
    console.error('Google Maps search failed', response.status, body);
    if (response.status === 403) {
      const denial = z.object({ error: z.object({ details: z.array(z.object({ reason: z.string().optional() }).passthrough()).optional() }).passthrough() }).safeParse(JSON.parse(body));
      const reason = denial.success ? denial.data.error.details?.find(detail => detail.reason)?.reason : undefined;
      if (reason === 'API_KEY_HTTP_REFERRER_BLOCKED') throw new Error('La chiave server Google Maps ha restrizioni per siti web. In Google Cloud imposta le restrizioni della chiave server su Nessuna o Indirizzi IP.');
      if (reason === 'API_KEY_SERVICE_BLOCKED') throw new Error('Abilita Places API (New) tra le API consentite della chiave server in Google Cloud.');
      throw new Error('Google Maps ha negato la ricerca (403). Verifica le restrizioni della chiave server in Google Cloud.');
    }
    throw new Error(`Google Maps non riesce a cercare i supermercati (${response.status}). Riprova più tardi.`);
  }
  const parsed = z.object({ places: z.array(placeSchema).optional() }).parse(await response.json());
  const result = (parsed.places ?? []).map(place => ({ id: place.id, name: place.displayName.text, address: place.formattedAddress ?? 'Indirizzo non disponibile', lat: place.location.latitude, lng: place.location.longitude, openNow: place.currentOpeningHours?.openNow ?? null }));
  await context.supabase.from('maps_cache').upsert({ user_id: context.userId, cache_key: cacheKey, result, expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString() });
  return result;
});

export const locateAddress = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).inputValidator((data: unknown) => z.object({ address: z.string().trim().min(2).max(200) }).parse(data)).handler(async ({ data, context }) => {
  const key = process.env['GOOGLE_MAPS_API_KEY'];
  const lovableKey = process.env['LOVABLE_API_KEY'];
  if (!key || !lovableKey) throw new Error('Collega Google Maps per cercare un indirizzo.');
  const cacheKey = `address:${data.address.toLocaleLowerCase('it')}`;
  const resultSchema = coordsSchema.extend({ label: z.string() });
  const cached = await context.supabase.from('maps_cache').select('result, expires_at').eq('user_id', context.userId).eq('cache_key', cacheKey).maybeSingle();
  if (cached.data && new Date(cached.data.expires_at).getTime() > Date.now()) return resultSchema.parse(cached.data.result);
  const response = await fetch(`${GATEWAY}/maps/api/geocode/json?address=${encodeURIComponent(data.address)}&language=it&region=it`, { headers: { Authorization: `Bearer ${lovableKey}`, 'X-Connection-Api-Key': key } });
  if (!response.ok) {
    const body = await response.text(); console.error('Google geocode failed', response.status, body);
    if (response.status === 403) {
      if (body.includes('API_KEY_HTTP_REFERRER_BLOCKED')) throw new Error('La chiave server Google Maps ha restrizioni per siti web. In Google Cloud imposta le restrizioni su Nessuna o Indirizzi IP.');
      if (body.includes('API_KEY_SERVICE_BLOCKED')) throw new Error('Abilita Geocoding API tra le API consentite della chiave server in Google Cloud.');
      throw new Error('Google Maps ha negato la ricerca (403). Verifica le restrizioni della chiave server.');
    }
    throw new Error(`Indirizzo non disponibile (${response.status}). Riprova più tardi.`);
  }
  const parsed = z.object({ status: z.string(), results: z.array(z.object({ formatted_address: z.string(), geometry: z.object({ location: coordsSchema }) })) }).parse(await response.json());
  if (parsed.status === 'ZERO_RESULTS') throw new Error('Non trovo questo indirizzo. Prova ad aggiungere città e numero civico.');
  if (parsed.status !== 'OK') throw new Error(`Google Maps non può cercare l’indirizzo (${parsed.status}). Verifica il collegamento e le API abilitate.`);
  const first = parsed.results[0];
  if (!first) throw new Error('Indirizzo non trovato.');
  const result = { ...first.geometry.location, label: first.formatted_address };
  await context.supabase.from('maps_cache').upsert({ user_id: context.userId, cache_key: cacheKey, result, expires_at: new Date(Date.now() + 86400000).toISOString() });
  return result;
});