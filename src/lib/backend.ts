import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import { Lead, Product, Vendor } from './catalog';

/**
 * Two backends behind one interface:
 *  - "local": demo data + whatever you add, saved on this device (no setup needed)
 *  - "supabase": real shared database, vendor accounts, image storage, inquiries and notifications
 *    (set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY)
 */
export type VendorInput = Omit<Vendor, 'id' | 'verified'>;
export type LeadInput = Omit<Lead, 'id' | 'createdAt' | 'read'>;

export interface Backend {
  mode: 'local' | 'supabase';
  listProducts(): Promise<Product[]>;
  listVendors(): Promise<Vendor[]>;
  // Vendor account
  currentUserEmail(): Promise<string | null>;
  getMyVendor(): Promise<Vendor | null>;
  signUpVendor(email: string, password: string, v: VendorInput): Promise<{ needsConfirmation: boolean }>;
  signIn(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
  saveMyVendor(v: VendorInput): Promise<Vendor>;
  // Products (vendor's own)
  addProduct(p: Product): Promise<Product>;
  updateProduct(p: Product): Promise<Product>;
  deleteProduct(id: string): Promise<void>;
  // Inquiries
  createLead(l: LeadInput): Promise<Lead>;
  listMyLeads(): Promise<Lead[]>;
  markLeadRead(id: string): Promise<void>;
  /** Calls back when a new inquiry for this vendor arrives. Returns an unsubscribe function. */
  subscribeLeads(vendorId: string, onLead: (l: Lead) => void): () => void;
  registerPushToken(token: string): Promise<void>;
}

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

// ---------- Local (demo) backend ----------
const K = {
  products: 'printingiq.products', vendors: 'printingiq.vendors', accounts: 'printingiq.accounts',
  session: 'printingiq.session', leads: 'printingiq.leads',
};
type LocalAccount = { email: string; password: string; vendorId: string };

async function readJSON<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
const writeJSON = (key: string, v: unknown) => AsyncStorage.setItem(key, JSON.stringify(v)).catch(() => {});

// In demo mode, inquiries made on this device reach the vendor signed in on this device instantly.
const localListeners = new Set<(l: Lead) => void>();

const localBackend: Backend = {
  mode: 'local',
  async listProducts() {
    return readJSON<Product[]>(K.products, []);
  },
  async listVendors() {
    return readJSON<Vendor[]>(K.vendors, []);
  },
  async currentUserEmail() {
    return (await readJSON<LocalAccount | null>(K.session, null))?.email ?? null;
  },
  async getMyVendor() {
    const s = await readJSON<LocalAccount | null>(K.session, null);
    if (!s) return null;
    return (await readJSON<Vendor[]>(K.vendors, [])).find((v) => v.id === s.vendorId) ?? null;
  },
  async signUpVendor(email, password, v) {
    const accounts = await readJSON<LocalAccount[]>(K.accounts, []);
    if (accounts.some((a) => a.email === email.toLowerCase())) throw new Error('This email already has an account.');
    const vendor: Vendor = { ...v, id: 'me-' + uid(), email };
    const acc = { email: email.toLowerCase(), password, vendorId: vendor.id };
    await writeJSON(K.accounts, [...accounts, acc]);
    await writeJSON(K.vendors, [vendor, ...(await readJSON<Vendor[]>(K.vendors, []))]);
    await writeJSON(K.session, acc);
    return { needsConfirmation: false };
  },
  async signIn(email, password) {
    const acc = (await readJSON<LocalAccount[]>(K.accounts, [])).find((a) => a.email === email.toLowerCase());
    if (!acc || acc.password !== password) throw new Error('Wrong email or password.');
    await writeJSON(K.session, acc);
  },
  async signOut() {
    await AsyncStorage.removeItem(K.session).catch(() => {});
  },
  async saveMyVendor(v) {
    const me = await this.getMyVendor();
    if (!me) throw new Error('Sign in first');
    const saved = { ...me, ...v, id: me.id };
    await writeJSON(K.vendors, (await readJSON<Vendor[]>(K.vendors, [])).map((x) => (x.id === me.id ? saved : x)));
    return saved;
  },
  async addProduct(p) {
    const saved = { ...p, id: uid(), createdAt: new Date().toISOString() };
    await writeJSON(K.products, [saved, ...(await readJSON<Product[]>(K.products, []))]);
    return saved;
  },
  async updateProduct(p) {
    await writeJSON(K.products, (await readJSON<Product[]>(K.products, [])).map((x) => (x.id === p.id ? p : x)));
    return p;
  },
  async deleteProduct(id) {
    await writeJSON(K.products, (await readJSON<Product[]>(K.products, [])).filter((p) => p.id !== id));
  },
  async createLead(l) {
    const lead: Lead = { ...l, id: uid(), createdAt: new Date().toISOString(), read: false };
    await writeJSON(K.leads, [lead, ...(await readJSON<Lead[]>(K.leads, []))]);
    localListeners.forEach((fn) => fn(lead));
    return lead;
  },
  async listMyLeads() {
    const me = await this.getMyVendor();
    if (!me) return [];
    return (await readJSON<Lead[]>(K.leads, [])).filter((l) => l.vendorId === me.id);
  },
  async markLeadRead(id) {
    await writeJSON(K.leads, (await readJSON<Lead[]>(K.leads, [])).map((l) => (l.id === id ? { ...l, read: true } : l)));
  },
  subscribeLeads(vendorId, onLead) {
    const fn = (l: Lead) => l.vendorId === vendorId && onLead(l);
    localListeners.add(fn);
    // Website demo: an inquiry sent from another tab of this browser shows up here too.
    const onStorage = (e: StorageEvent) => {
      if (e.key !== K.leads || !e.newValue) return;
      const before = new Set((JSON.parse(e.oldValue || '[]') as Lead[]).map((l) => l.id));
      (JSON.parse(e.newValue) as Lead[]).filter((l) => !before.has(l.id)).forEach(fn);
    };
    if (Platform.OS === 'web' && typeof window !== 'undefined') window.addEventListener('storage', onStorage);
    return () => {
      localListeners.delete(fn);
      if (Platform.OS === 'web' && typeof window !== 'undefined') window.removeEventListener('storage', onStorage);
    };
  },
  registerPushToken: async () => {},
};

// ---------- Supabase backend ----------
type ProductRow = {
  id: string; vendor_id: string; category_id: string; name: Product['name']; description: Product['description'];
  price: number | null; currency: Product['currency']; unit: Product['unit']; min_order: number | null;
  colors: Product['colors']; thickness: string[]; sizes: string[]; brand: string | null; origin: string | null;
  sku: string | null; stock_qty: number | null; availability: Product['availability']; images: string[]; created_at: string; template_id: string | null;
};
const fromProductRow = (r: ProductRow): Product => ({
  id: r.id, vendorId: r.vendor_id, categoryId: r.category_id, name: r.name, description: r.description,
  price: r.price, currency: r.currency, unit: r.unit, minOrder: r.min_order ?? undefined, colors: r.colors ?? [],
  thickness: r.thickness ?? [], sizes: r.sizes ?? [], brand: r.brand ?? undefined, origin: r.origin ?? undefined,
  sku: r.sku ?? undefined, stockQty: r.stock_qty ?? undefined, availability: r.availability,
  images: r.images ?? [], createdAt: r.created_at, templateId: r.template_id ?? undefined,
});

type LeadRow = {
  id: string; vendor_id: string; channel: Lead['channel']; customer_name: string; customer_phone: string;
  message: string | null; items: Lead['items']; created_at: string; read_at: string | null;
};
const fromLeadRow = (r: LeadRow): Lead => ({
  id: r.id, vendorId: r.vendor_id, channel: r.channel, customerName: r.customer_name, customerPhone: r.customer_phone,
  message: r.message ?? undefined, items: r.items ?? [], createdAt: r.created_at, read: !!r.read_at,
});

const VENDOR_COLS = 'id,name,city,phone,whatsapp,email,about,verified';

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
  const productRow = async (p: Product, id: string) => ({
    vendor_id: id, category_id: p.categoryId, name: p.name, description: p.description, price: p.price,
    currency: p.currency, unit: p.unit, min_order: p.minOrder ?? null, colors: p.colors, thickness: p.thickness,
    sizes: p.sizes, brand: p.brand ?? null, origin: p.origin ?? null, sku: p.sku ?? null, stock_qty: p.stockQty ?? null,
    availability: p.availability, images: await Promise.all(p.images.map((u) => uploadImage(sb, id, u))),
    template_id: p.templateId ?? null,
  });
  const upsertVendor = async (id: string, v: VendorInput) =>
    must(await sb.from('vendors').upsert({
      id, name: v.name, city: v.city, phone: v.phone, whatsapp: v.whatsapp || null, email: v.email || null, about: v.about || null,
    }).select(VENDOR_COLS).single()) as Vendor;

