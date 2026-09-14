import assert from 'node:assert/strict'
import { access, readFile } from 'node:fs/promises'
import test from 'node:test'

const repository = new URL('../../../', import.meta.url)

test('developer docs describe current architecture sources and commands', async () => {
  const architecture = await readFile(new URL('docs/architecture.md', repository), 'utf8')
  for (const reference of ['models/shell.ts', 'routing/routeSafety.ts', 'services/serviceRegistry.ts', 'storage/LocalStore.ts', 'models/integrationProvider.ts', 'public/sw.js']) assert.match(architecture, new RegExp(reference.replace('.', '\\.')))
  for (const command of ['npm run lint', 'npm test', 'npm run build', 'npm run validate:bundle', 'npm run test:e2e']) assert.match(architecture, new RegExp(command))
})

test('top-level documentation links resolve to committed files', async () => {
  await Promise.all(['README.md', 'CONTRIBUTING.md', 'docs/architecture.md', 'docs/autonomous-issue-runner.md', 'frontend/lifeos-web/PERFORMANCE.md'].map(path => access(new URL(path, repository))))
})
