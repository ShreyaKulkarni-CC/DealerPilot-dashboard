"""
Endpoint proof script: calls Cox's token endpoint and the vAuto Inventory and
Appraisal APIs directly (not through the DealerPilot backend) and writes a
plain report you can send to Cox as evidence.

What it records: request URLs, HTTP status codes, response headers, a
correlation ID we send on every request so Cox can find the call in their
logs, and a short body excerpt.

What it never records: the Client Secret, the Basic auth header, or the
access token. Responses that succeed are summarised (item counts and field
names), not dumped, so no dealership data lands in the report.

Credentials come from backend/.env (VAUTO_CLIENT_ID / VAUTO_CLIENT_SECRET).
Run it once per credential set: put the Sandbox credentials in .env and run
with --label sandbox, then the Integration credentials and --label
integration, and so on.

Usage (from the backend folder):
    .venv\\Scripts\\python scripts\\endpoint_proof.py --label sandbox
    .venv\\Scripts\\python scripts\\endpoint_proof.py --label integration
    .venv\\Scripts\\python scripts\\endpoint_proof.py --label production

Options:
    --entity ID       Store ID to test (repeat for several). Defaults:
                      sandbox -> EXT-TEST-01, others -> MP23634 and MP18936.
    --api-base URL    Override the API host for the label, for example if
                      Cox says Integration uses a different base URL.
"""

import argparse
import base64
import json
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path

import httpx

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from app.config import (  # noqa: E402
    VAUTO_APPRAISAL_BASE_URL_PROD,
    VAUTO_APPRAISAL_BASE_URL_SANDBOX,
    VAUTO_INVENTORY_BASE_URL_PROD,
    VAUTO_INVENTORY_BASE_URL_SANDBOX,
    VAUTO_TOKEN_URL_NONPROD,
    VAUTO_TOKEN_URL_PROD,
)

API_HEADERS = {
    "Accept": "application/vnd.coxauto.v1+json",
    "X-CoxAuto-ConsistentRead": "true",
    "User-Agent": "DealerPilotDashboard/0.1",
}

APIS = [
    {"name": "Inventory", "scope": "va.inventory.read", "path": "/inventory", "sandbox": VAUTO_INVENTORY_BASE_URL_SANDBOX, "prod": VAUTO_INVENTORY_BASE_URL_PROD},
    {"name": "Appraisal", "scope": "va.appraisal.read", "path": "/appraisals", "sandbox": VAUTO_APPRAISAL_BASE_URL_SANDBOX, "prod": VAUTO_APPRAISAL_BASE_URL_PROD},
]


def read_env(path):
    env = {}
    for line in Path(path).read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            key, value = line.split("=", 1)
            env[key.strip()] = value.strip().strip('"').strip("'")
    return env


def fmt_headers(headers):
    return "\n".join(f"    {k}: {v}" for k, v in headers.items())


