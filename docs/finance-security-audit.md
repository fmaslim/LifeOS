# Finance data security audit (pre-implementation)

This audits the state of `main` as of PR #152, before any mortgage/finance record is
ever written to durable storage. It covers the Finances, Budget, and Property pages,
the single-owner authentication scheme, backend routing, `localStorage` usage, the
JSON file repository, and the live Cloud Run deployment (read-only `gcloud`
inspection; nothing was provisioned, changed, or deployed to produce this document).
Scope is audit and regression tests only, per issue #153 — no product code changed.

## 1. Current architecture (verified against `main` and the live deployment)

- **Frontend Finance/Budget/Property pages** (`FinancesPage.tsx`, `BudgetPage.tsx`,
  `PropertyPage.tsx`) render entirely from typed mock/service data today. `Finances`
  is additionally wired to `ProviderBackedFinancesService`, which calls
  `GET /api/finance/summary` and caches the *entire* response — including formatted
  account balances, investment values, debt balances, and free-text "signals" — in
  **plaintext `localStorage`** under the key `finance-provider-cache`
  (`FinanceProviderService.ts`). Budget and Property have no backend at all.
- **Auth** is a single shared "owner password" (`Auth__OwnerPassword`), SHA-256 +
  constant-time compare, HMAC-SHA256-signed session token in an `HttpOnly` cookie
  (`Secure` off-localhost, `SameSite=Lax` on localhost / `SameSite=None` otherwise).
  `LifeOSAuthenticationHandler` returns `AuthenticateResult.Fail`/`NoResult` whenever
  the session is absent, invalid, expired, or `Auth__OwnerPassword`/`Auth__SigningKey`
  are unset — i.e. **auth fails closed by construction**, not by convention.
- **Backend routing**: every domain endpoint (`/api/finance/summary`, calendar,
  DocIQ, home, sync) is registered with `.RequireAuthorization()`. Only
  `/health/persistence` and the scaffold `/weatherforecast` are `AllowAnonymous`.
- **CORS**: `Auth:AllowedOrigins` is read once at startup; in Development,
  `localhost:5173`/`4173` are added. If the resulting origin list is empty (true in
  production today — see §3), `WithOrigins(...)` is **never called**, so the CORS
  middleware allows no cross-origin requests at all (default-deny, not default-allow).
- **Persistence**: `JsonFileApplicationRepository` writes one JSON document per
  hashed user id to a configurable `Persistence:RootPath`. There is **no finance
  entity type** in `CoreEntities.cs` today (only Task/Goal/Note/Calendar/Project/
  Habit/Preference/Notification/Automation/KPI) — Finance has never had a server-side
  persistent record. Its own README already documents that Cloud Run's ephemeral
  filesystem must not be treated as durable storage.
