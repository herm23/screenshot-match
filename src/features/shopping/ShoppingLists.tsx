import { useState } from 'react';
import { Check, CircleHelp, Hammer, Headphones, Pencil, Plus, ShoppingBasket, SprayCan, Store as StoreIcon, Trash2, X, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ChainLogo } from './ChainLogo';
import { ProductDialog } from './ProductDialog';
import type { Chain, ListCategoryId } from './catalog';
import type { ShoppingItem } from './models';
import { formatDistance, formatPrice, type CategoryPlan, type Line } from './pricing';
import { useShopping } from './ShoppingProvider';

const ICONS: Record<ListCategoryId, LucideIcon> = { alimentari: ShoppingBasket, casa: SprayCan, elettronica: Headphones, faidate: Hammer };

function ItemForm({ item, onSave, onCancel }: { item?: ShoppingItem; onSave: (value: { name: string; quantity: string | null }) => void; onCancel?: () => void }) {
  const [name, setName] = useState(item?.name ?? '');
  const [quantity, setQuantity] = useState(item?.quantity ?? '');
  return (
    <form className="flex flex-wrap gap-2 py-2" onSubmit={event => { event.preventDefault(); if (!name.trim()) return; onSave({ name: name.trim(), quantity: quantity.trim() || null }); if (!item) { setName(''); setQuantity(''); } }}>
      <input aria-label={item ? 'Modifica prodotto' : 'Nome del prodotto'} required maxLength={120} value={name} onChange={event => setName(event.target.value)} placeholder="Prodotto" className="min-w-0 flex-[2] rounded-full border bg-background px-4 py-2 text-sm" />
      <input aria-label="Quantità" maxLength={80} value={quantity} onChange={event => setQuantity(event.target.value)} placeholder="Quantità" className="w-28 min-w-0 flex-1 rounded-full border bg-background px-4 py-2 text-sm" />
      <Button type="submit" size="sm" disabled={!name.trim()} className="h-9 rounded-full"><Plus />{item ? 'Salva' : 'Aggiungi'}</Button>
      {onCancel && <Button type="button" variant="ghost" size="icon" aria-label="Annulla modifica" onClick={onCancel} className="rounded-full"><X /></Button>}
    </form>
  );
}

