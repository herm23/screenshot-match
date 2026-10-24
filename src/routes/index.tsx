import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, MapPinned, Mic } from "lucide-react";
import { useShopping } from '@/features/shopping/ShoppingProvider';

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Easy Shop — Le offerte dei supermercati vicino a te" },
      { name: "description", content: "Dimmi cosa vuoi comprare e trova le migliori offerte nei supermercati vicini." },
      { property: "og:title", content: "Easy Shop — Le offerte vicino a te" },
      { property: "og:description", content: "Scrivi o detta la tua spesa e scopri le offerte dei supermercati vicini." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const TOOLS = [
  { to: '/microfono', index: '01', label: 'Microfono', hint: 'Detta o scrivi la spesa', icon: Mic, iconClass: 'tool-icon--mic' },
  { to: '/mappa', index: '02', label: 'Mappa', hint: 'Supermercati entro 2 km', icon: MapPinned, iconClass: 'tool-icon--map' },
] as const;

function Index() {
  const { items } = useShopping();
  return (
    <section className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center px-4 py-16 text-center">
      <span className="es-eyebrow animate-rise mb-6">Easy Shop</span>
      <h1 className="es-title text-gradient animate-rise mb-4">Cosa vuoi comprare?</h1>
      <p className="mx-auto mb-8 max-w-[34rem] text-lg text-muted-foreground">Scegli da dove partire: la tua voce o i supermercati vicino a te.</p>

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
          La tua lista: {items.length} {items.length === 1 ? 'prodotto' : 'prodotti'}<ArrowRight className="size-4" />
        </Link>
      )}
    </section>
  );
}
