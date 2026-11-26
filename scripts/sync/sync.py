#!/usr/bin/env python3
"""
Daily catalog sync: imports every enabled source in sources.json into public/catalog.json (served by the website, downloaded by the apps).

    python3 scripts/sync/sync.py               # all sources
    python3 scripts/sync/sync.py toolmart      # just some sources (others keep their last data)

Safe by design:
  • a source that fails (site down, blocked, changed) keeps yesterday's products instead of disappearing;
  • a source whose product count suddenly drops by more than 70% is treated as a failure too;
  • every run writes scripts/sync/last-report.json with the result of each source.
Runs every day from .github/workflows/daily-sync.yml.
"""
import json
import sys
import time
import traceback
from datetime import datetime, timezone
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

import custom  # noqa: E402
import exchange  # noqa: E402
import generic  # noqa: E402
import linked  # noqa: E402

ROOT = HERE.parent.parent
OUT = ROOT / 'public' / 'catalog.json'
REPORT = HERE / 'last-report.json'
ADAPTERS = {**custom.ADAPTERS, **generic.ADAPTERS}
ADAPTERS['website'] = lambda src: linked.import_website(src, ADAPTERS)
VENDOR_FIELDS = ('id', 'name', 'city', 'phone', 'whatsapp', 'email', 'website', 'about')


def vendor_of(src: dict, synced_at: str | None) -> dict:
    v = {k: src[k] for k in VENDOR_FIELDS if src.get(k)}
    v.setdefault('city', '')
    v.setdefault('phone', '')
    v['imported'] = True
    if synced_at:
        v['syncedAt'] = synced_at
    return v


def main(only: list[str]):
    config = json.loads((HERE / 'sources.json').read_text(encoding='utf-8'))
    sources = [s for s in config['sources'] if s.get('enabled', True)]
    # Shops vendors linked from their dashboard and PrintingIQ approved (see linked.py)
    try:
        links = linked.approved_links()
    except Exception as e:  # the database being down must not stop the daily catalog
        print(f'✗ linked shops: {e}', file=sys.stderr)
        links = []
    known = {s['id'] for s in sources}
    sources += [s for s in linked.sources(links) if s['id'] not in known]
    claimed = linked.claims(links)
    claimed_by = {c['vendor_id']: sid for sid, c in claimed.items()}

    old = json.loads(OUT.read_text(encoding='utf-8')) if OUT.exists() else {'vendors': [], 'products': []}
    old_products: dict[str, list] = {}
    for p in old['products']:
        # A claimed shop's products carry the claiming vendor's id; file them under the shop's source again
        old_products.setdefault(claimed_by.get(p['vendorId'], p['vendorId']), []).append(p)
    old_vendor = {claimed_by.get(v['id'], v['id']): v for v in old['vendors']}

    now = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace('+00:00', 'Z')
    vendors, products, report = [], [], []
    for src in sources:
        sid = src['id']
        prev = old_products.get(sid, [])
        if only and sid not in only:
            products += prev
            vendors.append(vendor_of(src, old_vendor.get(sid, {}).get('syncedAt')))
            continue
        started = time.time()
        try:
            fresh = ADAPTERS[src['adapter']](src)
            if prev and len(prev) >= 20 and len(fresh) < 0.3 * len(prev):
                raise RuntimeError(f'only {len(fresh)} products now vs {len(prev)} before; keeping the previous data')
            # Keep the first-seen date so "newest" sorting isn't reshuffled every day
            first_seen = {p['id']: p.get('createdAt') for p in prev}
            for p in fresh:
                p['createdAt'] = first_seen.get(p['id']) or p.get('createdAt') or now
            products += fresh
            vendors.append(vendor_of(src, now))
            report.append({'id': sid, 'ok': True, 'products': len(fresh), 'before': len(prev), 'seconds': round(time.time() - started)})
            print(f'✓ {sid}: {len(fresh)} products (was {len(prev)})')
            if src.get('linkId'):
                linked.report(src['linkId'], f'ok: {len(fresh)} products')
        except Exception as e:  # keep yesterday's data for this source
            products += prev
            vendors.append(vendor_of(src, old_vendor.get(sid, {}).get('syncedAt')))
            report.append({'id': sid, 'ok': False, 'error': f'{type(e).__name__}: {e}', 'kept': len(prev)})
            print(f'✗ {sid}: {e} — kept {len(prev)} previous products', file=sys.stderr)
            traceback.print_exc(limit=2)
            if src.get('linkId'):
                linked.report(src['linkId'], f'error: {e}')

    rate, rate_msg = exchange.daily_rate(config.get('exchangeRate'), old.get('exchange'), now[:10])
    print(f'$ exchange rate: {rate_msg}')

    vendors, products = linked.apply_claims(vendors, products, claimed)
    for sid, c in claimed.items():
        linked.report(c['id'], f"ok: {sum(1 for p in products if p['vendorId'] == c['vendor_id'])} products from {sid}")

    seen, unique = set(), []
    for p in products:
        if p['id'] not in seen:
            seen.add(p['id'])
            unique.append(p)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({'syncedAt': now, 'exchange': rate, 'vendors': vendors, 'products': unique}, ensure_ascii=False, separators=(',', ':')),
                   encoding='utf-8')
    REPORT.write_text(json.dumps({'ranAt': now, 'total': len(unique), 'exchangeRate': rate_msg, 'sources': report}, ensure_ascii=False, indent=1) + '\n',
                      encoding='utf-8')
    print(f'Wrote {len(unique)} products from {len(vendors)} vendors to {OUT.relative_to(ROOT)}')
    # Fail the run (so GitHub shows it) only when nothing could be imported at all
    return 0 if any(r['ok'] for r in report) or not report else 1


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