function ItemRow({ line, recommendedName, onOpen }: { line: Line; recommendedName: string | null; onOpen: () => void }) {
  const { items, setItems } = useShopping();
  const [editing, setEditing] = useState(false);
  const { item, offer, packs } = line;
  const update = (patch: Partial<ShoppingItem>) => setItems(items.map(current => current.id === item.id ? { ...current, ...patch } : current));
  if (editing) return <li className="px-5"><ItemForm item={item} onCancel={() => setEditing(false)} onSave={value => { update(value); setEditing(false); }} /></li>;
  return (
    <li className="flex items-center gap-3 px-5 py-3">
      <input type="checkbox" checked={item.checked} aria-label={`Già preso: ${item.name}`} onChange={event => update({ checked: event.target.checked })} className="size-5 shrink-0 accent-primary" />
      <button type="button" onClick={onOpen} className="group flex min-w-0 flex-1 items-center gap-3 rounded-xl text-left" aria-label={`${item.name}: vedi le offerte`}>
        <span className="min-w-0 flex-1">
          <span className={`block truncate font-medium capitalize group-hover:text-primary ${item.checked ? 'text-muted-foreground line-through' : ''}`}>
            {item.name}{item.quantity && <span className="font-normal normal-case text-muted-foreground"> · {item.quantity}</span>}
          </span>
          <span className="block truncate text-xs text-muted-foreground">
            {offer ? <>{offer.name}{packs > 1 && ` · ${packs} conf.`}</> : 'Nessun prezzo disponibile'}
          </span>
          {line.elsewhere && offer && recommendedName && <span className="block text-xs font-medium text-accent-2">Non c'è da {recommendedName}: lo trovi da {offer.chain.name}</span>}
        </span>
        {offer && (
          <span className="flex shrink-0 items-center gap-2">
            <span className="text-right">
              <span className={`block font-display font-bold ${line.elsewhere ? 'text-muted-foreground' : ''}`}>{formatPrice(line.lineTotal)}</span>
              {offer.discount > 0 && <span className="block text-[0.7rem] font-semibold text-primary">-{offer.discount}%</span>}
            </span>
            <ChainLogo chain={offer.chain} size="sm" />
          </span>
        )}
      </button>
      <div className="flex shrink-0">
        <Button variant="ghost" size="icon" aria-label={`Modifica ${item.name}`} onClick={() => setEditing(true)} className="size-8 rounded-full"><Pencil /></Button>
        <Button variant="ghost" size="icon" aria-label={`Elimina ${item.name}`} onClick={() => setItems(items.filter(current => current.id !== item.id))} className="size-8 rounded-full"><Trash2 /></Button>
      </div>
    </li>
  );
}

function CategoryCard({ plan, onOpen }: { plan: CategoryPlan; onOpen: (line: Line) => void }) {
  const Icon = ICONS[plan.category.id];
  const { location } = useShopping();
  return (
    <section className="es-card overflow-hidden" aria-label={`Lista ${plan.category.label}`}>
      <header className="flex items-center gap-3 border-b px-5 py-4">
        <span className="grid size-10 place-items-center rounded-xl bg-primary/15 text-primary"><Icon className="size-5" /></span>
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-xl font-bold">{plan.category.label}</h3>
          <p className="text-xs text-muted-foreground">{plan.lines.length} {plan.lines.length === 1 ? 'prodotto' : 'prodotti'} · {plan.category.storeLabel.toLowerCase()}</p>
        </div>
      </header>
      {plan.chain && (
        <div className="es-card--glow flex items-center gap-3 border-b px-5 py-4">
          <ChainLogo chain={plan.chain} size="lg" />
          <div className="min-w-0 flex-1">
            <p className="label-mono text-primary">{plan.store ? 'Il più vicino con più prodotti' : 'Catena consigliata'}</p>
            <p className="truncate font-display text-lg font-semibold">{plan.store?.name ?? plan.chain.name}</p>
            <p className="truncate text-xs text-muted-foreground">
              {plan.store ? `${plan.store.address} · ${formatDistance(plan.store.distance)}${plan.store.source === 'demo' ? ' · negozio dimostrativo' : ''}` : location ? 'Cerco i negozi vicini…' : 'Attiva la posizione per trovare il più vicino'}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-[0.7rem] text-muted-foreground">Tutto qui</p>
            <p className="font-display text-2xl font-bold">{formatPrice(plan.total)}</p>
            <p className="text-xs text-muted-foreground">{plan.found}/{plan.open} prodotti</p>
          </div>
        </div>
      )}
      <ul className="divide-y">{plan.lines.map(line => <ItemRow key={line.item.id} line={line} recommendedName={plan.chain?.name ?? null} onOpen={() => onOpen(line)} />)}</ul>
    </section>
  );
}

/** Lista della spesa divisa per categoria, con un negozio consigliato e un totale per ognuna. */
export function ShoppingLists() {
  const { items, setItems, plan, stores } = useShopping();
  const [selected, setSelected] = useState<{ line: Line; chain: Chain | null } | null>(null);
  return (
    <div className="grid gap-6">
      <div className="es-card es-card--glow flex flex-wrap items-center gap-4 p-5 sm:p-6">
        <div className="flex-1">
          <p className="label-mono text-muted-foreground">Totale della spesa</p>
          <p className="font-display text-4xl font-bold">{formatPrice(plan.total)}</p>
          <p className="text-sm text-muted-foreground">
            {plan.plans.length ? `Comprando tutto in ${plan.plans.length === 1 ? 'un solo negozio' : `${plan.plans.length} negozi, uno per lista`}, ai prezzi esposti` : 'Aggiungi dei prodotti per calcolare il totale'}
          </p>
        </div>
        {plan.plans.length > 0 && (
          <ul className="grid gap-2">
            {plan.plans.filter(entry => entry.chain).map(entry => (
              <li key={entry.category.id} className="flex items-center gap-2 text-sm">
                <ChainLogo chain={entry.chain!} size="sm" />
                <span className="text-muted-foreground">{entry.category.label}</span>
                <span className="ml-auto pl-4 font-semibold">{formatPrice(entry.total)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {!items.length && (
        <div className="es-card flex flex-col items-center gap-3 p-8 text-center text-muted-foreground">
          <ShoppingBasket className="size-8" />
          <p className="text-sm">La lista è vuota.<br />Scrivi o detta la spesa qui sopra e premi Invio.</p>
        </div>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-2">
        {plan.plans.map(entry => <CategoryCard key={entry.category.id} plan={entry} onOpen={line => setSelected({ line, chain: entry.chain })} />)}
        {plan.unknown.length > 0 && (
          <section className="es-card overflow-hidden" aria-label="Altri prodotti">
            <header className="flex items-center gap-3 border-b px-5 py-4">
              <span className="grid size-10 place-items-center rounded-xl bg-muted text-muted-foreground"><CircleHelp className="size-5" /></span>
              <div><h3 className="font-display text-xl font-bold">Altro</h3><p className="text-xs text-muted-foreground">Prodotti senza prezzi nel catalogo</p></div>
            </header>
            <ul className="divide-y">{plan.unknown.map(item => {
              const line: Line = { item, product: null, offer: null, packs: 1, lineTotal: 0, elsewhere: false };
              return <ItemRow key={item.id} line={line} recommendedName={null} onOpen={() => setSelected({ line, chain: null })} />;
            })}</ul>
          </section>
        )}
      </div>

      <div className="es-card px-5 py-3">
        <h3 className="flex items-center gap-2 pt-2 text-sm font-medium"><Plus className="size-4" />Aggiungi a mano</h3>
        <ItemForm onSave={value => setItems([...items, { ...value, category: null, id: crypto.randomUUID(), checked: false }])} />
      </div>

      {items.length > 0 && items.every(item => item.checked) && <p className="flex items-center gap-2 text-sm text-primary"><Check className="size-4" />Spesa completata!</p>}
      {stores && <p className="flex items-center gap-2 text-xs text-muted-foreground"><StoreIcon className="size-3.5" />Negozi da OpenStreetMap entro 2 km (supermercati) e 10 km (elettronica e fai da te).</p>}

      <ProductDialog line={selected?.line ?? null} recommended={selected?.chain ?? null} stores={stores} onClose={() => setSelected(null)} />
    </div>
  );
}
