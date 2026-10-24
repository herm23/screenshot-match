import { z } from 'zod';

export const SEARCH_RADIUS = 2000;
export const extractedItemSchema = z.object({ name: z.string().trim().min(1).max(120), quantity: z.string().max(80).nullable(), category: z.string().max(80).nullable() });
export const itemSchema = extractedItemSchema.extend({ id: z.string().uuid(), checked: z.boolean() });
export const itemsSchema = z.array(itemSchema).max(100);
export type ShoppingItem = z.infer<typeof itemSchema>;
export type Coordinates = { lat: number; lng: number };
export type Supermarket = { id: string; name: string; address: string; lat: number; lng: number; openNow: boolean | null };
export function appendTranscript(base: string, transcript: string) {
  return [base.trimEnd(), transcript.trim()].filter(Boolean).join(' ');
}