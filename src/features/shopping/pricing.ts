// Prezzi e consigli: per ogni lista (alimentari, casa, elettronica, fai da te) sceglie un solo
// negozio, quello vicino che ha più prodotti, e calcola quanto si spende comprando tutto lì.
import realData from './data/open-prices.json';
import { CHAINS, LIST_CATEGORIES, findProduct, sellsProduct, type Chain, type ListCategory, type Product, type Size } from './catalog';
import type { ShoppingItem } from './models';
import type { Store } from './places';

export type Offer = {
  chain: Chain; name: string; size: Size; price: number; fullPrice: number | null; discount: number;
  // Prezzo rilevato da Open Prices (data e negozio) oppure null se è una stima
  real: { date: string; store: string } | null;
};
export type Line = { item: ShoppingItem; product: Product | null; offer: Offer | null; packs: number; lineTotal: number; elsewhere: boolean };
export type CategoryPlan = { category: ListCategory; lines: Line[]; chain: Chain | null; store: Store | null; found: number; open: number; total: number };
export type ShoppingPlan = { plans: CategoryPlan[]; unknown: ShoppingItem[]; total: number };

type RealOffer = { name: string; brand: string | null; price: number; fullPrice: number | null; date: string; size: Size | null; store: string };
const REAL = (realData as { offers: Record<string, Record<string, RealOffer>> }).offers;
export const PRICES_SOURCE = (realData as { source: string; generatedAt: string });

// Quota di catalogo che ogni catena tiene in assortimento (solo per i prezzi stimati)
const ASSORTMENT: Record<string, number> = { esselunga: 0.96, coop: 0.95, conad: 0.94, carrefour: 0.94, pam: 0.88, deco: 0.86, despar: 0.86, lidl: 0.78, aldi: 0.76, eurospin: 0.74, md: 0.74, penny: 0.72 };

function hash(text: string) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}
const round = (value: number) => Math.round(value * 100) / 100;

function offerAt(product: Product, chain: Chain): Offer | null {
  if (!sellsProduct(chain, product)) return null;
  const real = REAL[product.id]?.[chain.id];
  if (real) {
    const fullPrice = real.fullPrice;
    return {
      chain, name: real.brand && !real.name.toLowerCase().includes(real.brand.toLowerCase()) ? `${real.name} · ${real.brand}` : real.name,
      size: real.size ?? product.size, price: real.price, fullPrice,
      discount: fullPrice ? Math.round((1 - real.price / fullPrice) * 100) : 0,
      real: { date: real.date, store: real.store },
    };
  }
  const h = hash(product.id + chain.id);
  if ((h % 100) / 100 >= (ASSORTMENT[chain.id] ?? 0.9)) return null;
  const listPrice = round(product.price * chain.factor * (0.94 + ((h >>> 8) % 13) / 100));
  const discount = (h >>> 16) % 6 === 0 ? [10, 15, 20, 25, 30][(h >>> 20) % 5]! : 0;
  return { chain, name: product.label, size: product.size, price: discount ? round(listPrice * (1 - discount / 100)) : listPrice, fullPrice: discount ? listPrice : null, discount, real: null };
}

/** Tutte le offerte per un prodotto, dalla più economica. */
export function offersFor(product: Product): Offer[] {
  return CHAINS.map(chain => offerAt(product, chain)).filter(offer => offer !== null).sort((a, b) => a.price - b.price);
}

const UNIT_SCALE: Record<string, [Size['dim'], number] | 'packs'> = {
  l: ['l', 1], litro: ['l', 1], litri: ['l', 1], ml: ['l', 0.001],
  kg: ['kg', 1], g: ['kg', 0.001], etto: ['kg', 0.1], etti: ['kg', 0.1],
};

/** Quante confezioni servono per la quantità richiesta (es. "2 litri" di latte da 1 l = 2). */
export function packsFor(quantity: string | null, size: Size) {
  const match = quantity?.trim().match(/^(\d+(?:[.,]\d+)?)\s*([a-zà-ù]+)?/i);
  if (!match) return 1;
  const amount = Number(match[1]!.replace(',', '.'));
  if (!(amount > 0)) return 1;
  const unit = match[2]?.toLowerCase();
  const scale = unit ? UNIT_SCALE[unit] : undefined;
  let packs: number;
  if (scale && scale !== 'packs') packs = scale[0] === size.dim ? Math.ceil(amount * scale[1] / size.amount - 1e-9) : 1;
  else if (unit) packs = Math.ceil(amount); // pacchi, bottiglie, confezioni…
  else packs = size.dim === 'pz' ? Math.ceil(amount / size.amount - 1e-9) : Math.ceil(amount);
  return Math.min(99, Math.max(1, packs));
}