- **Cloud Run deployment** (`lifeos-api`, project `lifeos-508608`, region
  `us-east1`): confirmed via `gcloud run services describe` that the container has
  **no environment variables, no secrets, and no volumes attached** — i.e.
  `Auth__OwnerPassword`/`Auth__SigningKey`/`Auth:AllowedOrigins` are all unset in the
  live service today (auth is currently non-functional in production, and fails
  closed, matching §3's finding).

## 2. Threat model

**Assets**: session cookie/signing key, owner password, any future mortgage record
(balance, rate, payment, as-of date), integration credentials (currently unused for
Finance since no `Integrations:Finance:BaseUrl` is configured anywhere).

**Trust boundaries**: browser ↔ nginx (same-origin proxy, `getlifeos.co/api/*`) ↔
Cloud Run backend ↔ (future) Firestore. `localStorage` is inside the browser trust
boundary but is readable by any script that runs on the page (XSS) and is not
encrypted at rest by the browser.

**Key risks identified, ranked by severity:**

1. **Cloud Run runs as the default Compute Engine service account
   (`94214131383-compute@developer.gserviceaccount.com`) with project-level
   `roles/editor`**, confirmed via `gcloud projects get-iam-policy`. This is the
   single biggest blocker for storing real financial data: a container
   compromise (e.g. a dependency RCE) would inherit broad edit access to the
   **entire GCP project** — not a scoped Firestore role. No mortgage or other
   financial data should reach Firestore until this backend runs under a
   dedicated, least-privilege service account (Firestore read/write on its own
   collection only; nothing else).
2. **Cloud Firestore is not enabled** on `lifeos-508608` (confirmed via
   `gcloud firestore databases list`, which fails with `SERVICE_DISABLED`). No
   Firestore collection, index, or backup/PITR policy exists yet. This is
   expected at this stage and is not itself a defect, but it means issues
   #154/#155 must build against a fake/emulator only, and enabling the API plus
   creating the dedicated service account are explicit, owner-approval-gated
   prerequisites before any real deployment (see §4).
3. **The existing Finance provider snapshot caches full financial figures in
   plaintext `localStorage`.** This predates mortgage work and is out of scope
   to change under issue #153, but it is the wrong pattern to extend: issue
   #156 explicitly (and correctly) requires mortgage data to stay in component
   memory only, never `localStorage`/`sessionStorage`.
4. **CSRF defense is incidental, not explicit.** In production the session
   cookie is `SameSite=None` (needed historically for cross-origin use before
   the nginx same-origin proxy landed in PR #151). Today, cross-site forgery
   against JSON-body endpoints is blocked only *incidentally*: (a) CORS has no
   allowed origins configured, so a cross-site `fetch` can't read the response
   and a JSON-body request triggers a preflight that fails closed; (b) minimal
   API JSON body binding rejects a plain HTML form's
   `application/x-www-form-urlencoded` body. Neither is an intentional,
   documented CSRF control. The upcoming mortgage write endpoints (#155) should
   not rely on this by accident — see checklist.
5. **Auth is currently unconfigured in the live Cloud Run service** (§1), so
   production is fully inaccessible (fails closed, not a data exposure) but
   also not usable — this was already reported to the owner separately and is
   tracked outside this issue.

## 3. Verified existing behavior (locked in with regression tests)

Added to `backend/LifeOS.Persistence.Tests/Program.cs` (same style as the existing
`VerifyAuthenticationContract`, run via `dotnet run ... LifeOS.Persistence.Tests`):

- `VerifyFinanceEndpointFailsClosed` — `GET /api/finance/summary` returns `401`
  signed-out; signed-in with no `Integrations:Finance:BaseUrl` configured, it
  returns `200` with `status:"disconnected"`, empty collections, and a safe
  message — never a crash, never a leaked credential value.
- `VerifyCredentialStatusNeverLeaksSecretValue` — with a dummy
  `Integrations:Finance:Credential` configured, `GET /api/integrations/credentials`
  reports `state:"Configured"` for Finance but the raw response body never
  contains the configured secret string.
- `VerifyCorsDeniesUnconfiguredOrigins` — with `Auth:AllowedOrigins` unset (the
  live production configuration), a request carrying a third-party `Origin`
  header never receives a matching `Access-Control-Allow-Origin` header.
- `VerifyLoginRejectsNonJsonBody` — `POST /api/auth/login` with a form-encoded
  body (the shape a plain HTML-form CSRF attempt would send) never succeeds.

All four, plus the pre-existing suite, pass (see PR test plan).

## 4. Explicit blockers before any real mortgage/financial record is stored

These must be resolved (with owner approval — none of this is done by this issue
or by #154–#156) before real financial data reaches Firestore:

1. Create a **dedicated Firestore-scoped service account** for `lifeos-api` and
   attach it to the Cloud Run revision, replacing the default Compute Engine
   `editor` identity. Grant it only the collection-scoped role the mortgage
   repository needs (e.g. a custom role limited to the `mortgages` collection,
   not project-wide `roles/datastore.user` if that can be avoided).
2. **Enable the Firestore API** and choose Native mode, region, and a
   Point-in-Time-Recovery/backup policy (#154 documents the recommendation;
   nothing is provisioned until the owner approves).
3. Configure `Auth__OwnerPassword`/`Auth__SigningKey`/`Auth:AllowedOrigins` in
   production (tracked separately; auth is currently non-functional live).
4. Decide and implement an explicit anti-CSRF control for mortgage write
   endpoints (e.g. a custom header the frontend sets that a cross-site form
   cannot forge) rather than relying on the incidental protections in §2.4.
5. Do not extend the existing `finance-provider-cache` `localStorage` pattern to
   mortgage data; #156 must keep mortgage state in component memory only.

## 5. Checklist for #154–#156

- [ ] Mortgage record and repository contract live in `backend/LifeOS.Api`
      alongside the existing `Persistence`/`Integrations` folders, following the
      `CoreEntity`/`IApplicationRepository` shape already established.
- [ ] Firestore adapter is built but not wired to any live project; tests use an
      in-memory fake, never a real Firestore instance or emulator requiring
      network access in CI.
- [ ] Mortgage endpoints `RequireAuthorization()` and fail closed (503, not a
      silent empty/mock fallback) if storage isn't configured.
- [ ] No mortgage value (balance, rate, payment) is ever written to a log,
      exception message, or `localStorage`/`sessionStorage`.
- [ ] All test fixtures use synthetic values (e.g. `"Test St mortgage"`,
      `250000.00`) — never the owner's real figures.
