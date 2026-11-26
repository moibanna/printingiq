import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import type { ProductDraft } from './bulkImport';
import { Attachment, Lead, Offer, Product, QuoteRequest, Review, ShopLink, Vendor, VendorRating } from './catalog';

/**
 * Two backends behind one interface:
 *  - "local": demo data + whatever you add, saved on this device (no setup needed)
 *  - "supabase": real shared database, vendor accounts, image storage, inquiries and notifications
 *    (set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY)
 */
export type VendorInput = Omit<Vendor, 'id' | 'verified'>;
export type LeadInput = Omit<Lead, 'id' | 'createdAt' | 'read'>;
export type RequestInput = Omit<QuoteRequest, 'id' | 'token' | 'status' | 'createdAt' | 'files'> & { files: Attachment[] };
export type OfferInput = Omit<Offer, 'id' | 'createdAt' | 'vendorId'>;
/** What the AI helper reads: product photos (one product) or a price list (PDF, photos or text). */
export type AiInput = {
  mode: 'photo' | 'pricelist';
  files?: { mediaType: string; data: string }[];
  text?: string;
  categories: { id: string; name: string }[];
  hint?: string;
};
/** Error codes from the AI helper (supabase/functions/ai-assist); the app shows a message for each. */
export class AiError extends Error {
  constructor(public code: string) { super(code); }
}

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
  // Quote requests: customers describe a job, vendors send offers
  /** Saves the request (uploading attached files) and notifies vendors. Returns its private link parts. */
  createRequest(r: RequestInput): Promise<{ id: string; token: string }>;
  /** Customer view: the request and every offer, if the token matches. */
  getRequest(id: string, token: string): Promise<{ request: QuoteRequest; offers: Offer[] } | null>;
  closeRequest(id: string, token: string): Promise<void>;
  /** Vendor view: recent open requests (with the customer's contact) */
  listOpenRequests(): Promise<QuoteRequest[]>;
  listMyOffers(): Promise<Offer[]>;
  sendOffer(o: OfferInput): Promise<Offer>;
  subscribeRequests(onRequest: (r: QuoteRequest) => void): () => void;
  /** AI drafts for the vendor to review (needs the online database and the ai-assist function). */
  aiAssist(input: AiInput): Promise<ProductDraft[]>;
  // Shop links: import my shop from a link / claim an imported shop
  listMyLinks(): Promise<ShopLink[]>;
  addLink(l: Pick<ShopLink, 'kind' | 'url' | 'sourceId'>): Promise<ShopLink>;
  removeLink(id: string): Promise<void>;
  // Ratings: only a customer who contacted the vendor through PrintingIQ can rate them, once per inquiry
  listRatings(): Promise<Record<string, VendorRating>>;
  listReviews(vendorId: string): Promise<Review[]>;
  addReview(r: { leadId: string; customerPhone: string; stars: number; comment?: string }): Promise<void>;
}

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

