import { BadgePercent, MapPin } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ChainLogo } from './ChainLogo';
import type { Chain } from './catalog';
import type { Store } from './places';
import { formatDate, formatDistance, formatPrice, offersFor, packsFor, PRICES_SOURCE, unitPrice, type Line } from './pricing';

/** Pop-up con le offerte di un prodotto in tutti i negozi, dal prezzo più basso. */
export function ProductDialog({ line, recommended, stores, onClose }: { line: Line | null; recommended: Chain | null; stores: Store[] | null; onClose: () => void }) {
  const product = line?.product ?? null;
  const nearest = (chain: Chain) => stores?.find(store => store.chain.id === chain.id) ?? null;
  // Prima le catene con un punto vendita vicino, poi le altre; in ogni gruppo dalla più economica
  const offers = product ? offersFor(product).sort((a, b) => Number(!nearest(a.chain)) - Number(!nearest(b.chain))) : [];
  return (
    <Dialog open={line !== null} onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent className="block max-h-[85vh] max-w-lg overflow-y-auto rounded-3xl border bg-surface p-0 sm:rounded-3xl">
        {line && (
          <>
            <DialogHeader className="border-b px-6 pb-4 pt-6 text-left">
              <p className="label-mono text-muted-foreground">{product ? `${product.sub} · ${product.unitLabel}` : 'Prodotto'}</p>
              <DialogTitle className="font-display text-2xl font-bold capitalize">{line.item.name}</DialogTitle>
              <DialogDescription>
                {product ? <>Offerte per {product.label.toLowerCase()}{line.item.quantity ? <> · ti servono {line.item.quantity}</> : null}</> : 'Questo prodotto non è nel catalogo: non ho prezzi da confrontare.'}
              </DialogDescription>
            </DialogHeader>
            <ul className="divide-y">
              {offers.map(offer => {
                const store = nearest(offer.chain);
                const packs = packsFor(line.item.quantity, offer.size);
                const perUnit = unitPrice(offer);
                const isRecommended = offer.chain.id === recommended?.id;
                return (
                  <li key={offer.chain.id} className={`flex gap-3 px-6 py-4 ${isRecommended ? 'bg-primary/10' : ''}`}>
                    <ChainLogo chain={offer.chain} />
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-2 font-medium">
                        {offer.chain.name}
                        {isRecommended && <span className="rounded-full bg-primary px-2 py-0.5 text-[0.7rem] font-semibold text-primary-foreground">Consigliato</span>}
                      </p>
                      <p className="truncate text-sm text-muted-foreground">{offer.name}</p>
                      <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="size-3 shrink-0" />
                        {store ? `${formatDistance(store.distance)} · ${store.address}` : stores ? 'Nessun punto vendita qui vicino' : 'Attiva la posizione per vedere il più vicino'}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">{offer.real ? `Prezzo rilevato il ${formatDate(offer.real.date)} da Open Prices` : 'Prezzo stimato'}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-display text-lg font-bold">{formatPrice(offer.price)}</p>
                      {offer.discount > 0 && offer.fullPrice && <p className="inline-flex items-center gap-1 rounded-full bg-accent-2/20 px-2 py-0.5 text-xs font-semibold"><BadgePercent className="size-3.5" />-{offer.discount}% <s className="font-normal opacity-70">{formatPrice(offer.fullPrice)}</s></p>}
                      {perUnit && <p className="text-xs text-muted-foreground">{formatPrice(perUnit.value)}/{perUnit.unit}</p>}
                      {packs > 1 && <p className="text-xs font-medium">× {packs} = {formatPrice(offer.price * packs)}</p>}
                    </div>
                  </li>
                );
              })}
            </ul>
            {product && <p className="border-t px-6 py-4 text-xs text-muted-foreground">Prezzi reali da {PRICES_SOURCE.source}, aggiornati al {formatDate(PRICES_SOURCE.generatedAt)}. Dove manca un rilevamento il prezzo è stimato.</p>}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
