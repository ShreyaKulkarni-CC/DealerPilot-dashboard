# DealerPilot Dashboard

An internal, read-only dashboard for Bridgeland Auto Brokers and Candy Cars.
It is a hub of the platforms the stores use (vAuto, RapidRecon, DriveCentric,
Dealertrack, Xtime). Each platform gets a digest page, a place for a short AI
summary later, and a link out to the platform itself. Today only vAuto has
real data behind it. It is built as a React frontend plus a FastAPI backend
that reads vAuto's Appraisal and Inventory APIs.

This is an early version. It has been tested against vAuto **Sandbox** data
and against fake data for layout and speed. It has not yet been checked
against real Production data (see "Checking real data" below).

## Status at a glance

| Area | Status |
|---|---|
| Backend (FastAPI) | Working: two stores, 5 minute cache, rate limits, input checks, CORS limited to localhost |
| vAuto Inventory API | Connected, tested on Sandbox |
| vAuto Appraisal API | Connected, tested on Sandbox |
| Production | Supported in code (`ENVIRONMENT=production` and `VAUTO_STORES`). Real data not yet checked in the dashboard |
| Home page | Done: platform cards, quick links |
| vAuto digest | Done: totals, age bands, status charts, weekly appraisals, longest on the lot |
| Inventory page | Done: one scrolling list, grouping, filters, search, multi-sort, detail panel |
| Appraisals page | Done: same style as Inventory |
| Light and dark themes | Done, with a toggle |
| Phone and tablet layout | Done: slide-out menu, wrapping top bar |
| Keyboard use, screen readers | Done and checked with an automated scan. Not tried with a real screen reader |
| RapidRecon | Being built separately, not connected here yet |
| DriveCentric, Dealertrack, Xtime | Placeholder pages only |
| AI summaries | Not built |
| Sign-in and AWS hosting | Not built |
| Dealer swap plan / Dealer Day Supply | Not built, waiting on sales data |

## What the app does today

- **Home** lists the platforms with their status and has quick links into
  vAuto.
- **vAuto digest** shows vehicles in inventory, appraisals, vehicles over
  60 days, average days on the lot, and charts for age bands, inventory
  status, appraisals per week and appraisal status. Each chart has a table
  view. The eight oldest vehicles are listed at the bottom.
- **Inventory** shows every vehicle in one list with no "load more". Group
  by status (the default), age band, make, store or nothing. Filter by
  status, age band, make and disposition, search, sort by any column
  (Shift+click for a second sort), and click a row for a side panel with
  all the details vAuto sent. "Aged inventory" in the menu is this same
  page filtered to vehicles over 60 days.
- **Appraisals** works the same way. Group by status (default), created
  month, store, completed or make. Filter by status, completed and make.
- **Store switcher** at the top: Candy Cars, Bridgeland Auto Brokers, or
  both. Switching filters what is already loaded, it does not ask vAuto
  again.
- **Search** (Ctrl+K) jumps to any page.
- Your view (filters, grouping, sort, open row) is kept in the page address,
  so a refresh or a shared link shows the same view.

Definitions used on screen:

- **Aged** means more than 60 days. Age bands are 0 to 30, 31 to 60, 61 to
  90 and 90+ days (the 90+ band starts on day 91).
- **Days on the lot** is counted from the vehicle's `createdOn` date. It is
  **not yet confirmed** that `createdOn` is the real stock-in date. The
  data check below looks for signs that it is not.

Everything shown comes from the real API response. A field vAuto does not
send is left out or shown as a dash, never guessed.

## Architecture

```
                     +---------------------+
                     |   React frontend    |
                     |  (Vite, port 5173)  |
                     +----------+----------+
                                |  fetch(), GET only
                                |  CORS allowlist (localhost)
                                v
                     +---------------------+
                     |  FastAPI backend    |
                     |   (port 8000)       |
                     |  - store list       |
                     |  - 5 minute cache   |
                     |  - rate limiting    |
                     |  - input checks     |
                     +----------+----------+
                                |  OAuth2 client_credentials
                                |  (backend only)
                                v
                     +---------------------+
                     |  vAuto Appraisal &  |
                     |  Inventory APIs     |
                     |  (Cox Automotive)   |
                     +---------------------+
```

