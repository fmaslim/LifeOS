export interface ChartPoint { label: string; value: number }

export function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 0
  return Math.min(100, Math.max(0, value))
}

export function normalizePoints(points: ChartPoint[]) {
  const values = points.map(point => Math.max(0, point.value))
  const maximum = Math.max(...values, 1)
  return values.map(value => (value / maximum) * 100)
}

export function linePath(points: ChartPoint[], width = 100, height = 40) {
  if (!points.length) return ''
  const normalized = normalizePoints(points)
  const step = points.length === 1 ? 0 : width / (points.length - 1)
  return normalized.map((value, index) => `${index ? 'L' : 'M'} ${index * step} ${height - (value / 100) * height}`).join(' ')
}
