import { afterEach, describe, expect, it, vi } from 'vitest';
import { CHAINS, findProduct } from '@/features/shopping/catalog';
import { extractShoppingList } from '@/features/shopping/extract';
import { searchAddress } from '@/features/shopping/geo';
import { SEARCH_RADIUS, type ShoppingItem } from '@/features/shopping/models';
import { demoStores, nearbyStores, type Store } from '@/features/shopping/places';
import { chainBasket, offersFor, packsFor, planShopping } from '@/features/shopping/pricing';

const BOLOGNA = { lat: 44.4949, lng: 11.3426 };
const item = (name: string, quantity: string | null = null): ShoppingItem => ({ id: crypto.randomUUID(), name, quantity, category: null, checked: false });
afterEach(() => { vi.unstubAllGlobals(); });

describe('Estrazione della lista', () => {
  it('estrae prodotti e quantità dal testo dettato', () => {
    const items = extractShoppingList('Vorrei due litri di latte, il pane e sei uova');
    expect(items.map(entry => [entry.name, entry.quantity])).toEqual([['latte', '2 litri'], ['pane', null], ['uova', '6']]);
  });
  it('tratta "un" come articolo e non come quantità', () => {
    expect(extractShoppingList('una mozzarella')[0]).toMatchObject({ name: 'mozzarella', quantity: null });
  });
  it('riconosce il prodotto e la sua lista anche con parole chiave composte', () => {
    expect(findProduct('detersivo piatti')?.id).toBe('piatti');
    expect(findProduct('pomodorini')?.id).toBe('pomodori');
    expect(findProduct('auricolari bluetooth')?.list).toBe('elettronica');
    expect(findProduct('caramelle')).toBeNull();
  });
});

describe('Prezzi', () => {
  it('calcola le confezioni necessarie per la quantità richiesta', () => {
    expect(packsFor('2 litri', { amount: 1, dim: 'l' })).toBe(2);
    expect(packsFor('6', { amount: 6, dim: 'pz' })).toBe(1);
    expect(packsFor('3 etti', { amount: 0.1, dim: 'kg' })).toBe(3);
    expect(packsFor('2 pacchi', { amount: 0.5, dim: 'kg' })).toBe(2);
    expect(packsFor(null, { amount: 1, dim: 'l' })).toBe(1);
  });
  it('usa i prezzi reali di Open Prices quando ci sono', () => {
    const lidl = offersFor(findProduct('latte')!).find(offer => offer.chain.id === 'lidl');
    expect(lidl?.real?.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
  it('vende ogni prodotto solo nei negozi giusti', () => {
    const types = new Set(offersFor(findProduct('trapano')!).map(offer => offer.chain.type));
    expect([...types]).toEqual(['faidate']);
  });
});

describe('Piano di spesa', () => {
  it('divide la lista per categoria e sceglie un negozio del tipo giusto per ognuna', () => {
    const plan = planShopping([item('latte'), item('pane'), item('auricolari'), item('caramelle')], demoStores(BOLOGNA));
    expect(plan.plans.map(entry => [entry.category.id, entry.store?.chain.type])).toEqual([['alimentari', 'supermercato'], ['elettronica', 'elettronica']]);
    expect(plan.unknown.map(entry => entry.name)).toEqual(['caramelle']);
    const counted = plan.plans.flatMap(entry => entry.lines).filter(line => !line.elsewhere);
    expect(plan.total).toBeCloseTo(counted.reduce((sum, line) => sum + line.lineTotal, 0), 2);
  });
  it('preferisce il negozio con più prodotti a quello più vicino', () => {
    const items = ['latte', 'pane', 'uova', 'pasta', 'riso', 'tonno', 'olio', 'caffè', 'biscotti', 'yogurt', 'burro', 'pollo', 'gelato', 'pizza', 'vino', 'birra'].map(name => item(name));
    const [fewer, more] = [...CHAINS].filter(chain => chain.type === 'supermercato').map(chain => ({ chain, ...chainBasket(chain, items) })).sort((a, b) => a.found - b.found).filter((entry, index, all) => index === 0 || index === all.length - 1);
    expect(more!.found).toBeGreaterThan(fewer!.found);
    const store = (chainId: string, distance: number): Store => ({ id: chainId, chain: CHAINS.find(chain => chain.id === chainId)!, name: chainId, address: '', lat: 0, lng: 0, distance, source: 'demo' });
    const plan = planShopping(items, [store(fewer!.chain.id, 100), store(more!.chain.id, 900)]);
    expect(plan.plans[0]!.store?.chain.id).toBe(more!.chain.id);
  });
});

describe('Negozi e posizione', () => {
  it('genera negozi dimostrativi con i supermercati entro il raggio di ricerca', () => {
    const supermarkets = demoStores(BOLOGNA).filter(store => store.chain.type === 'supermercato');
    expect(supermarkets.length).toBeGreaterThan(0);
    expect(supermarkets.every(store => store.distance <= SEARCH_RADIUS)).toBe(true);
  });
  it('tiene solo le catene note entro il raggio del loro tipo di negozio', async () => {
    const place = (name: string, north: number) => ({ osm_type: 'node', osm_id: north, lat: String(BOLOGNA.lat + north / 111320), lon: String(BOLOGNA.lng), name, address: { road: 'Via Test', house_number: '1' } });
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async (url: string) => new Response(JSON.stringify(url.includes('supermarket') ? [place('Conad City', 500), place('Bottega Bio', 300), place('Lidl', 5000)] : []))));
    const result = await nearbyStores(BOLOGNA, new AbortController().signal, undefined, 0);
    const real = result.stores.filter(store => store.source === 'osm');
    expect(real.map(store => [store.chain.id, store.address])).toEqual([['conad', 'Via Test 1']]);
    expect(result.source).toBe('mixed');
  });
  it('usa i negozi dimostrativi se OpenStreetMap non risponde', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    const result = await nearbyStores(BOLOGNA, new AbortController().signal, undefined, 0);
    expect(result.source).toBe('demo');
    expect(result.stores.length).toBeGreaterThan(0);
  });
  it('riconosce almeno le città principali se la ricerca indirizzi non risponde', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    await expect(searchAddress('Via Zamboni 33, Bologna')).resolves.toMatchObject({ lat: 44.4949, source: 'manual' });
    await expect(searchAddress('Atlantide')).rejects.toThrow('Non trovo questo indirizzo');
  });
});
