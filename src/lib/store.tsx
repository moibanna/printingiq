import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { backend, LeadInput, VendorInput } from './backend';
import { Lead, Product, Vendor } from './catalog';
import { loadImportedCatalog } from './importedCatalog';

export type QuoteItem = { productId: string; qty: number };
export type Customer = { name: string; phone: string };

type Store = {
  mode: 'local' | 'supabase';
  loading: boolean;
  products: Product[];
  vendors: Record<string, Vendor>;
  refresh: () => Promise<void>;
  // Vendor session
  me: Vendor | null;
  email: string | null;
  signUpVendor: (email: string, pw: string, v: VendorInput) => Promise<{ needsConfirmation: boolean }>;
  signIn: (email: string, pw: string) => Promise<void>;
  signOut: () => Promise<void>;
  saveProfile: (v: VendorInput) => Promise<void>;
  addProduct: (p: Product) => Promise<Product>;
  updateProduct: (p: Product) => Promise<Product>;
  deleteProduct: (id: string) => Promise<void>;
  // Inquiries for the signed-in vendor
  leads: Lead[];
  unread: number;
  markRead: (id: string) => Promise<void>;
  /** Latest inquiry that arrived while the app was open (shown as a banner). */
  alert: Lead | null;
  dismissAlert: () => void;
  // Customer side
  customer: Customer | null;
  /** Records the inquiry (vendor gets notified) and remembers the customer's name/phone. */
  sendLead: (l: LeadInput) => Promise<void>;
  favorites: string[];
  toggleFavorite: (productId: string) => void;
  quote: QuoteItem[];
  setQuoteQty: (productId: string, qty: number) => void;
  addToQuote: (productId: string, qty?: number) => void;
  clearQuote: (productIds?: string[]) => void;
};

const Ctx = createContext<Store | null>(null);

type Loaded = { products: Product[]; vendors: Vendor[]; me: Vendor | null; email: string | null; leads: Lead[] };
async function loadAll(): Promise<Loaded | null> {
  try {
    const [own, ownVendors, imported, me, email] = await Promise.all([
      backend.listProducts(), backend.listVendors(), loadImportedCatalog(), backend.getMyVendor(), backend.currentUserEmail(),
    ]);
    // Vendors' own listings first, then the catalog copied daily from vendors' websites and pages.
    // A vendor who has an account here wins over the copied profile with the same id.
    const ids = new Set(ownVendors.map((v) => v.id));
    const vendors = [...ownVendors, ...imported.vendors.filter((v) => !ids.has(v.id))];
    const products = [...own, ...imported.products];
    return { products, vendors, me, email, leads: me ? await backend.listMyLeads() : [] };
  } catch (err) {
    console.warn('Failed to load data', err);
    return null;
  }
}

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

/** Phone push notifications (app builds only; Expo Go and the website skip this). */
async function registerForPush() {
  if (Platform.OS === 'web') return;
  const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
  if (!projectId) return; // set by `eas init`; without it Expo can't issue push tokens
  try {
    const N = await import('expo-notifications');
    const Device = await import('expo-device');
    if (!Device.isDevice) return;
    const { status } = await N.requestPermissionsAsync();
    if (status !== 'granted') return;
    const { data } = await N.getExpoPushTokenAsync({ projectId });
    await backend.registerPushToken(data);
  } catch (e) {
    console.warn('Push registration failed', e);
  }
}

function browserNotify(l: Lead, title: string) {
  if (Platform.OS !== 'web' || typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  try {
    new Notification(title, { body: `${l.customerName} · ${l.items.map((i) => i.name).join(', ')}` });
  } catch {}
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [vendorList, setVendorList] = useState<Vendor[]>([]);
  const [me, setMe] = useState<Vendor | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [alert, setAlert] = useState<Lead | null>(null);
  const [favorites, setFavorites] = usePersisted<string[]>('printingiq.favorites', []);
  const [quote, setQuote] = usePersisted<QuoteItem[]>('printingiq.quote', []);
  const [customerBox, setCustomerBox] = usePersisted<Customer | null>('printingiq.customer', null);
  const alertTitle = useRef('PrintingIQ');

  const apply = useCallback((d: Loaded | null) => {
    if (d) { setProducts(d.products); setVendorList(d.vendors); setMe(d.me); setEmail(d.email); setLeads(d.leads); }
    setLoading(false);
  }, []);
  const refresh = useCallback(async () => apply(await loadAll()), [apply]);

  useEffect(() => {
    let alive = true;
    loadAll().then((d) => alive && apply(d));
    return () => { alive = false; };
  }, [apply]);

  // While a vendor is signed in: live inquiries + push registration
  useEffect(() => {
    if (!me) return;
    registerForPush();
    return backend.subscribeLeads(me.id, (l) => {
      setLeads((xs) => (xs.some((x) => x.id === l.id) ? xs : [l, ...xs]));
      setAlert(l);
      browserNotify(l, alertTitle.current);
    });
  }, [me?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const value = useMemo<Store>(() => ({
    mode: backend.mode, loading, products, me, email, refresh,
    vendors: Object.fromEntries(vendorList.map((v) => [v.id, v])),
    async signUpVendor(e, pw, v) { const r = await backend.signUpVendor(e, pw, v); await refresh(); return r; },
    async signIn(e, pw) { await backend.signIn(e, pw); await refresh(); },
    async signOut() { await backend.signOut(); await refresh(); },
    async saveProfile(v) {
      const saved = await backend.saveMyVendor(v);
      setMe(saved);
      setVendorList((xs) => [saved, ...xs.filter((x) => x.id !== saved.id)]);
    },
    async addProduct(p) {
      const saved = await backend.addProduct(p);
      setProducts((xs) => [saved, ...xs]);
      return saved;
    },
    async updateProduct(p) {
      const saved = await backend.updateProduct(p);
      setProducts((xs) => xs.map((x) => (x.id === saved.id ? saved : x)));
      return saved;
    },
    async deleteProduct(id) {
      await backend.deleteProduct(id);
      setProducts((xs) => xs.filter((p) => p.id !== id));
    },
    leads,
    unread: leads.filter((l) => !l.read).length,
    async markRead(id) {
      await backend.markLeadRead(id);
      setLeads((xs) => xs.map((l) => (l.id === id ? { ...l, read: true } : l)));
    },
    alert,
    dismissAlert: () => setAlert(null),
    customer: customerBox,
    async sendLead(l) {
      setCustomerBox(() => ({ name: l.customerName, phone: l.customerPhone }));
      try {
        await backend.createLead(l);
      } catch (e) {
        console.warn('Could not record inquiry', e); // never stop the customer from reaching the vendor
      }
    },
    favorites,
    toggleFavorite: (id) => setFavorites((f) => (f.includes(id) ? f.filter((x) => x !== id) : [id, ...f])),
    quote,
    addToQuote: (id, qty = 1) => setQuote((q) => {
      const hit = q.find((x) => x.productId === id);
      return hit ? q.map((x) => (x.productId === id ? { ...x, qty: x.qty + qty } : x)) : [...q, { productId: id, qty }];
    }),
    setQuoteQty: (id, qty) => setQuote((q) => (qty <= 0 ? q.filter((x) => x.productId !== id) : q.map((x) => (x.productId === id ? { ...x, qty } : x)))),
    clearQuote: (ids) => setQuote((q) => (ids ? q.filter((x) => !ids.includes(x.productId)) : [])),
  }), [loading, products, vendorList, me, email, refresh, leads, alert, customerBox, favorites, quote, setFavorites, setQuote, setCustomerBox]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore must be used inside StoreProvider');
  return s;
}
