import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, LoaderCircle, LocateFixed, MapPinned, Search, Trophy } from "lucide-react";
import { Button } from '@/components/ui/button';
import { useShopping } from '@/features/shopping/ShoppingProvider';
import { SupermarketMap } from '@/features/shopping/SupermarketMap';
import { formatDistance, formatPrice, totalsByChain } from '@/features/shopping/fake-data';

export const Route = createFileRoute("/mappa")({
  head: () => ({ meta: [{ title: "Mappa · Easy Shop" }] }),
  component: Mappa,
});

function Mappa() {
  const { items, center, locationLabel, places, mapLoading, mapError, locate, searchAddress } = useShopping();
  const [address, setAddress] = useState('');
  const totals = totalsByChain(items);
  const bestChainId = totals[0]?.chain.id ?? null;
  const totalFor = (chainId: string) => totals.find(entry => entry.chain.id === chainId)?.total;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:py-14">
      <Link to="/" className="mb-8 inline-flex items-center gap-2 rounded-full border bg-surface px-4 py-2 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary">
        <ArrowLeft className="size-4" />Torna alla home
      </Link>

      <header className="mb-8 flex items-center gap-5">
        <span className="tool-icon tool-icon--map tool-icon--small shrink-0"><MapPinned className="size-8" /></span>
        <div>
          <p className="label-mono mb-1 text-muted-foreground">02 / Mappa</p>
          <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">Supermercati vicini</h1>
        </div>
      </header>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <Button onClick={locate} disabled={mapLoading} className="h-12 rounded-full px-6 text-base">
          {mapLoading ? <LoaderCircle className="animate-spin" /> : <LocateFixed />}Usa la mia posizione
        </Button>
        <form onSubmit={event => { event.preventDefault(); void searchAddress(address); }} className="flex flex-1 gap-2">
          <input aria-label="Città o indirizzo" value={address} maxLength={200} onChange={event => setAddress(event.target.value)} placeholder="Oppure scrivi una città, es. Bologna" className="h-12 min-w-0 flex-1 rounded-full border bg-surface px-5 text-base placeholder:text-muted-foreground focus:border-primary focus:outline-none" />
          <Button type="submit" variant="outline" disabled={mapLoading || !address.trim()} aria-label="Cerca indirizzo" className="size-12 rounded-full bg-surface"><Search /></Button>
        </form>
      </div>
      {mapError && <p role="alert" className="mb-4 text-sm text-destructive">{mapError}</p>}
      {locationLabel && <p className="label-mono mb-3 inline-flex items-center gap-2 text-muted-foreground"><span className="size-2 rounded-full bg-accent-2" />{locationLabel}</p>}

      <SupermarketMap center={center} places={places} loading={mapLoading} locationLabel={locationLabel} bestChainId={bestChainId} />

      {places.length > 0 && (
        <section className="mt-10">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <h2 className="font-display text-3xl font-bold">Dove fare la spesa</h2>
            {!items.length && <Link to="/microfono" className="text-sm font-medium text-primary hover:underline">Crea una lista per confrontare i prezzi</Link>}
          </div>
          <ul className="grid gap-4 sm:grid-cols-2">
            {places.map(place => {
              const total = totalFor(place.chain.id);
              const best = place.chain.id === bestChainId;
              return (
                <li key={place.id} className={`es-card flex items-center gap-4 p-5 ${best ? 'es-card--glow' : ''}`}>
                  <span className="grid size-12 shrink-0 place-items-center rounded-2xl font-display text-lg font-bold text-white" style={{ background: place.chain.color }}>{place.chain.name[0]}</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-lg font-semibold">{place.name}</p>
                    <p className="truncate text-sm text-muted-foreground">{place.address} · {formatDistance(place.distance)}</p>
                    <p className={`mt-1 text-xs font-semibold ${place.openNow ? 'text-emerald-500' : 'text-muted-foreground'}`}>{place.openNow ? 'Aperto ora' : 'Chiuso ora'}</p>
                  </div>
                  {total !== undefined && (
                    <div className="shrink-0 text-right">
                      {best && <p className="label-mono mb-1 inline-flex items-center gap-1 text-primary"><Trophy className="size-3.5" />Top</p>}
                      <p className="font-display text-lg font-bold">{formatPrice(total)}</p>
                      <p className="text-xs text-muted-foreground">la tua spesa</p>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
