import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { useServerFn } from '@tanstack/react-start';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable';
import { loadShoppingData } from '@/lib/shopping.functions';
import type { ShoppingItem } from './models';

type AuthState = { user: User | null; ready: boolean; profile: { display_name: string; avatar_url: string | null } | null; savedItems: ShoppingItem[]; error: string; signIn: () => Promise<void>; signOut: () => Promise<void>; setProfileName: (name: string) => void };
const AuthContext = createContext<AuthState | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState<AuthState['profile']>(null);
  const [savedItems, setSavedItems] = useState<ShoppingItem[]>([]);
  const [error, setError] = useState('');
  const queryClient = useQueryClient();
  const router = useRouter();
  const load = useServerFn(loadShoppingData);
  useEffect(() => {
    let cancelled = false;
    let version = 0;
    const sync = async (next: User | null) => {
      const current = ++version;
      setUser(next); setReady(false); setProfile(null); setSavedItems([]);
      if (next) {
        try { const data = await load(); if (!cancelled && current === version) { setProfile(data.profile); setSavedItems(data.items); } }
        catch { if (!cancelled && current === version) setError('Non riesco a caricare il profilo e la lista salvata. Riprova ad accedere.'); }
      }
      if (!cancelled && current === version) setReady(true);
    };
    void supabase.auth.getUser().then(({ data }) => { if (!cancelled) void sync(data.user); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event !== 'SIGNED_IN' && event !== 'SIGNED_OUT' && event !== 'USER_UPDATED') return;
      queueMicrotask(() => { if (!cancelled) { void sync(session?.user ?? null); void router.invalidate(); if (event !== 'SIGNED_OUT') void queryClient.invalidateQueries(); } });
    });
    return () => { cancelled = true; subscription.unsubscribe(); };
  }, [load, queryClient, router]);
  const signIn = async () => {
    setError('');
    try { const result = await lovable.auth.signInWithOAuth('google', { redirect_uri: window.location.origin }); if (result.error) setError('Accesso Google non riuscito. Riprova.'); }
    catch { setError('Accesso Google non disponibile. Riprova più tardi.'); }
  };
  const signOut = async () => {
    await queryClient.cancelQueries(); queryClient.clear();
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) { setError('Non riesco a uscire. Riprova.'); return; }
    setUser(null); setProfile(null); setSavedItems([]);
    await router.navigate({ to: '/', replace: true });
  };
  return <AuthContext.Provider value={{ user, ready, profile, savedItems, error, signIn, signOut, setProfileName: name => setProfile(current => ({ display_name: name, avatar_url: current?.avatar_url ?? null })) }}>{children}</AuthContext.Provider>;
}
export function useShoppingAuth() { const context = useContext(AuthContext); if (!context) throw new Error('Autenticazione non disponibile'); return context; }