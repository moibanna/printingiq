"""
Shops that vendors linked themselves, from their PrintingIQ dashboard (table shop_links in supabase/schema.sql):

  • kind "import": the vendor pasted a link to their website, Telegram channel or Instagram account. Once a PrintingIQ
    admin approves it (status = 'approved' in the Supabase table editor), the daily sync copies its products into
    the vendor's own shop.
  • kind "claim": the vendor says an imported shop (e.g. Toolmart) is theirs. Once approved, that shop's daily
    products are listed under the vendor's account instead of the imported profile.

Needs two GitHub repository secrets: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY. Without them this does nothing.
The service-role key stays in GitHub Actions; it is never in the app.
"""
import json
import os
import re
import urllib.request
from datetime import datetime, timezone
from urllib.parse import urlsplit

from http_util import USER_AGENT, get

URL = os.environ.get('SUPABASE_URL', '').rstrip('/')
KEY = os.environ.get('SUPABASE_SERVICE_ROLE_KEY', '')


def enabled() -> bool:
    return bool(URL and KEY)


def _rest(method: str, path: str, body=None):
    req = urllib.request.Request(
        f'{URL}/rest/v1/{path}', method=method, data=json.dumps(body).encode() if body is not None else None,
        headers={'apikey': KEY, 'Authorization': f'Bearer {KEY}', 'Content-Type': 'application/json',
                 'User-Agent': USER_AGENT, 'Prefer': 'return=minimal'})
    with urllib.request.urlopen(req, timeout=60) as r:
        raw = r.read()
        return json.loads(raw) if raw else None


def approved_links() -> list[dict]:
    """Approved links with the vendor's public profile."""
    if not enabled():
        return []
    return _rest('GET', 'shop_links?status=eq.approved&select=id,kind,url,source_id,vendor_id,'
                        'vendors(id,name,city,phone,whatsapp,email,about)&order=created_at.asc') or []


def report(link_id: str, result: str):
    """Shows the vendor how the last import went (in their dashboard)."""
    if not enabled():
        return
    now = datetime.now(timezone.utc).replace(microsecond=0).isoformat()
    _rest('PATCH', f'shop_links?id=eq.{link_id}', {'last_result': result[:300], 'synced_at': now})


def detect(url: str) -> dict:
    """Which importer reads this link: Telegram channel, Instagram account, or a shop website."""
    u = url.strip()
    if not re.match(r'^https?://', u, re.I):
        u = 'https://' + u
    parts = urlsplit(u)
    host = parts.netloc.lower().removeprefix('www.')
    path = [p for p in parts.path.split('/') if p]
    if host in ('t.me', 'telegram.me') and path:
        name = path[1] if path[0] == 's' and len(path) > 1 else path[0]
        return {'adapter': 'telegram', 'channel': name}
    if host in ('instagram.com', 'm.instagram.com') and path:
        return {'adapter': 'instagram', 'username': path[0]}
    if host in ('facebook.com', 'm.facebook.com', 'fb.com', 'wa.me', 'whatsapp.com', 'opensooq.com', 'iq.opensooq.com'):
        raise ValueError(f'{host} cannot be imported (no public feed, or its terms forbid copying)')
    return {'adapter': 'website', 'url': f'{parts.scheme}://{parts.netloc}'}


def import_website(src: dict, adapters: dict) -> list[dict]:
    """A shop website: Shopify or WooCommerce, whichever answers."""
    site = src['url'].rstrip('/')
    try:
        if isinstance(get(f'{site}/products.json?limit=1').get('products'), list):
            return adapters['shopify'](src)
    except Exception:
        pass
    try:
        if isinstance(get(f'{site}/wp-json/wc/store/v1/products?per_page=1'), list):
            return adapters['woocommerce'](src)
    except Exception:
        pass
    raise ValueError('this website is not a Shopify or WooCommerce shop; ask the vendor for a Telegram channel or a price list')


def sources(links: list[dict]) -> list[dict]:
    """Import links as sync sources. The source id is the vendor's account id, so products land in their own shop.
    One import link per vendor: the most recently approved one wins."""
    out: dict[str, dict] = {}
    for l in links:
        if l['kind'] != 'import' or not l.get('vendors'):
            continue
        v = l['vendors']
        try:
            src = detect(l['url'])
        except ValueError as e:
            report(l['id'], f'error: {e}')
            continue
        out[l['vendor_id']] = {
            **src, 'id': l['vendor_id'], 'linkId': l['id'], 'currency': 'IQD', 'days': 120,
            'name': v.get('name') or '', 'city': v.get('city') or '', 'phone': v.get('phone') or '',
            'whatsapp': v.get('whatsapp') or '', 'email': v.get('email') or '', 'about': v.get('about') or '',
            'website': l['url'],
        }
    return list(out.values())


def claims(links: list[dict]) -> dict[str, dict]:
    """{imported source id: claim link} for approved claims."""
    return {l['source_id']: l for l in links if l['kind'] == 'claim' and l.get('source_id')}


def apply_claims(vendors: list[dict], products: list[dict], claimed: dict[str, dict]) -> tuple[list[dict], list[dict]]:
    """Moves each claimed shop's products to the claiming vendor's account (keeps the shop's public details)."""
    if not claimed:
        return vendors, products
    new_id = {sid: c['vendor_id'] for sid, c in claimed.items()}
    vendors = [{**v, 'id': new_id[v['id']], 'imported': True} if v['id'] in new_id else v for v in vendors]
    products = [{**p, 'vendorId': new_id[p['vendorId']]} if p['vendorId'] in new_id else p for p in products]
    return vendors, products
