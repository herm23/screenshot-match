import { useEffect, useState } from 'react';
import { Coins } from 'lucide-react';
import QRCode from 'qrcode';

const SIZES = { sm: 'size-6', md: 'size-9', lg: 'size-14' };

/** Moneta Shopcoin: giallo e arancio del logo. */
export function CoinIcon({ size = 'md' }: { size?: keyof typeof SIZES }) {
  return (
    <span aria-hidden className={`grid shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#f2b921] to-[#e87823] text-[#123052] shadow-[inset_0_-2px_0_rgba(0,0,0,0.15)] ${SIZES[size]}`}>
      <Coins className="size-[58%]" strokeWidth={2.25} />
    </span>
  );
}

/** Ogni utente è rappresentato dall'icona del sito, con un anello del suo colore. */
export function MemberAvatar({ color, size = 'md' }: { color: string; size?: keyof typeof SIZES }) {
  return (
    <span aria-hidden className={`grid shrink-0 place-items-center overflow-hidden rounded-full bg-white p-0.5 ring-2 ${SIZES[size]}`} style={{ ['--tw-ring-color' as string]: color }}>
      <img src="/icon-192.png" alt="" className="size-full object-contain" />
    </span>
  );
}

/** QR code disegnato nel browser (SVG), sempre nero su bianco perché i lettori alla cassa lo leggano. */
export function QrCode({ value, label }: { value: string; label: string }) {
  const [svg, setSvg] = useState('');
  useEffect(() => {
    let active = true;
    void QRCode.toString(value, { type: 'svg', margin: 1, errorCorrectionLevel: 'M', color: { dark: '#123052', light: '#ffffff' } }).then(result => { if (active) setSvg(result); });
    return () => { active = false; };
  }, [value]);
  return <div role="img" aria-label={label} className="aspect-square w-full rounded-2xl bg-white p-3 [&_svg]:size-full" dangerouslySetInnerHTML={{ __html: svg }} />;
}
