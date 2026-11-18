import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import { Product, SEED_PRODUCTS, SEED_VENDORS, Vendor } from './catalog';

/**
 * Two backends behind one interface:
 *  - "local": demo data + whatever you add, saved on this device (no setup needed)
 *  - "supabase": real shared database, auth and image storage
 *    (set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in .env)
 */
export interface Backend {
  mode: 'local' | 'supabase';
  listProducts(): Promise<Product[]>;
  listVendors(): Promise<Vendor[]>;
  getMyVendor(): Promise<Vendor | null>;
  saveMyVendor(v: Omit<Vendor, 'id'>): Promise<Vendor>;
  addProduct(p: Product): Promise<Product>;
  deleteProduct(id: string): Promise<void>;
  // auth (supabase only)
  currentUserEmail(): Promise<string | null>;
  signIn(email: string, password: string): Promise<void>;
  signUp(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
}

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

// ---------- Local (demo) backend ----------
const K = { products: 'printingiq.products', vendors: 'printingiq.vendors', me: 'printingiq.me' };

async function readJSON<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
const writeJSON = (key: string, v: unknown) => AsyncStorage.setItem(key, JSON.stringify(v)).catch(() => {});

const localBackend: Backend = {
  mode: 'local',
  async listProducts() {
    const mine = await readJSON<Product[]>(K.products, []);
    return [...mine, ...SEED_PRODUCTS];
  },
  async listVendors() {
    const mine = await readJSON<Vendor[]>(K.vendors, []);
    return [...mine, ...SEED_VENDORS];
  },
  getMyVendor: () => readJSON<Vendor | null>(K.me, null),
  async saveMyVendor(v) {
    const existing = await readJSON<Vendor | null>(K.me, null);
    const me: Vendor = { ...v, id: existing?.id ?? 'me-' + uid() };
    await writeJSON(K.me, me);
    const others = (await readJSON<Vendor[]>(K.vendors, [])).filter((x) => x.id !== me.id);
    await writeJSON(K.vendors, [me, ...others]);
    return me;
  },
  async addProduct(p) {
    const saved = { ...p, id: uid(), createdAt: new Date().toISOString() };
    const mine = await readJSON<Product[]>(K.products, []);
    await writeJSON(K.products, [saved, ...mine]);
    return saved;
  },
  async deleteProduct(id) {
    const mine = await readJSON<Product[]>(K.products, []);
    await writeJSON(K.products, mine.filter((p) => p.id !== id));
  },
  currentUserEmail: async () => null,
  signIn: async () => {},
  signUp: async () => {},
  signOut: async () => {},
};

// ---------- Supabase backend ----------
type Row = {
  id: string; vendor_id: string; category_id: string; name: Product['name']; description: Product['description'];
  price: number | null; currency: Product['currency']; unit: Product['unit']; min_order: number | null;
  colors: Product['colors']; thickness: string[]; sizes: string[]; brand: string | null; origin: string | null;
  sku: string | null; stock_qty: number | null; availability: Product['availability']; images: string[]; created_at: string;
};
const fromRow = (r: Row): Product => ({
  id: r.id, vendorId: r.vendor_id, categoryId: r.category_id, name: r.name, description: r.description,
  price: r.price, currency: r.currency, unit: r.unit, minOrder: r.min_order ?? undefined, colors: r.colors ?? [],
  thickness: r.thickness ?? [], sizes: r.sizes ?? [], brand: r.brand ?? undefined, origin: r.origin ?? undefined,
  sku: r.sku ?? undefined, stockQty: r.stock_qty ?? undefined, availability: r.availability,
  images: r.images ?? [], createdAt: r.created_at,
});

async function uploadImage(sb: SupabaseClient, userId: string, uri: string): Promise<string> {
  if (/^https?:\/\//.test(uri)) return uri;
  const blob = await (await fetch(uri)).blob();
  const ext = (blob.type.split('/')[1] || 'jpg').replace('jpeg', 'jpg');
  const path = `${userId}/${uid()}.${ext}`;
  const { error } = await sb.storage.from('product-images').upload(path, blob, { contentType: blob.type || 'image/jpeg' });
  if (error) throw error;
  return sb.storage.from('product-images').getPublicUrl(path).data.publicUrl;
}

function supabaseBackend(url: string, key: string): Backend {
  const sb = createClient(url, key, {
    auth: { storage: AsyncStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: Platform.OS === 'web' },
  });
  const userId = async () => (await sb.auth.getUser()).data.user?.id ?? null;
  const must = <T,>(r: { data: T; error: unknown }) => {
    if (r.error) throw r.error;
    return r.data;
  };
  return {
    mode: 'supabase',
    async listProducts() {
      const rows = must(await sb.from('products').select('*').order('created_at', { ascending: false }).limit(500));
      return (rows as Row[]).map(fromRow);
    },
    async listVendors() {
      return must(await sb.from('vendors').select('id,name,city,phone,verified')) as Vendor[];
    },
    async getMyVendor() {
      const id = await userId();
      if (!id) return null;
      return (must(await sb.from('vendors').select('id,name,city,phone,verified').eq('id', id).maybeSingle()) as Vendor) ?? null;
    },
    async saveMyVendor(v) {
      const id = await userId();
      if (!id) throw new Error('Sign in first');
      const row = { id, name: v.name, city: v.city, phone: v.phone };
      return must(await sb.from('vendors').upsert(row).select('id,name,city,phone,verified').single()) as Vendor;
    },
    async addProduct(p) {
      const id = await userId();
      if (!id) throw new Error('Sign in first');
      const images = await Promise.all(p.images.map((u) => uploadImage(sb, id, u)));
      const row = {
        vendor_id: id, category_id: p.categoryId, name: p.name, description: p.description, price: p.price,
        currency: p.currency, unit: p.unit, min_order: p.minOrder ?? null, colors: p.colors, thickness: p.thickness,
        sizes: p.sizes, brand: p.brand ?? null, origin: p.origin ?? null,
        sku: p.sku ?? null, stock_qty: p.stockQty ?? null, availability: p.availability, images,
      };
      return fromRow(must(await sb.from('products').insert(row).select('*').single()) as Row);
    },
    async deleteProduct(pid) {
      must(await sb.from('products').delete().eq('id', pid));
    },
    async currentUserEmail() {
      return (await sb.auth.getUser()).data.user?.email ?? null;
    },
    async signIn(email, password) {
      const { error } = await sb.auth.signInWithPassword({ email, password });
      if (error) throw error;
    },
    async signUp(email, password) {
      const { error } = await sb.auth.signUp({ email, password });
      if (error) throw error;
    },
    async signOut() {
      await sb.auth.signOut();
    },
  };
}

const URL_ = process.env.EXPO_PUBLIC_SUPABASE_URL;
const KEY_ = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
export const backend: Backend = URL_ && KEY_ ? supabaseBackend(URL_, KEY_) : localBackend;
