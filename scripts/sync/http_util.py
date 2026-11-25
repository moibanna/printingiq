"""Polite HTTP helpers shared by the importers: one user agent, retries with backoff, robots.txt checks."""
import json
import time
import urllib.error
import urllib.request
import urllib.robotparser
from urllib.parse import urlsplit

USER_AGENT = 'PrintingIQ-catalog-sync/1.0'
_robots: dict[str, urllib.robotparser.RobotFileParser | None] = {}
_last_call: dict[str, float] = {}
MIN_GAP = 1.0  # seconds between requests to the same host


def _wait_turn(url: str):
    host = urlsplit(url).netloc
    gap = time.time() - _last_call.get(host, 0)
    if gap < MIN_GAP:
        time.sleep(MIN_GAP - gap)
    _last_call[host] = time.time()


def fetch(url: str, accept='application/json', tries=4) -> bytes:
    """GET with retries; waits longer on 429 / 5xx. Raises urllib.error.HTTPError for other errors."""
    for attempt in range(tries):
        _wait_turn(url)
        req = urllib.request.Request(url, headers={'User-Agent': USER_AGENT, 'Accept': accept})
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                return r.read()
        except urllib.error.HTTPError as e:
            if e.code in (429, 500, 502, 503, 504) and attempt < tries - 1:
                retry_after = e.headers.get('Retry-After')
                time.sleep(float(retry_after) if retry_after and retry_after.isdigit() else 5 * 2 ** attempt)
                continue
            raise
        except (urllib.error.URLError, TimeoutError):
            if attempt < tries - 1:
                time.sleep(5 * 2 ** attempt)
                continue
            raise
    raise RuntimeError('unreachable')


def get(url: str):
    return json.loads(fetch(url).decode('utf-8'))


def get_text(url: str) -> str:
    return fetch(url, accept='text/html,*/*').decode('utf-8', errors='replace')


def allowed(url: str) -> bool:
    """Respect the site's robots.txt (sites without one, or with an unreadable one, allow everything)."""
    parts = urlsplit(url)
    base = f'{parts.scheme}://{parts.netloc}'
    if base not in _robots:
        rp = urllib.robotparser.RobotFileParser()
        try:
            rp.parse(fetch(base + '/robots.txt', accept='text/plain').decode('utf-8', errors='replace').splitlines())
            _robots[base] = rp
        except Exception:
            _robots[base] = None
    rp = _robots[base]
    return rp is None or rp.can_fetch(USER_AGENT, url)
