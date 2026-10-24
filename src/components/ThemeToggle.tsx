import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

type Theme = 'dark' | 'light';

// Applicato prima del render (vedi __root.tsx) per evitare il flash del tema sbagliato
export const THEME_INIT_SCRIPT = `(function(){var r=document.documentElement,t='dark';try{t=localStorage.getItem('theme')||(matchMedia('(prefers-color-scheme: light)').matches?'light':'dark')}catch(e){}r.classList.add(t);r.style.colorScheme=t})();`;

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('dark');
  useEffect(() => { setTheme(document.documentElement.classList.contains('light') ? 'light' : 'dark'); }, []);
  const toggle = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    const root = document.documentElement;
    root.classList.remove('dark', 'light');
    root.classList.add(next);
    root.style.colorScheme = next;
    try { localStorage.setItem('theme', next); } catch { /* preferenza non salvata */ }
    setTheme(next);
  };
  return (
    <button type="button" onClick={toggle} aria-label="Cambia tema chiaro/scuro" className="grid size-10 place-items-center rounded-full border bg-surface text-foreground transition-colors hover:border-primary hover:text-primary">
      {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  );
}
