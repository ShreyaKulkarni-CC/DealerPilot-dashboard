# Endpoint testing and evidence for Cox

This explains how to produce proof of what the vAuto APIs return, so it can
be sent to Cox. It also records what we have found so far.

## How to run the test

The script calls Cox directly (not through the DealerPilot backend) and
writes a report. It reads `VAUTO_CLIENT_ID` and `VAUTO_CLIENT_SECRET` from
`backend/.env`, so run it once per credential set.

From the `backend` folder in PowerShell:

```powershell
# 1. Put the SANDBOX Client ID and Secret in backend/.env, save, then:
.venv\Scripts\python scripts\endpoint_proof.py --label sandbox

# 2. Put the INTEGRATION Client ID and Secret in backend/.env, save, then:
.venv\Scripts\python scripts\endpoint_proof.py --label integration

# 3. Optional, PRODUCTION credentials:
.venv\Scripts\python scripts\endpoint_proof.py --label production
```

The backend does not need to be running. Reports are saved in
`backend/test-reports/` (ignored by git).

Options: `--entity MP23634` tests a specific store (repeat the flag for more
than one). `--api-base https://host` overrides the API host if Cox says
Integration uses a different one.

## What each report contains

- The token request: URL, status, response headers, and whether a token was issued.
- Each API call: full URL, status, all response headers, and the body (or a
  summary of it when the call succeeds).
- A correlation ID (`X-CoxAuto-Correlation-Id`) that we send on every call,
  so Cox can find the exact request in their logs.
- Never included: the Client Secret, the Authorization header, the access token.
  Successful responses show item counts and field names only, no vehicle data.

Send Cox the sandbox report next to the integration report. The difference
between them is the evidence.

## Findings so far

| Credentials | Token request | API call result |
|---|---|---|
| Sandbox, store EXT-TEST-01 | Issued | 200 on Inventory and Appraisals (3 items each) |
| Integration, MP23634 and MP18936 | Issued | 403 `{"message":"Forbidden"}` |
| Production, MP23634 and MP18936 | Rejected: 401 access_denied, "Policy evaluation failed" | Not reached |

Notes:

- In Sandbox, an unauthorized store returns a descriptive error
  (`inventory.unauthorized`, "The API client is not authorized to access
  MP23634..."). The Integration 403 is a bare `{"message":"Forbidden"}`, a
  different shape. This suggests Integration calls are rejected before the
  store check. This is an inference, not confirmed.
- Integration calls so far used the sandbox API host
  (`sandbox.api.coxautoinc.com`) with the non-production token URL. The
  published API specs list only Sandbox and Production hosts. We have not
  confirmed that Integration credentials are meant to call that host.

## Questions for Cox

1. What API base URL should Integration credentials call?
2. Is the Integration Client ID subscribed to the vAuto Inventory and
   Appraisal APIs on the Integration gateway?
3. Is the Production Client ID assigned to the Production access policy for
   `va.inventory.read` and `va.appraisal.read`?
