import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowDown, MapPin, Mic } from "lucide-react";

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

type GeoState = "idle" | "loading" | "ok" | "denied";

function Index() {
  const [text, setText] = useState("");
  const [exampleIdx, setExampleIdx] = useState(0);
  const [geo, setGeo] = useState<GeoState>("idle");
  const [city, setCity] = useState<string | null>(null);
  const [listening, setListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState<boolean | null>(null);
  const [searched, setSearched] = useState<string | null>(null);
  const recRef = useRef<any>(null);

  useEffect(() => {
    const w = window as any;
    setSpeechSupported(!!(w.SpeechRecognition || w.webkitSpeechRecognition));
    const t = setInterval(() => setExampleIdx((i) => (i + 1) % EXAMPLES.length), 3000);
    return () => clearInterval(t);
  }, []);

  const askLocation = () => {
    if (!("geolocation" in navigator)) return setGeo("denied");
    setGeo("loading");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setGeo("ok");
        try {
          const { latitude, longitude } = pos.coords;
          const r = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=it`,
          );
          const d = await r.json();
          setCity(d.city || d.locality || null);
        } catch {
          /* resta "Posizione attiva" */
        }
      },
      () => setGeo("denied"),
    );
  };

  const toggleMic = () => {
    if (listening) {
      recRef.current?.stop();
      return;
    }
    const w = window as any;
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.lang = "it-IT";
    rec.interimResults = true;
    rec.continuous = false;
    const base = text.trim();
    rec.onresult = (e: any) => {
      let t = "";
      for (let i = 0; i < e.results.length; i++) t += e.results[i][0].transcript;
      setText(base ? `${base} ${t}` : t);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    setListening(true);
    rec.start();
  };

  const canSearch = text.trim().length > 0;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[640px] flex-col px-4 py-8 sm:py-16">
      <section className="animate-rise rounded-lg border bg-surface p-5 sm:p-8">
        <p className="label-mono mb-6 text-muted-foreground">01/ Cerca</p>

        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="font-display text-5xl font-extrabold leading-none tracking-tight sm:text-6xl">
              Easy <span className="font-serif text-[1.1em] font-normal italic">Shop</span>
            </h1>
            {geo !== "idle" && (
              <p className="label-mono animate-rise mt-3 inline-flex items-center gap-1.5 text-muted-foreground">
                <span
                  className={`size-1.5 rounded-full ${geo === "ok" ? "bg-primary" : "bg-muted-foreground"}`}
                />
                {geo === "loading" && "Cerco la posizione…"}
                {geo === "ok" && (city ?? "Posizione attiva")}
                {geo === "denied" && "Posizione non disponibile"}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={askLocation}
            aria-label="Usa la mia posizione"
            className={`flex size-12 shrink-0 items-center justify-center rounded-md border transition-colors hover:bg-muted ${geo === "ok" ? "text-primary" : ""}`}
          >
            <MapPin className="size-5" />
          </button>
        </div>

        <p className="mt-6 text-muted-foreground">Cosa vuoi comprare?</p>

        <div className="mt-3 flex items-start gap-3">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            placeholder={`Dimmi cosa cerchi… es. ${EXAMPLES[exampleIdx]}`}
            className="min-w-0 flex-1 resize-none rounded-md border bg-background px-4 py-3 text-base placeholder:text-muted-foreground focus:border-primary focus:outline-none"
          />
          {speechSupported !== false && (
            <button
              type="button"
              onClick={toggleMic}
              aria-label="Detta con il microfono"
              aria-pressed={listening}
              className={`flex size-14 shrink-0 items-center justify-center rounded-full border transition-colors ${
                listening ? "animate-mic-pulse border-primary bg-primary text-primary-foreground" : "hover:bg-muted"
              }`}
            >
              <Mic className="size-5" />
            </button>
          )}
        </div>
        {speechSupported === false && (
          <p className="mt-2 text-sm text-muted-foreground">
            Il tuo browser non supporta la dettatura, scrivi pure qui sopra.
          </p>
        )}
        {listening && <p className="label-mono mt-2 text-primary">Ti ascolto…</p>}

        <button
          type="button"
          disabled={!canSearch}
          onClick={() => setSearched(text.trim())}
          className="mt-5 w-full rounded-md bg-primary px-4 py-3 font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-35"
        >
          Cerca offerte
        </button>
      </section>

      <div className="flex justify-center py-6 text-muted-foreground" aria-hidden>
        <ArrowDown className="size-5" />
      </div>

      {searched && (
        <section
          key={searched}
          className="animate-rise rounded-lg border border-dashed p-8 text-center"
          aria-live="polite"
        >
          <p className="label-mono mb-2 text-muted-foreground">02/ Offerte</p>
          <p className="text-muted-foreground">
            Qui vedrai le offerte per:{" "}
            <span className="font-serif text-xl italic text-foreground">{searched}</span>
          </p>
        </section>
      )}
    </main>
  );
}
