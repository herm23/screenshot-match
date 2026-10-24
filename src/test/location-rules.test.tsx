import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { lookupVisitorLocation, publicVisitorIp } from '@/lib/ip-location.server';
import { useShoppingLocation } from '@/hooks/use-shopping-location';
import { GEOLOCATION_OPTIONS, LOCATION_STORAGE_KEY } from '@/features/shopping/models';

const calls = vi.hoisted(() => ({ estimate: vi.fn(), nearby: vi.fn(), geocode: vi.fn(), reverse: vi.fn() }));
vi.mock('@tanstack/react-start', () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock('@/lib/location.functions', () => ({ estimateIpLocation: calls.estimate }));
vi.mock('@/lib/maps.functions', () => ({ nearbySupermarkets: calls.nearby, locateAddress: calls.geocode, reverseLocation: calls.reverse }));
const city = { lat: 45.4642, lng: 9.19, city: 'Milano', region: 'Lombardia' };

const browserPosition = vi.fn();
const queryPermission = vi.fn();
const fix = (accuracy = 20) => ({ coords: { latitude: 45.4384, longitude: 10.9916, accuracy } });
beforeEach(() => {
  vi.resetAllMocks(); localStorage.clear();
  calls.estimate.mockResolvedValue({ location: city }); calls.nearby.mockResolvedValue([]);
  calls.reverse.mockResolvedValue({ label: 'Centro, Verona' });
  queryPermission.mockResolvedValue({ state: 'prompt' });
  vi.stubGlobal('navigator', { permissions: { query: queryPermission }, geolocation: { getCurrentPosition: browserPosition } });
});
afterEach(() => vi.unstubAllGlobals());

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
    expect(result.current.locationLabel).toBe('Posizione: Verona');
    expect(result.current.estimated).toBe(false);
  });
  it('fails gracefully on timeouts and unsuccessful provider responses', async () => {
    expect(await lookupVisitorLocation('8.8.8.8', vi.fn().mockRejectedValue(new Error('timeout')))).toBeNull();
    expect(await lookupVisitorLocation('8.8.8.8', vi.fn().mockResolvedValue(new Response('{"success":false}')))).toBeNull();
  });
});
describe('Location priority and permission rules', () => {
  it('restores manual coordinates before precise and IP without requesting either', async () => {
    localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify({ lat: 44.5, lng: 11.3, label: 'Bologna', source: 'manual' }));
    queryPermission.mockResolvedValue({ state: 'granted' });
    const { result } = renderHook(() => useShoppingLocation(undefined));
    await waitFor(() => expect(queryPermission).toHaveBeenCalledWith({ name: 'geolocation' }));
    expect(result.current.center).toEqual({ lat: 44.5, lng: 11.3 });
    expect(result.current.sourceLabel).toBe('Manuale');
    expect(browserPosition).not.toHaveBeenCalled();
    expect(calls.estimate).not.toHaveBeenCalled();
  });
  it('uses a granted fix with high accuracy, 10 seconds timeout and five minutes cache', async () => {
    queryPermission.mockResolvedValue({ state: 'granted' });
    browserPosition.mockImplementation(success => success(fix()));
    const { result } = renderHook(() => useShoppingLocation('account'));
    await waitFor(() => expect(result.current.locationLabel).toBe('Posizione: Centro, Verona'));
    expect(result.current.sourceLabel).toBe('Precisa');
    expect(browserPosition.mock.calls[0]?.[2]).toEqual({ enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 });
    expect(GEOLOCATION_OPTIONS).toEqual({ enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 });
    expect(calls.reverse).toHaveBeenCalledWith({ data: { lat: 45.4384, lng: 10.9916 } });
  });
  it('uses IP immediately for prompt and asks only after an explicit click', async () => {
    const { result } = renderHook(() => useShoppingLocation(undefined));
    await waitFor(() => expect(result.current.sourceLabel).toBe('Stimata da IP'));
    expect(result.current.showPrecisionPrompt).toBe(true);
    expect(browserPosition).not.toHaveBeenCalled();
    act(() => result.current.askLocation());
    expect(browserPosition).toHaveBeenCalledTimes(1);
  });
  it('never asks again when denied and opens manual correction', async () => {
    queryPermission.mockResolvedValue({ state: 'denied' });
    const { result } = renderHook(() => useShoppingLocation(undefined));
    await waitFor(() => expect(result.current.permission).toBe('denied'));
    expect(result.current.correctionOpen).toBe(true);
    act(() => result.current.askLocation());
    expect(browserPosition).not.toHaveBeenCalled();
    expect(result.current.sourceLabel).toBe('Stimata da IP');
  });
  it('offers click-only positioning when Permissions is unsupported', async () => {
    vi.stubGlobal('navigator', { geolocation: { getCurrentPosition: browserPosition } });
    const { result } = renderHook(() => useShoppingLocation(undefined));
    await waitFor(() => expect(result.current.sourceLabel).toBe('Stimata da IP'));
    expect(result.current.showPrecisionPrompt).toBe(true);
    expect(browserPosition).not.toHaveBeenCalled();
  });
  it('treats accuracy above 1000 metres as estimated and opens manual correction', async () => {
    browserPosition.mockImplementation(success => success(fix(1001)));
    const { result } = renderHook(() => useShoppingLocation(undefined));
    await waitFor(() => expect(result.current.estimating).toBe(false));
    act(() => result.current.askLocation());
    expect(result.current.sourceLabel).toBe('Stimata dal browser');
    expect(result.current.correctionOpen).toBe(true);
    expect(result.current.estimated).toBe(true);
  });
  it('treats accuracy exactly 1000 metres as precise', async () => {
    browserPosition.mockImplementation(success => success(fix(1000)));
    const { result } = renderHook(() => useShoppingLocation(undefined));
    await waitFor(() => expect(result.current.estimating).toBe(false));
    act(() => result.current.askLocation());
    expect(result.current.sourceLabel).toBe('Precisa');
  });
  it.each([1, 2, 3])('falls back to IP for geolocation error %s', async code => {
    queryPermission.mockResolvedValue({ state: 'granted' });
    browserPosition.mockImplementation((_success, failure) => failure({ code }));
    const { result } = renderHook(() => useShoppingLocation(undefined));
    await waitFor(() => expect(result.current.sourceLabel).toBe('Stimata da IP'));
    await waitFor(() => expect(result.current.locationError).not.toBe(''));
    expect(result.current.locating).toBe(false);
    expect(result.current.permission).toBe(code === 1 ? 'denied' : 'granted');
    expect(result.current.locationError.startsWith(code === 1 ? 'Permesso' : code === 2 ? 'Posizione non disponibile' : 'Tempo scaduto')).toBe(true);
  });
  it('persists the last precise location without turning it into a manual preference', async () => {
    browserPosition.mockImplementation(success => success(fix()));
    const { result, unmount } = renderHook(() => useShoppingLocation(undefined));
    await waitFor(() => expect(result.current.estimating).toBe(false));
    act(() => result.current.askLocation());
    expect(JSON.parse(localStorage.getItem(LOCATION_STORAGE_KEY) ?? '{}').source).toBe('precise');
    unmount();
    const restarted = renderHook(() => useShoppingLocation(undefined));
    await waitFor(() => expect(restarted.result.current.sourceLabel).toBe('Stimata da IP'));
    expect(restarted.result.current.sourceLabel).not.toBe('Manuale');
  });
  it('keeps a new manual selection when a browser fix arrives late', async () => {
    let success: (position: ReturnType<typeof fix>) => void = () => undefined;
    browserPosition.mockImplementation(callback => { success = callback; });
    calls.geocode.mockResolvedValue({ lat: 44.5, lng: 11.3, label: 'Bologna' });
    const { result } = renderHook(() => useShoppingLocation('account'));
    await waitFor(() => expect(result.current.estimating).toBe(false));
    act(() => result.current.askLocation());
    await act(async () => { await result.current.searchAddress('Bologna'); });
    act(() => success(fix()));
    expect(result.current.center).toEqual({ lat: 44.5, lng: 11.3 });
    expect(JSON.parse(localStorage.getItem(LOCATION_STORAGE_KEY) ?? '{}').source).toBe('manual');
  });
});
