import assert from 'node:assert/strict'
import test from 'node:test'
import { clampPercent, linePath, normalizePoints } from '../src/components/visualizations/visualizationMath.ts'

test('clamps progress values to a safe percentage', () => {
  assert.equal(clampPercent(-12), 0)
  assert.equal(clampPercent(45.5), 45.5)
  assert.equal(clampPercent(140), 100)
  assert.equal(clampPercent(Number.NaN), 0)
})

test('normalizes chart points against the largest value', () => {
  assert.deepEqual(normalizePoints([{ label: 'A', value: 5 }, { label: 'B', value: 10 }]), [50, 100])
  assert.deepEqual(normalizePoints([{ label: 'A', value: -2 }]), [0])
})

test('creates stable accessible line geometry', () => {
  assert.equal(linePath([]), '')
  assert.equal(linePath([{ label: 'A', value: 2 }, { label: 'B', value: 4 }]), 'M 0 20 L 100 0')
})
