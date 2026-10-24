import { createContext, useContext, useRef, useState, type ReactNode } from 'react';
import type { Coordinates, ShoppingItem } from './models';
import { extractShoppingList, locateAddress, nearbySupermarkets, type NearbySupermarket } from './fake-data';

// Stato condiviso tra le pagine Microfono e Mappa: testo, lista, posizione e supermercati.
// Tutto resta in memoria (niente login né salvataggio).
type ShoppingState = {
  text: string;
  setText: (text: string) => void;
  items: ShoppingItem[];
  setItems: (items: ShoppingItem[]) => void;
  generating: boolean;
  generateList: () => Promise<boolean>;
  center: Coordinates | null;
  locationLabel: string;
  places: NearbySupermarket[];
  mapLoading: boolean;
  mapError: string;
  locate: () => void;
  searchAddress: (address: string) => Promise<void>;
};

const ShoppingContext = createContext<ShoppingState | null>(null);

export function ShoppingProvider({ children }: { children: ReactNode }) {
  const [text, setText] = useState('');
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [generating, setGenerating] = useState(false);
  const [center, setCenter] = useState<Coordinates | null>(null);
  const [locationLabel, setLocationLabel] = useState('');
  const [places, setPlaces] = useState<NearbySupermarket[]>([]);
  const [mapLoading, setMapLoading] = useState(false);
  const [mapError, setMapError] = useState('');
  const requestVersion = useRef(0);

  const generateList = async () => {
    if (!text.trim() || generating) return false;
    setGenerating(true);
    try {
      const extracted = await extractShoppingList(text);
      // Aggiunge solo i prodotti non già in lista
      const known = new Set(items.map(item => item.name.toLocaleLowerCase('it')));
      setItems([...items, ...extracted.filter(item => !known.has(item.name.toLocaleLowerCase('it')))]);
      setText('');
      return extracted.length > 0;
    } finally { setGenerating(false); }
  };

  const searchNearby = async (position: Coordinates, label: string, version: number) => {
    setCenter(position); setLocationLabel(label); setPlaces([]);
    const results = await nearbySupermarkets(position);
    if (version !== requestVersion.current) return;
    setPlaces(results); setMapLoading(false);
  };

  const locate = () => {
    const version = ++requestVersion.current;
    setMapError('');
    if (!('geolocation' in navigator)) { setMapError('La posizione non è disponibile in questo browser. Inserisci una città o un indirizzo.'); return; }
    setMapLoading(true);
    navigator.geolocation.getCurrentPosition(
      pos => { void searchNearby({ lat: pos.coords.latitude, lng: pos.coords.longitude }, 'La tua posizione', version); },
      error => {
        if (version !== requestVersion.current) return;
        setMapLoading(false);
        setMapError(error.code === 1 ? 'Permesso posizione negato. Inserisci una città o un indirizzo.' : 'Non riesco a trovare la tua posizione. Inserisci una città o un indirizzo.');
      },
      { timeout: 12000, maximumAge: 60000 },
    );
  };

  const searchAddress = async (address: string) => {
    if (!address.trim()) return;
    const version = ++requestVersion.current;
    setMapLoading(true); setMapError('');
    try {
      const position = await locateAddress(address);
      if (version === requestVersion.current) await searchNearby(position, position.label, version);
    } catch (error) {
      if (version !== requestVersion.current) return;
      setMapError(error instanceof Error ? error.message : 'Indirizzo non disponibile.');
      setMapLoading(false);
    }
  };

  return <ShoppingContext.Provider value={{ text, setText, items, setItems, generating, generateList, center, locationLabel, places, mapLoading, mapError, locate, searchAddress }}>{children}</ShoppingContext.Provider>;
}

export function useShopping() {
  const context = useContext(ShoppingContext);
  if (!context) throw new Error('useShopping va usato dentro ShoppingProvider');
  return context;
}
