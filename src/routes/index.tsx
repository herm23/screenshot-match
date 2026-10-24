import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from '@tanstack/react-start';
import { ArrowDown, MapPin, Mic, Square, ListPlus, LoaderCircle, LogOut, UserRound, X, Check } from "lucide-react";
import { Button } from '@/components/ui/button';
import { useDictation } from '@/hooks/use-dictation';
import { useShoppingAuth } from '@/features/shopping/AuthProvider';
import { ShoppingList } from '@/features/shopping/ShoppingList';
import { SupermarketMap } from '@/features/shopping/SupermarketMap';
import type { ShoppingItem } from '@/features/shopping/models';
import { extractShoppingList, saveShoppingList, saveProfile } from '@/lib/shopping.functions';
import { useShoppingLocation } from '@/hooks/use-shopping-location';

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

const EXAMPLES = ["latte, pane, uova", "pasta in offerta", "detersivo"];

function Index() {
  const [text, setText] = useState("");
  const [exampleIdx, setExampleIdx] = useState(0);
  const [searched, setSearched] = useState<string | null>(null);
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [mapOpen, setMapOpen] = useState(false);
  const [address, setAddress] = useState('');
  const [generating, setGenerating] = useState(false);
  const [listError, setListError] = useState('');
  const [saveStatus, setSaveStatus] = useState('');
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [profileError, setProfileError] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const section = useRef<HTMLElement>(null);
  const mapSection = useRef<HTMLDivElement>(null);
  const requestVersion = useRef(0);
  const pendingSave = useRef<ShoppingItem[] | null>(null);
  const saving = useRef(false);
  const auth = useShoppingAuth();
  const location = useShoppingLocation(auth.user?.id);
  const { center, locationLabel, places, loading: mapLoading, error: mapError } = location;
  const dictation = useDictation(text, setText);
  const extract = useServerFn(extractShoppingList);
  const save = useServerFn(saveShoppingList);
  const updateProfile = useServerFn(saveProfile);
  useEffect(() => {
    const t = setInterval(() => setExampleIdx((i) => (i + 1) % EXAMPLES.length), 3000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => { setItems(auth.savedItems); }, [auth.savedItems]);
  useEffect(() => {
    requestVersion.current += 1;
    setText(''); setSearched(null); setListError(''); setSaveStatus(''); pendingSave.current = null;
  }, [auth.user?.id]);
  const scrollTo = (element: HTMLElement | null) => element?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  const askLocation = () => {
    setMapOpen(true);
    requestAnimationFrame(() => scrollTo(mapSection.current));
    location.askLocation();
  };
  const searchAddress = () => location.searchAddress(address);
  const correctLocation = () => { location.setCorrectionOpen(true); setMapOpen(true); requestAnimationFrame(() => scrollTo(mapSection.current)); };
  const flushSave = async () => {
    if (saving.current || !auth.user) return;
    saving.current = true;
    setSaveStatus('Salvataggio…');
    try {
      while (pendingSave.current) { const next = pendingSave.current; pendingSave.current = null; await save({ data: next }); }
      setSaveStatus('Lista salvata');
    } catch (error) { setSaveStatus(''); setListError(error instanceof Error ? error.message : 'Non riesco a salvare la lista.'); }
    finally { saving.current = false; }
  };
  const changeItems = (next: ShoppingItem[]) => {
    setItems(next); setListError('');
    if (auth.user) { pendingSave.current = next; void flushSave(); }
  };
  const generateList = async () => {
    if (!auth.user || !text.trim() || generating) return;
    setGenerating(true); setListError('');
    const identity = auth.user.id;
    const version = requestVersion.current;
    try {
      const result = await extract({ data: { text } });
      if (identity !== auth.user.id || version !== requestVersion.current) return;
      if (result.error) { setListError(result.error); return; }
      changeItems(result.items);
      requestAnimationFrame(() => scrollTo(section.current));
    } catch { setListError('Non riesco a creare la lista. Il testo è conservato: riprova.'); }
    finally { setGenerating(false); }
  };
  const canSearch = text.trim().length > 0;
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[1080px] flex-col px-4 py-8 sm:py-16">
      <div className="mx-auto mb-4 flex w-full max-w-[640px] flex-wrap items-center justify-end gap-2">
        {auth.ready && (auth.user ? <><Button variant="ghost" size="sm" onClick={() => { setProfileName(auth.profile?.display_name ?? ''); setProfileOpen(value => !value); }}><UserRound />{auth.profile?.display_name || 'Il mio profilo'}</Button><Button variant="ghost" size="icon" aria-label="Esci" title="Esci" onClick={() => void auth.signOut()}><LogOut /></Button></> : <Button variant="outline" size="sm" onClick={() => void auth.signIn()}><UserRound />Accedi con Google</Button>)}
      </div>
      {auth.error && <p role="alert" className="mx-auto mb-4 w-full max-w-[640px] text-sm text-destructive">{auth.error}</p>}
      {profileOpen && auth.user && <form className="mx-auto mb-5 grid w-full max-w-[640px] gap-3 border-y py-4" onSubmit={async event => { event.preventDefault(); setProfileSaving(true); setProfileError(''); try { const result = await updateProfile({ data: { display_name: profileName } }); auth.setProfileName(result.display_name); setProfileOpen(false); } catch { setProfileError('Non riesco a salvare il nome. Riprova.'); } finally { setProfileSaving(false); } }}>
        <div className="flex items-center justify-between"><h2 className="font-medium">Il mio profilo</h2><Button type="button" variant="ghost" size="icon" aria-label="Chiudi profilo" onClick={() => setProfileOpen(false)}><X /></Button></div>
        <label className="text-sm">Nome<input required maxLength={100} value={profileName} onChange={event => setProfileName(event.target.value)} className="mt-2 w-full rounded-md border bg-surface px-3 py-2" /></label>
        {profileError && <p role="alert" className="text-sm text-destructive">{profileError}</p>}<Button type="submit" disabled={profileSaving || !profileName.trim()}><Check />{profileSaving ? 'Salvataggio…' : 'Salva profilo'}</Button>
      </form>}
      <section className="animate-rise mx-auto w-full max-w-[640px] rounded-lg border bg-surface p-5 sm:p-8">
        <p className="label-mono mb-6 text-muted-foreground">01/ Cerca</p>

        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="font-display text-5xl font-extrabold leading-none tracking-tight sm:text-6xl">
              Easy <span className="font-serif text-[1.1em] font-normal italic">Shop</span>
            </h1>
            {locationLabel && (
              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1"><p className="label-mono animate-rise inline-flex items-center gap-1.5 text-muted-foreground">
                <span
                  className="size-1.5 rounded-full bg-primary"
                />
                {locationLabel}
              </p><span className="text-xs text-muted-foreground">{location.sourceLabel}</span>{location.estimated && <Button variant="link" className="h-auto px-0 py-1 text-sm" onClick={correctLocation}>Non è corretta?</Button>}</div>
            )}
            {location.estimating && <p role="status" className="mt-3 text-sm text-muted-foreground">Stimo la posizione…</p>}
          </div>
          <Button
            type="button"
            onClick={() => { setMapOpen(true); requestAnimationFrame(() => scrollTo(mapSection.current)); }}
            variant="outline"
            disabled={mapLoading}
            aria-label="Mappe"
            title="Apri la mappa"
            className="h-12 shrink-0 px-3"
          >
            {mapLoading ? <LoaderCircle className="animate-spin" /> : <MapPin className="size-5" />}<span className="hidden sm:inline">Mappe</span>
          </Button>
        </div>

        {location.showPrecisionPrompt && <div className="mt-3 flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground"><span>Vuoi risultati più precisi?</span><Button variant="link" className="h-auto px-0 py-1" onClick={askLocation} disabled={location.locating}><MapPin />Usa la mia posizione</Button></div>}
        {location.locationError && <p role="status" className="mt-3 text-sm text-muted-foreground">{location.locationError}</p>}
        <p className="mt-6 text-muted-foreground">Cosa vuoi comprare?</p>

        <div className="mt-3 flex items-start gap-3">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            aria-label="Cosa vuoi comprare?"
            maxLength={6000}
            readOnly={dictation.listening}
            rows={3}
            placeholder={`Dimmi cosa cerchi… es. ${EXAMPLES[exampleIdx]}`}
            className="min-w-0 flex-1 resize-none rounded-md border bg-background px-4 py-3 text-base placeholder:text-muted-foreground focus:border-primary focus:outline-none"
          />
          {dictation.supported !== false && (
            <Button
              type="button"
              variant="outline"
              onClick={dictation.toggle}
              aria-label={dictation.listening ? 'Ferma dettatura' : 'Detta con il microfono'}
              title={dictation.listening ? 'Ferma dettatura' : 'Detta con il microfono'}
              aria-pressed={dictation.listening}
              className={`flex size-14 shrink-0 items-center justify-center rounded-full border transition-colors ${
                dictation.listening ? "animate-mic-pulse border-primary bg-primary text-primary-foreground" : "hover:bg-muted"
              }`}
            >
              {dictation.listening ? <Square className="size-5" /> : <Mic className="size-5" />}
            </Button>
          )}
        </div>
        {dictation.supported === false && (
          <p className="mt-2 text-sm text-muted-foreground">
            Il tuo browser non supporta la dettatura, scrivi pure qui sopra.
          </p>
        )}
        {dictation.listening && <p className="label-mono mt-2 text-primary" role="status">Ti ascolto…</p>}
        {dictation.error && <p role="alert" className="mt-2 text-sm text-destructive">{dictation.error}</p>}
        <Button
          type="button"
          disabled={!canSearch}
          onClick={() => setSearched(text.trim())}
          className="mt-5 w-full rounded-md bg-primary px-4 py-3 font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-35"
        >
          Cerca offerte
        </Button>
        <Button variant="outline" className="mt-3 h-auto min-h-11 w-full whitespace-normal py-3" disabled={!canSearch || generating || dictation.listening || !auth.ready} onClick={() => auth.user ? void generateList() : void auth.signIn()}>
          {generating ? <LoaderCircle className="animate-spin" /> : <ListPlus />}{generating ? 'Creo la lista…' : 'Crea lista della spesa'}
        </Button>
        {!auth.user && auth.ready && <p className="mt-2 text-center text-sm text-muted-foreground">Accedi con Google per creare e salvare la lista.</p>}
        {listError && <p role="alert" className="mt-3 text-sm text-destructive">{listError}</p>}
      </section>

      {(mapOpen || location.correctionOpen) && <div ref={mapSection} className="mx-auto mt-6 w-full max-w-[640px] scroll-mt-6">
        <div className="mb-3 flex items-center justify-between gap-3"><h2 className="font-display text-xl font-bold">Supermercati vicini</h2><Button variant="ghost" size="icon" aria-label="Chiudi mappa" onClick={() => { setMapOpen(false); location.setCorrectionOpen(false); }}><X /></Button></div>
        <SupermarketMap center={center} places={places} loading={mapLoading} locationLabel={locationLabel} />
        {mapError && <p role="alert" className="mt-3 text-sm text-destructive">{mapError}</p>}
        {locationLabel ? <p className="mt-3 text-sm text-muted-foreground">{locationLabel} · {location.sourceLabel}</p> : !location.estimating && <p className="mt-3 text-sm text-muted-foreground">Posizione non disponibile. Inserisci una città o un indirizzo.</p>}
        <form onSubmit={event => { event.preventDefault(); void searchAddress(); }} className="mt-3 flex gap-2"><input aria-label="Città o indirizzo" value={address} maxLength={200} onChange={event => setAddress(event.target.value)} placeholder="Città o indirizzo" className="min-w-0 flex-1 rounded-md border bg-surface px-3 py-2 text-sm" /><Button type="submit" disabled={!address.trim() || mapLoading || !auth.user}>Cerca</Button></form>
        {location.permission !== 'denied' && <Button variant="outline" className="mt-3" onClick={askLocation} disabled={location.locating}><MapPin />{location.locating ? 'Cerco la posizione…' : 'Usa posizione precisa'}</Button>}
        {!auth.user && <Button className="mt-3 w-full" variant="outline" onClick={() => void auth.signIn()}>Accedi con Google per cercare supermercati</Button>}
      </div>}

      <div className="flex justify-center py-6 text-muted-foreground" aria-hidden>
        <ArrowDown className="size-5" />
      </div>

      {searched && (
        <section
          key={searched}
          className="animate-rise mx-auto w-full max-w-[640px] rounded-lg border border-dashed p-8 text-center"
          aria-live="polite"
        >
          <p className="label-mono mb-2 text-muted-foreground">02/ Offerte</p>
          <p className="text-muted-foreground">
            Qui vedrai le offerte per:{" "}
            <span className="font-serif text-xl italic text-foreground">{searched}</span>
          </p>
        </section>
      )}
      <section ref={section} className="mt-6 scroll-mt-6 border-t pt-8">
        <p className="label-mono mb-3 text-muted-foreground">03/ La tua spesa</p>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3"><h2 className="font-display text-3xl font-bold">Lista della spesa</h2><span role="status" className="text-sm text-muted-foreground">{saveStatus}</span></div>
        <div className="grid items-start gap-8 md:grid-cols-2">
          <div><ShoppingList items={items} onChange={changeItems} />{listError && <div className="mt-3"><p role="alert" className="text-sm text-destructive">{listError}</p>{auth.user && <Button variant="outline" className="mt-2" onClick={() => { pendingSave.current = items; setListError(''); void flushSave(); }}>Riprova a salvare</Button>}</div>}</div>
          <aside className="md:sticky md:top-6"><div className="mb-3 flex items-center justify-between"><h3 className="font-medium">Dove fare la spesa</h3><Button variant="outline" size="sm" onClick={location.permission === 'denied' ? correctLocation : askLocation} disabled={location.locating}><MapPin />Posizione</Button></div><SupermarketMap center={center} places={places} loading={mapLoading} locationLabel={locationLabel} />{mapError && <p role="alert" className="mt-3 text-sm text-destructive">{mapError}</p>}<Button variant="link" className="mt-2 h-auto px-0 whitespace-normal" onClick={correctLocation}>Inserisci città o indirizzo</Button></aside>
        </div>
      </section>
    </main>
  );
}
