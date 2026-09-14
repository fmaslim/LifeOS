# Contributing to LifeOS

## Principles

- Keep one focused issue per branch and include `Fixes #<issue>` in the pull request.
- Extend the existing model/service/registry architecture instead of creating parallel stores or composition roots.
- Treat all external connections as mocks unless an issue explicitly defines a secure backend integration.
- Never commit tokens, credentials, private data, generated local backups, or real user content.
- Preserve responsive behavior, keyboard access, reduced motion, and the premium dark visual language.

## Development workflow

Start from current main and use a dedicated branch:

```bash
git fetch origin main
git switch main
git pull --ff-only
git switch -c agent/issue-<number>
cd frontend/lifeos-web
npm ci
```

Before opening a pull request, run:

```bash
npm run lint
npm test
npm run build
npm run validate:bundle
npm run test:e2e
```

Install the Playwright browser once with `npx playwright install chromium`. The GitHub workflow installs Chromium and OS dependencies automatically.

## Review checklist

- The implementation matches only the issue scope and uses typed contracts.
- Mutable local data has safe fallback behavior and the intended persistence key.
- Import/export changes remain versioned and exclude sensitive fields.
- Provider work does not introduce credentials, OAuth, or real network calls without an explicit secure design.
- Interactive controls have names, focus states, keyboard behavior, and mobile layouts.
- Loading, empty, error, and recovery paths remain understandable.
- New dependencies are necessary; bundle budgets and route splitting still pass.
- Tests cover the risky behavior, and no generated artifacts or unrelated files are committed.

Architecture details and the workspace recipe are in [docs/architecture.md](docs/architecture.md). The sequential issue automation is documented separately in [docs/autonomous-issue-runner.md](docs/autonomous-issue-runner.md).
