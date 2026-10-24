import { useState } from 'react';
import { Trophy } from 'lucide-react';
import { MemberAvatar } from './ui';
import { useCommunity } from './CommunityProvider';
import { formatCoins } from './rewards';

type Metric = 'earned' | 'balance';
const METRICS: { id: Metric; label: string; hint: string }[] = [
  { id: 'earned', label: 'Storico', hint: 'Crediti guadagnati in totale, senza contare quelli spesi' },
  { id: 'balance', label: 'Saldo', hint: 'Crediti disponibili adesso' },
];
const MEDALS = ['#f2b921', '#b8c2cc', '#d08a4c'];

/** Classifica degli utenti per crediti guadagnati (storico) o saldo attuale. */
export function Leaderboard() {
  const { members, allPosts, ready } = useCommunity();
  const [metric, setMetric] = useState<Metric>('earned');
  const ranked = [...members].sort((a, b) => b[metric] - a[metric] || a.name.localeCompare(b.name));
  const postsBy = (id: string) => allPosts.filter(post => post.memberId === id).length;
  return (
    <section aria-label="Classifica" className="es-card overflow-hidden">
      <header className="border-b px-5 py-4">
        <h2 className="flex items-center gap-2 font-display text-xl font-bold"><Trophy className="size-5 text-accent-2" />Classifica</h2>
        <div role="tablist" aria-label="Ordina la classifica" className="mt-3 grid grid-cols-2 gap-1 rounded-full bg-muted p-1">
          {METRICS.map(entry => (
            <button key={entry.id} type="button" role="tab" aria-selected={metric === entry.id} title={entry.hint} onClick={() => setMetric(entry.id)}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${metric === entry.id ? 'bg-surface text-foreground shadow' : 'text-muted-foreground hover:text-foreground'}`}>
              {entry.label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">{METRICS.find(entry => entry.id === metric)!.hint}</p>
      </header>
      <ol className="divide-y">
        {ranked.map((member, index) => (
          <li key={member.id} className={`flex items-center gap-3 px-5 py-3 ${member.me ? 'bg-primary/10' : ''}`}>
            <span className="grid w-6 shrink-0 place-items-center font-display text-sm font-bold" style={index < 3 ? { color: MEDALS[index] } : undefined}>{index + 1}</span>
            <MemberAvatar color={member.color} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{member.name}{member.me && <span className="ml-1.5 rounded-full bg-primary px-1.5 py-0.5 text-[0.65rem] font-semibold text-primary-foreground">tu</span>}</p>
              <p className="text-xs text-muted-foreground">{postsBy(member.id)} post vicino a te</p>
            </div>
            <div className="shrink-0 text-right">
              <p className="font-display font-bold">{member.me && !ready ? '—' : formatCoins(member[metric])}</p>
              <p className="text-[0.7rem] text-muted-foreground">{metric === 'earned' ? `saldo ${formatCoins(member.balance)}` : `storico ${formatCoins(member.earned)}`}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
