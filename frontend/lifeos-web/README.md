# LifeOS web

The LifeOS client is a React 19 + TypeScript + Vite application. It is local-first, uses typed mock services, and lazy-loads workspace routes behind a shared premium dark shell.

```bash
npm ci
npm run dev
```

Available checks:

```bash
npm run lint
npm test
npm run build
npm run validate:bundle
npm run test:e2e
```

Use Node 24 to match CI. Install the local E2E browser with `npx playwright install chromium`.

See the repository [architecture guide](../../docs/architecture.md), [contribution guide](../../CONTRIBUTING.md), and [performance guardrails](PERFORMANCE.md).
