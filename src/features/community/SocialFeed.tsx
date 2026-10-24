import { useState } from 'react';
import { Heart, MapPin, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useShopping } from '../shopping/ShoppingProvider';
import { formatDistance } from '../shopping/pricing';
import { MemberAvatar } from './ui';
import { useCommunity } from './CommunityProvider';
import { timeAgo } from './community-data';
import { COINS_PER_POST, REWARDED_POSTS_PER_DAY, formatCoins, rewardedPostsToday } from './rewards';

/** Modulo per pubblicare un post nel punto in cui ci si trova (o in un negozio vicino). */
export function PostComposer() {
  const { location, stores } = useShopping();
  const { publishPost, transactions } = useCommunity();
  const [text, setText] = useState('');
  const [storeId, setStoreId] = useState('');
  const [message, setMessage] = useState('');
  const nearby = (stores ?? []).filter(store => store.distance <= 2000).slice(0, 12);
  const left = REWARDED_POSTS_PER_DAY - rewardedPostsToday(transactions);
  const submit = () => {
    const result = publishPost(text, storeId || null);
    if (!result) return;
    setText('');
    setMessage(result.rewarded ? `Pubblicato! +${formatCoins(COINS_PER_POST)}` : 'Pubblicato! Per oggi hai già ricevuto tutti gli Shopcoin dei post.');
  };
  return (
    <form className="es-card grid gap-3 p-5" onSubmit={event => { event.preventDefault(); submit(); }}>
      <label htmlFor="post" className="font-display text-lg font-bold">Segnala un'offerta o un consiglio</label>
      <textarea id="post" value={text} onChange={event => { setText(event.target.value); setMessage(''); }} maxLength={280} rows={2}
        placeholder="Es. Fragole a 1,99 € la vaschetta, ne restano poche" className="resize-none rounded-2xl border bg-background px-4 py-3 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none" />
      <div className="flex flex-wrap items-center gap-2">
        <select aria-label="Dove ti trovi" value={storeId} onChange={event => setStoreId(event.target.value)} className="h-10 min-w-0 flex-1 rounded-full border bg-background px-4 text-sm">
          <option value="">La mia posizione</option>
          {nearby.map(store => <option key={store.id} value={store.id}>{store.name} · {formatDistance(store.distance)}</option>)}
        </select>
        <Button type="submit" disabled={!text.trim() || !location} className="h-10 rounded-full px-5"><Send />Pubblica</Button>
      </div>
      <p className="text-xs text-muted-foreground" role="status">
        {message || (!location ? 'Serve la posizione per pubblicare.' : left > 0 ? `+${formatCoins(COINS_PER_POST)} per ogni post (ancora ${left} oggi)` : 'Hai già ricevuto gli Shopcoin dei post di oggi: puoi comunque pubblicare.')}
      </p>
    </form>
  );
}

/** Post recenti della community, dal più nuovo. */
export function PostFeed({ limit = 8 }: { limit?: number }) {
  const { allPosts, members, liked, toggleLike, now } = useCommunity();
  const memberById = new Map(members.map(member => [member.id, member]));
  return (
    <section aria-label="Post della community" className="es-card overflow-hidden">
      <h2 className="border-b px-5 py-4 font-display text-xl font-bold">Ultimi post</h2>
      {!allPosts.length && <p className="px-5 py-6 text-sm text-muted-foreground">I post compaiono appena è nota la tua posizione.</p>}
      <ul className="divide-y">
        {allPosts.slice(0, limit).map(post => {
          const member = memberById.get(post.memberId);
          const isLiked = liked.includes(post.id);
          return (
            <li key={post.id} className="flex gap-3 px-5 py-4">
              <MemberAvatar color={member?.color ?? 'gray'} />
              <div className="min-w-0 flex-1">
                <p className="text-sm"><span className="font-semibold">{member?.name}</span> <span className="text-muted-foreground">· {timeAgo(post.createdAt, now)}</span></p>
                <p className="mt-0.5 break-words text-sm">{post.text}</p>
                {post.storeName && <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="size-3" />{post.storeName}</p>}
              </div>
              <button type="button" onClick={() => toggleLike(post.id)} aria-pressed={isLiked} aria-label={isLiked ? 'Togli mi piace' : 'Mi piace'}
                className={`flex h-8 shrink-0 items-center gap-1 self-start rounded-full px-2 text-xs ${isLiked ? 'text-[#c7392d]' : 'text-muted-foreground hover:text-foreground'}`}>
                <Heart className={`size-4 ${isLiked ? 'fill-current' : ''}`} />{post.likes + (isLiked ? 1 : 0)}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
