import { createServerFn } from '@tanstack/react-start';
import { getRequestHeader, getRequestUrl, setResponseHeader, useSession } from '@tanstack/react-start/server';
import { estimatedLocationSchema, type IpLocationResult } from '@/features/shopping/models';
import { lookupVisitorLocation, publicVisitorIp } from './ip-location.server';

// Public city lookup only; Google Maps requests remain authenticated.
export const estimateIpLocation = createServerFn({ method: 'POST' }).handler(async (): Promise<IpLocationResult> => {
  setResponseHeader('Cache-Control', 'private, no-store');
  const password = process.env['LOCATION_SESSION_SECRET'];
  if (!password) return { location: null };
  try {
    const session = await useSession<{ location?: IpLocationResult['location']; attempted?: boolean }>({
      name: 'easy-shop-location', password,
      cookie: { httpOnly: true, secure: getRequestUrl().protocol === 'https:', sameSite: 'lax', path: '/' },
    });
    if (session.data.attempted) {
      const cached = estimatedLocationSchema.safeParse(session.data.location);
      return { location: cached.success ? cached.data : null };
    }
    // Never use the service's implicit caller IP: it would locate the server.
    const ip = publicVisitorIp(getRequestHeader('cf-connecting-ip')) ?? publicVisitorIp(getRequestHeader('x-forwarded-for'));
    const location = ip ? await lookupVisitorLocation(ip) : null;
    await session.update({ location, attempted: true });
    return { location };
  } catch { return { location: null }; }
});