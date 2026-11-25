"""
Importers that work for many shops, configured in sources.json:
  shopify     – any Shopify store (public /products.json), optionally limited to some collections
  woocommerce – any WordPress/WooCommerce store (public Store API)
  telegram    – a public Telegram channel (t.me/s/<channel> web preview); price and category read from each post
  instagram   – a public Instagram business/creator account through Meta's Business Discovery API
                (needs IG_USER_ID and IG_ACCESS_TOKEN from your own Instagram business account; see README)
Every importer keeps only items that classify.category_for() recognises as print / sign / stationery products.
"""
import html
import os
import re
import urllib.error
from datetime import datetime, timedelta, timezone
from urllib.parse import quote

from classify import category_for, find_price, split_lang
from http_util import allowed, get, get_text


def _num(v):
    try:
        f = float(v)
    except (TypeError, ValueError):
        return None
    if f <= 0:
        return None  # 0 means "ask for price" in most shops
    return int(f) if f.is_integer() else round(f, 2)


def _strip_html(s: str) -> str:
    s = re.sub(r'<br\s*/?>|</p>|</li>', '\n', s or '', flags=re.I)
    s = re.sub(r'<[^>]+>', ' ', s)
    s = html.unescape(s)
    s = re.sub(r'[ \t\xa0]+', ' ', s)
    return re.sub(r'\n\s*\n+', '\n', s).strip()


def _short(s: str, n: int) -> str:
    return s if len(s) <= n else s[: n - 1].rstrip() + '…'


def _product(src, pid, cat, name, desc, price, currency, images, url, **extra):
    p = {
        'id': f"{src['id']}-{pid}", 'vendorId': src['id'], 'categoryId': cat,
        'name': name, 'description': desc, 'price': price, 'currency': currency or src.get('currency', 'IQD'),
        'unit': 'piece', 'images': images[:6], 'sourceUrl': url, **extra,
    }
    return {k: v for k, v in p.items() if v not in (None, '', [], {})}


# ───────────────────────── Shopify
def _shopify_pages(base: str):
    page = 1
    while page <= 200:
        url = f'{base}/products.json?limit=250&page={page}'
        try:
            batch = get(url)['products']
        except urllib.error.HTTPError as e:
            if e.code == 400 and page > 1:  # Shopify stops serving deep pages: treat as the end
                return
            raise
        if not batch:
            return
        yield from batch
        page += 1


def import_shopify(src):
    site = src['url'].rstrip('/')
    bases = [f'{site}/collections/{quote(c)}' for c in src.get('collections', [])] or [site]
    skip_vendors = {v.lower() for v in src.get('skipBrands', [])}
    out, seen = [], set()
    for base in bases:
        if not allowed(base + '/products.json'):
            raise PermissionError(f'robots.txt disallows {base}/products.json')
        for x in _shopify_pages(base):
            if x['id'] in seen or (x.get('vendor') or '').lower() in skip_vendors:
                continue
            seen.add(x['id'])
            title = x.get('title') or ''
            cat = category_for(title, x.get('product_type') or '')
            if not cat:
                continue
            variants = x.get('variants') or [{}]
            prices = [p for p in (_num(v.get('price')) for v in variants) if p]
            out.append(_product(
                src, x['id'], cat, split_lang(title), split_lang(_short(_strip_html(x.get('body_html')), 1500)),
                min(prices) if prices else None, src.get('currency'),
                [i['src'] for i in x.get('images') or [] if i.get('src')], f"{site}/products/{x['handle']}",
                brand=(x.get('vendor') or '') if (x.get('vendor') or '').lower() not in ('', src['name'].lower(), 'toolmart gifts') else '',
                sku=variants[0].get('sku') or '',
                availability='in_stock' if any(v.get('available') for v in variants) else 'out_of_stock',
                createdAt=x.get('created_at'),
            ))
    return merge_variants(out)


# ───────────────────────── WooCommerce (Store API, no key needed)
def import_woocommerce(src):
    site = src['url'].rstrip('/')
    out, page = [], 1
    api = f'{site}/wp-json/wc/store/v1/products'
    if not allowed(api):
        raise PermissionError(f'robots.txt disallows {api}')
    while page <= 100:
        try:
            batch = get(f'{api}?per_page=100&page={page}')
        except urllib.error.HTTPError as e:
            if e.code == 400 and page > 1:  # past the last page
                break
            raise
        if not batch:
            break
        for x in batch:
            title = html.unescape(x.get('name') or '')
            cats = ' '.join(c.get('name', '') for c in x.get('categories') or [])
            cat = category_for(title, cats)
            if not cat:
                continue
            pr = x.get('prices') or {}
            minor = int(pr.get('currency_minor_unit') or 0)
            price = _num(int(pr['price']) / 10 ** minor) if pr.get('price') else None
            cur = (pr.get('currency_code') or src.get('currency') or 'IQD').upper()
            out.append(_product(
                src, x['id'], cat, split_lang(title),
                split_lang(_short(_strip_html(x.get('short_description') or x.get('description')), 1500)),
                price, cur if cur in ('IQD', 'USD') else src.get('currency', 'IQD'),
                [i['src'] for i in x.get('images') or [] if i.get('src')], x.get('permalink'),
                sku=x.get('sku') or '', availability='in_stock' if x.get('is_in_stock', True) else 'out_of_stock',
            ))
        page += 1
    return out


