import { Platform } from 'react-native';
import { fromImported, ImportedCatalog, Product, Vendor } from './catalog';

/**
 * The catalog copied every day from Iraqi vendors' websites and social pages (scripts/sync writes public/catalog.json).
 * It is downloaded when the app starts instead of being built into the app, so the website and the phone apps
 * show the new prices the same day, without publishing a new app version.
 *   • Website: served next to the site as /catalog.json.
 *   • Phone apps: set EXPO_PUBLIC_CATALOG_URL to the website's address, e.g. https://printingiq.netlify.app/catalog.json
 */
const CATALOG_URL = process.env.EXPO_PUBLIC_CATALOG_URL || (Platform.OS === 'web' ? '/catalog.json' : '');
const MAX_AGE = 60 * 60 * 1000; // re-download at most once an hour per app session

type Loaded = { vendors: Vendor[]; products: Product[]; syncedAt?: string };
let cache: { at: number; data: Loaded } | null = null;

export async function loadImportedCatalog(): Promise<Loaded> {
  if (cache && Date.now() - cache.at < MAX_AGE) return cache.data;
  if (!CATALOG_URL) return { vendors: [], products: [] };
  try {
    const res = await fetch(CATALOG_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const raw = (await res.json()) as ImportedCatalog;
    const data = { ...fromImported(raw), syncedAt: raw.syncedAt };
    cache = { at: Date.now(), data };
    return data;
  } catch (e) {
    console.warn('Could not load the daily catalog', e);
    return cache?.data ?? { vendors: [], products: [] }; // shoppers still see vendors' own listings
  }
}
