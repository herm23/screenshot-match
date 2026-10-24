import { lazy, Suspense } from 'react';
import { ClientOnly } from '@tanstack/react-router';
import { LoaderCircle, MapPin, Store } from 'lucide-react';
import type { Coordinates } from './models';
import type { NearbySupermarket } from './fake-data';

const LeafletMap = lazy(() => import('./LeafletMap'));

export function SupermarketMap({ center, places, loading, locationLabel, bestChainId }: { center: Coordinates | null; places: NearbySupermarket[]; loading: boolean; locationLabel: string; bestChainId: string | null }) {
  const overlay = (message: string, spinning: boolean) => (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-muted px-6 text-center text-muted-foreground">
      {spinning ? <LoaderCircle className="size-7 animate-spin" /> : <MapPin className="size-8" />}
      <p className="max-w-xs text-sm">{message}</p>
    </div>
  );
  return (
    <div className="es-card overflow-hidden">
      <div className="es-map relative h-[360px] sm:h-[440px]">
        {center
          ? <ClientOnly fallback={overlay('Carico la mappa…', true)}><Suspense fallback={overlay('Carico la mappa…', true)}><LeafletMap center={center} places={places} locationLabel={locationLabel} bestChainId={bestChainId} /></Suspense></ClientOnly>
          : overlay(loading ? 'Cerco la tua posizione…' : 'Usa la tua posizione o inserisci una città.', loading)}
        {loading && center && <div className="absolute left-3 top-3 z-[500] flex items-center gap-2 rounded-full border bg-surface px-3 py-2 text-sm"><LoaderCircle className="size-4 animate-spin" />Cerco supermercati…</div>}
      </div>
      <div className="flex items-center gap-2 border-t px-5 py-3 text-sm text-muted-foreground">
        <Store className="size-4 shrink-0" />
        <span>{places.length ? `${places.length} supermercati · entro 2 km` : 'Supermercati vicini · 2 km'}</span>
      </div>
    </div>
  );
}