# ───────────────────────── Telegram public channel
_TG_POST = re.compile(r'<div class="tgme_widget_message_wrap.*?(?=<div class="tgme_widget_message_wrap|\Z)', re.S)


def parse_telegram(page_html: str, channel: str):
    """Posts on one t.me/s/<channel> page, oldest first: {id, text, images, date, url}."""
    posts = []
    for block in _TG_POST.findall(page_html):
        m = re.search(r'data-post="([^"]+)"', block)
        if not m:
            continue
        post_id = m.group(1).split('/')[-1]
        tm = re.search(r'<div class="tgme_widget_message_text[^"]*"[^>]*>(.*?)</div>', block, re.S)
        text = _strip_html(tm.group(1)) if tm else ''
        imgs = re.findall(r"tgme_widget_message_photo_wrap[^>]*background-image:url\('([^']+)'\)", block)
        dm = re.search(r'<time datetime="([^"]+)"', block)
        posts.append({'id': post_id, 'text': text, 'images': imgs, 'date': dm.group(1) if dm else None,
                      'url': f'https://t.me/{channel}/{post_id}'})
    return posts


def _post_product(src, pid, text, images, date, url):
    """A product from one social post: first line is the name, the rest the description."""
    if not text or not images:
        return None
    lines = [l.strip(' -•*#') for l in text.splitlines() if l.strip(' -•*#')]
    title = _short(lines[0], 90) if lines else ''
    cat = category_for(title, text, src.get('defaultCategory') or '')
    if not cat:
        return None
    price, cur = find_price(text)
    return _product(src, pid, cat, split_lang(title), split_lang(_short(text, 1500)), price, cur, images, url,
                    availability='in_stock', createdAt=date)


def import_telegram(src):
    channel = src['channel'].lstrip('@')
    days = int(src.get('days', 120))
    since = datetime.now(timezone.utc) - timedelta(days=days)
    url = f'https://t.me/s/{quote(channel)}'
    out, pages = [], 0
    while url and pages < int(src.get('maxPages', 15)):
        posts = parse_telegram(get_text(url), channel)
        pages += 1
        if not posts:
            break
        for p in posts:
            if p['date'] and datetime.fromisoformat(p['date']) < since:
                continue
            item = _post_product(src, p['id'], p['text'], p['images'], p['date'], p['url'])
            if item:
                out.append(item)
        oldest = posts[0]
        if oldest['date'] and datetime.fromisoformat(oldest['date']) < since:
            break
        url = f"https://t.me/s/{quote(channel)}?before={oldest['id']}"
    return out


# ───────────────────────── Instagram (Meta Business Discovery API)
GRAPH = 'https://graph.facebook.com/' + os.environ.get('META_GRAPH_VERSION', 'v23.0')


def import_instagram(src):
    user_id, token = os.environ.get('IG_USER_ID'), os.environ.get('IG_ACCESS_TOKEN')
    if not (user_id and token):
        raise RuntimeError('IG_USER_ID / IG_ACCESS_TOKEN are not set (see README: Instagram sources)')
    username = src['username'].lstrip('@')
    fields = (f'business_discovery.username({username})'
              '{media.limit(50){id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,'
              'children{media_url,media_type}}}')
    d = get(f'{GRAPH}/{user_id}?fields={quote(fields, safe="(){},._")}&access_token={quote(token)}')
    out = []
    for m in ((d.get('business_discovery') or {}).get('media') or {}).get('data', []):
        imgs = [c['media_url'] for c in (m.get('children') or {}).get('data', []) if c.get('media_type') == 'IMAGE' and c.get('media_url')]
        if not imgs:
            imgs = [m.get('media_url') if m.get('media_type') != 'VIDEO' else m.get('thumbnail_url')]
        item = _post_product(src, m['id'], m.get('caption') or '', [i for i in imgs if i], m.get('timestamp'), m.get('permalink'))
        if item:
            out.append(item)
    return out


def merge_variants(items):
    """Shops often list each colour/size as its own product: merge items with the same name, keeping all photos
    and the lowest price."""
    out, by_name = [], {}
    for p in items:
        key = next((v for v in p['name'].values() if v), '').strip().lower()
        first = by_name.get(key)
        if not first:
            by_name[key] = p
            out.append(p)
            continue
        first['images'] = list(dict.fromkeys(first.get('images', []) + p.get('images', [])))[:6]
        if p.get('price') and (not first.get('price') or p['price'] < first['price']):
            first['price'], first['currency'] = p['price'], p['currency']
        if p.get('availability') == 'in_stock':
            first['availability'] = 'in_stock'
    return out


ADAPTERS = {'shopify': import_shopify, 'woocommerce': import_woocommerce, 'telegram': import_telegram, 'instagram': import_instagram}
