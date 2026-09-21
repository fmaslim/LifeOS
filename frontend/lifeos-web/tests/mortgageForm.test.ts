import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'

const root = join(process.cwd(), 'src')
const panel = readFileSync(join(root, 'components/MortgagesPanel.tsx'), 'utf8')
const panelCss = readFileSync(join(root, 'components/MortgagesPanel.css'), 'utf8')
const service = readFileSync(join(root, 'services/MortgageService.ts'), 'utf8')
const financesPage = readFileSync(join(root, 'components/FinancesPage.tsx'), 'utf8')
const endpoints = readFileSync(join(process.cwd(), '../../backend/LifeOS.Api/Finance/MortgageEndpoints.cs'), 'utf8')

test('mortgage endpoints expose full CRUD and require authorization', () => {
  assert.match(endpoints, /MapGroup\("\/api\/finance\/mortgages"\)\.RequireAuthorization\(\)/)
  assert.match(endpoints, /group\.MapGet\("\/"/)
  assert.match(endpoints, /group\.MapGet\("\/\{id\}"/)
  assert.match(endpoints, /group\.MapPost\("\/"/)
  assert.match(endpoints, /group\.MapPut\("\/\{id\}"/)
  assert.match(endpoints, /group\.MapDelete\("\/\{id\}"/)
})

test('mortgage endpoints fail closed instead of falling back to mock data when storage is unconfigured', () => {
  assert.match(endpoints, /StorageUnavailable/)
  assert.match(endpoints, /StatusCodes\.Status503ServiceUnavailable/)
  assert.doesNotMatch(endpoints, /financesMockData|MockMortgage/)
})

test('mortgage write requests carry the explicit anti-CSRF client header', () => {
  assert.match(endpoints, /X-LifeOS-Client/)
  assert.match(service, /'X-LifeOS-Client':\s*'web'/)
})

test('the mortgage service never touches localStorage or sessionStorage', () => {
  assert.doesNotMatch(service, /\b(?:localStorage|sessionStorage)\s*\./)
  assert.doesNotMatch(panel, /\b(?:localStorage|sessionStorage)\s*\.|localStore\.(?:read|write)|usePersistentState/)
})

test('the mortgage service uses same-origin credentialed fetches, never an embedded credential', () => {
  assert.match(service, /credentials: 'include'/g)
  assert.doesNotMatch(service, /Bearer|ApiKey|accessToken|secretValue/i)
})

test('save and delete failures surface a fixed safe message, never the raw response body', () => {
  assert.doesNotMatch(service, /console\.(log|error|warn)/)
  assert.doesNotMatch(panel, /console\.(log|error|warn)/)
})

test('every mortgage form field has an associated accessible label', () => {
  const fieldCount = (panel.match(/className="mortgage-field"/g) ?? []).length
  assert.ok(fieldCount >= 5, 'expected label, as-of date, balance, rate, and payment fields')
  assert.match(panel, /<label className="mortgage-field">Label/)
  assert.match(panel, /aria-label={`Edit \$\{mortgage\.label\}`}/)
  assert.match(panel, /aria-label={`Remove \$\{mortgage\.label\}`}/)
})

test('the form supports keyboard dismissal and confirmations are announced to assistive tech', () => {
  assert.match(panel, /key === 'Escape'/)
  assert.match(panel, /aria-live="polite"/)
  assert.match(panel, /role="alert"/)
})

test('the mortgage panel is visually distinct from the existing mock debt/financing panel', () => {
  assert.match(financesPage, /<MortgagesPanel \/>/)
  assert.match(panel, />Mortgages</)
  assert.match(panel, />Manually entered</)
  // The existing mock section keeps its own heading; the new panel must not reuse it or its mock data.
  assert.doesNotMatch(panel, /debtPayments|financesMockData/i)
})

test('mortgage CSS scales with the shared typography token like the rest of the app', () => {
  const fontSizeDeclarations = panelCss.match(/font-size:[^;]+/g) ?? []
  assert.ok(fontSizeDeclarations.length > 5, 'expected multiple font-size declarations in the mortgage panel styles')
  for (const declaration of fontSizeDeclarations) {
    assert.match(declaration, /var\(--font-scale\)/, `expected "${declaration}" to use the shared --font-scale token`)
  }
})

test('the mobile breakpoint keeps the form single-column and actions reachable', () => {
  assert.match(panelCss, /@media\(max-width:760px\)/)
})
