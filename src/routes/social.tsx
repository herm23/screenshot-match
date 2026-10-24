import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, LoaderCircle, LocateFixed, MapPinned, MessageCircle, Search, Store as StoreIcon, Trophy } from "lucide-react";
import { Button } from '@/components/ui/button';
import { useShopping } from '@/features/shopping/ShoppingProvider';
import { SupermarketMap } from '@/features/shopping/SupermarketMap';
import { ChainLogo } from '@/features/shopping/ChainLogo';
import { LocationStatus } from '@/features/shopping/LocationStatus';
import type { Highlight, MapPost } from '@/features/shopping/LeafletMap';
import { chainBasket, formatDistance, formatPrice } from '@/features/shopping/pricing';
import { useCommunity } from '@/features/community/CommunityProvider';
import { Leaderboard } from '@/features/community/Leaderboard';
import { PostComposer, PostFeed } from '@/features/community/SocialFeed';
import { timeAgo } from '@/features/community/community-data';

export const Route = createFileRoute("/social")({
  head: () => ({ meta: [{ title: "Social · SHOPT" }] }),
  component: Social,
});

const RECENT = 2 * 60 * 60 * 1000;

function Social() {
  const { items, location, locating, locationError, locate, searchAddress, stores, storesLoading, storesSource, plan } = useShopping();
  const { allPosts, members, now } = useCommunity();
  const [address, setAddress] = useState('');
  const [showStores, setShowStores] = useState(true);
  const [showPosts, setShowPosts] = useState(true);
  const openItems = items.filter(item => !item.checked).length;

  // Negozi consigliati per ogni lista; senza lista evidenzio il supermercato più vicino
  const recommended = plan.plans.filter(entry => entry.store);
  const nearestSupermarket = stores?.find(store => store.chain.type === 'supermercato') ?? null;
  const highlights = useMemo(() => {
    const map = new Map<string, Highlight>();
    if (!recommended.length && nearestSupermarket) map.set(nearestSupermarket.id, { label: 'Supermercato più vicino', primary: true });
    recommended.forEach((entry, index) => map.set(entry.store!.id, { label: `Consigliato per ${entry.category.label.toLowerCase()}`, primary: index === 0 }));
    return map;
  }, [recommended.map(entry => entry.store!.id).join(), nearestSupermarket?.id]);

  // Ogni post è l'icona del sito con il colore dell'utente; più post ha l'utente, più è grande
  const mapPosts = useMemo<MapPost[]>(() => {
    const memberById = new Map(members.map(member => [member.id, member]));
    const counts = new Map<string, number>();
    allPosts.forEach(post => counts.set(post.memberId, (counts.get(post.memberId) ?? 0) + 1));
    return allPosts.map(post => {
      const count = counts.get(post.memberId) ?? 1;
      const member = memberById.get(post.memberId);
      return { id: post.id, lat: post.lat, lng: post.lng, color: member?.color ?? 'gray', name: member?.name ?? 'Utente', text: post.text, ago: timeAgo(post.createdAt, now), activity: count >= 3 ? 3 : count === 2 ? 2 : 1, recent: now - post.createdAt < RECENT };
    });
  }, [allPosts, members, now]);

  const toggle = (active: boolean, set: (value: boolean) => void, label: string, Icon: typeof StoreIcon) => (
    <button type="button" aria-pressed={active} onClick={() => set(!active)} className={`inline-flex h-9 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors ${active ? 'border-primary bg-primary/15 text-foreground' : 'bg-surface text-muted-foreground'}`}>
      <Icon className="size-4" />{label}
    </button>
  );

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:py-14">
      <Link to="/" className="mb-8 inline-flex items-center gap-2 rounded-full border bg-surface px-4 py-2 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary">
        <ArrowLeft className="size-4" />Torna alla home
      </Link>

      <header className="mb-8 flex items-center gap-5">
        <span className="tool-icon tool-icon--map tool-icon--small shrink-0"><MapPinned className="size-8" /></span>
        <div>
          <p className="label-mono mb-1 text-muted-foreground">02 / Social</p>
          <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">La mappa della community</h1>
        </div>
      </header>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <Button onClick={locate} disabled={locating} className="h-12 rounded-full px-6 text-base">
          {locating ? <LoaderCircle className="animate-spin" /> : <LocateFixed />}{locating ? 'Affino la posizione…' : 'Usa la mia posizione'}
        </Button>
        <form onSubmit={event => { event.preventDefault(); void searchAddress(address); }} className="flex flex-1 gap-2">
          <input aria-label="Città o indirizzo" value={address} maxLength={200} onChange={event => setAddress(event.target.value)} placeholder="Oppure scrivi un indirizzo, es. Via Zamboni 33, Bologna" className="h-12 min-w-0 flex-1 rounded-full border bg-surface px-5 text-base placeholder:text-muted-foreground focus:border-primary focus:outline-none" />
          <Button type="submit" variant="outline" disabled={locating || !address.trim()} aria-label="Cerca indirizzo" className="size-12 rounded-full bg-surface"><Search /></Button>
        </form>
      </div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <LocationStatus />
        <div className="flex gap-2" aria-label="Cosa mostrare sulla mappa">
          {toggle(showStores, setShowStores, 'Negozi', StoreIcon)}
          {toggle(showPosts, setShowPosts, 'Post', MessageCircle)}
        </div>
      </div>
      {locationError && <p role="alert" className="mb-4 text-sm text-destructive">{locationError}</p>}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="grid min-w-0 gap-6">
          {recommended.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2">
              {recommended.map((entry, index) => (
                <div key={entry.category.id} className={`es-card flex items-center gap-4 p-4 ${index === 0 ? 'es-card--glow' : ''}`}>
                  <ChainLogo chain={entry.chain!} size="lg" />
                  <div className="min-w-0 flex-1">
                    <p className="label-mono flex items-center gap-1 text-primary">{index === 0 && <Trophy className="size-3.5" />}{entry.category.label}</p>
                    <p className="truncate font-display text-lg font-semibold">{entry.store!.name} · {formatDistance(entry.store!.distance)}</p>
                    <p className="truncate text-xs text-muted-foreground">{entry.store!.address} · {entry.found}/{entry.open} prodotti</p>
                  </div>
                  <p className="shrink-0 font-display text-xl font-bold">{formatPrice(entry.total)}</p>
                </div>
              ))}
            </div>
          )}
          <div>
            <SupermarketMap center={location} stores={showStores ? stores : []} loading={storesLoading || (locating && !location)} highlights={highlights} posts={showPosts ? mapPosts : []} />
            {storesSource && storesSource !== 'osm' && <p className="mt-2 text-xs text-muted-foreground">{storesSource === 'demo' ? 'OpenStreetMap non ha risposto o non ha trovato catene note qui: mostro negozi dimostrativi.' : 'Alcuni tipi di negozio non sono su OpenStreetMap in questa zona: li completo con negozi dimostrativi.'}</p>}
            <p className="mt-2 text-xs text-muted-foreground">Ogni icona del carrello è un post di un utente: più è grande, più l'utente è attivo; quelle che pulsano sono delle ultime 2 ore.</p>
          </div>
          <div className="grid items-start gap-6 xl:grid-cols-2">
            <PostComposer />
            <PostFeed />
          </div>
        </div>
        <aside className="lg:sticky lg:top-24"><Leaderboard /></aside>
      </div>

      {stores && stores.length > 0 && (
        <section className="mt-12">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <h2 className="font-display text-3xl font-bold">Negozi vicini</h2>
            {!items.length && <Link to="/microfono" className="text-sm font-medium text-primary hover:underline">Crea una lista per confrontare i prezzi</Link>}
          </div>
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {stores.map(store => {
              const basket = openItems ? chainBasket(store.chain, items) : null;
              const highlight = highlights.get(store.id);
              return (
                <li key={store.id} className={`es-card flex items-center gap-4 p-5 ${highlight ? 'es-card--glow' : ''}`}>
                  <ChainLogo chain={store.chain} size="lg" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-lg font-semibold">{store.name}</p>
                    <p className="truncate text-sm text-muted-foreground">{store.address} · {formatDistance(store.distance)}</p>
                    {highlight ? <p className="mt-1 text-xs font-semibold text-primary">{highlight.label}</p> : store.source === 'demo' && <p className="mt-1 text-xs text-muted-foreground">Negozio dimostrativo</p>}
                  </div>
                  {basket && (
                    <div className="shrink-0 text-right">
                      <p className="font-display text-lg font-bold">{basket.found ? formatPrice(basket.total) : '—'}</p>
                      <p className="text-xs text-muted-foreground">{basket.found}/{openItems} prodotti</p>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
