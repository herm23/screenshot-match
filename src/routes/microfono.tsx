import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type KeyboardEvent } from "react";
import { ArrowLeft, CornerDownLeft, Mic, Square } from "lucide-react";
import { Button } from '@/components/ui/button';
import { useDictation } from '@/hooks/use-dictation';
import { useShopping } from '@/features/shopping/ShoppingProvider';
import { ShoppingLists } from '@/features/shopping/ShoppingLists';

export const Route = createFileRoute("/microfono")({
  head: () => ({ meta: [{ title: "La tua spesa · SHOPT" }] }),
  component: Microfono,
});

const EXAMPLES = ["due litri di latte, pane e sei uova", "pasta, passata e detersivo piatti", "auricolari, pile e una lampadina"];

function Microfono() {
  const { text, setText, addFromText } = useShopping();
  const [exampleIdx, setExampleIdx] = useState(0);
  const [message, setMessage] = useState('');
  const dictation = useDictation(text, setText);
  useEffect(() => {
    const t = setInterval(() => setExampleIdx((i) => (i + 1) % EXAMPLES.length), 3000);
    return () => clearInterval(t);
  }, []);

  const submit = () => {
    if (dictation.listening) dictation.toggle();
    const added = addFromText();
    setMessage(added ? '' : 'Non ho riconosciuto prodotti. Prova con "latte, pane e uova".');
  };
  // Invio aggiunge alla lista, Maiusc+Invio va a capo
  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) return;
    event.preventDefault();
    if (text.trim()) submit();
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:py-14">
      <Link to="/" className="mb-8 inline-flex items-center gap-2 rounded-full border bg-surface px-4 py-2 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary">
        <ArrowLeft className="size-4" />Torna alla home
      </Link>

      <header className="mb-8 flex items-center gap-5">
        <span className="tool-icon tool-icon--mic tool-icon--small shrink-0"><Mic className="size-8" /></span>
        <div>
          <p className="label-mono mb-1 text-muted-foreground">01 / La tua spesa</p>
          <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">Detta o scrivi la spesa</h1>
        </div>
      </header>

      <section className="es-card animate-rise mx-auto mb-10 max-w-3xl p-5 sm:p-8">
        <label htmlFor="spesa" className="text-muted-foreground">Cosa vuoi comprare?</label>
        <div className="mt-3 flex items-start gap-3">
          <textarea
            id="spesa"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKeyDown}
            maxLength={6000}
            readOnly={dictation.listening}
            rows={2}
            enterKeyHint="send"
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
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><CornerDownLeft className="size-3.5" />Premi Invio per aggiungere alla lista · Maiusc+Invio per andare a capo</p>
          <Button type="button" disabled={!text.trim()} onClick={submit} className="h-10 rounded-full px-5 disabled:opacity-35">Aggiungi alla lista</Button>
        </div>
        {dictation.supported === false && <p className="mt-2 text-sm text-muted-foreground">Il tuo browser non supporta la dettatura, scrivi pure qui sopra.</p>}
        {dictation.listening && <p className="label-mono mt-2 text-primary" role="status">Ti ascolto… premi di nuovo il microfono o Invio per aggiungere</p>}
        {dictation.error && <p role="alert" className="mt-2 text-sm text-destructive">{dictation.error}</p>}
        {message && <p role="alert" className="mt-3 text-sm text-destructive">{message}</p>}
      </section>

      <ShoppingLists />
    </div>
  );
}
