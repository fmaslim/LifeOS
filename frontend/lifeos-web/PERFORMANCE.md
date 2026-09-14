# Frontend performance guardrails

LifeOS keeps the navigation shell, dashboard, search, and notifications in the entry bundle. Workspace pages load through React `lazy` imports so visiting one domain does not download every other domain.

Run `npm run validate:bundle` after `npm run build`. The check requires at least eight JavaScript chunks, caps the largest uncompressed chunk at 325 kB, and caps all JavaScript at 1.2 MB. Adjust a limit only with a documented product need and a before/after build comparison.

Prefer extending existing services and components, memoize only measured expensive computations, and avoid adding chart or utility libraries when the shared dependency-free primitives are sufficient. Validate a production build because development module behavior does not represent shipped chunking.