// ---------- Local (demo) backend ----------
const K = {
  products: 'printingiq.products', vendors: 'printingiq.vendors', accounts: 'printingiq.accounts',
  session: 'printingiq.session', leads: 'printingiq.leads', requests: 'printingiq.requests', offers: 'printingiq.offers',
  links: 'printingiq.links', reviews: 'printingiq.reviews',
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
const requestListeners = new Set<(r: QuoteRequest) => void>();
const REQUEST_DAYS = 30; // vendors see requests from the last 30 days
const recent = (iso: string) => Date.now() - new Date(iso).getTime() < REQUEST_DAYS * 864e5;

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
  async createRequest(r) {
    const req: QuoteRequest = { ...r, id: uid(), token: uid() + uid(), status: 'open', createdAt: new Date().toISOString() };
    await writeJSON(K.requests, [req, ...(await readJSON<QuoteRequest[]>(K.requests, []))]);
    requestListeners.forEach((fn) => fn(req));
    return { id: req.id, token: req.token! };
  },
  async getRequest(id, token) {
    const req = (await readJSON<QuoteRequest[]>(K.requests, [])).find((x) => x.id === id && x.token === token);
    if (!req) return null;
    return { request: req, offers: (await readJSON<Offer[]>(K.offers, [])).filter((o) => o.requestId === id) };
  },
  async closeRequest(id, token) {
    await writeJSON(K.requests, (await readJSON<QuoteRequest[]>(K.requests, [])).map((x) =>
      (x.id === id && x.token === token ? { ...x, status: 'closed' as const } : x)));
  },
  async listOpenRequests() {
    if (!(await this.getMyVendor())) return [];
    return (await readJSON<QuoteRequest[]>(K.requests, []))
      .filter((x) => x.status === 'open' && recent(x.createdAt)).map(({ token: _t, ...x }) => x);
  },
  async listMyOffers() {
    const me = await this.getMyVendor();
    return me ? (await readJSON<Offer[]>(K.offers, [])).filter((o) => o.vendorId === me.id) : [];
  },
  async sendOffer(o) {
    const me = await this.getMyVendor();
    if (!me) throw new Error('Sign in first');
    const offers = await readJSON<Offer[]>(K.offers, []);
    const old = offers.find((x) => x.requestId === o.requestId && x.vendorId === me.id);
    const saved: Offer = { ...o, id: old?.id ?? uid(), vendorId: me.id, createdAt: new Date().toISOString() };
    await writeJSON(K.offers, [saved, ...offers.filter((x) => x.id !== saved.id)]);
    return saved;
  },
  subscribeRequests(onRequest) {
    requestListeners.add(onRequest);
    return () => { requestListeners.delete(onRequest); };
  },
  async aiAssist() {
    throw new AiError('unavailable'); // the demo has no server to keep the AI key on
  },
  async listMyLinks() {
    const me = await this.getMyVendor();
    return me ? (await readJSON<(ShopLink & { vendorId: string })[]>(K.links, [])).filter((l) => l.vendorId === me.id) : [];
  },
  async addLink(l) {
    const me = await this.getMyVendor();
    if (!me) throw new Error('Sign in first');
    const link = { ...l, id: uid(), vendorId: me.id, status: 'pending' as const, createdAt: new Date().toISOString() };
    await writeJSON(K.links, [link, ...(await readJSON<ShopLink[]>(K.links, []))]);
    return link;
  },
  async removeLink(id) {
    await writeJSON(K.links, (await readJSON<ShopLink[]>(K.links, [])).filter((l) => l.id !== id));
  },
  async listRatings() {
    return ratingsOf(await readJSON<Review[]>(K.reviews, []));
  },
  async listReviews(vendorId) {
    return (await readJSON<Review[]>(K.reviews, [])).filter((r) => r.vendorId === vendorId);
  },
  async addReview({ leadId, customerPhone, stars, comment }) {
    const lead = (await readJSON<Lead[]>(K.leads, [])).find((l) => l.id === leadId && l.customerPhone === customerPhone);
    if (!lead) throw new Error('Not found');
    const reviews = await readJSON<(Review & { leadId: string })[]>(K.reviews, []);
    if (reviews.some((r) => r.leadId === leadId)) return;
    const review = { id: uid(), leadId, vendorId: lead.vendorId, stars, comment, customerName: lead.customerName, createdAt: new Date().toISOString() };
    await writeJSON(K.reviews, [review, ...reviews]);
  },
};

function ratingsOf(reviews: Review[]): Record<string, VendorRating> {
  const out: Record<string, VendorRating> = {};
  for (const r of reviews) {
    const x = (out[r.vendorId] ??= { avg: 0, count: 0 });
    x.avg = (x.avg * x.count + r.stars) / (x.count + 1);
    x.count++;
  }
  return out;
}

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

const VENDOR_COLS = 'id,name,city,phone,whatsapp,email,about,verified,kind,areas,portfolio';

type RequestRow = {
  id: string; group_id: string; category_id: string | null; description: string; quantity: string | null; city: string;
  files: Attachment[] | null; customer_name: string; customer_phone: string; status: QuoteRequest['status']; created_at: string;
};
const fromRequestRow = (r: RequestRow): QuoteRequest => ({
  id: r.id, groupId: r.group_id, categoryId: r.category_id ?? undefined, description: r.description, quantity: r.quantity ?? undefined,
  city: r.city, files: r.files ?? [], customerName: r.customer_name, customerPhone: r.customer_phone, status: r.status, createdAt: r.created_at,
});
type OfferRow = { id: string; request_id: string; vendor_id: string; price: number | null; currency: Offer['currency']; note: string | null; days: number | null; created_at: string };
const fromOfferRow = (r: OfferRow): Offer => ({
  id: r.id, requestId: r.request_id, vendorId: r.vendor_id, price: r.price, currency: r.currency, note: r.note ?? undefined,
  days: r.days ?? undefined, createdAt: r.created_at,
});

