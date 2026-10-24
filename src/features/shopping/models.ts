import { z } from 'zod';

export const SEARCH_RADIUS = 2000;
export const extractedItemSchema = z.object({ name: z.string().trim().min(1).max(120), quantity: z.string().max(80).nullable(), category: z.string().max(80).nullable() });
export const itemSchema = extractedItemSchema.extend({ id: z.string().uuid(), checked: z.boolean() });
export const itemsSchema = z.array(itemSchema).max(100);
export type ShoppingItem = z.infer<typeof itemSchema>;
export type Coordinates = { lat: number; lng: number };
export const estimatedLocationSchema = z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180), city: z.string().trim().min(1).max(200), region: z.string().max(200) });
export type EstimatedLocation = z.infer<typeof estimatedLocationSchema>;
export type IpLocationResult = { location: EstimatedLocation | null };
export const locationRecordSchema = z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180), label: z.string().min(1).max(300), source: z.enum(['manual', 'precise', 'ip', 'approximate']), accuracy: z.number().nonnegative().optional() });
export type LocationRecord = z.infer<typeof locationRecordSchema>;
export const LOCATION_STORAGE_KEY = 'easy-shop:last-location';
export const GEOLOCATION_OPTIONS = { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 };
export type Supermarket = { id: string; name: string; address: string; lat: number; lng: number; openNow: boolean | null };
export function appendTranscript(base: string, transcript: string) {
  return [base.trimEnd(), transcript.trim()].filter(Boolean).join(' ');
}