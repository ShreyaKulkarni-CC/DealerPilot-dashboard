"""
Fetches every record for a store from vAuto by paging, and caches the result
for a few minutes so the dashboard does not hit vAuto on every screen.

Why this exists: vAuto's list endpoints return one page at a time and give no
total count. Confirmed on sandbox: `limit=start,count` where start is a
1-based record position, and a page shorter than `count` means the end was
reached. So the only way to know the full list is to page until a short page.

Gentle by design: one request at a time per store, a short pause between
pages, a hard cap on total records, and one in-flight fetch per store (other
callers wait for it instead of starting their own).
"""

import asyncio
import time
from typing import Awaitable, Callable, Optional

PAGE_SIZE = 100          # matches the backend's own maximum page size
MAX_RECORDS = 20000      # safety cap so a runaway loop can never hammer vAuto
PAUSE_BETWEEN_PAGES = 0.1

# loader(start, count) -> list of records for that page
PageLoader = Callable[[int, int], Awaitable[list]]


async def fetch_all_pages(
    loader: PageLoader,
    page_size: int = PAGE_SIZE,
    max_records: int = MAX_RECORDS,
    pause: float = PAUSE_BETWEEN_PAGES,
) -> tuple[list, bool]:
    """Page until a short page. Returns (records, truncated). `truncated` is
    True only if the safety cap stopped the loop before the end was reached."""
    records: list = []
    start = 1
    while True:
        page = await loader(start, page_size)
        records.extend(page)
        if len(page) < page_size:
            return records, False
        if len(records) >= max_records:
            return records, True
        start += page_size
        if pause:
            await asyncio.sleep(pause)


class StoreDataCache:
    """In-memory cache keyed by (kind, store id). Single process only, same
    as the rate limiter, which is how this runs today."""

    def __init__(self, ttl_seconds: int):
        self._ttl = ttl_seconds
        self._entries: dict[tuple, dict] = {}
        self._locks: dict[tuple, asyncio.Lock] = {}

    def _lock_for(self, key: tuple) -> asyncio.Lock:
        if key not in self._locks:
            self._locks[key] = asyncio.Lock()
        return self._locks[key]

    async def get(
        self,
        kind: str,
        store_id: str,
        loader: PageLoader,
        refresh: bool = False,
        now: Optional[Callable[[], float]] = None,
    ) -> dict:
        clock = now or time.time
        key = (kind, store_id)
        entry = self._entries.get(key)
        if entry and not refresh and clock() - entry["fetched_at"] < self._ttl:
            return {**entry, "cached": True}

        async with self._lock_for(key):
            # Another caller may have just finished the same fetch.
            entry = self._entries.get(key)
            if entry and not refresh and clock() - entry["fetched_at"] < self._ttl:
                return {**entry, "cached": True}

            records, truncated = await fetch_all_pages(loader)
            entry = {"records": records, "truncated": truncated, "fetched_at": clock()}
            self._entries[key] = entry
            return {**entry, "cached": False}


_cache: Optional[StoreDataCache] = None


def get_cache(ttl_seconds: int) -> StoreDataCache:
    global _cache
    if _cache is None:
        _cache = StoreDataCache(ttl_seconds)
    return _cache
