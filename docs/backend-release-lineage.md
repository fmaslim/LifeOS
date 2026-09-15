# Backend release lineage

LifeOS production revisions are built from GitHub by the existing Cloud Build trigger. A backend investigation must start from a clean `origin/main`, then compare the deployed revision's commit label with GitHub before treating local differences as source drift.

## Verified authentication lineage

| Item | Value |
| --- | --- |
| Authentication source | PR #119, commit `55428173d9fde45690079ce765c041fa05b69f66` |
| First auth revision | `lifeos-api-00007-88g` |
| Audited production revision | `lifeos-api-00016-q25` |
| Audited production commit | `44204eb0163770344c59eeda65c2bca86e041c56` |
| Relationship | `44204eb` descends from `5542817`; both are present on `main` |

The authentication implementation is therefore source-controlled. The apparent mismatch during the incident came from a local checkout at `636c799`, which predated PR #119.

## Audit procedure

1. Fetch and reset a clean audit worktree to `origin/main` without overwriting an active developer worktree.
2. Read the API Cloud Build trigger's connected repository, branch, build substitution, and image target.
3. Read the active Cloud Run revision labels and image digest. Record the revision, commit SHA, build id, and digest together.
4. Verify that the deployed commit is reachable from `origin/main` and contains the auth endpoint, handler, session service, options, program wiring, tests, and backend workflow.
5. Run the backend Release build and contract tests. Do not deploy during an audit unless a concrete mismatch is demonstrated and separately approved.

The contract tests verify login/logout cookie behavior, the protected session endpoint, and the unauthenticated `401` response with `X-LifeOS-Auth-State: signed-out`. Secrets and credential values must never be copied into audit notes or build logs.