/** Customers' designs for quote requests (no account needed; see the request-files bucket in schema.sql). */
async function uploadRequestFile(sb: SupabaseClient, f: Attachment): Promise<Attachment> {
  if (/^https?:\/\//.test(f.url)) return f;
  const blob = await (await fetch(f.url)).blob();
  const safe = f.name.normalize('NFKD').replace(/[^\w.-]+/g, '_').slice(-60) || 'file';
  const path = `requests/${uid()}-${safe}`;
  const { error } = await sb.storage.from('request-files').upload(path, blob, { contentType: f.type || blob.type || undefined });
  if (error) throw error;
  return { ...f, url: sb.storage.from('request-files').getPublicUrl(path).data.publicUrl };
}

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
      kind: v.kind ?? 'shop', areas: v.areas ?? [],
      portfolio: await Promise.all((v.portfolio ?? []).slice(0, 12).map((u) => uploadImage(sb, id, u))),
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
    async createRequest(r) {
      const files = await Promise.all(r.files.map((f) => uploadRequestFile(sb, f)));
      // A database function saves the request and its private token together (customers have no account).
      const data = must(await sb.rpc('create_quote_request', {
        p_group_id: r.groupId, p_category_id: r.categoryId ?? null, p_description: r.description, p_quantity: r.quantity ?? null,
        p_city: r.city, p_files: files, p_customer_name: r.customerName, p_customer_phone: r.customerPhone,
      })) as { id: string; token: string };
      sb.functions.invoke('notify-vendor', { body: { request_id: data.id } }).catch(() => {});
      return data;
    },
    async getRequest(id, token) {
      const data = must(await sb.rpc('get_quote_request', { p_id: id, p_token: token })) as { request: RequestRow; offers: OfferRow[] } | null;
      return data?.request ? { request: { ...fromRequestRow(data.request), token }, offers: (data.offers ?? []).map(fromOfferRow) } : null;
    },
    async closeRequest(id, token) {
      must(await sb.rpc('close_quote_request', { p_id: id, p_token: token }));
    },
    async listOpenRequests() {
      if (!(await userId())) return [];
      const since = new Date(Date.now() - 30 * 864e5).toISOString();
      return (must(await sb.from('quote_requests').select('*').eq('status', 'open').gte('created_at', since)
        .order('created_at', { ascending: false }).limit(200)) as RequestRow[]).map(fromRequestRow);
    },
    async listMyOffers() {
      const id = await userId();
      if (!id) return [];
      return (must(await sb.from('quote_offers').select('*').eq('vendor_id', id).limit(500)) as OfferRow[]).map(fromOfferRow);
    },
    async sendOffer(o) {
      const id = await userId();
      if (!id) throw new Error('Sign in first');
      return fromOfferRow(must(await sb.from('quote_offers').upsert({
        request_id: o.requestId, vendor_id: id, price: o.price, currency: o.currency, note: o.note ?? null, days: o.days ?? null,
      }, { onConflict: 'request_id,vendor_id' }).select('*').single()) as OfferRow);
    },
    subscribeRequests(onRequest) {
      const ch = sb
        .channel('quote-requests')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'quote_requests' },
          (payload) => onRequest(fromRequestRow(payload.new as RequestRow)))
        .subscribe();
      return () => { sb.removeChannel(ch); };
    },
    async listMyLinks() {
      const id = await userId();
      if (!id) return [];
      type LinkRow = { id: string; kind: ShopLink['kind']; url: string | null; source_id: string | null; status: ShopLink['status']; last_result: string | null; synced_at: string | null; created_at: string };
      return (must(await sb.from('shop_links').select('*').eq('vendor_id', id).order('created_at', { ascending: false })) as LinkRow[]).map((r) => ({
        id: r.id, kind: r.kind, url: r.url ?? undefined, sourceId: r.source_id ?? undefined, status: r.status,
        lastResult: r.last_result ?? undefined, syncedAt: r.synced_at ?? undefined, createdAt: r.created_at,
      }));
    },
    async addLink(l) {
      const id = await userId();
      if (!id) throw new Error('Sign in first');
      const linkId = crypto.randomUUID();
      must(await sb.from('shop_links').insert({ id: linkId, vendor_id: id, kind: l.kind, url: l.url ?? null, source_id: l.sourceId ?? null }));
      return { ...l, id: linkId, status: 'pending', createdAt: new Date().toISOString() };
    },
    async removeLink(lid) {
      must(await sb.from('shop_links').delete().eq('id', lid));
    },
    async listRatings() {
      const rows = must(await sb.from('vendor_ratings').select('*')) as { vendor_id: string; avg: number; count: number }[];
      return Object.fromEntries(rows.map((r) => [r.vendor_id, { avg: Number(r.avg), count: r.count }]));
    },
    async listReviews(vendorId) {
      type Row = { id: string; vendor_id: string; stars: number; comment: string | null; customer_name: string; created_at: string };
      return (must(await sb.from('reviews').select('id,vendor_id,stars,comment,customer_name,created_at').eq('vendor_id', vendorId)
        .order('created_at', { ascending: false }).limit(50)) as Row[]).map((r) => ({
        id: r.id, vendorId: r.vendor_id, stars: r.stars, comment: r.comment ?? undefined, customerName: r.customer_name, createdAt: r.created_at,
      }));
    },
    async addReview({ leadId, customerPhone, stars, comment }) {
      must(await sb.rpc('add_review', { p_lead_id: leadId, p_phone: customerPhone, p_stars: stars, p_comment: comment ?? null }));
    },
    async aiAssist(input) {
      const { data, error } = await sb.functions.invoke('ai-assist', { body: input });
      if (error) {
        // The function answers { error: code } with a status; read the code when there is one
        const ctx = (error as { context?: Response }).context;
        const code = ctx?.json ? await ctx.json().then((b: { error?: string }) => b.error).catch(() => undefined) : undefined;
        throw new AiError(code ?? 'unavailable');
      }
      return (data as { items: ProductDraft[] }).items ?? [];
    },
  };
}

const URL_ = process.env.EXPO_PUBLIC_SUPABASE_URL;
const KEY_ = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
export const backend: Backend = URL_ && KEY_ ? supabaseBackend(URL_, KEY_) : localBackend;
