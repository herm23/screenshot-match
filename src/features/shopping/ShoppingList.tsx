import { useState } from 'react';
import { Check, Pencil, Plus, ShoppingBasket, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ShoppingItem } from './models';

function ProductForm({ item, onSave, onCancel }: { item?: ShoppingItem; onSave: (value: { name: string; quantity: string | null; category: string | null }) => void; onCancel?: () => void }) {
  const [name, setName] = useState(item?.name ?? '');
  const [quantity, setQuantity] = useState(item?.quantity ?? '');
  const [category, setCategory] = useState(item?.category ?? '');
  return <form className="grid gap-2 py-3" onSubmit={event => { event.preventDefault(); if (!name.trim()) return; onSave({ name: name.trim(), quantity: quantity.trim() || null, category: category.trim() || null }); if (!item) { setName(''); setQuantity(''); setCategory(''); } }}>
    <input aria-label={item ? 'Modifica prodotto' : 'Nome del prodotto'} required maxLength={120} value={name} onChange={event => setName(event.target.value)} placeholder="Prodotto" className="w-full rounded-md border bg-background px-3 py-2 text-sm" />
    <div className="grid grid-cols-2 gap-2"><input aria-label="Quantità" maxLength={80} value={quantity} onChange={event => setQuantity(event.target.value)} placeholder="Quantità" className="min-w-0 rounded-md border bg-background px-3 py-2 text-sm" /><input aria-label="Categoria" maxLength={80} value={category} onChange={event => setCategory(event.target.value)} placeholder="Categoria" className="min-w-0 rounded-md border bg-background px-3 py-2 text-sm" /></div>
    <div className="flex gap-2"><Button type="submit" size="sm" disabled={!name.trim()}><Plus className="size-4" />{item ? 'Salva prodotto' : 'Aggiungi prodotto'}</Button>{onCancel && <Button type="button" variant="ghost" size="icon" aria-label="Annulla modifica" title="Annulla modifica" onClick={onCancel}><X /></Button>}</div>
  </form>;
}

export function ShoppingList({ items, onChange }: { items: ShoppingItem[]; onChange: (items: ShoppingItem[]) => void }) {
  const [editing, setEditing] = useState<string | null>(null);
  const done = items.filter(item => item.checked).length;
  return <div>
    <div className="mb-4 flex items-center justify-between gap-4"><span className="label-mono text-muted-foreground">{items.length} prodotti</span>{items.length > 0 && <span className="text-sm text-muted-foreground">{done}/{items.length} acquistati</span>}</div>
    {!items.length && <div className="flex flex-col items-center gap-3 border-y py-8 text-center text-muted-foreground"><ShoppingBasket className="size-8" /><p className="text-sm">La lista è vuota.<br />Detta o scrivi la spesa, oppure aggiungi un prodotto.</p></div>}
    <ul className="divide-y border-b">{items.map(item => <li key={item.id} className="py-3">
      {editing === item.id ? <ProductForm item={item} onCancel={() => setEditing(null)} onSave={value => { onChange(items.map(current => current.id === item.id ? { ...current, ...value } : current)); setEditing(null); }} /> : <div className="flex items-start gap-3">
        <input type="checkbox" checked={item.checked} aria-label={`Acquistato: ${item.name}`} onChange={event => onChange(items.map(current => current.id === item.id ? { ...current, checked: event.target.checked } : current))} className="mt-1 size-5 shrink-0 accent-primary" />
        <div className="min-w-0 flex-1"><p className={`break-words font-medium ${item.checked ? 'text-muted-foreground line-through' : ''}`}>{item.name}</p><p className="mt-1 break-words text-sm text-muted-foreground">{[item.quantity, item.category].filter(Boolean).join(' · ')}</p></div>
        <div className="flex shrink-0"><Button variant="ghost" size="icon" aria-label={`Modifica ${item.name}`} title="Modifica prodotto" onClick={() => setEditing(item.id)}><Pencil /></Button><Button variant="ghost" size="icon" aria-label={`Elimina ${item.name}`} title="Elimina prodotto" onClick={() => onChange(items.filter(current => current.id !== item.id))}><Trash2 /></Button></div>
      </div>}
    </li>)}</ul>
    <div className="mt-5"><h3 className="flex items-center gap-2 text-sm font-medium"><Plus className="size-4" />Aggiungi alla lista</h3><ProductForm onSave={value => onChange([...items, { ...value, id: crypto.randomUUID(), checked: false }])} /></div>
    {items.length > 0 && done === items.length && <p className="mt-3 flex items-center gap-2 text-sm text-primary"><Check className="size-4" />Spesa completata!</p>}
  </div>;
}