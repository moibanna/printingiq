"""
Daily US dollar → Iraqi dinar MARKET rate (what exchange shops charge), stored in the catalog so the app can show every
price in both currencies. The Central Bank's official rate is much lower and is not what shoppers pay, so it isn't used.

Source: Shafaq News's market survey, published twice a day ("Dollar rises/falls in Baghdad, Erbil markets"), which quotes
the Baghdad bourse (Al-Kifah / Al-Harithiya) price per 100 dollars. The app links to the article it came from.

To use your own number (e.g. what the Tak Nrx app or your exchange shop shows), set "override" in sources.json →
"exchangeRate". A rate outside "min"…"max", a jump of more than "maxDailyChange" from the previous market rate,
a report older than "maxAgeDays", or a failed download keeps the previous rate.
"""
import html
import re
from datetime import date, datetime, timezone

from http_util import allowed, get_text

DEFAULT = {
    'marketPage': 'https://shafaq.com/en/Economy',
    'override': None, 'min': 1000, 'max': 3000, 'maxDailyChange': 0.2, 'maxAgeDays': 4,
}
SOURCE = 'Shafaq News'

ARTICLE_LINK = re.compile(r'href="(/en/Economy/Dollar-[^"#?]*(?:Baghdad|Erbil)[^"#?]*)"', re.I)
# Most specific first: the Baghdad bourse price, then Erbil shops' selling price, then the headline figure
PATTERNS = [
    re.compile(r'Al-Harithiya exchanges? at ([\d,]{6,8}) dinars', re.I),
    re.compile(r'Erbil,? selling prices? stood at ([\d,]{6,8}) dinars', re.I),
    re.compile(r'sold the dollar at ([\d,]{6,8}) dinars', re.I),
    re.compile(r'(?:around|at) ([\d,]{6,8}) dinars per 100', re.I),
]


def parse_article(page: str) -> tuple[int, str] | None:
    """(IQD per USD, publish date YYYY-MM-DD) from a Shafaq market-survey article, or None."""
    published = re.search(r'"datePublished"\s*:\s*"(\d{4}-\d\d-\d\d)', page)
    text = html.unescape(re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', ' ', page)))
    for pat in PATTERNS:
        m = pat.search(text)
        if m:
            per100 = int(m.group(1).replace(',', ''))
            return round(per100 / 100), published.group(1) if published else ''
    return None


def market_rate(cfg: dict) -> tuple[int, str, str]:
    """Newest market rate: (IQD per USD, date, article URL)."""
    listing = cfg['marketPage']
    if not allowed(listing):
        raise PermissionError(f'robots.txt disallows {listing}')
    base = re.match(r'https?://[^/]+', listing).group(0)
    links = list(dict.fromkeys(ARTICLE_LINK.findall(get_text(listing))))
    found = []
    for path in links[:4]:
        url = base + path
        if not allowed(url):
            continue
        got = parse_article(get_text(url))
        if got:
            found.append((got[1], got[0], url))
    if not found:
        raise ValueError(f'no dollar market report found on {listing}')
    day, rate, url = max(found)  # newest report
    return rate, day, url


def daily_rate(config: dict | None, previous: dict | None, today: str | None = None) -> tuple[dict | None, str]:
    """Returns (exchange, message). exchange = {iqdPerUsd, date, source, sourceUrl, manual, market}."""
    cfg = {**DEFAULT, **(config or {})}
    today = today or datetime.now(timezone.utc).strftime('%Y-%m-%d')
    if cfg.get('override'):
        rate = round(float(cfg['override']))
        return {'iqdPerUsd': rate, 'date': today, 'source': 'PrintingIQ', 'manual': True, 'market': True}, f'manual rate {rate}'
    try:
        rate, day, url = market_rate(cfg)
        if not cfg['min'] <= rate <= cfg['max']:
            raise ValueError(f'{rate} IQD/USD is outside {cfg["min"]}–{cfg["max"]}')
        if day and (date.fromisoformat(today) - date.fromisoformat(day)).days > cfg['maxAgeDays']:
            raise ValueError(f'newest market report is from {day}')
        # Only compare with a previous market rate: an old official-rate value would always look like a jump
        if previous and previous.get('market') and not previous.get('manual'):
            change = abs(rate - previous['iqdPerUsd']) / previous['iqdPerUsd']
            if change > cfg['maxDailyChange']:
                raise ValueError(f'{rate} is {change:.0%} away from yesterday\'s {previous["iqdPerUsd"]}')
        return ({'iqdPerUsd': rate, 'date': day or today, 'source': SOURCE, 'sourceUrl': url, 'manual': False, 'market': True},
                f'market rate {rate} IQD per USD ({day}, {url})')
    except Exception as e:
        if previous:
            return previous, f'kept previous rate {previous.get("iqdPerUsd")} ({type(e).__name__}: {e})'
        return None, f'no rate ({type(e).__name__}: {e})'
