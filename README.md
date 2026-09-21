# DealerPilot Dashboard

An internal, read-only dashboard unifying live inventory and appraisal data
from vAuto (Cox Automotive) for Bridgeland Auto Brokers / Candy Cars, built
from scratch as a React + FastAPI application. **This is an early-stage
codebase** — functional and live-tested against real vAuto Sandbox data,
but still a first version. See "What's next" below for what's deliberately
not built yet.

## Status at a glance

| Area | Status |
|---|---|
| Backend (FastAPI) | Working — rate-limited, input-validated, CORS-scoped |
| vAuto Inventory API | Connected (Sandbox), live-tested |
| vAuto Appraisal API | Connected (Sandbox), live-tested |
| Frontend (React + Vite) | Working — 4 pages + 2 detail views |
| Overview page | Live connector status + stat cards |
| Inventory page | Search, sort, pagination, detail drill-in |
| Appraisals page | Search, sort, pagination, detail drill-in |
| Aged Inventory page | 60+ day vehicles + lollipop age-distribution chart |
| Detail pages | Full single-vehicle / single-appraisal view, refresh |
| Rapid Recon | Not built — on hold |
| DMS+ (sales velocity) | Not available — vendor still in beta |
| AI agent layer (Q&A, alerts) | Not built — scoped, not started |
| Dealer swap plan / DDS | Not built — blocked, see the companion report |
| Production credentials | Not configured — still running on Sandbox only |
| Multi-location support | Not built — app currently assumes one dealer entity |

## What this app does today

DealerPilot Dashboard connects to vAuto's **Appraisal API** and **Inventory
API** (Sandbox environment, shared test dealer `EXT-TEST-01`) through a
FastAPI backend, and presents that data in a React dashboard:

- **Overview** — connector health, vehicle/appraisal counts, aged-inventory
  count, average days in inventory.
- **Inventory** — every vehicle in Sandbox inventory, searchable and
  sortable by year/make/model/VIN/stock #/status/price/age, paginated 50
  at a time, with a detail link per row.
- **Appraisals** — every appraisal in Sandbox, same search/sort/paginate
  pattern, with a detail link per row.
- **Aged Inventory** — vehicles at 60+ days in inventory, oldest first,
  with a lollipop chart showing the age-bucket distribution (60–89 /
  90–119 / 120–179 / 180+ days).
- **Detail views** — drilling into a single vehicle or appraisal surfaces
  fields the list views don't show (for example, appraised value is only
  returned by vAuto's detail endpoint, not the list endpoint — confirmed
  by live testing, not assumed).

All data shown is **real Sandbox test data**, not real Bridgeland/Candy
Cars inventory. Nothing in the app is a mock, placeholder, or guessed
value — every field either shows the real API response or honestly shows
it's missing/unavailable.

## Architecture

```
                     ┌─────────────────────┐
                     │   React frontend     │
                     │  (Vite, port 5173)   │
                     └──────────┬───────────┘
                                │  fetch() — GET only, same-origin
                                │  allowlisted CORS
                                ▼
                     ┌─────────────────────┐
                     │  FastAPI backend     │
                     │   (port 8000)        │
                     │  - rate limiting     │
                     │  - input validation  │
                     │  - security headers  │
                     └──────────┬───────────┘
                                │  OAuth2 client_credentials
                                │  (HTTP Basic, backend-only)
                                ▼
                     ┌─────────────────────┐
                     │   vAuto Appraisal &  │
                     │   Inventory APIs     │
                     │   (Cox Automotive)   │
                     └─────────────────────┘
```

The frontend **never** talks to vAuto directly and never sees vAuto
credentials — only the backend holds those, read from environment
variables / a local `.env` file that is never committed to git.

## Project layout

