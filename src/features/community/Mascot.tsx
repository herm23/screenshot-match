import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, X } from 'lucide-react';
import { CoinIcon } from './ui';
import { useCommunity } from './CommunityProvider';
import { COINS_PER_POST, VOUCHERS, WELCOME_BONUS, formatCoins } from './rewards';

const STEPS = [
  { title: 'Ciao, sono Shoppy!', text: `Con SHOPT guadagni Shopcoin, la nostra moneta virtuale. Per iniziare te ne ho regalati ${WELCOME_BONUS}.` },
  { title: 'Come si guadagnano', text: `1 SC per ogni euro speso alla cassa e ${COINS_PER_POST} SC per ogni post sulla mappa Social, quando segnali un'offerta o un consiglio.` },
  { title: 'Come si usano', text: `Nel portafoglio trasformi gli Shopcoin in buoni sconto: ${VOUCHERS.map(voucher => `${voucher.value} € con ${formatCoins(voucher.cost)}`).join(', ')}. I buoni si sommano tra loro.` },
  { title: 'Alla cassa', text: 'Apri il portafoglio e mostra il QR del tuo profilo: il cassiere lo scansiona, i buoni vengono scalati dal totale e ricevi i nuovi Shopcoin.' },
];

/** Mascotte in basso a destra: alla prima visita racconta in una vignetta come funzionano gli Shopcoin. */
export function Mascot() {
  const { ready, tutorialSeen, setTutorialSeen } = useCommunity();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (!ready || tutorialSeen) return;
    const timer = setTimeout(() => setOpen(true), 900);
    return () => clearTimeout(timer);
  }, [ready, tutorialSeen]);
  const close = () => { setOpen(false); setStep(0); setTutorialSeen(); };
  const current = STEPS[step]!;
  const last = step === STEPS.length - 1;

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-30 flex flex-col items-end gap-2 sm:bottom-6 sm:right-6">
      {open && (
        <div role="dialog" aria-label="Tutorial Shopcoin" className="es-bubble pointer-events-auto relative w-[min(22rem,calc(100vw-2rem))] p-5 animate-rise">
          <button type="button" onClick={close} aria-label="Chiudi il tutorial" className="absolute right-3 top-3 grid size-8 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"><X className="size-4" /></button>
          <div className="mb-2 flex items-center gap-2 pr-8">
            <CoinIcon size="sm" />
            <p className="font-display text-lg font-bold">{current.title}</p>
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">{current.text}</p>
          <div className="mt-4 flex items-center justify-between gap-3">
            <div className="flex gap-1.5" aria-label={`Passo ${step + 1} di ${STEPS.length}`}>
              {STEPS.map((_, index) => <span key={index} className={`h-1.5 rounded-full transition-all ${index === step ? 'w-5 bg-primary' : 'w-1.5 bg-muted-foreground/40'}`} />)}
            </div>
            <div className="flex gap-2">
              {step > 0 && <button type="button" onClick={() => setStep(step - 1)} aria-label="Indietro" className="grid size-9 place-items-center rounded-full border hover:border-primary hover:text-primary"><ArrowLeft className="size-4" /></button>}
              <button type="button" onClick={() => last ? close() : setStep(step + 1)} className="inline-flex h-9 items-center gap-1.5 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90">
                {last ? 'Ho capito' : <>Avanti<ArrowRight className="size-4" /></>}
              </button>
            </div>
          </div>
          {!last && <button type="button" onClick={close} className="mt-3 text-xs text-muted-foreground underline-offset-2 hover:underline">Salta il tutorial</button>}
        </div>
      )}
      <button type="button" onClick={() => open ? close() : setOpen(true)} aria-label={open ? 'Chiudi il tutorial' : 'Apri il tutorial degli Shopcoin'} aria-expanded={open} className="es-mascot pointer-events-auto grid size-16 place-items-center rounded-full bg-surface p-1.5 sm:size-20">
        <img src="/icon-192.png" alt="" className="size-full object-contain" />
      </button>
    </div>
  );
}
