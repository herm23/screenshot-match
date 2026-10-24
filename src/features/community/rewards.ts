// Regole della valuta virtuale Shopcoin: come si guadagna, quanto vale e come si spende.

export const COIN = { name: 'Shopcoin', short: 'SC' };
export const EURO_PER_COIN = 0.05; // 20 SC = 1 € di sconto
export const COINS_PER_EURO = 1; // alla cassa, sulla cifra pagata dopo gli sconti
export const COINS_PER_POST = 15;
export const REWARDED_POSTS_PER_DAY = 5;
export const WELCOME_BONUS = 50;

export type VoucherOffer = { id: string; value: number; cost: number };
export const VOUCHERS: VoucherOffer[] = [
  { id: 'buono-2', value: 2, cost: 40 },
  { id: 'buono-5', value: 5, cost: 100 },
  { id: 'buono-10', value: 10, cost: 200 },
];

export type Transaction = { id: string; kind: 'benvenuto' | 'spesa' | 'post' | 'riscatto'; coins: number; date: string; note: string };
export type Voucher = { id: string; value: number; redeemedAt: string };

/** Saldo attuale: tutto ciò che è stato guadagnato meno quanto è stato speso in buoni. */
export const balanceOf = (transactions: Transaction[]) => transactions.reduce((sum, tx) => sum + tx.coins, 0);
/** Storico guadagnato: solo i guadagni, senza le spese. */
export const earnedOf = (transactions: Transaction[]) => transactions.reduce((sum, tx) => sum + Math.max(0, tx.coins), 0);
export const coinsValue = (coins: number) => Math.round(coins * EURO_PER_COIN * 100) / 100;
export const coinsForSpend = (paid: number) => Math.max(0, Math.floor(paid * COINS_PER_EURO));

export function rewardedPostsToday(transactions: Transaction[], now = new Date()) {
  const today = now.toDateString();
  return transactions.filter(tx => tx.kind === 'post' && tx.coins > 0 && new Date(tx.date).toDateString() === today).length;
}

/**
 * Pagamento alla cassa con i buoni accumulati: si usano dal più grande, finché lo sconto
 * non supera la spesa; i buoni che non servono restano per la prossima volta.
 */
export function checkout(amount: number, vouchers: Voucher[]) {
  const used: Voucher[] = [];
  let discount = 0;
  for (const voucher of [...vouchers].sort((a, b) => b.value - a.value)) {
    if (discount + voucher.value > amount + 1e-9) continue;
    used.push(voucher);
    discount += voucher.value;
  }
  const paid = Math.round((amount - discount) * 100) / 100;
  return { discount, paid, coins: coinsForSpend(paid), used };
}

export const formatCoins = (coins: number) => `${coins.toLocaleString('it-IT')} ${COIN.short}`;
