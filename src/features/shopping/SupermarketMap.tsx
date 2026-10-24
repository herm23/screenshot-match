import { lazy, Suspense } from 'react';
import { ClientOnly } from '@tanstack/react-router';
import { LoaderCircle, MapPin, Store as StoreIcon } from 'lucide-react';
import type { Located } from './geo';
import type { Store } from './places';
import type { Highlight, MapPost } from './LeafletMap';

const LeafletMap = lazy(() => import('./LeafletMap'));

export function SupermarketMap({ center, stores, loading, highlights, posts }: { center: Located | null; stores: Store[] | null; loading: boolean; highlights: Map<string, Highlight>; posts?: MapPost[] | undefined }) {
  const overlay = (message: string, spinning: boolean) => (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-muted px-6 text-center text-muted-foreground">
      {spinning ? <LoaderCircle className="size-7 animate-spin" /> : <MapPin className="size-8" />}
      <p className="max-w-xs text-sm">{message}</p>
    </div>
  );
  return (
    <div className="es-card overflow-hidden">
      <div className="es-map relative isolate h-[380px] sm:h-[480px]">
        {center
          ? <ClientOnly fallback={overlay('Carico la mappa…', true)}><Suspense fallback={overlay('Carico la mappa…', true)}><LeafletMap center={center} stores={stores ?? []} highlights={highlights} posts={posts} /></Suspense></ClientOnly>
          : overlay(loading ? 'Cerco la tua posizione…' : 'Consenti la posizione o scrivi un indirizzo.', loading)}
        {loading && center && <div className="absolute left-3 top-3 z-[500] flex items-center gap-2 rounded-full border bg-surface px-3 py-2 text-sm"><LoaderCircle className="size-4 animate-spin" />Cerco i negozi…</div>}
      </div>
      <div className="flex items-center gap-2 border-t px-5 py-3 text-sm text-muted-foreground">
        <StoreIcon className="size-4 shrink-0" />
        <span>{stores ? `${stores.length} negozi trovati · supermercati entro 2 km` : 'Negozi vicini'}{posts?.length ? ` · ${posts.length} post della community` : ''}</span>
      </div>
    </div>
  );
}
