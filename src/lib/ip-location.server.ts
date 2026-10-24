import { z } from 'zod';
import { estimatedLocationSchema, type EstimatedLocation } from '@/features/shopping/models';

export function publicVisitorIp(value: string | undefined): string | null {
  const ip = value?.split(',')[0]?.trim();
  if (!ip || !z.string().ip().safeParse(ip).success) return null;
  if (ip.includes(':')) return /^[23]/.test(ip) && !ip.toLowerCase().startsWith('2001:db8:') ? ip : null;
  const [a = 0, b = 0] = ip.split('.').map(Number);
  if (a === 0 || a === 10 || a === 127 || a >= 224 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127)) return null;
  return ip;
}

export async function lookupVisitorLocation(ip: string, request: typeof fetch = fetch): Promise<EstimatedLocation | null> {
  if (!publicVisitorIp(ip)) return null;
  try {
    const response = await request(`https://ipwho.is/${encodeURIComponent(ip)}`, { signal: AbortSignal.timeout(5000), headers: { Accept: 'application/json' } });
    if (!response.ok) return null;
    const payload = z.object({ success: z.literal(true), latitude: z.number(), longitude: z.number(), city: z.string(), region: z.string().optional() }).safeParse(await response.json());
    if (!payload.success) return null;
    const result = estimatedLocationSchema.safeParse({ lat: payload.data.latitude, lng: payload.data.longitude, city: payload.data.city, region: payload.data.region ?? '' });
    return result.success ? result.data : null;
  } catch { return null; }
}