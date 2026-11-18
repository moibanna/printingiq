import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { backend } from './backend';
import { Product, Vendor } from './catalog';

type Store = {
  mode: 'local' | 'supabase';
  loading: boolean;
  products: Product[];
  vendors: Record<string, Vendor>;
  me: Vendor | null;
  email: string | null;
  refresh: () => Promise<void>;
  addProduct: (p: Product) => Promise<Product>;
  deleteProduct: (id: string) => Promise<void>;
  saveProfile: (v: Omit<Vendor, 'id'>) => Promise<void>;
  signIn: (email: string, pw: string) => Promise<void>;
  signUp: (email: string, pw: string) => Promise<void>;
  signOut: () => Promise<void>;
  /** Favorites and the quote list are per device (like a shopping cart). */
  favorites: string[];
  toggleFavorite: (productId: string) => void;
  quote: QuoteItem[];
  setQuoteQty: (productId: string, qty: number) => void;
  addToQuote: (productId: string, qty?: number) => void;
  clearQuote: (productIds?: string[]) => void;
};

export type QuoteItem = { productId: string; qty: number };
const FAV_KEY = 'printingiq.favorites';
const QUOTE_KEY = 'printingiq.quote';

function usePersisted<T>(key: string, initial: T) {
  const [v, setV] = useState<T>(initial);
  useEffect(() => {
    AsyncStorage.getItem(key).then((raw) => raw && setV(JSON.parse(raw))).catch(() => {});
  }, [key]);
  const set = useCallback((fn: (prev: T) => T) => {
    setV((prev) => {
      const next = fn(prev);
      AsyncStorage.setItem(key, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, [key]);
  return [v, set] as const;
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [vendorList, setVendorList] = useState<Vendor[]>([]);
  const [me, setMe] = useState<Vendor | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [favorites, setFavorites] = usePersisted<string[]>(FAV_KEY, []);
  const [quote, setQuote] = usePersisted<QuoteItem[]>(QUOTE_KEY, []);

  const refresh = useCallback(async () => {
    try {
      const [p, v, m, e] = await Promise.all([
        backend.listProducts(), backend.listVendors(), backend.getMyVendor(), backend.currentUserEmail(),
      ]);
      setProducts(p); setVendorList(v); setMe(m); setEmail(e);
    } catch (err) {
      console.warn('Failed to load data', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const value = useMemo<Store>(() => ({
    mode: backend.mode, loading, products, me, email, refresh,
    vendors: Object.fromEntries(vendorList.map((v) => [v.id, v])),
    async addProduct(p) {
      const saved = await backend.addProduct(p);
      setProducts((xs) => [saved, ...xs]);
      return saved;
    },
    async deleteProduct(id) {
      await backend.deleteProduct(id);
      setProducts((xs) => xs.filter((p) => p.id !== id));
    },
    async saveProfile(v) {
      const saved = await backend.saveMyVendor(v);
      setMe(saved);
      setVendorList((xs) => [saved, ...xs.filter((x) => x.id !== saved.id)]);
    },
    async signIn(e, pw) { await backend.signIn(e, pw); await refresh(); },
    async signUp(e, pw) { await backend.signUp(e, pw); await refresh(); },
    async signOut() { await backend.signOut(); await refresh(); },
    favorites,
    toggleFavorite: (id) => setFavorites((f) => (f.includes(id) ? f.filter((x) => x !== id) : [id, ...f])),
    quote,
    addToQuote: (id, qty = 1) => setQuote((q) => {
      const hit = q.find((x) => x.productId === id);
      return hit ? q.map((x) => (x.productId === id ? { ...x, qty: x.qty + qty } : x)) : [...q, { productId: id, qty }];
    }),
    setQuoteQty: (id, qty) => setQuote((q) => (qty <= 0 ? q.filter((x) => x.productId !== id) : q.map((x) => (x.productId === id ? { ...x, qty } : x)))),
    clearQuote: (ids) => setQuote((q) => (ids ? q.filter((x) => !ids.includes(x.productId)) : [])),
  }), [loading, products, vendorList, me, email, refresh, favorites, quote, setFavorites, setQuote]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore must be used inside StoreProvider');
  return s;
}