The frontend never talks to vAuto and never sees credentials. Only the
backend holds them, read from `backend/.env`, which is never committed.

How data flows: the first time you open a vAuto page, the frontend asks the
backend for all inventory and all appraisals once (`/api/all/inventory` and
`/api/all/appraisals`). The backend pages through vAuto one request at a time
for each store, keeps the result for 5 minutes, and tags every record with
its store. The frontend keeps that data while you move between pages. The
Refresh button asks for new data, with a short wait between presses. If one
store fails, the other store's data still shows, and the failed store gets a
message.

## Project layout

```
dealerpilot-dashboard/
├── backend/
│   ├── app/
│   │   ├── auth/oauth_client.py       # vAuto OAuth2 sign-in
│   │   ├── connectors/vauto.py        # vAuto API calls
│   │   ├── connectors/rapid_recon.py  # stub, on hold
│   │   ├── routers/health.py          # GET /health
│   │   ├── routers/stores.py          # GET /api/stores, /api/all/inventory, /api/all/appraisals
│   │   ├── routers/inventory.py       # older paged routes (/api/inventory, /api/appraisals and detail)
│   │   ├── services/store_data.py     # paging through vAuto and the cache
│   │   ├── validation.py              # input allowlists
│   │   ├── rate_limit.py              # rate limiter
│   │   ├── config.py                  # settings, store list
│   │   └── main.py                    # app, CORS, security headers
│   ├── scripts/
│   │   ├── endpoint_proof.py          # evidence report for Cox support
│   │   └── data_check.py              # read-only check of real data
│   ├── tests/                         # no-network tests
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── api/client.js              # the only file that calls our backend
│   │   ├── lib/                       # data provider, store and theme state, digest maths, URL state
│   │   ├── pages/                     # Home, Overview (vAuto digest), Inventory, Appraisals, PlatformDigest
│   │   └── components/
│   │       ├── shell/                 # sidebar, top bar, store switcher, search palette
│   │       ├── explorer/              # table, filters, grouping control, side panel
│   │       ├── charts/                # digest charts
│   │       └── ui/                    # small pieces (cards, count-up, loading blocks)
│   ├── package.json
│   └── .env.example
└── docs/
    ├── INTEGRATION_TODO.md            # vAuto integration notes
    └── ENDPOINT_TESTING.md
```

Some older files are still on disk but are no longer used by any page:
`pages/AgedInventory.jsx`, `pages/AppraisalDetail.jsx`,
`hooks/usePaginatedList.js` and `components/AgeDistributionChart.jsx`. They
can be deleted whenever convenient. The route `/inventory/:id` still opens
the older single-vehicle page, which nothing links to any more.

## Running it locally

Step by step instructions are in `MANUAL.md`. The short version:

```bash
# Backend
cd backend
python3 -m venv .venv
./.venv/bin/pip install -r requirements.txt     # Windows: .venv\Scripts\pip install -r requirements.txt
cp .env.example .env                            # then fill in the values yourself
./.venv/bin/uvicorn app.main:app --reload       # Windows: .venv\Scripts\uvicorn app.main:app --reload

# Frontend (second terminal)
cd frontend
npm install
npm run dev
```

Backend: `http://127.0.0.1:8000` (check `/health`). Frontend:
`http://localhost:5173`.

To build the frontend for hosting later: `npm run build` (output goes to
`frontend/dist`, which is not committed). `npm run preview` serves that
build locally.

## Required environment variables

Never committed. Filled in by whoever runs this, following `.env.example`.

