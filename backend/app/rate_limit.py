"""
Shared rate limiter instance (slowapi, in-memory). One limiter object is
imported by both main.py (to register it on the app) and any router that
wants to apply a limit to a specific endpoint -- keeps them in sync
without a circular import between main.py and the routers.

In-memory storage is fine for how this runs today (a single local
process). If this ever runs as multiple worker processes, the limit
would need a shared backend (e.g. Redis) instead -- noted here so it's
not forgotten later, not needed now.
"""

from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
