# PrintingIQ

A marketplace for print, sign and stationery supplies in Iraq. Vendors list products such as acrylic, foam/PVC board, Alucobond, flex, stickers and vinyl, paper, inks, printing machines, laser/CNC machines and stationery. Customers browse and contact vendors on WhatsApp or by phone.

**One codebase builds three things: the website, the Android app and the iOS app** ([Expo](https://expo.dev) + React Native + Expo Router).

## Features
- **8 main category groups with 60 subcategories:** sign & print materials, machines, inks, printing services, stationery, promotional gifts, awards, and clothing & bags
- **Product cards** show the product code, color dots, stock quantity, price, and badges for "out of stock" and "custom order"
- **Sorting** by newest, price (low/high, with IQD and USD compared together) and stock, plus subcategory and color filters
- **Favorites (♡) and a quote list (🛒):** the quote list sends each vendor one itemized WhatsApp message, since that's how orders are agreed in Iraq
- **Daily catalog sync:** every night, products, prices and contact details are copied from Iraqi vendors' websites, Shopify/WooCommerce shops, public Telegram channels and Instagram business accounts (`scripts/sync/`, see its README). Each listing links to the original and shows the date its price was checked
- **Website layout on desktop** (top contact bar, header, slider, footer) and **app layout on phones** (bottom tabs)

## Languages
- **Kurdish (Sorani, `ckb`)**, **Arabic (`ar`)** and **English (`en`)**, with an in-app switch. The language is detected from the device the first time and remembered after that.
- Kurdish and Arabic switch the whole layout to right-to-left straight away, with no restart.
- Vendors type the product name and description in each language. If one language is left empty, the app shows another language instead.
- Search matches all three languages at once, so "acrylic", "أكريليك" and "ئەکریلیک" all find the same sheet.
- All interface text is in `src/lib/i18n.tsx`, and categories, colors and cities are in `src/lib/catalog.ts`.

## Run it
```bash
npm install
npm run web        # website at http://localhost:8081
npm start          # scan the QR code with the Expo Go app on your phone
```
With no setup, the app runs in **demo mode**: it shows sample products, and anything a vendor adds is saved only on that device.

## Go live (shared database, vendor accounts, inquiries, image upload)
1. Create a free project at [supabase.com](https://supabase.com).
2. In **SQL Editor**, run `supabase/schema.sql`. It's safe to run again after updates.
3. In **Project Settings → API**, copy the *Project URL* and the *anon public* key:
   - **Website:** add them in Netlify → Site configuration → Environment variables as
     `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`, then redeploy.
   - **Local / apps:** copy `.env.example` to `.env` and fill in the same two values.
4. Optional: under **Authentication → Providers → Email**, turn off "Confirm email" so vendors can start immediately.

### How vendors get notified
When a customer taps **WhatsApp**, **Call** or **Send request** on the quote list, they enter their name and phone once. PrintingIQ then:
1. saves an inquiry (`leads` table), which only that vendor can read;
2. shows it live in the vendor dashboard (**Account → Inquiries**), with a badge and a pop-up alert, plus a browser notification on the website;
3. sends a **push notification** to the vendor's phone app (after the steps below);
4. opens WhatsApp with a message that starts "I found your product on PrintingIQ…" and includes the customer's name and phone.

Phone push notifications need a real app build, not Expo Go:
```bash
npx eas-cli@latest init                                     # adds the projectId push needs
npx supabase functions deploy notify-vendor --no-verify-jwt # sends the push when an inquiry arrives
npx eas-cli@latest build -p android
```

## Publish
```bash
npm run build:web                       # static website in dist/ (Netlify, Vercel, Cloudflare Pages…)
npx eas-cli@latest build -p android     # Play Store build
npx eas-cli@latest build -p ios         # App Store build (needs an Apple developer account)
```

## Structure
```
src/app/(tabs)/index.tsx       Home: search, categories, latest products
src/app/(tabs)/categories.tsx  All categories
src/app/(tabs)/sell.tsx        Vendor form: 3-language name/description, colors, thickness, sizes, price, photos
src/app/(tabs)/quote.tsx       Quote list → WhatsApp request per vendor
src/app/(tabs)/account.tsx     Vendor sign up / sign in, dashboard: inquiries, my products, shop profile
src/app/search.tsx             Search + sort
src/app/favorites.tsx          Saved products
src/app/category/[id].tsx      Category listing with color filter
src/app/product/[id].tsx       Product details, vendor card, contact (WhatsApp / call)
src/app/vendor/[id].tsx        Vendor shop page
src/components/contact.tsx     Contact sheet: records the inquiry, then opens WhatsApp or the dialer
src/lib/                       i18n, catalog data, backend (demo or Supabase), store
public/catalog.json            Daily catalog copied from vendors' sites (written by scripts/sync, loaded at startup)
scripts/sync/                  Daily sync: sources.json lists the vendors; runs from .github/workflows/daily-sync.yml
supabase/schema.sql            Database tables, security rules, realtime, image bucket
supabase/functions/            notify-vendor: push notification to the vendor's phone
```

## Suggested next steps
- Phone number + SMS code login for vendors (more common than email in Iraq)
- Admin panel to verify vendors and approve listings
- Kurdish Kurmanji/Badini (Latin script) as a 4th language for Duhok
- Search filters for city and price, and favorites
- Orders/quotes inside the app, and later FIB / ZainCash / FastPay payments
