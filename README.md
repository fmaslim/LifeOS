# LifeOS

LifeOS is a local-first personal operating system with workspaces for daily planning, tasks, goals, calendar, notes, projects, habits, learning, contacts, reading, documents, budgets, property, content, automations, and system settings. The current product is a responsive React preview backed by typed mock services and versioned browser storage; it does not connect to real external accounts.

## Current state

- React 19, TypeScript, and Vite frontend in `frontend/lifeos-web`
- Hash-based, route-lazy workspaces with a persistent premium dark shell
- Typed domain models and service interfaces composed in one registry
- Local browser persistence plus validated JSON import/export
- Mock-only integration provider framework; no OAuth or credentials
- Installable PWA shell with conservative same-origin static caching
- Node unit/guard tests and Playwright browser smoke tests in GitHub Actions
- Minimal .NET 10 API scaffold in `backend/LifeOS.Api`; it is not currently used by the frontend

## Quick start

```bash
cd frontend/lifeos-web
npm ci
npm run dev
```

Validate a change:

```bash
npm run lint
npm test
npm run build
npm run validate:bundle
npx playwright install chromium
npm run test:e2e
```

See [Architecture](docs/architecture.md), [Contributing](CONTRIBUTING.md), and [frontend performance guardrails](frontend/lifeos-web/PERFORMANCE.md).
