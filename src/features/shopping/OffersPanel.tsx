import { Link } from '@tanstack/react-router';
import { ArrowRight, BadgePercent, Trophy } from 'lucide-react';
import type { ShoppingItem } from './models';
import { formatPrice, offersForItems, totalsByChain } from './fake-data';

export function OffersPanel({ items }: { items: ShoppingItem[] }) {
  const open = items.filter(item => !item.checked);
  const entries = offersForItems(open);
  const totals = totalsByChain(items);
  const best = totals[0];
  const worst = totals.at(-1);

  if (!open.length) return <p className="es-card p-6 text-center text-sm text-muted-foreground">Aggiungi dei prodotti alla lista per vedere le offerte.</p>;

  return (
    <div className="grid gap-4">
      {best && worst && (
        <div className="es-card es-card--glow p-5">
          <p className="label-mono mb-2 flex items-center gap-2 text-muted-foreground"><Trophy className="size-4 text-primary" />Il più conveniente</p>
          <p className="font-display text-2xl font-bold">{best.chain.name} · {formatPrice(best.total)}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Per {best.products} {best.products === 1 ? 'prodotto' : 'prodotti'}
            {worst.total > best.total && <> · risparmi {formatPrice(worst.total - best.total)} rispetto a {worst.chain.name}</>}
          </p>
          <Link to="/mappa" className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">Trova il {best.chain.name} più vicino<ArrowRight className="size-4" /></Link>
        </div>
      )}
      <ul className="es-card divide-y">
        {entries.map(({ item, product, offers }) => {
          const offer = offers[0];
          return (
            <li key={item.id} className="flex items-center gap-4 px-5 py-4">
              <div className="min-w-0 flex-1">
                <p className="break-words font-medium">{item.name}{item.quantity && <span className="text-muted-foreground"> · {item.quantity}</span>}</p>
                <p className="mt-1 text-sm text-muted-foreground">{offer && product ? `${product.label} ${product.unit} · ${offer.chain.name}` : 'Nessuna offerta trovata'}</p>
              </div>
              {offer && (
                <div className="shrink-0 text-right">
                  <p className="font-display text-lg font-bold">{formatPrice(offer.price)}</p>
                  {offer.discount > 0 && <p className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary"><BadgePercent className="size-3.5" />-{offer.discount}% <s className="font-normal opacity-70">{formatPrice(offer.fullPrice)}</s></p>}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
