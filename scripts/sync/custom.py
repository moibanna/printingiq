#!/usr/bin/env python3
"""
Importers for vendors whose websites have their own catalog API:
  Print Way (print-way.com), 365 Promo (365promo.net), Penna (penna-iq.com)
Each importer returns PrintingIQ products. Vendor details live in sources.json; sync.py runs everything.
"""
import re

from http_util import get



def clean(s):
    s = (s or '').replace('\r', ' ').replace('\n', ' ')
    s = re.sub(r'^(\s*-+\s*)+', '', s)          # Print Way prefixes names with "-- - "
    s = re.sub(r'\s+', ' ', s).strip(' -')
    return '' if s in ('', '-', '--', '.') else s


def loc(en='', ar='', ckb=''):
    return {'en': clean(en), 'ar': clean(ar), 'ckb': clean(ckb)}


def has(name, *words):
    n = name.upper()
    return any(w in n for w in words)


def num(v):
    try:
        f = float(v)
        return int(f) if f.is_integer() else round(f, 2)
    except (TypeError, ValueError):
        return None


def product(**kw):
    """Drop empty optional fields to keep the bundle small."""
    return {k: v for k, v in kw.items() if v not in (None, '', [], {})}


# ───────────────────────── Print Way
def pw_category(cat, name):
    cat = (cat or '').strip()
    if cat == 'Advertisement':
        return 'tools' if has(name, 'CNC', 'CUTER', 'CUTTER', 'TOOL') else 'led'
    if cat == 'Machines':
        if has(name, 'LASER'): return 'laser-cnc'
        if has(name, 'PRESS', 'SUBLIM', 'SBMITION'): return 'heat-press'
        if has(name, 'UV '): return 'uv-printer'
        if has(name, 'BADGE', 'MEDAL'): return 'tools'
        return 'office-print'
    if cat == 'INK':
        if has(name, 'UV'): return 'uv-ink'
        if has(name, 'FILM', 'POWDER'): return 'lamination'
        return 'solvent-ink'
    if cat == 'Acrylic&foam':
        if has(name, 'FOAM', 'PVC', 'FOREX'): return 'foam'
        if has(name, 'ALUCO', 'ACP'): return 'acp'
        return 'acrylic'
    if cat == 'FLEX & STICKER':
        return 'flex' if has(name, 'FLEX', 'BANNER') else 'vinyl'
    if cat == 'Sublimations':
        return 'vinyl' if has(name, 'VINYL') else 'sublimation-ink'
    if cat == 'Printing':
        return 'lamination' if has(name, 'SLEFON', 'TIPE', 'TAPE') else 'paper'
    if cat == 'Promotion':
        if has(name, 'TISSUE'): return 'tissue-box'
        if has(name, 'PEN COVER', 'PEN COVRE'): return 'pen-box'
        if has(name, 'NOTE BOOK'): return 'notebooks'
        return 'gift-box'
    if cat == 'Stand':
        if has(name, 'BADGE', 'MAGN'): return 'card-holder'
        if has(name, 'CHARGING'): return 'powerbank'
        if has(name, 'VINYL'): return 'vinyl'
        if has(name, 'GLASS AND PEN'): return 'pen-box'
        return 'stands'
    return {
        'Notebook': 'notebooks', 'Pen': 'pens', 'METAL PEN': 'pens', 'MUG': 'mugs', 'MADEL': 'medals',
        'Crystal': 'crystal', 'BAG': 'bags', 'Trophy': 'trophies', 'T-shirts': 't-shirts', 'HAT': 'hats', 'USB': 'flash',
        'Vest': 'vests', 'LAPTOP BAG': 'laptop-bags', 'POWER BANK PHONE': 'powerbank', "O'clock": 'clocks',
    }.get(cat)


