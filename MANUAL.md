# DealerPilot Dashboard — Operator Manual

Step-by-step instructions for starting this app locally: what to run, in
what order, and exactly what to check at each step before moving on. This
is the "how do I actually run this" doc — for what the app does and its
current status, see `README.md`; for why it exists and what's blocking
the next phase, see the companion strategic report.

## 0. Before you start — checklist

- [ ] Python 3.10+ installed (`python3 --version`)
- [ ] Node.js + npm installed (`node --version`, `npm --version`)
- [ ] `backend/.env` exists and has real values in `VAUTO_CLIENT_ID` /
      `VAUTO_CLIENT_SECRET` (copy from `backend/.env.example` if it
      doesn't exist yet — never ask anyone else to fill this in for you
      over chat)
- [ ] You're in the project root (`dealerpilot-dashboard/`) — everything
      below assumes that as your starting point

If any of these aren't true yet, stop here and fix that first — the
steps below won't produce useful results without them.

## 1. Start the backend

```bash
cd backend
python3 -m venv .venv                 # skip if .venv already exists
./.venv/bin/pip install -r requirements.txt
./.venv/bin/uvicorn app.main:app --reload
```

On Windows (PowerShell), the venv commands are:
```powershell
python -m venv .venv
.venv\Scripts\pip install -r requirements.txt
.venv\Scripts\uvicorn app.main:app --reload
```

**What to check:**

- Terminal shows `Uvicorn running on http://127.0.0.1:8000` with no
  tracebacks. A traceback here almost always means a missing/misnamed
  variable in `backend/.env` — check it against `.env.example` before
  doing anything else.
- Open `http://127.0.0.1:8000/health` in a browser or `curl` it. You
  should see JSON with `"environment"` and a `"connectors"` object.
- In that JSON, confirm `vauto_appraisal` and `vauto_inventory` both say
  `"configured"`, not `"not_configured"`. If either says
  `not_configured`, the backend is running fine but your `.env` values
  aren't being picked up — double-check the file is actually named
  `.env` (not `.env.txt` or similar) and sits in `backend/`, next to
  `requirements.txt`.

Leave this terminal running — the backend needs to stay up while you use
the dashboard.

## 2. Start the frontend

Open a **second** terminal (the backend keeps the first one busy):

```bash
cd frontend
npm install          # only needed the first time, or after package.json changes
npm run dev
```

**What to check:**

- Terminal shows something like `Local: http://localhost:5173/` with no
  red error text.
- Open `http://localhost:5173` in a browser. You should land on the
  Overview page.
- Overview should show both connector badges as **Connected** (green),
  real vehicle/appraisal counts, and no red error banner. If you see a
  red error banner instead, it's almost always one of:
  - "Could not reach the DealerPilot backend" → the backend (step 1)
    isn't running, or crashed — check that terminal first.
  - A timeout message → the backend is up but vAuto itself is slow to
    respond; wait a moment and click Refresh.
  - A 4xx/5xx error with real detail text → that's vAuto's own error
    message surfacing honestly; read it, it's not a bug in this app.

Leave this terminal running too. Both servers need to stay up at the
same time for the dashboard to work — the frontend never has data of
its own, it only displays what the backend gives it live.

## 3. Walk through the pages once

A quick pass to confirm everything's actually working, not just "the
server started":

1. **Overview** — stat cards show real numbers, not all zeros or dashes.
2. **Inventory** — table has rows, search box filters them, clicking a
   column header re-sorts, "View →" on a row opens that vehicle's detail
   page with real data.
3. **Appraisals** — same checks as Inventory.
4. **Aged Inventory** — chart renders (a lollipop per age bucket), table
   below only shows vehicles at 60+ days.
5. Click **Refresh** on any page — the button should briefly spin, then
   settle with no error.

If all five pass, the app is working end-to-end against live data.

## 4. Stopping everything

In each terminal, `Ctrl+C` stops that server. Stop the frontend first,
then the backend, though the order doesn't actually matter — neither
depends on the other staying alive to shut down cleanly.

## Common issues

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| Backend won't start, traceback on launch | Bad or missing `.env` value | Compare `backend/.env` against `backend/.env.example` line by line |
| `/health` shows `not_configured` | `.env` not being read | Confirm the file is named exactly `.env`, sits in `backend/`, and you restarted uvicorn after editing it |
| Frontend shows "Could not reach the DealerPilot backend" | Backend isn't running | Check the backend terminal for errors, restart it |
| A page times out on first load | vAuto Sandbox is slow to respond (this has happened before, not a bug) | Wait and click Refresh; if it persists, check the backend terminal for the real error |
| `npm install` warnings about vulnerabilities | Known, already assessed — see README | No action needed unless you're deliberately revisiting that decision |
| Port 8000 or 5173 already in use | A previous run is still up somewhere | Find and stop it (`lsof -i :8000` / `lsof -i :5173` on Mac/Linux, `netstat -ano \| findstr :8000` on Windows), or change the port |

## Reference

- Backend code: `backend/app/`
- Frontend code: `frontend/src/`
- Environment variable reference: `README.md` → "Required environment
  variables"
- Full architecture + current feature status: `README.md`
- Why this exists, current constraints, and what's next: companion
  strategic report
