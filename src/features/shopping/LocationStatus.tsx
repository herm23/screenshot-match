import { LoaderCircle, LocateFixed, MapPin } from 'lucide-react';
import { useShopping } from './ShoppingProvider';

const SOURCE: Record<string, string> = { gps: 'GPS', ip: 'stima dalla rete', manual: 'indirizzo scelto', saved: 'ultima posizione' };

/** Dove si trova l'utente e con quale precisione. compact = versione per la barra in alto. */
export function LocationStatus({ compact = false }: { compact?: boolean }) {
  const { location, locating } = useShopping();
  if (!location) {
    return (
      <p className={`inline-flex items-center gap-2 text-muted-foreground ${compact ? 'text-xs' : 'text-sm'}`} role="status">
        {locating ? <LoaderCircle className="size-3.5 animate-spin" /> : <MapPin className="size-3.5" />}
        {locating ? 'Cerco la posizione…' : 'Posizione non disponibile'}
      </p>
    );
  }
  const accuracy = location.accuracy && location.source === 'gps' ? ` ±${location.accuracy < 1000 ? `${Math.round(location.accuracy)} m` : `${(location.accuracy / 1000).toFixed(1)} km`}` : '';
  return (
    <p className={`inline-flex min-w-0 max-w-full items-center gap-2 ${compact ? 'rounded-full border bg-surface px-3 py-1.5 text-xs' : 'text-sm'}`} role="status" title={`${location.label} (${SOURCE[location.source]}${accuracy})`}>
      {locating ? <LoaderCircle className="size-3.5 shrink-0 animate-spin text-primary" /> : location.source === 'gps' ? <LocateFixed className="size-3.5 shrink-0 text-primary" /> : <MapPin className="size-3.5 shrink-0 text-accent-2" />}
      <span className="truncate font-medium">{location.label}</span>
      <span className={`shrink-0 text-muted-foreground ${compact ? 'hidden sm:inline' : ''}`}>{SOURCE[location.source]}{accuracy}</span>
    </p>
  );
}