export function unitPrice(offer: Offer) {
  if (offer.size.dim === 'pz') return null;
  return { value: round(offer.price / offer.size.amount), unit: offer.size.dim };
}

function planCategory(category: ListCategory, items: ShoppingItem[], stores: Store[] | null): CategoryPlan {
  const entries = items.map(item => ({ item, product: findProduct(item.name)! }));
  const open = entries.filter(entry => !entry.item.checked);
  const offersByChain = new Map(CHAINS.map(chain => [chain.id, new Map(entries.map(entry => [entry.item.id, offerAt(entry.product, chain)]))]));
  const scoreChain = (chain: Chain) => {
    const offers = offersByChain.get(chain.id)!;
    const found = open.filter(entry => offers.get(entry.item.id));
    return { found: found.length, total: found.reduce((sum, entry) => sum + offers.get(entry.item.id)!.price * packsFor(entry.item.quantity, offers.get(entry.item.id)!.size), 0) };
  };

  let chain: Chain | null = null;
  let store: Store | null = null;
  const sellers = (candidate: Chain) => entries.some(entry => sellsProduct(candidate, entry.product));
  if (stores) {
    // Il negozio vicino con più prodotti della lista; a parità, il più vicino
    const ranked = stores.filter(candidate => sellers(candidate.chain)).map(candidate => ({ candidate, ...scoreChain(candidate.chain) }))
      .sort((a, b) => b.found - a.found || a.candidate.distance - b.candidate.distance);
    store = ranked[0]?.candidate ?? null;
    chain = store?.chain ?? null;
  }
  if (!chain) {
    // Senza negozi vicini: la catena con più prodotti e, a parità, la più economica
    const ranked = CHAINS.filter(sellers).map(candidate => ({ candidate, ...scoreChain(candidate) })).sort((a, b) => b.found - a.found || a.total - b.total);
    chain = ranked[0]?.candidate ?? null;
  }

  const nearbyChains = stores ? new Set(stores.map(candidate => candidate.chain.id)) : null;
  const lines: Line[] = entries.map(({ item, product }) => {
    let offer = chain ? offersByChain.get(chain.id)!.get(item.id) ?? null : null;
    const elsewhere = !offer;
    if (!offer) {
      const all = offersFor(product);
      offer = all.find(candidate => nearbyChains?.has(candidate.chain.id)) ?? all[0] ?? null;
    }
    const packs = offer ? packsFor(item.quantity, offer.size) : 1;
    return { item, product, offer, packs, lineTotal: offer ? round(offer.price * packs) : 0, elsewhere };
  });
  const counted = lines.filter(line => !line.item.checked && !line.elsewhere && line.offer);
  return { category, lines, chain, store, found: counted.length, open: open.length, total: round(counted.reduce((sum, line) => sum + line.lineTotal, 0)) };
}

/** Divide la lista per categoria e sceglie un negozio per ognuna. stores = null se la posizione non è nota. */
export function planShopping(items: ShoppingItem[], stores: Store[] | null): ShoppingPlan {
  const byCategory = new Map<string, ShoppingItem[]>();
  const unknown: ShoppingItem[] = [];
  for (const item of items) {
    const product = findProduct(item.name);
    if (!product) { unknown.push(item); continue; }
    byCategory.set(product.list, [...(byCategory.get(product.list) ?? []), item]);
  }
  const plans = LIST_CATEGORIES.filter(category => byCategory.has(category.id)).map(category => planCategory(category, byCategory.get(category.id)!, stores));
  return { plans, unknown, total: round(plans.reduce((sum, plan) => sum + plan.total, 0)) };
}

/** Quanti prodotti ancora da prendere si trovano in una catena e quanto costano lì. */
export function chainBasket(chain: Chain, items: ShoppingItem[]) {
  let found = 0, total = 0;
  for (const item of items) {
    if (item.checked) continue;
    const product = findProduct(item.name);
    const offer = product ? offerAt(product, chain) : null;
    if (!offer) continue;
    found++;
    total += offer.price * packsFor(item.quantity, offer.size);
  }
  return { found, total: round(total) };
}

export const formatPrice =(value: number) => value.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' });
export const formatDistance = (meters: number) => meters < 1000 ? `${Math.round(meters / 10) * 10} m` : `${(meters / 1000).toLocaleString('it-IT', { maximumFractionDigits: 1 })} km`;
export const formatDate = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' });
