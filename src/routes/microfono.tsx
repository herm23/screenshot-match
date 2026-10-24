import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ListPlus, LoaderCircle, Mic, Square } from "lucide-react";
import { Button } from '@/components/ui/button';
import { useDictation } from '@/hooks/use-dictation';
import { useShopping } from '@/features/shopping/ShoppingProvider';
import { ShoppingList } from '@/features/shopping/ShoppingList';
import { OffersPanel } from '@/features/shopping/OffersPanel';

export const Route = createFileRoute("/microfono")({
  head: () => ({ meta: [{ title: "Microfono · Easy Shop" }] }),
  component: Microfono,
});

const EXAMPLES = ["due litri di latte, pane e sei uova", "un pacco di pasta e la passata", "detersivo e carta igienica"];

function Microfono() {
  const { text, setText, items, setItems, generating, generateList } = useShopping();
  const [exampleIdx, setExampleIdx] = useState(0);
  const [message, setMessage] = useState('');
  const results = useRef<HTMLElement>(null);
  const dictation = useDictation(text, setText);
  useEffect(() => {
    const t = setInterval(() => setExampleIdx((i) => (i + 1) % EXAMPLES.length), 3000);
    return () => clearInterval(t);
  }, []);

  const submit = async () => {
    if (dictation.listening) dictation.toggle();
    setMessage('');
    const found = await generateList();
    if (!found) { setMessage('Non ho riconosciuto prodotti. Prova con "latte, pane e uova".'); return; }
    requestAnimationFrame(() => results.current?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' }));
  };

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:py-14">
      <Link to="/" className="mb-8 inline-flex items-center gap-2 rounded-full border bg-surface px-4 py-2 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary">
        <ArrowLeft className="size-4" />Torna alla home
      </Link>

      <header className="mb-8 flex items-center gap-5">
        <span className="tool-icon tool-icon--mic tool-icon--small shrink-0"><Mic className="size-8" /></span>
        <div>
          <p className="label-mono mb-1 text-muted-foreground">01 / Microfono</p>
          <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">Detta la tua spesa</h1>
        </div>
      </header>

      <section className="es-card animate-rise mx-auto max-w-3xl p-5 sm:p-8">
        <p className="text-muted-foreground">Cosa vuoi comprare?</p>
        <div className="mt-3 flex items-start gap-3">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            aria-label="Cosa vuoi comprare?"
            maxLength={6000}
            readOnly={dictation.listening}
            rows={3}
            placeholder={`Dimmi cosa cerchi… es. ${EXAMPLES[exampleIdx]}`}
            className="min-w-0 flex-1 resize-none rounded-2xl border bg-background px-4 py-3 text-base placeholder:text-muted-foreground focus:border-primary focus:outline-none"
          />
          {dictation.supported !== false && (
            <button
              type="button"
              onClick={dictation.toggle}
              aria-label={dictation.listening ? 'Ferma dettatura' : 'Detta con il microfono'}
              title={dictation.listening ? 'Ferma dettatura' : 'Detta con il microfono'}
              aria-pressed={dictation.listening}
              className={`grid size-14 shrink-0 place-items-center rounded-full border transition-colors ${
                dictation.listening ? "animate-mic-pulse border-primary bg-primary text-primary-foreground" : "bg-surface hover:border-primary hover:text-primary"
              }`}
            >
              {dictation.listening ? <Square className="size-5" /> : <Mic className="size-5" />}
            </button>
          )}
        </div>
        {dictation.supported === false && <p className="mt-2 text-sm text-muted-foreground">Il tuo browser non supporta la dettatura, scrivi pure qui sopra.</p>}
        {dictation.listening && <p className="label-mono mt-2 text-primary" role="status">Ti ascolto…</p>}
        {dictation.error && <p role="alert" className="mt-2 text-sm text-destructive">{dictation.error}</p>}
        <Button
          type="button"
          disabled={!text.trim() || generating}
          onClick={() => void submit()}
          className="mt-5 h-12 w-full rounded-full text-base disabled:opacity-35"
        >
          {generating ? <LoaderCircle className="animate-spin" /> : <ListPlus />}{generating ? 'Creo la lista…' : 'Crea la lista e trova le offerte'}
        </Button>
        {message && <p role="alert" className="mt-3 text-sm text-destructive">{message}</p>}
      </section>

      <section ref={results} className="mt-12 grid scroll-mt-20 items-start gap-8 md:grid-cols-2">
        <div>
          <p className="label-mono mb-2 text-muted-foreground">La tua spesa</p>
          <h2 className="mb-5 font-display text-3xl font-bold">Lista della spesa</h2>
          <div className="es-card p-5"><ShoppingList items={items} onChange={setItems} /></div>
        </div>
        <div className="md:sticky md:top-24">
          <p className="label-mono mb-2 text-muted-foreground">Offerte</p>
          <h2 className="mb-5 font-display text-3xl font-bold">Le migliori offerte</h2>
          <OffersPanel items={items} />
        </div>
      </section>
    </div>
  );
}
