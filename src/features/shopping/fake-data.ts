// Dati finti per la demo: nessuna API esterna. Prezzi, offerte e supermercati sono
// generati in modo deterministico, così la stessa ricerca dà sempre lo stesso risultato.
import type { Coordinates, ShoppingItem, Supermarket } from './models';

export type Chain = { id: string; name: string; color: string };
export type Offer = { chain: Chain; price: number; fullPrice: number; discount: number };
export type ItemOffers = { item: ShoppingItem; product: Product | null; offers: Offer[] };
export type NearbySupermarket = Supermarket & { chain: Chain; distance: number };

type Product = { label: string; keywords: string[]; category: string; unit: string; price: number };

export const CHAINS: Chain[] = [
  { id: 'coop', name: 'Coop', color: '#e30613' },
  { id: 'conad', name: 'Conad', color: '#e2001a' },
  { id: 'esselunga', name: 'Esselunga', color: '#0060a8' },
  { id: 'lidl', name: 'Lidl', color: '#0050aa' },
  { id: 'eurospin', name: 'Eurospin', color: '#1d4f91' },
  { id: 'carrefour', name: 'Carrefour Express', color: '#1e5bc6' },
];

const CATALOG: Product[] = [
  { label: 'Latte', keywords: ['latte'], category: 'Latticini', unit: '1 l', price: 1.39 },
  { label: 'Pane', keywords: ['pane', 'pagnotta', 'baguette'], category: 'Panetteria', unit: '500 g', price: 1.8 },
  { label: 'Uova', keywords: ['uova', 'uovo'], category: 'Latticini', unit: '6 pz', price: 2.1 },
  { label: 'Pasta', keywords: ['pasta', 'spaghetti', 'penne', 'fusilli', 'rigatoni'], category: 'Dispensa', unit: '500 g', price: 0.99 },
  { label: 'Riso', keywords: ['riso'], category: 'Dispensa', unit: '1 kg', price: 2.29 },
  { label: 'Passata di pomodoro', keywords: ['passata', 'pomodor', 'sugo'], category: 'Dispensa', unit: '700 g', price: 1.15 },
  { label: 'Mozzarella', keywords: ['mozzarell'], category: 'Latticini', unit: '125 g', price: 0.89 },
  { label: 'Parmigiano', keywords: ['parmigian', 'grana', 'formaggio'], category: 'Latticini', unit: '200 g', price: 4.2 },
  { label: 'Yogurt', keywords: ['yogurt'], category: 'Latticini', unit: '2 x 125 g', price: 1.25 },
  { label: 'Burro', keywords: ['burro'], category: 'Latticini', unit: '250 g', price: 2.35 },
  { label: 'Biscotti', keywords: ['biscott'], category: 'Colazione', unit: '700 g', price: 2.49 },
  { label: 'Caffè', keywords: ['caffè', 'caffe'], category: 'Colazione', unit: '250 g', price: 3.59 },
  { label: 'Acqua', keywords: ['acqua'], category: 'Bevande', unit: '6 x 1,5 l', price: 1.99 },
  { label: 'Birra', keywords: ['birr'], category: 'Bevande', unit: '3 x 33 cl', price: 2.79 },
  { label: 'Vino', keywords: ['vino'], category: 'Bevande', unit: '75 cl', price: 4.5 },
  { label: 'Olio extravergine', keywords: ['olio'], category: 'Dispensa', unit: '1 l', price: 8.9 },
  { label: 'Zucchero', keywords: ['zucchero'], category: 'Dispensa', unit: '1 kg', price: 1.19 },
  { label: 'Farina', keywords: ['farina'], category: 'Dispensa', unit: '1 kg', price: 0.95 },
  { label: 'Tonno', keywords: ['tonno'], category: 'Dispensa', unit: '3 x 80 g', price: 3.4 },
  { label: 'Banane', keywords: ['banan'], category: 'Frutta e verdura', unit: '1 kg', price: 1.69 },
  { label: 'Mele', keywords: ['mela', 'mele'], category: 'Frutta e verdura', unit: '1 kg', price: 2.2 },
  { label: 'Insalata', keywords: ['insalat', 'lattuga'], category: 'Frutta e verdura', unit: '250 g', price: 1.49 },
  { label: 'Pomodori', keywords: ['pomodorini', 'pomodori freschi'], category: 'Frutta e verdura', unit: '500 g', price: 1.99 },
  { label: 'Petto di pollo', keywords: ['pollo'], category: 'Carne', unit: '500 g', price: 5.9 },
  { label: 'Prosciutto cotto', keywords: ['prosciutto'], category: 'Salumi', unit: '100 g', price: 1.89 },
  { label: 'Detersivo', keywords: ['detersiv', 'sapone'], category: 'Casa', unit: '1,5 l', price: 4.99 },
  { label: 'Carta igienica', keywords: ['carta igienica', 'carta'], category: 'Casa', unit: '8 rotoli', price: 3.49 },
];