def import_printway(src):
    items, page = [], 1
    while True:
        batch = get(f'https://print-way.com/api/productRegistrations/ProductWholeSale?currentPage={page}&pageSize=100')
        if not batch: break
        items += batch
        page += 1
    out = []
    for x in items:
        if not x.get('active', True): continue
        name = clean(x.get('name'))
        cat = pw_category(x.get('categoryManagement'), name)
        if not name or not cat: continue
        price = (x.get('itemPrice') or {})
        qty = num(price.get('remainQuantity'))
        imgs = [i['imageName'] for i in (x.get('productImages') or [])] or ([x['thumbnail']] if x.get('thumbnail') else [])
        out.append(product(
            id=f"pw-{x['barcode']}", vendorId=src['id'], categoryId=cat,
            name=loc(en=name), description=loc(en=x.get('description'), ar=x.get('arabicDescription'), ckb=x.get('kurdishDescription')),
            price=num(price.get('unitPrice')) or None, currency='USD', unit='piece',
            colors=[], thickness=[], sizes=[clean(x['size'])] if clean(x.get('size')) else [],
            brand=clean(x.get('brandName')), sku=x['barcode'], stockQty=qty,
            availability='in_stock' if (qty or 0) > 0 else 'out_of_stock',
            images=['https://print-way.com/' + i.replace('\\', '/') for i in imgs],
            createdAt='2026-11-01T00:00:00Z',
        ))
    return out


# ───────────────────────── 365 Promo
P365 = {
    'Pens': 'pens', 'Crystal': 'crystal', 'Bags': 'bags', 'VIP Boxs': 'gift-box', 'Notebooks': 'notebooks', 'Box': 'gift-box',
    'Keychain': 'keychains', 'Thermos': 'thermos', 'Cups': 'mugs', 'Power Bank and Mobile': 'powerbank',
    'Business card Holder': 'card-holder', 'Clock and Calendar': 'clocks', 'Stationery': 'office-supplies',
    'Flash Memory': 'flash', 'Vests': 'vests', 'Tissue Box': 'tissue-box', 'Sunshade': 'sunshade', 'Custom Items': 'holographic',
}


def p365_category(cat, name):
    if cat == 'Sign and Light Board':
        if has(name, 'DIGITAL', 'LCD', 'SCREEN'): return 'screens'
        if has(name, 'DOOR'): return 'door-sign'
        if has(name, 'STAND', 'BACKDROP'): return 'stands'
        if has(name, 'ACRYLIC'): return 'acrylic'
        return 'led'
    if cat == 'Gifts':
        if has(name, 'FRAME', 'ALBUM'): return 'frames'
        if has(name, 'SASH', 'GRADUATION'): return 't-shirts'
        return 'holographic'
    if cat == 'Box' and has(name, 'PEN'): return 'pen-box'
    return P365.get(cat)


def color_365(c):
    return {'hex': c.get('colorCode') or '#CCCCCC', 'name': loc(c.get('enName'), c.get('arName'), c.get('kuName'))}


def import_365(src):
    items, page = [], 1
    while True:
        d = get(f'https://api.365promo.net/api/v1/products?page={page}&limit=100&isActive=true')
        items += d.get('data') or []
        if page >= (d.get('pagination') or {}).get('totalPages', 1): break
        page += 1
    out = []
    for x in items:
        en = clean(x.get('enName'))
        cat = p365_category(((x.get('category') or {}).get('enName') or '').strip(), en)
        if not en or not cat: continue
        colors, seen = [], set()
        for v in x.get('colorVariants') or []:
            c = v.get('color') or {}
            if c.get('colorCode') and c['colorCode'] not in seen:
                seen.add(c['colorCode']); colors.append(color_365(c))
        qty = None if x.get('isHasNoQty') else num(x.get('quantity'))
        out.append(product(
            id=f"365-{x['id']}", vendorId=src['id'], categoryId=cat,
            name=loc(en, x.get('arName'), x.get('kuName')), description=loc(en=x.get('description')),
            price=num(x.get('salesPrice')) or None, currency='USD', unit='piece',
            colors=colors, thickness=[], sizes=[], sku=x.get('code'), stockQty=qty,
            availability='custom_order' if x.get('isHasNoQty') else ('in_stock' if (qty or 0) > 0 else 'out_of_stock'),
            images=[u if u.startswith('http') else 'https://api.365promo.net' + u for u in (x.get('images') or [])],
            createdAt=x.get('createdAt'),
        ))
    return out


