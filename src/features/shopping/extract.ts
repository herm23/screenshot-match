// Estrae la lista della spesa dal testo scritto o dettato, senza AI: divide le frasi,
// riconosce le quantità ("due litri di", "6", "un pacco di") e toglie articoli e riempitivi.
import type { ShoppingItem } from './models';

const NUMBERS: Record<string, string> = { un: '1', uno: '1', una: '1', due: '2', tre: '3', quattro: '4', cinque: '5', sei: '6', sette: '7', otto: '8', nove: '9', dieci: '10', dodici: '12', mezzo: '0,5', mezza: '0,5' };
const UNITS: Record<string, string> = { kg: 'kg', chilo: 'kg', chili: 'kg', g: 'g', gr: 'g', grammi: 'g', etto: 'etto', etti: 'etti', l: 'l', lt: 'l', litro: 'litro', litri: 'litri', ml: 'ml', pacco: 'pacco', pacchi: 'pacchi', confezione: 'confezione', confezioni: 'confezioni', bottiglia: 'bottiglia', bottiglie: 'bottiglie', vasetto: 'vasetto', vasetti: 'vasetti', scatoletta: 'scatoletta', scatolette: 'scatolette', pezzi: 'pezzi', pezzo: 'pezzo', rotoli: 'rotoli', casse: 'casse', cassa: 'cassa' };
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
  return { name: name.slice(0, 120), quantity, category: null };
}

export function extractShoppingList(text: string): ShoppingItem[] {
  return text
    .split(/[,;\n]+|\s+(?:e|poi|più)\s+/i)
    .map(parseChunk)
    .filter(item => item !== null)
    .slice(0, 100)
    .map(item => ({ ...item, id: crypto.randomUUID(), checked: false }));
}
