import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useShopping } from '../shopping/ShoppingProvider';
import { MEMBERS, communityPosts, type Member, type Post } from './community-data';
import { COINS_PER_POST, REWARDED_POSTS_PER_DAY, VOUCHERS, WELCOME_BONUS, balanceOf, checkout, earnedOf, rewardedPostsToday, type Transaction, type Voucher } from './rewards';

// Portafoglio Shopcoin e community. Non c'è un server: il profilo, i movimenti e i post dell'utente
// restano in questo browser, gli altri membri della community sono simulati (community-data.ts).
type Saved = { userId: string; name: string; transactions: Transaction[]; vouchers: Voucher[]; posts: Post[]; liked: string[]; tutorialSeen: boolean };
type CheckoutResult = ReturnType<typeof checkout>;
type CommunityState = Saved & {
  ready: boolean;
  balance: number;
  earned: number;
  members: Member[];
  allPosts: Post[];
  now: number;
  setName: (name: string) => void;
  publishPost: (text: string, storeId: string | null) => { rewarded: boolean } | null;
  redeem: (offerId: string) => boolean;
  payAtCheckout: (amount: number, storeName: string) => CheckoutResult;
  toggleLike: (postId: string) => void;
  setTutorialSeen: () => void;
};

const CommunityContext = createContext<CommunityState | null>(null);
const STORAGE_KEY = 'shopt:portafoglio';
const newId = () => crypto.randomUUID();
const fresh = (): Saved => ({ userId: newId(), name: 'Tu', transactions: [], vouchers: [], posts: [], liked: [], tutorialSeen: false });

export function CommunityProvider({ children }: { children: ReactNode }) {
  const { location, stores } = useShopping();
  const [saved, setSaved] = useState<Saved>(fresh);
  const [ready, setReady] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let data = fresh();
    try { data = { ...data, ...JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Partial<Saved> }; } catch { /* profilo nuovo */ }
    if (!data.transactions.length) data.transactions = [{ id: newId(), kind: 'benvenuto', coins: WELCOME_BONUS, date: new Date().toISOString(), note: 'Bonus di benvenuto' }];
    setSaved(data);
    setReady(true);
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(saved)); } catch { /* non salvato */ }
  }, [saved, ready]);

  const balance = balanceOf(saved.transactions);
  const earned = earnedOf(saved.transactions);
  const members = useMemo(() => [...MEMBERS, { id: 'me', name: saved.name, color: 'var(--primary)', earned, balance, me: true }], [saved.name, earned, balance]);
  const allPosts = useMemo(() => [...(location ? communityPosts(location, stores, now) : []), ...saved.posts].sort((a, b) => b.createdAt - a.createdAt), [location?.lat, location?.lng, stores, now, saved.posts]);

  const update = (patch: (current: Saved) => Partial<Saved>) => setSaved(current => ({ ...current, ...patch(current) }));
  const addTransaction = (current: Saved, tx: Omit<Transaction, 'id' | 'date'>) => [...current.transactions, { ...tx, id: newId(), date: new Date().toISOString() }];

  const publishPost = (text: string, storeId: string | null) => {
    if (!location || !text.trim()) return null;
    const store = stores?.find(candidate => candidate.id === storeId) ?? null;
    const rewarded = rewardedPostsToday(saved.transactions) < REWARDED_POSTS_PER_DAY;
    const post: Post = { id: newId(), memberId: 'me', text: text.trim().slice(0, 280), storeName: store?.name ?? null, lat: store?.lat ?? location.lat, lng: store?.lng ?? location.lng, createdAt: Date.now(), likes: 0 };
    update(current => ({
      posts: [...current.posts, post],
      transactions: rewarded ? addTransaction(current, { kind: 'post', coins: COINS_PER_POST, note: store ? `Post da ${store.name}` : 'Post pubblicato' }) : current.transactions,
    }));
    setNow(Date.now());
    return { rewarded };
  };

  const redeem = (offerId: string) => {
    const offer = VOUCHERS.find(candidate => candidate.id === offerId);
    if (!offer || balance < offer.cost) return false;
    update(current => ({
      transactions: addTransaction(current, { kind: 'riscatto', coins: -offer.cost, note: `Buono sconto da ${offer.value} €` }),
      vouchers: [...current.vouchers, { id: newId(), value: offer.value, redeemedAt: new Date().toISOString() }],
    }));
    return true;
  };

  const payAtCheckout = (amount: number, storeName: string) => {
    const result = checkout(amount, saved.vouchers);
    const usedIds = new Set(result.used.map(voucher => voucher.id));
    const discount = result.discount ? ` − ${result.discount.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })} di buoni` : '';
    update(current => ({
      vouchers: current.vouchers.filter(voucher => !usedIds.has(voucher.id)),
      transactions: addTransaction(current, { kind: 'spesa', coins: result.coins, note: `Spesa da ${storeName}: ${amount.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}${discount}` }),
    }));
    return result;
  };

  const value: CommunityState = {
    ...saved, ready, balance, earned, members, allPosts, now,
    setName: name => update(() => ({ name: name.trim().slice(0, 40) || 'Tu' })),
    publishPost, redeem, payAtCheckout,
    toggleLike: postId => update(current => ({ liked: current.liked.includes(postId) ? current.liked.filter(id => id !== postId) : [...current.liked, postId] })),
    setTutorialSeen: () => update(() => ({ tutorialSeen: true })),
  };
  return <CommunityContext.Provider value={value}>{children}</CommunityContext.Provider>;
}

export function useCommunity() {
  const context = useContext(CommunityContext);
  if (!context) throw new Error('useCommunity va usato dentro CommunityProvider');
  return context;
}
