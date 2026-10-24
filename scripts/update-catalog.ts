// Aggiorna i prezzi reali e i loghi delle catene.
// Uso: node --experimental-strip-types scripts/update-catalog.ts [--solo-prezzi]
// Con OPEN_PRICES_CACHE=file.json i prezzi grezzi vengono salvati lì e riletti alle esecuzioni successive.
//
// Prezzi: Open Prices (https://prices.openfoodfacts.org), dati aperti con licenza ODbL.
// Per ogni prodotto del catalogo e ogni catena tiene il prezzo rilevato più recente in Italia.
// Loghi: favicon dei siti delle catene, salvate in src/features/shopping/logos.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { CHAINS, PRODUCTS, chainForName, type Size } from '../src/features/shopping/catalog.ts';

const API = 'https://prices.openfoodfacts.org/api/v1';
const HEADERS = { 'User-Agent': 'ShoptHackathonDemo/0.1 (catalogo prezzi demo)' };
const OUT = new URL('../src/features/shopping/data/open-prices.json', import.meta.url);
const LOGOS = new URL('../src/features/shopping/logos/', import.meta.url);
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

type Location = { id: number; osm_name?: string; osm_brand?: string; osm_address_city?: string; osm_address_country?: string; price_count?: number };
type Price = {
  price: number; currency: string; date: string; price_is_discounted: boolean; price_without_discount: number | null; price_per: string | null;
  category_tag: string | null; product_name: string | null; location: Location | null;
  product: { product_name?: string | null; brands?: string | null; product_quantity?: number | null; product_quantity_unit?: string | null; categories_tags?: string[] } | null;
};
export type RealOffer = { name: string; brand: string | null; price: number; fullPrice: number | null; date: string; size: Size | null; store: string };

// Frutta e verdura sfusa: Open Prices usa un tag di categoria invece del codice a barre
const RAW_TAGS: Record<string, string> = {
  'en:bananas': 'banane', 'en:apples': 'mele', 'en:plums': 'frutta', 'en:pears': 'frutta', 'en:peaches': 'frutta', 'en:melons': 'frutta', 'en:avocados': 'frutta',
  'en:oranges': 'frutta', 'en:kiwis': 'frutta', 'en:grapes': 'frutta', 'en:carrots': 'verdura', 'en:aubergines': 'verdura', 'en:mixed-bell-peppers': 'verdura',
  'en:zucchini': 'verdura', 'en:onions': 'verdura', 'en:potatoes': 'patate', 'en:tomatoes': 'pomodori', 'en:lettuces': 'insalata',
};

async function get<T>(path: string): Promise<T> {
  const response = await fetch(`${API}${path}`, { headers: HEADERS });
  if (!response.ok) throw new Error(`${path}: ${response.status}`);
  return response.json() as Promise<T>;
}

function sizeOf(price: Price): Size | null {
  if (price.price_per === 'KILOGRAM') return { amount: 1, dim: 'kg' };
  const quantity = price.product?.product_quantity;
  const unit = price.product?.product_quantity_unit?.toLowerCase();
  if (!quantity) return null;
  if (unit === 'g') return { amount: quantity / 1000, dim: 'kg' };
  if (unit === 'ml') return { amount: quantity / 1000, dim: 'l' };
  return null;
}

function productFor(price: Price) {
  if (price.category_tag && RAW_TAGS[price.category_tag]) return PRODUCTS.find(product => product.id === RAW_TAGS[price.category_tag!]) ?? null;
  const name = (price.product?.product_name ?? price.product_name ?? '').toLocaleLowerCase('it');
  if (!name) return null;
  return PRODUCTS.find(product => product.op && product.op.test(name) && !product.exclude?.test(name)) ?? null;
}

async function fetchPrices() {
  const locations: Location[] = [];
  for (let page = 1; page <= 5; page++) {
    const data = await get<{ items: Location[] }>(`/locations?osm_address_country__like=Italia&size=100&page=${page}&order_by=-price_count`);
    locations.push(...data.items);
    await sleep(800);
    if (data.items.length < 100) break;
  }
  const italian = locations.filter(location => location.osm_address_country === 'Italia' && (location.price_count ?? 0) > 0 && chainForName(location.osm_brand ?? location.osm_name));
  console.log(`${italian.length} negozi italiani di catene note`);
  const prices: Price[] = [];
  for (const location of italian) {
    for (let page = 1; page <= 5; page++) {
      const data = await get<{ items: Price[] }>(`/prices?location_id=${location.id}&size=100&page=${page}`);
      prices.push(...data.items.map(price => ({ ...price, location })));
      await sleep(700);
      if (data.items.length < 100) break;
    }
  }
  return prices;
}

async function updatePrices() {
  const cache = process.env['OPEN_PRICES_CACHE'];
  const cached = cache ? await readFile(cache, 'utf8').then(text => JSON.parse(text) as Price[]).catch(() => null) : null;
  const prices = cached ?? await fetchPrices();
  if (cache && !cached) await writeFile(cache, JSON.stringify(prices));
  const result: Record<string, Record<string, RealOffer>> = {};
  let matched = 0;
  for (const price of prices) {
    if (price.currency !== 'EUR' || !(price.price > 0)) continue;
    const chain = chainForName(price.location?.osm_brand ?? price.location?.osm_name);
    const product = productFor(price);
    if (!chain || !product) continue;
    matched++;
    const offer: RealOffer = {
      name: price.product?.product_name ?? price.product_name ?? product.label,
      brand: price.product?.brands?.split(',')[0]?.trim() || null,
      price: price.price,
      fullPrice: price.price_is_discounted && price.price_without_discount && price.price_without_discount > price.price ? price.price_without_discount : null,
      date: price.date,
      size: sizeOf(price),
      store: [price.location?.osm_name, price.location?.osm_address_city].filter(Boolean).join(', '),
    };
    const byChain = (result[product.id] ??= {});
    const current = byChain[chain.id];
    if (!current || offer.date > current.date || (offer.date === current.date && offer.price < current.price)) byChain[chain.id] = offer;
  }
  await mkdir(new URL('.', OUT), { recursive: true });
  await writeFile(OUT, JSON.stringify({ source: 'Open Prices (prices.openfoodfacts.org), ODbL', generatedAt: new Date().toISOString().slice(0, 10), offers: result }, null, 1) + '\n');
  const pairs = Object.values(result).reduce((sum, byChain) => sum + Object.keys(byChain).length, 0);
  console.log(`${prices.length} prezzi letti, ${matched} abbinati, ${Object.keys(result).length} prodotti e ${pairs} coppie prodotto/catena salvate`);
}

async function updateLogos() {
  await mkdir(LOGOS, { recursive: true });
  for (const chain of CHAINS) {
    const response = await fetch(`https://www.google.com/s2/favicons?domain=${chain.domain}&sz=128`, { headers: HEADERS });
    // Senza logo (o con un'icona illeggibile) l'app mostra l'iniziale nel colore della catena
    if (!response.ok) { console.warn(`logo ${chain.id}: ${response.status}, tengo quello esistente`); continue; }
    const image = Buffer.from(await response.arrayBuffer());
    if (image.length < 300) { console.warn(`logo ${chain.id}: icona troppo piccola, saltata`); continue; }
    await writeFile(new URL(`${chain.id}.png`, LOGOS), image);
    await sleep(200);
  }
  console.log('loghi aggiornati');
}

if (!process.argv.includes('--solo-prezzi')) await updateLogos();
await updatePrices();
