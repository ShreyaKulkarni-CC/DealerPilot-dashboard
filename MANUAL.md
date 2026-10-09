# DealerPilot Dashboard: Operator Manual

Step by step instructions for starting this app locally: what to run, in
what order, and what to check at each step before moving on. This is the
"how do I actually run this" document. For what the app does and its
current status, see `README.md`.

## 0. Before you start

- [ ] Python 3.10 or newer (`python --version`)
- [ ] Node.js and npm (`node --version`, `npm --version`)
- [ ] `backend/.env` exists and has real values in `VAUTO_CLIENT_ID` and
      `VAUTO_CLIENT_SECRET`. Copy `backend/.env.example` if it does not
      exist yet. Fill it in yourself. Never paste these into a chat.
- [ ] `ENVIRONMENT` in `backend/.env` is the one you mean: `sandbox` for
      test data, `production` for the real stores. On `production` also set
      `VAUTO_STORES`, for example `VAUTO_STORES="MP12345=Store One,MP67890=Store Two"`.
- [ ] You are in the project folder (`dealerpilot-dashboard/`). The steps
      below start from there.

If any of these is not true yet, fix it first. The steps below will not give
useful results without them.

## 1. Start the backend

PowerShell (Windows):

```powershell
cd backend
python -m venv .venv                 # skip if .venv already exists
.venv\Scripts\pip install -r requirements.txt
.venv\Scripts\uvicorn app.main:app --reload
```

Mac or Linux:

```bash
cd backend
python3 -m venv .venv
./.venv/bin/pip install -r requirements.txt
./.venv/bin/uvicorn app.main:app --reload
```

**What to check:**

- The terminal shows `Uvicorn running on http://127.0.0.1:8000` with no
  traceback. A traceback on start almost always means a missing or
  misspelled value in `backend/.env`. A `VAUTO_STORES` entry that is not
  written as `ID=Name` is reported at start with a clear message.
- Open `http://127.0.0.1:8000/health`. You should see JSON with
  `"environment"` and a `"connectors"` object.
- In that JSON, `vauto_appraisal` and `vauto_inventory` should both say
  `"configured"`. If they say `"not_configured"`, the backend is fine but
  your `.env` is not being read. Check the file is named exactly `.env`,
  sits in `backend/` next to `requirements.txt`, and that you restarted
  uvicorn after editing it.
- Open `http://127.0.0.1:8000/api/stores`. You should see your stores
  listed. On Sandbox it shows one store, "Sandbox test store".

Leave this terminal running.

## 2. Start the frontend

Open a second terminal:

```powershell
cd frontend
npm install          # first time, or after package.json changes
npm run dev
```

**What to check:**

- The terminal shows `Local: http://localhost:5173/` with no red errors.
- Open `http://localhost:5173`. You should land on Home, with a card for each
  platform. The top bar shows the store switcher and a **Sandbox** or
  **Production** badge. Check that badge matches what you meant to run.

Leave this terminal running too. Both must stay up. The frontend has no
data of its own, it only shows what the backend gives it.

## 3. Walk through the pages once

A quick pass to confirm it works end to end:

1. **vAuto digest** (click vAuto in the menu): the numbers are real, not
   zeros or dashes, the charts draw, and the line under the title says when
   the data was last updated.
2. **Inventory**: the list has rows, grouped by status. DELETED vehicles are
   hidden, and the line above the list says how many (the "Show deleted"
   button brings them back). Try the search box,
   a Status filter, "Group by Age band", and click a column heading to sort.
   Click a row: a side panel opens with that vehicle's details. Press Esc to
   close it.
3. **Appraisals**: same checks. It opens grouped by Completed. Try "Group by
   Created month". Click a row: the appraised value shows "Loading…" and
   then the amount, or a short message if vAuto does not send it.
4. **Aged inventory** (under vAuto in the menu): this is Inventory with the
   "Over 60 days" filter already on.
5. **Store switcher**: pick one store, then Both stores. The numbers change
   at once.
6. **Refresh** on a page: the button spins, then settles with no error. It is
   disabled for a few seconds after each press on purpose.
7. **Theme toggle** (sun or moon icon): the whole app switches between light
   and dark.
8. Press Ctrl+K and type a page name: the search jumps there.

If all of these pass, the app works against the data you pointed it at.

## 4. Check real data (before trusting Production numbers)

Run this from the `backend` folder in a third terminal, after setting
`ENVIRONMENT=production` and `VAUTO_STORES` in `backend/.env`:

```powershell
cd backend
.venv\Scripts\python scripts\data_check.py --max-records 500
```

It makes read-only requests, one at a time, and stops at the first rate
limit or error. It prints counts and status names, not VINs, stock numbers
or credentials. The output is safe to paste into a chat. Run the light
version first. Add `--out test-reports\data_check.txt` to save the report.
Wait a few minutes before running it again.

## 5. Build for hosting (later)

```powershell
cd frontend
npm run build        # creates frontend/dist
npm run preview      # optional: serves the build at http://localhost:4173
```

`dist` is not committed to git. Note that the backend only accepts requests
from `localhost:5173` and `127.0.0.1:5173` today, so a preview on port 4173
will not be able to reach it until that allowlist (in `backend/app/main.py`)
is widened.

## 6. Run the backend tests

```powershell
cd backend
.venv\Scripts\pip install -r requirements-dev.txt
.venv\Scripts\python -m pytest tests -q
```

These use fake data and need no network or credentials.

## 7. Stopping everything

Press `Ctrl+C` in each terminal. The order does not matter.

## Common issues

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| Backend will not start, traceback on launch | Bad or missing `.env` value | Compare `backend/.env` with `backend/.env.example` line by line |
| `/health` shows `not_configured` | `.env` not being read | Check the file name and place, restart uvicorn |
| Top bar says "No stores" | On Production, `VAUTO_STORES` (or `VAUTO_ENTITY_LOGICAL_ID`) is empty | Set it in `backend/.env` and restart the backend |
| "Could not reach the DealerPilot backend" | Backend is not running | Check the backend terminal, restart it |
| A store shows a red "could not be loaded" message | vAuto returned an error for that store. The other store still shows | Read the message, it is vAuto's own. Click Refresh later |
| A page is slow the first time | The backend is reading every record from vAuto page by page | Wait. Later loads use the 5 minute saved copy |
| HTTP 429 (too many requests) | The rate limit was hit (the "all" routes allow 10 a minute) | Wait a minute, then Refresh once |
| The numbers do not change after something changed in vAuto | The backend keeps data for 5 minutes | Click Refresh, or wait |
| `npm install` warns about vulnerabilities | Known, in development tools only | No action needed unless you are deliberately revisiting it |
| Port 8000 or 5173 already in use | An earlier run is still going | Stop it (`netstat -ano \| findstr :8000` on Windows, `lsof -i :8000` on Mac or Linux), or change the port |

## Reference

- Backend code: `backend/app/`
- Frontend code: `frontend/src/`
- Environment variables: `README.md`, "Required environment variables"
- What the app does, current status and known limits: `README.md`
- vAuto integration notes: `docs/INTEGRATION_TODO.md`