  return {
    mode: 'supabase',
    async listProducts() {
      return (must(await sb.from('products').select('*').order('created_at', { ascending: false }).limit(1000)) as ProductRow[]).map(fromProductRow);
    },
    async listVendors() {
      return must(await sb.from('vendors').select(VENDOR_COLS)) as Vendor[];
    },
    async currentUserEmail() {
      return (await sb.auth.getUser()).data.user?.email ?? null;
    },
    async getMyVendor() {
      const id = await userId();
      if (!id) return null;
      return (must(await sb.from('vendors').select(VENDOR_COLS).eq('id', id).maybeSingle()) as Vendor | null) ?? null;
    },
    async signUpVendor(email, password, v) {
      // Shop details travel with the sign-up so the profile can be created even when email confirmation is on.
      const { data, error } = await sb.auth.signUp({ email, password, options: { data: { vendor: { ...v, email } } } });
      if (error) throw error;
      if (data.session && data.user) {
        await upsertVendor(data.user.id, { ...v, email });
        return { needsConfirmation: false };
      }
      return { needsConfirmation: true };
    },
    async signIn(email, password) {
      const { data, error } = await sb.auth.signInWithPassword({ email, password });
      if (error) throw error;
      // First sign-in after confirming email: create the shop from the details given at sign-up.
      const pending = data.user?.user_metadata?.vendor as VendorInput | undefined;
      if (data.user && pending && !(await this.getMyVendor())) await upsertVendor(data.user.id, pending);
    },
    async signOut() {
      await sb.auth.signOut();
    },
    async saveMyVendor(v) {
      const id = await userId();
      if (!id) throw new Error('Sign in first');
      return upsertVendor(id, v);
    },
    async addProduct(p) {
      const id = await userId();
      if (!id) throw new Error('Sign in first');
      return fromProductRow(must(await sb.from('products').insert(await productRow(p, id)).select('*').single()) as ProductRow);
    },
    async updateProduct(p) {
      const id = await userId();
      if (!id) throw new Error('Sign in first');
      return fromProductRow(must(await sb.from('products').update(await productRow(p, id)).eq('id', p.id).select('*').single()) as ProductRow);
    },
    async deleteProduct(pid) {
      must(await sb.from('products').delete().eq('id', pid));
    },
    async createLead(l) {
      // Anyone may create an inquiry; only the vendor can read it (see supabase/schema.sql).
      const id = crypto.randomUUID();
      must(await sb.from('leads').insert({
        id, vendor_id: l.vendorId, channel: l.channel, customer_name: l.customerName, customer_phone: l.customerPhone,
        message: l.message ?? null, items: l.items,
      }));
      // Push notification to the vendor's phone (supabase/functions/notify-vendor). Never block the customer on it.
      sb.functions.invoke('notify-vendor', { body: { lead_id: id } }).catch(() => {});
      return { ...l, id, createdAt: new Date().toISOString(), read: false };
    },
    async listMyLeads() {
      const id = await userId();
      if (!id) return [];
      return (must(await sb.from('leads').select('*').eq('vendor_id', id).order('created_at', { ascending: false }).limit(200)) as LeadRow[]).map(fromLeadRow);
    },
    async markLeadRead(lid) {
      must(await sb.from('leads').update({ read_at: new Date().toISOString() }).eq('id', lid));
    },
    subscribeLeads(vendorId, onLead) {
      const ch = sb
        .channel(`leads-${vendorId}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'leads', filter: `vendor_id=eq.${vendorId}` },
          (payload) => onLead(fromLeadRow(payload.new as LeadRow)))
        .subscribe();
      return () => { sb.removeChannel(ch); };
    },
    async registerPushToken(token) {
      const id = await userId();
      if (!id) return;
      await sb.from('push_tokens').upsert({ token, vendor_id: id, platform: Platform.OS });
    },
  };
}

const URL_ = process.env.EXPO_PUBLIC_SUPABASE_URL;
const KEY_ = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
export const backend: Backend = URL_ && KEY_ ? supabaseBackend(URL_, KEY_) : localBackend;
