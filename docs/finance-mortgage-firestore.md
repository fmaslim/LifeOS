# Mortgage schema and Firestore repository design (issue #154)

This documents the schema, storage design, and cost/retention choices for manually
entered mortgage records. **Nothing in this issue provisions Firestore, creates a
service account, or touches any live cloud resource.** Tests use the deterministic
in-memory fake `InMemoryMortgageRepository` (`backend/LifeOS.Persistence.Tests`)
against the exact same `IMortgageRepository` contract a real Firestore adapter will
implement in issue #155. See `docs/finance-security-audit.md` (#153) for the audit
this design responds to, including the two provisioning blockers in §4 that must be
resolved — with your approval — before any real adapter is deployed.

## Schema

`MortgageRecord` (`backend/LifeOS.Api/Finance/MortgageRecord.cs`):

| Field | Type | Notes |
| --- | --- | --- |
| `Id` | `string` | Document id, generated server-side |
| `UserId` | `string` | The owner id (single owner today; see `docs/architecture.md`) |
| `UpdatedAt` | `DateTimeOffset` | Server-set; doubles as the optimistic-concurrency token |
| `Label` | `string` | e.g. "Maple Street mortgage"; required, ≤200 chars |
| `CurrentBalance` | `decimal` | USD, 0–100,000,000 |
| `AnnualInterestRatePercent` | `decimal` | 0–100 |
| `MonthlyPrincipalAndInterest` | `decimal` | USD, 0–1,000,000 |
| `AsOfDate` | `DateOnly` | Not in the future, not before 1900-01-01 |

`MortgageValidator.Validate(record, now)` (pure, no I/O) enforces all of the above and
is exercised directly by the repository's `UpsertAsync`, so no caller can bypass it by
writing straight to storage.

## Firestore collection path and access model

- **Path**: `users/{ownerId}/mortgages/{mortgageId}` — a subcollection under a
  per-owner document, not a flat top-level `mortgages` collection with an `ownerId`
  field. Ownership isolation is then structural (a query is rooted under one owner's
  path) rather than "remember to filter by ownerId," which is safer against an
  accidental unfiltered query as more finance record types are added later.
- **Server-only access.** Firestore is called exclusively from the backend via the
  Admin SDK using the Cloud Run service's attached identity (Application Default
  Credentials / Workload Identity) — never a client SDK, API key, or config shipped
  to the browser. This mirrors the existing `CredentialBroker` principle that secrets
  never reach the frontend, extended here to "no cloud credential of any kind reaches
  the frontend."
- **Firestore Security Rules do not apply** to Admin SDK access — they only govern
  direct client-SDK reads/writes, which this design never uses. IAM is therefore the
  only enforcement layer at the infrastructure level; per-owner isolation is enforced
  in application code (the repository takes `ownerId` from the authenticated session,
  never from client input) and is exactly what the ownership-isolation tests below
  pin down.
- **Service account least privilege** (blocker, tracked in #153 §4): today
  `lifeos-api` runs as the default Compute Engine service account with project-level
  `roles/editor`. Before any real Firestore write, create a dedicated service account
  for `lifeos-api` and grant it `roles/datastore.user` scoped to this project's
  Firestore database only — Firestore's IAM model is project/database-level, not
  collection-level, so a custom role narrower than `datastore.user` is not available;
  document that limitation rather than imply a false guarantee.

## Validation and concurrency

- Validation (§ above) runs before any write reaches storage, in-memory fake or real
  adapter alike, and rejects the record with an itemized error list — it never
  partially stores an invalid record.
- Concurrency uses `expectedUpdatedAt`, an optimistic-concurrency token:
  - `null` → create; conflicts if the id already exists.
  - a timestamp → update; a real Firestore adapter reads the current document inside
    a transaction and compares its `updatedAt` field before writing, returning
    `Conflict` if it has changed (e.g. a second device or tab updated it first) or
    `NotFound` if the document no longer exists.
- This is a small, single-owner, low-write dataset (a handful of mortgages, edited
  occasionally) — a full CRDT/merge strategy is unnecessary; last-writer-wins with a
  conflict signal back to the caller (who can re-fetch and retry) is sufficient and
  matches the UI in #156, which shows an explicit save-conflict state rather than
  silently overwriting.

## Cost, billing, retention

- **Cost**: Firestore's free tier (1 GiB storage, 50K reads/20K writes/20K deletes
  per day) comfortably covers a single owner's handful of mortgage documents
  indefinitely. Expected ongoing cost: **$0/month** at this scale.
- **Retention/PITR**: recommend enabling Firestore's built-in Point-in-Time Recovery
  (7-day rolling window) when the database is created — it is a checkbox/flag at
  creation time with a small per-GB-hour storage fee, negligible for this data
  volume (well under $1/month). This is simpler and cheaper than a custom scheduled
  export pipeline and should be the default choice unless a longer retention window
  is later required, in which case a scheduled export to a private Cloud Storage
  bucket can be added as a follow-up.
- None of the above is provisioned by this issue; it is documented so the owner can
  approve it explicitly before #155 (or a later issue) connects a real adapter.

## What's implemented here vs. deferred to #155

| In this issue | Deferred to #155 |
| --- | --- |
| `MortgageRecord`, `MortgageValidator` | Authenticated HTTP endpoints |
| `IMortgageRepository` contract | Real Firestore-backed adapter |
| `InMemoryMortgageRepository` (test-only fake) | Wiring behind configuration, fail-closed when unconfigured |
| Repository contract tests (validation, ownership isolation, concurrency, CRUD) | Endpoint-level auth/CRUD/conflict tests |