def summarise_body(resp):
    text = resp.text
    if resp.status_code == 200:
        try:
            data = json.loads(text)
            items = data.get("items") if isinstance(data, dict) else None
            if isinstance(items, list):
                keys = sorted(items[0].keys()) if items and isinstance(items[0], dict) else []
                return f"200 OK. items returned: {len(items)}. fields on first item: {', '.join(keys)}"
            return f"200 OK. top-level fields: {', '.join(data.keys()) if isinstance(data, dict) else type(data).__name__}"
        except ValueError:
            return "200 OK (body was not JSON)"
    return text[:1500]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--label", required=True, choices=["sandbox", "integration", "production"])
    parser.add_argument("--entity", action="append")
    parser.add_argument("--api-base")
    args = parser.parse_args()

    backend_dir = Path(__file__).resolve().parent.parent
    env = read_env(backend_dir / ".env")
    client_id = env.get("VAUTO_CLIENT_ID")
    client_secret = env.get("VAUTO_CLIENT_SECRET")
    if not client_id or not client_secret:
        sys.exit("VAUTO_CLIENT_ID / VAUTO_CLIENT_SECRET missing in backend/.env")

    prod = args.label == "production"
    token_url = VAUTO_TOKEN_URL_PROD if prod else VAUTO_TOKEN_URL_NONPROD
    entities = args.entity or (["EXT-TEST-01"] if args.label == "sandbox" else ["MP23634", "MP18936"])

    now = datetime.now(timezone.utc)
    lines = [
        f"# vAuto endpoint test: {args.label}",
        "",
        f"- Run at (UTC): {now.strftime('%Y-%m-%d %H:%M:%S')}",
        f"- Application: Bridgeland Internal Deal Management Application",
        f"- Credential set under test: {args.label}",
        f"- Client ID: {client_id}",
        f"- Token URL: {token_url}",
        f"- Store IDs tested: {', '.join(entities)}",
        "- Client Secret, Authorization headers and access tokens are never written to this report.",
        "",
    ]

    with httpx.Client(timeout=45) as http:
        for api in APIS:
            api_base = (
                (args.api_base.rstrip("/") + ("/va/inventory-vehicle" if api["name"] == "Inventory" else "/va/appraisal-vehicle"))
                if args.api_base
                else (api["prod"] if prod else api["sandbox"])
            )
            lines += [f"## {api['name']} API", "", f"Base URL used: {api_base}", f"Scope requested: {api['scope']}", ""]

            # --- Step 1: token request ---
            basic = base64.b64encode(f"{client_id}:{client_secret}".encode()).decode()
            try:
                tok = http.post(
                    token_url,
                    headers={"Authorization": f"Basic {basic}", "Content-Type": "application/x-www-form-urlencoded", "Accept": "application/json", "Cache-Control": "no-cache"},
                    data={"grant_type": "client_credentials", "scope": api["scope"]},
                )
            except httpx.HTTPError as e:
                lines += ["### Step 1: token request", f"POST {token_url}", f"Network error, no response: {type(e).__name__}", ""]
                continue
            lines += [
                "### Step 1: token request",
                f"POST {token_url}",
                "Body: grant_type=client_credentials&scope=" + api["scope"],
                "Authorization: Basic <redacted>",
                f"Result: HTTP {tok.status_code}",
                "Response headers:",
                fmt_headers(tok.headers),
            ]
            token = None
            if tok.status_code == 200:
                payload = tok.json()
                token = payload.get("access_token")
                lines.append(f"Token issued: yes. expires_in={payload.get('expires_in')} scope={payload.get('scope')}")
            else:
                lines.append(f"Token issued: NO. Body: {tok.text[:800]}")
            lines.append("")

            if not token:
                lines += ["API calls skipped because no token was issued.", ""]
                continue

            # --- Step 2: API calls ---
            for entity in entities:
                corr = str(uuid.uuid4())
                url = api_base + api["path"]
                params = {"entityLogicalId": entity, "limit": "1,1"}
                try:
                    resp = http.get(url, params=params, headers={**API_HEADERS, "Authorization": f"Bearer {token}", "X-CoxAuto-Correlation-Id": corr})
                except httpx.HTTPError as e:
                    lines += [f"### Step 2: GET {api['path']} for store {entity}", f"Network error, no response: {type(e).__name__}", ""]
                    continue
                lines += [
                    f"### Step 2: GET {api['path']} for store {entity}",
                    f"Request: GET {resp.request.url}",
                    "Authorization: Bearer <redacted>",
                    f"X-CoxAuto-Correlation-Id (sent by us): {corr}",
                    f"Result: HTTP {resp.status_code}",
                    "Response headers:",
                    fmt_headers(resp.headers),
                    f"Body: {summarise_body(resp)}",
                    "",
                ]

    out_dir = backend_dir / "test-reports"
    out_dir.mkdir(exist_ok=True)
    out_file = out_dir / f"proof_{args.label}_{now.strftime('%Y%m%d_%H%M%S')}.md"
    out_file.write_text("\n".join(lines), encoding="utf-8")
    print("\n".join(lines))
    print(f"\nReport saved to: {out_file}")


if __name__ == "__main__":
    main()
