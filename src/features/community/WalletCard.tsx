import { Link } from '@tanstack/react-router';
import { Info, QrCode } from 'lucide-react';
import { formatPrice } from '../shopping/pricing';
import { CoinIcon } from './ui';
import { useCommunity } from './CommunityProvider';
import { COINS_PER_POST, COIN, EURO_PER_COIN, formatCoins } from './rewards';

/** Saldo Shopcoin per la home, con la nota che spiega come funzionano. */
export function WalletCard() {
  const { ready, balance, earned, vouchers } = useCommunity();
  const voucherTotal = vouchers.reduce((sum, voucher) => sum + voucher.value, 0);
  return (
    <section aria-label="Il tuo saldo Shopcoin" className="es-card es-card--glow grid w-full max-w-3xl overflow-hidden text-left sm:grid-cols-[1.2fr_1fr]">
      <div className="flex flex-col gap-4 p-5 sm:p-6">
        <div className="flex items-center gap-4">
          <CoinIcon size="lg" />
          <div className="min-w-0">
            <p className="label-mono text-muted-foreground">Il tuo saldo</p>
            <p className="font-display text-4xl font-bold">{ready ? formatCoins(balance) : '—'}</p>
            <p className="text-sm text-muted-foreground">
              Valore {ready ? formatPrice(balance * EURO_PER_COIN) : '—'}{voucherTotal > 0 && <> · buoni pronti {formatPrice(voucherTotal)}</>}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/portafoglio" className="inline-flex h-10 items-center gap-2 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground hover:opacity-90"><QrCode className="size-4" />QR per la cassa</Link>
          <Link to="/portafoglio" hash="buoni" className="inline-flex h-10 items-center rounded-full border bg-surface px-5 text-sm font-medium hover:border-primary hover:text-primary">Riscatta sconti</Link>
        </div>
        <p className="text-xs text-muted-foreground">Guadagnati in totale: {ready ? formatCoins(earned) : '—'}</p>
      </div>
      <aside className="border-t bg-muted/40 p-5 text-sm sm:border-l sm:border-t-0 sm:p-6">
        <p className="mb-2 flex items-center gap-2 font-semibold"><Info className="size-4 text-primary" />Cosa sono gli {COIN.name}?</p>
        <ul className="grid gap-1.5 text-muted-foreground">
          <li><strong className="text-foreground">1 SC</strong> per ogni euro speso alla cassa</li>
          <li><strong className="text-foreground">{COINS_PER_POST} SC</strong> per ogni post sulla mappa Social</li>
          <li><strong className="text-foreground">{Math.round(1 / EURO_PER_COIN)} SC = 1 €</strong> di sconto, in buoni che si sommano</li>
          <li>Alla cassa mostri il QR del profilo e il cassiere lo scansiona</li>
        </ul>
      </aside>
    </section>
  );
}