# ───────────────────────── Penna (categories keyed by their Kurdish name; their English labels are sometimes off)
PENNA = {
    'مەتارە': 'thermos', 'خه‌ڵاتی ڕێزلێنان-کریستاڵ': 'crystal', 'دەفتەر': 'notebooks', 'سێتی دیاری': 'gift-box',
    'مەدالیا': 'keychains', 'قەڵەم': 'pens', 'بابەتی تایبەت': 'holographic', 'کاتژمێر': 'clocks', 'پاوەربانک': 'powerbank',
    'ڕیکلام': 'led', 'توتباگ': 'bags', 'کوپ': 'mugs', 'ناونیشانی سەردەرگا': 'door-sign', 'ھێلەگ': 'vests',
    'بۆکسی دیاری': 'gift-box', 'خه‌ڵاتی ڕێزلێنان-دار': 'wood-award', 'بۆکسی کلێنس': 'tissue-box', 'كیسی دیاری': 'gift-bags',
    'فۆڵدەر': 'folders', 'چوارچێوەی وێنە': 'frames', 'ئایدی هۆڵده‌ر': 'card-holder', 'شاشە': 'screens', 'جانتا': 'bags',
    'ستاند': 'stands', 'فلاش میمۆری': 'flash', 'مێنیو ستاند': 'menu-stand', 'ھۆڵۆگرافیک': 'holographic',
    'بۆکسی قەڵەم': 'pen-box', 'حاسیبە': 'calculators', 'لەزگەی بڕوانامە': 'seals', 'مەدالیا-خەڵات': 'medals',
    'ھەڵگری بڕوانامە': 'certificate-holder',
}


def penna_category(kurdish, name_en):
    if kurdish == 'ئامێر':
        return 'laser-cnc' if has(name_en, 'LASER') else 'heat-press'
    return PENNA.get(kurdish)


def import_penna(src):
    items, page = [], 1
    while True:
        d = get(f'https://penna-iq.com/api/store/items?page={page}&pageSize=200&language=kurdish&currency=USD')
        items += d.get('items') or []
        if page >= d.get('totalPages', 1): break
        page += 1
    out = []
    for x in items:
        if not x.get('isShowInWebsite', True): continue
        cat = penna_category(((x.get('category') or {}).get('kurdish') or '').strip(), x.get('itemNameEnglish') or '')
        name = loc(x.get('itemNameEnglish'), x.get('itemNameArabic'), x.get('itemName'))
        if not cat or not any(name.values()): continue
        colors, seen = [], set()
        for a in x.get('availableColors') or []:
            c = a.get('color') or {}
            if a.get('isActive', True) and c.get('hexCode') and c['hexCode'] not in seen:
                seen.add(c['hexCode'])
                colors.append({'hex': c['hexCode'], 'name': loc(c.get('colorNameEnglish'), c.get('colorNameArabic'), c.get('colorName'))})
        qty = num(x.get('totalQuantity')) if x.get('showQuantityInWebsite') else None
        imgs = [u for u in [x.get('imageData')] + [g if isinstance(g, str) else (g or {}).get('url') for g in (x.get('itemGallery') or [])] if u]
        out.append(product(
            id=f"pn-{x['_id']}", vendorId=src['id'], categoryId=cat, name=name,
            description=loc(x.get('descriptionEnglish'), x.get('descriptionArabic'), x.get('descriptionKurdish')),
            price=(num(x.get('sellPriceUSD')) or None) if x.get('showPriceInWebsite') else None, currency='USD', unit='piece',
            minOrder=None, colors=colors, thickness=[], sizes=[], brand=clean(x.get('brand')), origin=clean(x.get('country')),
            sku=x.get('code'), stockQty=qty,
            availability='in_stock' if x.get('inStock') else 'out_of_stock',
            images=imgs, createdAt=x.get('createdAt'),
        ))
    return out


ADAPTERS = {'printway': import_printway, '365promo': import_365, 'penna': import_penna}
