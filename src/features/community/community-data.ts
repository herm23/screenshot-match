// Community simulata per la demo: utenti con i loro crediti e post pubblicati vicino ai negozi.
// I post usano i prezzi del catalogo, così sono coerenti con quelli mostrati nel resto dell'app.
import { productById } from '../shopping/catalog';
import type { Coordinates } from '../shopping/models';
import type { Store } from '../shopping/places';
import { formatPrice, offersFor } from '../shopping/pricing';

export type Member = { id: string; name: string; color: string; earned: number; balance: number; me?: boolean };
export type Post = { id: string; memberId: string; lat: number; lng: number; text: string; createdAt: number; storeName: string | null; likes: number };

export const MEMBERS: Member[] = [
  { id: 'giulia', name: 'Giulia R.', color: '#e87823', earned: 2140, balance: 380 },
  { id: 'marco', name: 'Marco B.', color: '#2f6fd1', earned: 1765, balance: 1210 },
  { id: 'sara', name: 'Sara L.', color: '#c7392d', earned: 1490, balance: 95 },
  { id: 'luca', name: 'Luca F.', color: '#2e9e6a', earned: 1220, balance: 640 },
  { id: 'chiara', name: 'Chiara M.', color: '#8a5cf6', earned: 980, balance: 980 },
  { id: 'davide', name: 'Davide P.', color: '#f2b921', earned: 760, balance: 210 },
  { id: 'elena', name: 'Elena C.', color: '#d6336c', earned: 615, balance: 455 },
  { id: 'omar', name: 'Omar K.', color: '#14a3b8', earned: 430, balance: 30 },
  { id: 'anna', name: 'Anna G.', color: '#6b7a90', earned: 260, balance: 260 },
];

// Post di offerta (prodotto in catalogo) e post di consiglio, a rotazione tra gli utenti
const OFFER_POSTS: { product: string; text: (price: string, chain: string) => string }[] = [
  { product: 'latte', text: (price, chain) => `Latte a ${price} da ${chain}, il più basso che ho visto questa settimana` },
  { product: 'pasta', text: (price, chain) => `Pasta a ${price} da ${chain}: ho fatto scorta 🍝` },
  { product: 'crema-spalmabile', text: (price, chain) => `Nutella a ${price} da ${chain}, correte!` },
  { product: 'tonno', text: (price, chain) => `Tonno in offerta a ${price} da ${chain}` },
  { product: 'caffe', text: (price, chain) => `Caffè a ${price} da ${chain}, conviene rispetto al solito` },
  { product: 'yogurt', text: (price, chain) => `Yogurt a ${price} da ${chain}` },
  { product: 'detersivo', text: (price, chain) => `Detersivo lavatrice a ${price} da ${chain}` },
  { product: 'auricolari', text: (price, chain) => `Auricolari Bluetooth scontati a ${price} da ${chain}` },
];
const TIPS = [
  (store: string) => `Alla ${store} alle 19 zero code alle casse`,
  (store: string) => `Frutta freschissima stamattina da ${store}`,
  (store: string) => `${store}: banco gastronomia con 3x2 fino a domenica`,
  (store: string) => `Parcheggio libero e carrelli puliti da ${store} 👍`,
];
// Minuti fa di ogni post: alcuni recentissimi (attività evidenziata), altri di ieri
const AGES = [6, 25, 48, 95, 180, 320, 610, 900, 1300, 1700, 2300, 2900];
const POSTS_PER_MEMBER = [3, 2, 2, 2, 1, 1, 1, 1, 1];

function jitter(seed: number) {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return (x - Math.floor(x) - 0.5) * 0.0004; // circa ±20 m
}

/** Post della community intorno alla posizione, ancorati ai negozi vicini quando ci sono. */
export function communityPosts(center: Coordinates, stores: Store[] | null, now: number): Post[] {
  const posts: Post[] = [];
  let index = 0;
  MEMBERS.forEach((member, memberIndex) => {
    for (let n = 0; n < (POSTS_PER_MEMBER[memberIndex] ?? 1); n++, index++) {
      const offer = index % 3 !== 2 ? OFFER_POSTS[index % OFFER_POSTS.length]! : null;
      const product = offer ? productById.get(offer.product) : null;
      const best = product ? offersFor(product)[0] : null;
      // Negozio della catena con il prezzo migliore, altrimenti un negozio vicino qualsiasi
      const candidates = stores?.filter(store => !best || store.chain.id === best.chain.id) ?? [];
      const store = candidates[index % Math.max(1, candidates.length)] ?? stores?.[(index * 3) % Math.max(1, stores.length)] ?? null;
      const base = store ?? { lat: center.lat + (((index * 37) % 21) - 10) * 0.0012, lng: center.lng + (((index * 53) % 21) - 10) * 0.0016 };
      const text = offer && best ? offer.text(formatPrice(best.price), store?.name ?? best.chain.name) : TIPS[index % TIPS.length]!(store?.name ?? 'il supermercato sotto casa');
      posts.push({
        id: `post-${member.id}-${n}`, memberId: member.id, text, storeName: store?.name ?? null,
        lat: base.lat + jitter(index + 1), lng: base.lng + jitter(index + 101),
        createdAt: now - AGES[index % AGES.length]! * 60000, likes: (index * 7) % 23,
      });
    }
  });
  return posts;
}

export function timeAgo(timestamp: number, now: number) {
  const minutes = Math.max(0, Math.round((now - timestamp) / 60000));
  if (minutes < 1) return 'adesso';
  if (minutes < 60) return `${minutes} min fa`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h fa`;
  const days = Math.round(hours / 24);
  return days === 1 ? 'ieri' : `${days} giorni fa`;
}
