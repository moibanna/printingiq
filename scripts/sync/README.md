# Daily catalog sync

Every night at 03:17 Iraq time, GitHub runs `scripts/sync/sync.py` (see `.github/workflows/daily-sync.yml`).
It copies products, prices, photos and contact details from the vendors listed in `sources.json` into
`public/catalog.json`, and commits that file to `main`.
Netlify then republishes the website, and the phone apps download the new catalog the next time they open.

Each product page shows where the listing came from (link to the original shop page or post) and the date the
price was last checked.

## Dollar rate

Prices are converted with the **market** rate (what exchange shops charge), not the Central Bank's official rate.
It is read from [Shafaq News](https://shafaq.com/en/Economy)'s Baghdad/Erbil market report (the Al-Kifah / Al-Harithiya
bourse price per $100), every day at 11:30 and 15:00 Iraq time (and with the products at 03:17). The app shows
it as "Dollar market rate" and links to the report it came from.

To use your own rate instead, for example what the Tak Nrx app or your exchange shop shows, set `"override": 1790`
under `exchangeRate` in `sources.json` (set it back to `null` to go automatic).
The previous rate is kept if the report can't be read, is more than 4 days old, is outside 1,000–3,000, or moves more
than 20% in a day.

## Run it yourself

```bash
python3 scripts/sync/sync.py            # every source
python3 scripts/sync/sync.py toolmart   # just one (the others keep their last data)
python3 scripts/sync/sync.py rate       # only the dollar rate
python3 -m unittest discover -s scripts/sync
```

To run it on GitHub at any time: open the repository → **Actions** → **Daily catalog sync** → **Run workflow**.
The result of each source is in `scripts/sync/last-report.json`.

## Safety

- If a site is down or has changed, that vendor keeps yesterday's products instead of disappearing.
- If a vendor's product count suddenly drops by more than 70%, the new data is ignored for that day.
- Every site's `robots.txt` is respected, requests are spaced at least one second apart, and the importer
  identifies itself as `PrintingIQ-catalog-sync/1.0`.
- Only items recognised as print, sign, machine, stationery, promotional or award products are kept
  (keywords in English, Arabic and Kurdish: `classify.py`).

## Add a vendor

Add an entry to `sources.json`. The vendor fields are what customers see:

| Field | Meaning |
|---|---|
| `id` | Short unique name, letters/numbers/dashes (e.g. `al-noor-sign`) |
| `name`, `city`, `phone`, `whatsapp`, `email`, `website`, `about` | Shown on the vendor's page and every product |
| `adapter` | How to read the source: see below |
| `enabled` | `false` to pause a source without deleting it |

### Shopify shop

```json
{ "id": "shopname", "adapter": "shopify", "url": "https://shop.example.iq", "currency": "IQD",
  "collections": ["printers", "stationery"], "skipBrands": [], "name": "…", "city": "Baghdad", "phone": "07…" }
```
`collections` is optional (without it the whole shop is read). Shopify shops show `/collections/…` in their links.

### WooCommerce (WordPress) shop

```json
{ "id": "shopname", "adapter": "woocommerce", "url": "https://shop.example.iq", "currency": "IQD", "name": "…", "phone": "07…" }
```
Works when the shop has WooCommerce's public Store API (`/wp-json/wc/store/v1/products`).

### Public Telegram channel

```json
{ "id": "signshop", "adapter": "telegram", "channel": "signshop", "days": 120, "defaultCategory": "acrylic",
  "name": "…", "phone": "07…" }
```
Each post with a photo becomes a product: the first line is the name, the rest the description. The price is read
from the text ("25$", "25 دولار", "15,000 دينار", "15 الف", "نرخ ٢٥ هەزار"). Posts without a recognisable product are
skipped. `defaultCategory` helps when posts don't name the product type.

### Instagram business account

```json
{ "id": "shopname", "adapter": "instagram", "username": "shop.name", "name": "…", "phone": "07…" }
```
Instagram only allows this through Meta's official API (Business Discovery), which needs **your own** Instagram
professional account connected to a Facebook page and a Meta app. Once you have them, add two repository secrets
on GitHub (Settings → Secrets and variables → Actions): `IG_USER_ID` and `IG_ACCESS_TOKEN`.
The vendor's account must be a business or creator account.

### Facebook pages, WhatsApp channels, OpenSooq

Not supported: Facebook doesn't let apps read other businesses' pages, WhatsApp channels have no public feed,
and OpenSooq's terms forbid copying listings. Ask those vendors to open a PrintingIQ vendor account instead.

## Shops vendors link themselves

Vendors can paste a link to their website, Telegram channel or Instagram account (Dashboard → My shop), or say that
a shop PrintingIQ already imports is theirs. Each request waits in the `shop_links` table in Supabase:

1. Check the request (call the vendor if needed), then set `status` to `approved` (or `rejected`) in the Supabase
   table editor.
2. The next nightly run imports it into the vendor's own shop and writes the result in `last_result`, which the
   vendor sees in their dashboard.

This needs two repository secrets on GitHub (Settings → Secrets and variables → Actions): `SUPABASE_URL` and
`SUPABASE_SERVICE_ROLE_KEY`. Without them linked shops are skipped and everything else runs as before.

## Vendors with their own API

`custom.py` reads Print Way, 365 Promo and Penna through their websites' own catalog APIs
(adapters `printway`, `365promo`, `penna`).
