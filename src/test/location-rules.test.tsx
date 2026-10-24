import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { lookupVisitorLocation, publicVisitorIp } from '@/lib/ip-location.server';
import { useShoppingLocation } from '@/hooks/use-shopping-location';

const calls = vi.hoisted(() => ({ estimate: vi.fn(), nearby: vi.fn(), geocode: vi.fn() }));
vi.mock('@tanstack/react-start', () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock('@/lib/location.functions', () => ({ estimateIpLocation: calls.estimate }));
vi.mock('@/lib/maps.functions', () => ({ nearbySupermarkets: calls.nearby, locateAddress: calls.geocode }));
const city = { lat: 45.4642, lng: 9.19, city: 'Milano', region: 'Lombardia' };

beforeEach(() => { vi.clearAllMocks(); calls.estimate.mockResolvedValue({ location: city }); calls.nearby.mockResolvedValue([]); });

describe('IP location rules', () => {
  it('requires a public visitor IP instead of locating the server', async () => {
    const fetcher = vi.fn();
    expect(publicVisitorIp(undefined)).toBeNull();
    expect(publicVisitorIp('127.0.0.1')).toBeNull();
    expect(publicVisitorIp('192.168.1.2')).toBeNull();
    expect(await lookupVisitorLocation('10.0.0.1', fetcher)).toBeNull();
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('returns city coordinates and region from a server-side lookup', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true, latitude: 45.4642, longitude: 9.19, city: 'Milano', region: 'Lombardia' })));
    expect(await lookupVisitorLocation('8.8.8.8', fetcher)).toEqual(city);
    expect(fetcher.mock.calls[0]?.[0]).toBe('https://ipwho.is/8.8.8.8');
  });
  it('opens manual entry when the location service fails', async () => {
    calls.estimate.mockResolvedValue({ location: null });
    const { result } = renderHook(() => useShoppingLocation(undefined));
    await waitFor(() => expect(result.current.estimating).toBe(false));
    expect(result.current.correctionOpen).toBe(true);
    expect(result.current.center).toBeNull();
  });
  it('automatically searches nearby after sign-in without asking for browser permission', async () => {
    const browserPosition = vi.fn();
    vi.stubGlobal('navigator', { geolocation: { getCurrentPosition: browserPosition } });
    const { result, rerender } = renderHook(({ userId }) => useShoppingLocation(userId), { initialProps: { userId: undefined as string | undefined } });
    await waitFor(() => expect(result.current.center).toEqual({ lat: 45.4642, lng: 9.19 }));
    expect(calls.nearby).not.toHaveBeenCalled();
    rerender({ userId: 'account' });
    await waitFor(() => expect(calls.nearby).toHaveBeenCalledWith({ data: { lat: 45.4642, lng: 9.19 } }));
    expect(browserPosition).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
  it('keeps the manual choice even when the IP response arrives later', async () => {
    let resolveIp: (value: { location: typeof city }) => void = () => undefined;
    calls.estimate.mockReturnValue(new Promise(resolve => { resolveIp = resolve; }));
    calls.geocode.mockResolvedValue({ lat: 45.4384, lng: 10.9916, label: 'Verona' });
    const { result } = renderHook(() => useShoppingLocation('account'));
    await act(async () => { await result.current.searchAddress('Verona'); });
    await act(async () => { resolveIp({ location: city }); });
    expect(result.current.center).toEqual({ lat: 45.4384, lng: 10.9916 });
    expect(result.current.locationLabel).toBe('Verona');
    expect(result.current.estimated).toBe(false);
  });
  it('fails gracefully on timeouts and unsuccessful provider responses', async () => {
    expect(await lookupVisitorLocation('8.8.8.8', vi.fn().mockRejectedValue(new Error('timeout')))).toBeNull();
    expect(await lookupVisitorLocation('8.8.8.8', vi.fn().mockResolvedValue(new Response('{"success":false}')))).toBeNull();
  });
});