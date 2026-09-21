# Integration status

## vAuto — CONFIRMED, code written (2026-09-21)

Read directly from the real Appraisal + Inventory API Specs and Product
User Guide pages on developer.coxautoinc.com. Nothing below is guessed.

- Token URL (shared by both APIs): sandbox/integration
  `https://authorize.coxautoinc.com/oauth2/aus132uaxy2eomhmi357/v1/token`,
  production `https://authorize.coxautoinc.com/oauth2/aus132sv79JpAYinE357/v1/token`
- Auth: OAuth2 client_credentials, HTTP Basic (base64 client_id:secret),
  scope requested per call
- Appraisal base URL: sandbox `https://sandbox.api.coxautoinc.com/va/appraisal-vehicle`,
  prod `https://api.coxautoinc.com/va/appraisal-vehicle`
- Inventory base URL: sandbox `https://sandbox.api.coxautoinc.com/va/inventory-vehicle`,
  prod `https://api.coxautoinc.com/va/inventory-vehicle`
- Sandbox test dealer: `EXT-TEST-01` (used automatically when `ENVIRONMENT=sandbox`)
- Full request/response shapes, filter/sort/select syntax, error codes, and
  the field-level permission model (omitted vs. null) are all implemented
  in `app/connectors/vauto.py` and `app/config.py`.

These are all real, non-secret values and are already hardcoded as defaults
in the code — nothing further needed from you for any of this.

**The only thing left is real credentials**, which per your instruction
never go in this chat:

- [ ] `VAUTO_APPRAISAL_CLIENT_ID` / `VAUTO_APPRAISAL_CLIENT_SECRET`
- [ ] `VAUTO_INVENTORY_CLIENT_ID` / `VAUTO_INVENTORY_CLIENT_SECRET`

Fill these into `backend/.env` (copy from `.env.example`) wherever this
actually runs. Once that's done, task #4/#5 (a real test call against each
API) can happen — either by you running the server and hitting
`/api/inventory` / `/api/appraisals` yourself, or by connecting a folder on
your computer so a test can run there without the secrets ever being
visible to me.

## Rapid Recon — on hold

Explicitly deferred per your instruction to get vAuto running first. Open
question when we return to it: is there a real REST API distinct from the
prior browser-session automation? Not investigated yet.
