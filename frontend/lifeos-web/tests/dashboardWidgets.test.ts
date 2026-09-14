import assert from 'node:assert/strict'
import test from 'node:test'
import { defaultDashboardWidgets, normalizeDashboardWidgets } from '../src/models/dashboardWidgets.ts'

test('falls back to the complete default dashboard for malformed data', () => {
  assert.deepEqual(normalizeDashboardWidgets({ bad: true }), defaultDashboardWidgets)
  assert.deepEqual(normalizeDashboardWidgets([]), defaultDashboardWidgets)
})

test('preserves valid ordering, visibility, and appends newly supported widgets', () => {
  assert.deepEqual(normalizeDashboardWidgets([{ id: 'activity', visible: false }, { id: 'summary', visible: true }]), [
    { id: 'activity', visible: false },
    { id: 'summary', visible: true },
    { id: 'operations', visible: true },
  ])
})

test('rejects unknown and duplicate widget entries', () => {
  assert.deepEqual(normalizeDashboardWidgets([{ id: 'summary', visible: false }, { id: 'summary', visible: true }, { id: 'unknown' }]), [
    { id: 'summary', visible: false },
    { id: 'operations', visible: true },
    { id: 'activity', visible: true },
  ])
})
