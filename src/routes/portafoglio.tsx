import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowDownLeft, ArrowLeft, ArrowUpRight, Check, Gift, ScanLine, Ticket } from "lucide-react";
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatPrice } from '@/features/shopping/pricing';
import { useShopping } from '@/features/shopping/ShoppingProvider';
import { useCommunity } from '@/features/community/CommunityProvider';
import { Mascot } from '@/features/community/Mascot';
import { CoinIcon, QrCode } from '@/features/community/ui';
import { EURO_PER_COIN, VOUCHERS, checkout, formatCoins } from '@/features/community/rewards';

export const Route = createFileRoute("/portafoglio")({
  head: () => ({ meta: [{ title: "Portafoglio · SHOPT" }] }),
  component: Portafoglio,
});

const KIND_LABEL = { benvenuto: 'Bonus', spesa: 'Spesa', post: 'Post', riscatto: 'Buono' };

function CheckoutDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { plan, stores } = useShopping();
  const { vouchers, payAtCheckout } = useCommunity();
  const suggestedStore = plan.plans.find(entry => entry.store)?.store?.name ?? stores?.find(store => store.chain.type === 'supermercato')?.name ?? 'Supermercato';
  const [amount, setAmount] = useState(() => (plan.total || 25).toFixed(2).replace('.', ','));
  const [store, setStore] = useState(suggestedStore);
  const [done, setDone] = useState<ReturnType<typeof payAtCheckout> | null>(null);
  const value = Number(amount.replace(',', '.'));
  const valid = Number.isFinite(value) && value > 0 && value < 10000;
  const preview = valid ? checkout(value, vouchers) : null;
  const close = () => { setDone(null); onClose(); };
  return (
    <Dialog open={open} onOpenChange={next => { if (!next) close(); }}>
      <DialogContent className="block max-w-md rounded-3xl border bg-surface p-6 sm:rounded-3xl">
        <DialogHeader className="mb-4 text-left">
          <DialogTitle className="flex items-center gap-2 font-display text-2xl font-bold"><ScanLine className="size-6 text-primary" />Scansione alla cassa</DialogTitle>
          <DialogDescription>Simulazione per la demo: è quello che succede quando il cassiere scansiona il QR del tuo profilo.</DialogDescription>
        </DialogHeader>
        {done ? (
          <div className="grid gap-3 text-center">
            <span className="mx-auto grid size-14 place-items-center rounded-full bg-primary text-primary-foreground"><Check className="size-7" /></span>
            <p className="font-display text-xl font-bold">Pagati {formatPrice(done.paid)}</p>
            {done.discount > 0 && <p className="text-sm text-muted-foreground">{done.used.length} {done.used.length === 1 ? 'buono usato' : 'buoni usati'}: −{formatPrice(done.discount)}</p>}
            <p className="flex items-center justify-center gap-2 font-semibold text-primary"><CoinIcon size="sm" />+{formatCoins(done.coins)} accreditati</p>
            <Button onClick={close} className="mt-2 h-11 rounded-full">Fatto</Button>
          </div>
        ) : (
          <form className="grid gap-3" onSubmit={event => { event.preventDefault(); if (valid) setDone(payAtCheckout(value, store.trim() || 'Supermercato')); }}>
            <label className="grid gap-1 text-sm">Totale dello scontrino (€)
              <input inputMode="decimal" value={amount} onChange={event => setAmount(event.target.value)} className="h-11 rounded-full border bg-background px-4 text-base" />
            </label>
            <label className="grid gap-1 text-sm">Negozio
              <input value={store} maxLength={60} onChange={event => setStore(event.target.value)} className="h-11 rounded-full border bg-background px-4 text-base" />
            </label>
            {preview && (
              <dl className="grid grid-cols-2 gap-y-1 rounded-2xl bg-muted p-4 text-sm">
                <dt className="text-muted-foreground">Buoni applicati</dt><dd className="text-right">−{formatPrice(preview.discount)}</dd>
                <dt className="font-semibold">Da pagare</dt><dd className="text-right font-semibold">{formatPrice(preview.paid)}</dd>
                <dt className="text-muted-foreground">Shopcoin guadagnati</dt><dd className="text-right font-semibold text-primary">+{formatCoins(preview.coins)}</dd>
              </dl>
            )}
            <Button type="submit" disabled={!valid} className="h-11 rounded-full"><ScanLine />Conferma scansione</Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Portafoglio() {
  const { ready, userId, name, setName, balance, earned, vouchers, transactions, redeem } = useCommunity();
  const [scanning, setScanning] = useState(false);
  const [redeemed, setRedeemed] = useState('');
  const voucherTotal = vouchers.reduce((sum, voucher) => sum + voucher.value, 0);
  const qrValue = `shopt:profilo/${userId}?buoni=${vouchers.map(voucher => voucher.id.slice(0, 8)).join(',')}`;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-32 pt-10 sm:pt-14">
      <Link to="/" className="mb-8 inline-flex items-center gap-2 rounded-full border bg-surface px-4 py-2 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary">
        <ArrowLeft className="size-4" />Torna alla home
      </Link>
      <header className="mb-8 flex items-center gap-5">
        <CoinIcon size="lg" />
        <div>
          <p className="label-mono mb-1 text-muted-foreground">03 / Portafoglio</p>
          <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">I tuoi Shopcoin</h1>
        </div>
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-[22rem_minmax(0,1fr)]">
        <section aria-label="QR del profilo" className="es-card grid gap-4 p-5">
          <div className="flex items-center justify-between gap-3">
            <label className="min-w-0 flex-1 text-sm text-muted-foreground">Nome nel profilo
              <input value={ready ? name : ''} onChange={event => setName(event.target.value)} maxLength={40} className="mt-1 block h-10 w-full rounded-full border bg-background px-4 font-medium text-foreground" />
            </label>
          </div>
          {ready && <QrCode value={qrValue} label="QR del tuo profilo SHOPT da mostrare alla cassa" />}
          <p className="text-center text-xs text-muted-foreground">Mostralo alla cassa: il cassiere lo scansiona, applica i buoni e ti accredita gli Shopcoin.<br />ID profilo {userId.slice(0, 8).toUpperCase()}</p>
          <div className="rounded-2xl bg-muted p-3 text-sm">
            <p className="mb-2 flex items-center gap-2 font-semibold"><Ticket className="size-4 text-primary" />Buoni pronti: {formatPrice(voucherTotal)}</p>
            {vouchers.length ? <div className="flex flex-wrap gap-1.5">{vouchers.map(voucher => <span key={voucher.id} className="rounded-full bg-primary px-2.5 py-0.5 text-xs font-semibold text-primary-foreground">{formatPrice(voucher.value)}</span>)}</div> : <p className="text-xs text-muted-foreground">Nessun buono: riscattane uno qui accanto.</p>}
          </div>
          <Button onClick={() => setScanning(true)} disabled={!ready} className="h-11 rounded-full"><ScanLine />Simula scansione alla cassa</Button>
        </section>

        <div className="grid gap-6">
          <section aria-label="Saldo" className="es-card es-card--glow grid gap-4 p-5 sm:grid-cols-3 sm:p-6">
            <div><p className="label-mono text-muted-foreground">Saldo</p><p className="font-display text-3xl font-bold">{ready ? formatCoins(balance) : '—'}</p></div>
            <div><p className="label-mono text-muted-foreground">Valore</p><p className="font-display text-3xl font-bold">{ready ? formatPrice(balance * EURO_PER_COIN) : '—'}</p></div>
            <div><p className="label-mono text-muted-foreground">Guadagnati in totale</p><p className="font-display text-3xl font-bold">{ready ? formatCoins(earned) : '—'}</p></div>
          </section>

          <section id="buoni" aria-label="Riscatta buoni sconto" className="es-card scroll-mt-24 p-5 sm:p-6">
            <h2 className="mb-1 flex items-center gap-2 font-display text-xl font-bold"><Gift className="size-5 text-primary" />Riscatta buoni sconto</h2>
            <p className="mb-4 text-sm text-muted-foreground">I buoni si sommano: alla cassa vengono usati tutti quelli che stanno nel totale dello scontrino.</p>
            <div className="grid gap-3 sm:grid-cols-3">
              {VOUCHERS.map(offer => (
                <div key={offer.id} className="flex flex-col items-center gap-2 rounded-2xl border bg-background p-4 text-center">
                  <p className="font-display text-3xl font-bold">{formatPrice(offer.value)}</p>
                  <p className="text-sm text-muted-foreground">{formatCoins(offer.cost)}</p>
                  <Button size="sm" disabled={!ready || balance < offer.cost} onClick={() => { if (redeem(offer.id)) setRedeemed(`Buono da ${formatPrice(offer.value)} aggiunto`); }} className="h-9 w-full rounded-full">Riscatta</Button>
                </div>
              ))}
            </div>
            <p className="mt-3 text-sm text-primary" role="status">{redeemed}</p>
          </section>

          <section aria-label="Movimenti" className="es-card overflow-hidden">
            <h2 className="border-b px-5 py-4 font-display text-xl font-bold">Movimenti</h2>
            <ul className="divide-y">
              {[...transactions].reverse().map(tx => (
                <li key={tx.id} className="flex items-center gap-3 px-5 py-3">
                  <span className={`grid size-9 shrink-0 place-items-center rounded-full ${tx.coins >= 0 ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'}`}>{tx.coins >= 0 ? <ArrowDownLeft className="size-4" /> : <ArrowUpRight className="size-4" />}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{tx.note}</p>
                    <p className="text-xs text-muted-foreground">{KIND_LABEL[tx.kind]} · {new Date(tx.date).toLocaleString('it-IT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                  <p className={`shrink-0 font-display font-bold ${tx.coins >= 0 ? 'text-primary' : 'text-muted-foreground'}`}>{tx.coins >= 0 ? '+' : ''}{formatCoins(tx.coins)}</p>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>

      {scanning && <CheckoutDialog open={scanning} onClose={() => setScanning(false)} />}
      <Mascot />
    </div>
  );
}
