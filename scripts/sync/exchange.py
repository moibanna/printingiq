"""
Daily US dollar → Iraqi dinar rate, stored in the catalog so the app can show every price in both currencies.

Source: ExchangeRate-API's open endpoint (free, no key, updated once a day; its IQD rate follows the market, not the
Central Bank's 1,310 official rate). Their terms ask for a visible "Rates by Exchange Rate API" link, which the app shows.

To use your own number (e.g. today's Kifah / Harthiya market rate), set "override" in sources.json → "exchangeRate".
A rate outside "min"…"max", or a failed download, keeps the previous day's rate.
"""
from datetime import datetime, timezone

from http_util import get

DEFAULT = {'url': 'https://open.er-api.com/v6/latest/USD', 'override': None, 'min': 1000, 'max': 3000}
ATTRIBUTION = {'source': 'Exchange Rate API', 'sourceUrl': 'https://www.exchangerate-api.com'}


def daily_rate(config: dict | None, previous: dict | None, today: str | None = None) -> tuple[dict | None, str]:
    """Returns (exchange, message). exchange = {iqdPerUsd, date, source, sourceUrl, manual}."""
    cfg = {**DEFAULT, **(config or {})}
    today = today or datetime.now(timezone.utc).strftime('%Y-%m-%d')
    if cfg.get('override'):
        rate = round(float(cfg['override']))
        return {'iqdPerUsd': rate, 'date': today, 'source': 'PrintingIQ', 'manual': True}, f'manual rate {rate}'
    try:
        d = get(cfg['url'])
        if d.get('result') != 'success':
            raise ValueError(f"source answered {d.get('result')!r}")
        rate = round(float(d['rates']['IQD']))
        if not cfg['min'] <= rate <= cfg['max']:
            raise ValueError(f'{rate} IQD/USD is outside {cfg["min"]}–{cfg["max"]}')
        return {'iqdPerUsd': rate, 'date': today, **ATTRIBUTION, 'manual': False}, f'{rate} IQD per USD'
    except Exception as e:
        if previous:
            return previous, f'kept previous rate {previous.get("iqdPerUsd")} ({type(e).__name__}: {e})'
        return None, f'no rate ({type(e).__name__}: {e})'
