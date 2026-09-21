"""
Shared input validation for anything that gets forwarded to vAuto's own
filter/sort/select query syntax.

This is deliberately a character-allowlist, not a full grammar parser --
we haven't independently verified vAuto's complete CarQL-style grammar
character-by-character, so we don't claim to validate its structure. What
this DOES guarantee: nothing outside a safe, narrow character set (no
quotes, semicolons, angle brackets, backslashes, pipes, backticks, or
other characters typically used to break out of a query string) ever
leaves this backend toward vAuto, and every value has a hard length cap.
"""

import re
from typing import Optional

from fastapi import HTTPException

# Letters, digits, spaces, and the punctuation vAuto's confirmed filter
# examples actually use: . , ( ) - _ * (wildcards, e.g. eq(vin,*120499))
_SAFE_FILTER_RE = re.compile(r"^[A-Za-z0-9 ,\.\(\)\-_\*]*$")
_SAFE_SORT_RE = re.compile(r"^[A-Za-z0-9 ,\.\-_:+]*$")
_LIMIT_RE = re.compile(r"^(\d{1,6}),(\d{1,4})$")

MAX_FILTER_LENGTH = 500
MAX_SORT_LENGTH = 200
MAX_PAGE_SIZE = 100


def validate_filter(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None
    if len(value) > MAX_FILTER_LENGTH:
        raise HTTPException(status_code=422, detail=f"filter exceeds {MAX_FILTER_LENGTH} characters")
    if not _SAFE_FILTER_RE.match(value):
        raise HTTPException(status_code=422, detail="filter contains characters that aren't allowed")
    return value


def validate_sort(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None
    if len(value) > MAX_SORT_LENGTH:
        raise HTTPException(status_code=422, detail=f"sort exceeds {MAX_SORT_LENGTH} characters")
    if not _SAFE_SORT_RE.match(value):
        raise HTTPException(status_code=422, detail="sort contains characters that aren't allowed")
    return value


_SAFE_ID_RE = re.compile(r"^[A-Za-z0-9_\-]{1,100}$")


def validate_id(value: str, field_name: str = "id") -> str:
    if not value or not _SAFE_ID_RE.match(value):
        raise HTTPException(status_code=422, detail=f"{field_name} contains characters that aren't allowed")
    return value


def validate_limit(value: str) -> str:
    match = _LIMIT_RE.match(value or "")
    if not match:
        raise HTTPException(status_code=422, detail="limit must look like 'start,count' (e.g. '1,25')")
    start, count = int(match.group(1)), int(match.group(2))
    if start < 1:
        raise HTTPException(status_code=422, detail="limit start must be 1 or greater")
    if count < 1 or count > MAX_PAGE_SIZE:
        raise HTTPException(status_code=422, detail=f"limit count must be between 1 and {MAX_PAGE_SIZE}")
    return f"{start},{count}"
