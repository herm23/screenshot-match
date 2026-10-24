import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, MapPinned, Mic } from "lucide-react";
import { useShopping } from '@/features/shopping/ShoppingProvider';
import { Logo } from '@/components/Logo';
import { formatPrice } from '@/features/shopping/pricing';
import { WalletCard } from '@/features/community/WalletCard';
import { Mascot } from '@/features/community/Mascot';

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SHOPT — La spesa più conveniente vicino a te" },
      { name: "description", content: "Detta o scrivi la spesa: SHOPT la divide per negozio, confronta i prezzi e ti dice dove comprare tutto vicino a te." },
      { property: "og:title", content: "SHOPT — La spesa più conveniente vicino a te" },
      { property: "og:description", content: "Scrivi o detta la tua spesa e scopri le offerte dei supermercati vicini." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const TOOLS = [
  { to: '/microfono', index: '01', label: 'La tua spesa', hint: 'Detta, scrivi e confronta i prezzi', icon: Mic, iconClass: 'tool-icon--mic' },
  { to: '/social', index: '02', label: 'Social', hint: 'Negozi, post e classifica vicino a te', icon: MapPinned, iconClass: 'tool-icon--map' },
] as const;

function Index() {
  const { items, plan } = useShopping();
  return (
    <section className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center px-4 pb-32 pt-16 text-center">
      <h1 className="animate-rise mb-8 w-full max-w-md sm:max-w-lg"><Logo className="w-full" /></h1>
      <p className="es-title text-gradient animate-rise mb-4">Cosa vuoi comprare?</p>
      <p className="mx-auto mb-8 max-w-[34rem] text-lg text-muted-foreground">Scegli da dove partire: la tua spesa o la community vicino a te.</p>

      <div className="mb-8 flex w-full justify-center"><WalletCard /></div>

      <div className="grid w-full max-w-3xl gap-6 sm:grid-cols-2">
        {TOOLS.map(tool => (
          <Link key={tool.to} to={tool.to} className="tool-card">
            <span className="tool-index">{tool.index}</span>
            <span className={`tool-icon ${tool.iconClass}`}><tool.icon className="size-14" strokeWidth={1.75} /></span>
            <span className="tool-label">{tool.label}</span>
            <span className="tool-hint">{tool.hint}</span>
            <span className="tool-arrow"><ArrowRight className="size-4" /></span>
          </Link>
        ))}
      </div>

      {items.length > 0 && (
        <Link to="/microfono" className="mt-8 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">
          La tua lista: {items.length} {items.length === 1 ? 'prodotto' : 'prodotti'} · {formatPrice(plan.total)}<ArrowRight className="size-4" />
        </Link>
      )}
      <Mascot />
    </section>
  );
}
