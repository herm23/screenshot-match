import { describe, expect, it } from 'vitest';
import { extractShoppingList, locateAddress, nearbySupermarkets, offersForItems, totalsByChain } from '@/features/shopping/fake-data';
import { SEARCH_RADIUS } from '@/features/shopping/models';

describe('Dati finti della demo', () => {
  it('estrae prodotti e quantità dal testo dettato', async () => {
    const items = await extractShoppingList('Vorrei due litri di latte, il pane e sei uova');
    expect(items.map(item => [item.name, item.quantity, item.category])).toEqual([
      ['latte', '2 litri', 'Latticini'],
      ['pane', null, 'Panetteria'],
      ['uova', '6', 'Latticini'],
    ]);
  });
  it('tratta "un" come articolo e non come quantità', async () => {
    const [item] = await extractShoppingList('una mozzarella');
    expect(item).toMatchObject({ name: 'mozzarella', quantity: null });
  });
  it('restituisce sempre le stesse offerte, dalla più conveniente', async () => {
    const items = await extractShoppingList('pasta');
    const first = offersForItems(items)[0]!.offers;
    expect(offersForItems(items)[0]!.offers).toEqual(first);
    expect(first.map(offer => offer.price)).toEqual([...first.map(offer => offer.price)].sort((a, b) => a - b));
  });
  it('ignora i prodotti già presi nel totale per catena', async () => {
    const items = await extractShoppingList('latte, pane');
    const all = totalsByChain(items)[0]!.products;
    expect(totalsByChain(items.map((item, i) => ({ ...item, checked: i === 0 })))[0]!.products).toBe(all - 1);
  });
  it('genera supermercati entro il raggio di ricerca', async () => {
    const places = await nearbySupermarkets({ lat: 44.4949, lng: 11.3426 });
    expect(places.length).toBeGreaterThan(0);
    expect(places.every(place => place.distance <= SEARCH_RADIUS)).toBe(true);
  });
  it('trova una città nel testo e rifiuta indirizzi sconosciuti', async () => {
    await expect(locateAddress('Via Zamboni 33, Bologna')).resolves.toMatchObject({ lat: 44.4949 });
    await expect(locateAddress('Atlantide')).rejects.toThrow('Non trovo questo indirizzo');
  });
});