// Prima i prodotti con le parole chiave più lunghe, così "pomodorini" non diventa "passata"
const SORTED_KEYWORDS = CATALOG.flatMap(product => product.keywords.map(keyword => ({ keyword, product }))).sort((a, b) => b.keyword.length - a.keyword.length);

function hash(text: string) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

const round = (value: number) => Math.round(value * 100) / 100;
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export function findProduct(name: string) {
  const text = name.toLocaleLowerCase('it');
  return SORTED_KEYWORDS.find(entry => text.includes(entry.keyword))?.product ?? null;
}

const NUMBERS: Record<string, string> = { un: '1', uno: '1', una: '1', due: '2', tre: '3', quattro: '4', cinque: '5', sei: '6', sette: '7', otto: '8', nove: '9', dieci: '10', dodici: '12', mezzo: '0,5', mezza: '0,5' };
const UNITS: Record<string, string> = { kg: 'kg', chilo: 'kg', chili: 'kg', g: 'g', grammi: 'g', etto: 'etto', etti: 'etti', l: 'l', litro: 'litro', litri: 'litri', pacco: 'pacco', pacchi: 'pacchi', confezione: 'confezione', confezioni: 'confezioni', bottiglia: 'bottiglia', bottiglie: 'bottiglie', vasetto: 'vasetto', vasetti: 'vasetti', scatoletta: 'scatoletta', scatolette: 'scatolette', pezzi: 'pezzi', rotoli: 'rotoli' };
const FILLERS = /^(?:vorrei|voglio|mi serve|mi servono|devo comprare|compra|comprare|prendi|prendere|anche|poi|e|ah|allora|ok)\s+/i;
const ARTICLES = /^(?:un po'? di\s*|un po'?\s+|(?:una|uno|un)\s+|un'|(?:di|del|dello|della|dei|degli|delle|il|lo|la|i|gli|le)\s+|d'|l')/i;
const QUANTITY = new RegExp(`^(\\d+(?:[.,]\\d+)?|${Object.keys(NUMBERS).join('|')})\\s*(${Object.keys(UNITS).join('|')})?\\b\\s*`, 'i');

function parseChunk(chunk: string): Omit<ShoppingItem, 'id' | 'checked'> | null {
  let rest = chunk.trim().replace(/[.!?]+$/, '');
  while (FILLERS.test(rest)) rest = rest.replace(FILLERS, '');
  let quantity: string | null = null;
  const match = QUANTITY.exec(rest);
  // "un" da solo è un articolo, non una quantità
  if (match && (match[2] || !/^un[oa]?$/i.test(match[1] ?? ''))) {
    const amount = NUMBERS[match[1]!.toLowerCase()] ?? match[1]!;
    quantity = match[2] ? `${amount} ${UNITS[match[2].toLowerCase()]}` : amount;
    rest = rest.slice(match[0].length);
  }
  while (ARTICLES.test(rest)) rest = rest.replace(ARTICLES, '');
  const name = rest.trim();
  if (!name) return null;
  return { name: name.slice(0, 120), quantity, category: findProduct(name)?.category ?? null };
}

/** Estrae la lista della spesa dal testo scritto o dettato (sostituisce la chiamata AI). */
export async function extractShoppingList(text: string): Promise<ShoppingItem[]> {
  await delay(700);
  return text
    .split(/[,;\n]+|\s+(?:e|poi|più)\s+/i)
    .map(parseChunk)
    .filter(item => item !== null)
    .slice(0, 100)
    .map(item => ({ ...item, id: crypto.randomUUID(), checked: false }));
}

export function offersFor(product: Product): Offer[] {
  return CHAINS.map(chain => {
    const h = hash(product.label + chain.id);
    const fullPrice = round(product.price * (0.88 + (h % 25) / 100));
    const discount = [0, 0, 10, 15, 20, 25, 30, 50][(h >>> 5) % 8]!;
    return { chain, fullPrice, discount, price: round(fullPrice * (1 - discount / 100)) };
  }).sort((a, b) => a.price - b.price);
}

export function offersForItems(items: ShoppingItem[]): ItemOffers[] {
  return items.map(item => {
    const product = findProduct(item.name);
    return { item, product, offers: product ? offersFor(product) : [] };
  });
}

/** Totale della spesa (prodotti non ancora presi) per ogni catena, dal più conveniente. */
export function totalsByChain(items: ShoppingItem[]) {
  const found = offersForItems(items.filter(item => !item.checked)).filter(entry => entry.offers.length);
  if (!found.length) return [];
  return CHAINS.map(chain => ({
    chain,
    total: round(found.reduce((sum, entry) => sum + (entry.offers.find(offer => offer.chain.id === chain.id)?.price ?? 0), 0)),
    products: found.length,
  })).sort((a, b) => a.total - b.total);
}

const STREETS = ['Via Roma', 'Via Garibaldi', 'Via Mazzini', 'Corso Italia', 'Via Verdi', 'Viale Europa', 'Via Dante', 'Via Marconi'];
// Spostamenti in metri (nord, est) rispetto alla posizione, tutti entro 2 km
const OFFSETS: [number, number][] = [[220, -340], [-480, 260], [760, 610], [-150, -890], [1120, -260], [-920, -700], [450, 1350], [-1300, 520]];

function distanceMeters(a: Coordinates, b: Coordinates) {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

/** Supermercati finti intorno alla posizione (sostituisce Google Places). */
export async function nearbySupermarkets(center: Coordinates): Promise<NearbySupermarket[]> {
  await delay(600);
  const hour = new Date().getHours();
  return OFFSETS.map(([north, east], index) => {
    const chain = CHAINS[index % CHAINS.length]!;
    const position = { lat: center.lat + north / 111320, lng: center.lng + east / (111320 * Math.cos(center.lat * Math.PI / 180)) };
    return {
      id: `${chain.id}-${index}`,
      name: chain.name,
      chain,
      address: `${STREETS[index]} ${(hash(chain.id + index) % 120) + 1}`,
      ...position,
      openNow: chain.id === 'carrefour' ? true : hour >= 8 && hour < 21,
      distance: Math.round(distanceMeters(center, position)),
    };
  }).sort((a, b) => a.distance - b.distance);
}

const CITIES: Record<string, Coordinates> = {
  bologna: { lat: 44.4949, lng: 11.3426 },
  milano: { lat: 45.4642, lng: 9.19 },
  roma: { lat: 41.9028, lng: 12.4964 },
  torino: { lat: 45.0703, lng: 7.6869 },
  napoli: { lat: 40.8518, lng: 14.2681 },
  firenze: { lat: 43.7696, lng: 11.2558 },
  padova: { lat: 45.4064, lng: 11.8768 },
  pisa: { lat: 43.7228, lng: 10.4017 },
  genova: { lat: 44.4056, lng: 8.9463 },
  venezia: { lat: 45.4408, lng: 12.3155 },
  bari: { lat: 41.1171, lng: 16.8719 },
  palermo: { lat: 38.1157, lng: 13.3615 },
};

/** Trova le coordinate di una città italiana citata nel testo (sostituisce il geocoding di Google). */
export async function locateAddress(address: string): Promise<Coordinates & { label: string }> {
  await delay(400);
  const text = address.toLocaleLowerCase('it');
  const city = Object.keys(CITIES).find(name => text.includes(name));
  if (!city) throw new Error(`Non trovo questo indirizzo. Prova con una città, ad esempio ${Object.keys(CITIES).slice(0, 3).map(name => name[0]!.toUpperCase() + name.slice(1)).join(', ')}.`);
  return { ...CITIES[city]!, label: address.trim() };
}

export const formatPrice = (value: number) => value.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' });
export const formatDistance = (meters: number) => meters < 1000 ? `${meters} m` : `${(meters / 1000).toLocaleString('it-IT', { maximumFractionDigits: 1 })} km`;