| File | Variable | Purpose |
|---|---|---|
| `backend/.env` | `ENVIRONMENT` | `sandbox` or `production` |
| `backend/.env` | `VAUTO_CLIENT_ID` / `VAUTO_CLIENT_SECRET` | vAuto OAuth2 credentials (one Application covers both APIs) |
| `backend/.env` | `VAUTO_STORES` | Production stores as `ID=Name` pairs separated by commas. Store IDs are not secrets. Ignored on Sandbox |
| `backend/.env` | `VAUTO_ENTITY_LOGICAL_ID` | Single store ID. Blank on Sandbox uses the shared test store `EXT-TEST-01`. Used on Production only if `VAUTO_STORES` is empty |
| `backend/.env` | `VAUTO_CACHE_SECONDS` | How long fetched data is reused (default 300) |
| `backend/.env` | `RAPIDRECON_*` | Reserved, not active |
| `frontend/.env.local` | `VITE_API_BASE_URL` | Backend address, default `http://127.0.0.1:8000` |

## Checking real data

Some things cannot be known from Sandbox, and the dashboard should not guess
them: the real status names, whether `createdOn` is the true stock-in date,
and which vehicle fields vAuto sends on list records. `backend/scripts/data_check.py`
answers these. It is read-only and gentle: GET requests only, one request at
a time, one store at a time, a pause between pages, and it stops at the first
rate limit or error without retrying. It prints counts, status names, date
ranges and which fields are present. It never prints VINs, stock numbers,
record IDs or credentials, so the output is safe to paste into a chat.

```bash
cd backend
.venv\Scripts\python scripts\data_check.py --max-records 500    # light first look
.venv\Scripts\python scripts\data_check.py --out test-reports\data_check.txt
```

Run the light version first. It uses the same settings as the backend, so
set `ENVIRONMENT=production` and `VAUTO_STORES` in `backend/.env` first if
you want to check Production.

## Tests

Backend tests need no network (vAuto is replaced with fakes):

```bash
cd backend
.venv\Scripts\pip install -r requirements-dev.txt
.venv\Scripts\python -m pytest tests -q
```

The frontend has no automated tests in the repository yet. During
development it was checked with a real browser against 6,000 to 40,000 fake
vehicles: layout at phone, tablet and desktop widths in both themes, an
automated accessibility scan, keyboard use, reduced motion, and the loading,
error and one-store-failed states. Those checks were run outside the repo
and are not saved here.

## Known limits

- Everything for a store is loaded into the browser. The backend stops at
  20,000 records per store and list. In a test with 40,000 fake vehicles the
  list opened in about 1.4 seconds and used roughly 430 MB of browser memory.
  Real Production first-load time is not known yet.
- The cache lives in the backend's memory, so it resets when the backend
  restarts, and it only works with a single backend process.
- Days on the lot depends on `createdOn` (see above).
- Real Production status names are not known yet. Charts and filters use
  whatever vAuto sends.
- Row details show only the fields vAuto sends on list records. Some fields
  (for example the appraised value) depend on the permissions of the
  credentials.
- Keyboard use and contrast were checked with an automated scanner, not with
  a real screen reader.

## Security notes

- CORS is limited to the localhost frontend addresses, not `*`. Hosting the
  frontend elsewhere later means adding its address.
- Query and path parameters are checked against allowlists before anything
  is sent to vAuto. The store list comes from the backend's own settings,
  so a request cannot ask for an arbitrary store.
- Per-IP rate limiting on every API route (the two "all" routes allow 10 a
  minute).
- Security response headers on every response.
- Credentials are typed `SecretStr` in the backend, never logged and never
  defaulted.
- `.gitignore` excludes `.env`, `.env.local`, virtual environments,
  `node_modules`, `dist` and common credential file patterns.
- The dashboard is read-only. It sends only GET requests to vAuto.

## What's next

1. **Check real Production data** with `data_check.py`, then confirm the
   status names and the `createdOn` question.
2. **AI summaries** on each digest page, limited to days on the lot, status
   and appraisals. Needs a decision on which AI service to use. Any key is
   handled like the vAuto credentials and is never pasted in chat.
3. **RapidRecon** connection, once its separate dashboard is ready.
4. **Sign-in and hosting on AWS** (static hosting, sign-in, a place for
   secrets, scheduled refresh).
5. **Dealer swap plan / Dealer Day Supply**, which is waiting on real sales
   data by model. It will not be faked with placeholder numbers.
