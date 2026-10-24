import { describe, expect, it } from 'vitest';
import { MEMBERS, communityPosts } from '@/features/community/community-data';
import { balanceOf, checkout, coinsForSpend, earnedOf, rewardedPostsToday, type Transaction } from '@/features/community/rewards';
import { demoStores, distanceMeters } from '@/features/shopping/places';

const BOLOGNA = { lat: 44.4949, lng: 11.3426 };
const tx = (coins: number, kind: Transaction['kind'] = 'spesa', date = new Date().toISOString()): Transaction => ({ id: crypto.randomUUID(), kind, coins, date, note: '' });

describe('Shopcoin', () => {
  it('separa il saldo attuale dallo storico guadagnato', () => {
    const history = [tx(50, 'benvenuto'), tx(34), tx(15, 'post'), tx(-40, 'riscatto')];
    expect(balanceOf(history)).toBe(59);
    expect(earnedOf(history)).toBe(99);
  });
  it('dà 1 Shopcoin per ogni euro pagato', () => {
    expect(coinsForSpend(39.66)).toBe(39);
    expect(coinsForSpend(0)).toBe(0);
  });
  it('somma i buoni senza superare il totale dello scontrino', () => {
    const vouchers = [2, 5, 10].map(value => ({ id: `v${value}`, value, redeemedAt: '' }));
    const result = checkout(12, vouchers);
    expect(result.used.map(voucher => voucher.value)).toEqual([10, 2]);
    expect(result.paid).toBe(0);
    expect(result.coins).toBe(0);
    expect(checkout(40, vouchers)).toMatchObject({ discount: 17, paid: 23, coins: 23 });
  });
  it('conta solo i post premiati di oggi per il limite giornaliero', () => {
    const yesterday = new Date(Date.now() - 86400000).toISOString();
    expect(rewardedPostsToday([tx(15, 'post'), tx(15, 'post', yesterday), tx(30)])).toBe(1);
  });
});

describe('Community simulata', () => {
  it('genera post vicino alla posizione, ancorati ai negozi quando ci sono', () => {
    const stores = demoStores(BOLOGNA);
    const posts = communityPosts(BOLOGNA, stores, Date.now());
    expect(new Set(posts.map(post => post.memberId))).toEqual(new Set(MEMBERS.map(member => member.id)));
    expect(posts.every(post => distanceMeters(BOLOGNA, post) < 8000)).toBe(true);
    expect(posts.filter(post => post.storeName).length).toBe(posts.length);
  });
  it('è stabile: stessi post per la stessa posizione', () => {
    const now = Date.now();
    expect(communityPosts(BOLOGNA, null, now)).toEqual(communityPosts(BOLOGNA, null, now));
  });
});
