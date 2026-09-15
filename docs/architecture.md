# LifeOS architecture

## Runtime shape

The shipped application is the Vite frontend in `frontend/lifeos-web`. `src/main.tsx` mounts the app-wide error boundary, application, PWA update prompt, and skip link. `src/App.tsx` owns the shared shell and selects a workspace from the URL hash. The .NET project is still the generated weather-forecast scaffold and has no production contract with the frontend.

```text
main.tsx
  AppErrorBoundary
    App shell (sidebar, command palette, notifications)
      lazy workspace page
        typed service data
        local component state / BrowserLocalStore
```

## Routing and shell

- `models/shell.ts` is the source of truth for the `RouteName` union.
- `data/shellMockData.ts` defines visible navigation and placeholder metadata.
- `routing/routeSafety.ts` rejects unknown hashes and returns `dashboard`.
- `App.tsx` subscribes to `hashchange`. Workspace components use React `lazy`; the shell, search, notifications, and dashboard remain in the entry chunk.
- Each rendered route has the `main-content` landmark targeted by the global skip link. `AppErrorBoundary` supplies retry, dashboard reset, and reload recovery.

This is intentionally a small hash router. If nested routing, loaders, or server rendering become real requirements, adopt a routing library in one migration rather than mixing a second router into individual pages.

## Domain and service boundaries

Domain contracts live in `src/models`. Service interfaces and mock implementations live in `src/services`. `createServiceRegistry()` in `services/serviceRegistry.ts` is the single composition root; pages do not instantiate domain services. Most services synchronously return deterministic mock data today, which keeps the interface replaceable without pretending an external integration exists.

The expected dependency direction is:

```text
page -> service interface/registry -> mock adapter -> typed model/mock data
```

Do not import one workspace page into another or create a second global service registry. Cross-workspace features such as search, activity, notifications, data transfer, and provider status should get a shared typed service.

## State ownership and persistence

| State | Owner | Persistence |
| --- | --- | --- |
| Current route, open overlays, filters, selected records | Shell/page component | In memory |
| Tasks, goals, notes, calendar and supported workspace records | Workspace via `usePersistentState` | Browser local storage |
| Dashboard operations and widget preferences | Dashboard components | Browser local storage |
| Seed/demo data | Mock service or `src/data` | Source controlled fallback |
| Integration status | Provider service mock adapters | In memory; no accounts |

`storage/LocalStore.ts` writes `{ version: 1, value }` envelopes under the `lifeos:v1:` prefix. `usePersistentState` reads a seed once and writes changes through the store. Add shared keys to `storage/storageKeys.ts`; do not write raw local-storage keys from new code. Storage failures safely fall back to the in-memory experience.

`services/LocalDataTransfer.ts` exports only an explicit allowlist of user-created collections and dashboard preferences. Imports require the `lifeos-local-backup` schema/version, preview counts before applying, and reject malformed or credential-shaped fields. Expanding backup scope requires a schema-compatible migration and tests.

`services/BackupService.ts` is a distinct, provider-neutral concept built on top of `LocalDataTransfer.ts` rather than a duplicate of it: scheduled backup *jobs*, retention pruning, checksum-based integrity verification, and non-destructive restore previews, all as first-class typed data (`models/backup.ts`), with the deterministic derivation logic split out into `services/BackupLogic.ts` (mirroring `PlanningLogic.ts`/`PlanningService.ts`). Every snapshot's payload is produced with `createBackup` and must round-trip through `parseBackup` - the same schema and secret-shape validation manual export/import already uses - before it is persisted or offered for restore; a payload that fails validation is recorded as a failed snapshot with no stored payload. Restore always requires explicit approval through `ApprovalService`, the same convention `ReleaseService` uses for rollback. Backup run/snapshot history is itself persisted (`storageKeys.backupRecords`) but is deliberately **not** added to `LocalDataTransfer`'s export allowlist - backing up the backup log inside the backup it describes would be recursive and has no disaster-recovery value. Backup failures and stale-backup warnings publish through the existing `ActivityService`/`NotificationService`, deduplicated per health state per day.

## Integration provider framework

`models/integrationProvider.ts` defines provider metadata, connection state, health, and capability flags. `IntegrationProviderService.ts` supplies adapters for Jarvis, DocIQ, YouTube, calendar, finance, health, and smart home. They are mock adapters: all start `not-configured`, health is `unknown`, and actions are disabled. Settings displays these snapshots without accepting OAuth tokens or credentials.

A future real provider should implement `IntegrationProviderAdapter`, keep secrets outside frontend storage and exports, report health without leaking response bodies, and expose only capabilities it actually supports.

## Design system and accessibility

The visual language is CSS-first: `App.css` contains the shell and shared dashboard surfaces; `index.css` contains global focus/reduced-motion behavior; `WorkspaceCollection.css`, `PageState`, and `components/visualizations` are reusable primitives. Workspace CSS stays next to its component.

Preserve the dark palette, compact type scale, subtle borders, violet interaction color, responsive breakpoints, and keyboard-visible focus. New dialogs must name themselves, contain focus, close with Escape, and restore trigger focus. Icon-only controls need an accessible name. Charts need textual values and loading/empty states.

## PWA and cache policy

`public/manifest.webmanifest` and `public/sw.js` provide installability and offline shell navigation. The worker caches only same-origin GET navigation/static requests, excludes `/api/`, ignores external and mutating requests, and waits for the user to accept an update. Do not broaden caching to authenticated responses or sensitive external data.

## Testing and CI

- `npm run lint`: Oxlint across frontend source and tests.
- `npm test`: Node's built-in runner with TypeScript stripping for pure logic, policy, and architecture guards.
- `npm run build`: TypeScript project build plus Vite production build.
- `npm run validate:bundle`: verifies route chunking and JavaScript budgets.
- `npm run test:e2e`: Playwright Chromium navigation and persistence smoke tests.
- `.github/workflows/frontend.yml`: runs the complete sequence for frontend pull requests and main pushes.

## Adding a workspace safely

1. Add its typed contract under `src/models`.
2. Add a service interface/mock adapter under `src/services`, using deterministic safe data.
3. Register the adapter once in `createServiceRegistry()`.
4. Add the route to `RouteName` and the navigation entry to `shellMockData`.
5. Create the page and colocated CSS, reusing shared page states, visualization, and workspace primitives.
6. Add a named React lazy import and route branch in `App.tsx`; keep the shell eager.
7. If data is user-editable, use `usePersistentState` and a key in `storageKeys`. Decide explicitly whether it belongs in the backup allowlist.
8. Add focused unit tests and extend the Playwright route/persistence smoke coverage.
9. Run the full validation sequence and review the production chunk output, mobile layout, keyboard flow, secrets, and unrelated changes.