```
dealerpilot-dashboard/
├── backend/
│   ├── app/
│   │   ├── auth/oauth_client.py      # vAuto OAuth2 client_credentials flow
│   │   ├── connectors/vauto.py       # vAuto API calls (inventory + appraisal)
│   │   ├── connectors/rapid_recon.py # stub — on hold
│   │   ├── routers/health.py         # GET /health
│   │   ├── routers/inventory.py      # GET /api/inventory, /api/appraisals + detail routes
│   │   ├── validation.py             # allowlist validation for filter/sort/limit/id
│   │   ├── rate_limit.py             # slowapi limiter
│   │   ├── config.py                 # settings (pydantic-settings, SecretStr for creds)
│   │   └── main.py                   # FastAPI app, CORS, security headers
│   ├── requirements.txt
│   └── .env.example                  # template — copy to .env, fill in real values yourself
├── frontend/
│   ├── src/
│   │   ├── api/client.js             # the only file that calls our own backend
│   │   ├── pages/                    # Overview, Inventory, Appraisals, AgedInventory, detail pages
│   │   ├── components/               # shared UI (RefreshButton, DetailSection, chart, etc.)
│   │   ├── hooks/                    # useApiData, usePaginatedList
│   │   └── lib/vehicleAge.js         # shared age-calculation logic
│   ├── package.json
│   └── .env.example
└── docs/
    └── INTEGRATION_TODO.md           # vAuto integration notes (confirmed API details)
```

## Running it locally

### Backend

```bash
cd backend
python3 -m venv .venv
./.venv/bin/pip install -r requirements.txt     # Windows: .venv\Scripts\pip install -r requirements.txt
cp .env.example .env
# open .env and fill in VAUTO_CLIENT_ID / VAUTO_CLIENT_SECRET yourself —
# never paste real credentials anywhere else
./.venv/bin/uvicorn app.main:app --reload        # Windows: .venv\Scripts\uvicorn app.main:app --reload
```

Backend runs at `http://127.0.0.1:8000`. Check `http://127.0.0.1:8000/health`
to confirm the vAuto connectors show `configured`.

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local   # only needed if the backend isn't on the default URL
npm run dev
```

Frontend runs at `http://localhost:5173`.

## Required environment variables

Never committed — filled in locally by whoever runs this, per `.env.example`.

| File | Variable | Purpose |
|---|---|---|
| `backend/.env` | `ENVIRONMENT` | `sandbox` or `production` |
| `backend/.env` | `VAUTO_CLIENT_ID` / `VAUTO_CLIENT_SECRET` | vAuto OAuth2 credentials (one Application, shared by both APIs) |
| `backend/.env` | `VAUTO_ENTITY_LOGICAL_ID` | Dealer entity ID; blank defaults to the Sandbox test dealer |
| `backend/.env` | `RAPIDRECON_*` | Reserved for Rapid Recon — not active yet |
| `frontend/.env.local` | `VITE_API_BASE_URL` | Backend URL, defaults to `http://127.0.0.1:8000` |

## Security notes

- CORS is restricted to an explicit localhost origin allowlist — not `*`.
- All list/detail endpoints validate `filter`/`sort`/`limit`/`id` query and
  path parameters against a character allowlist before forwarding anything
  to vAuto.
- Per-IP rate limiting (`slowapi`) on every API route.
- Security response headers (`X-Content-Type-Options`, `X-Frame-Options`)
  on every response.
- Credentials are typed `SecretStr` in the backend config — never logged,
  never defaulted, never hardcoded.
- `.gitignore` excludes `.env`, `.env.local`, virtual environments,
  `node_modules`, and common credential file patterns. See the companion
  GitHub push guide for how this was verified before the first commit.

## What's next

See the companion strategic report for the full picture (why this exists,
current API constraints, and the dealer swap-plan idea). In short, the
next build phases are:

1. **AI agent layer** — natural-language Q&A over live inventory/appraisal
   data, plus automated alerts. Requires an LLM API key (handled the same
   way as vAuto credentials — never pasted in chat).
2. **Multi-location support** — once real Production dealer entity IDs
   exist for both Bridgeland and Candy Cars.
3. **Dealer swap plan / Dealer Day Supply (DDS)** — blocked on Production
   access and on DMS+ (still in beta) for real sales-velocity data. Not
   going to be faked with placeholder numbers.
4. **Rapid Recon integration** — on hold, deprioritized behind vAuto.
