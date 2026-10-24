import type { Chain } from './catalog';

// Loghi presenti in ./logos (scaricati da scripts/update-catalog.ts); le catene senza logo mostrano l'iniziale
const LOGOS = Object.fromEntries(Object.entries(import.meta.glob<string>('./logos/*.png', { eager: true, query: '?url', import: 'default' }))
  .map(([path, url]) => [path.slice('./logos/'.length, -'.png'.length), url]));

const SIZES = { sm: 'size-6 rounded-md text-[0.7rem]', md: 'size-8 rounded-lg text-sm', lg: 'size-12 rounded-2xl text-lg' };

export function ChainLogo({ chain, size = 'md' }: { chain: Chain; size?: keyof typeof SIZES }) {
  const url = LOGOS[chain.id];
  if (!url) return <span title={chain.name} className={`grid shrink-0 place-items-center font-display font-bold text-white ${SIZES[size]}`} style={{ background: chain.color }}>{chain.name[0]}</span>;
  return (
    <span title={chain.name} className={`grid shrink-0 place-items-center overflow-hidden bg-white ring-1 ring-black/10 ${SIZES[size]}`}>
      <img src={url} alt="" className="size-[82%] object-contain" />
    </span>
  );
}

export const logoUrl = (chain: Chain) => LOGOS[chain.id] ?? null;
