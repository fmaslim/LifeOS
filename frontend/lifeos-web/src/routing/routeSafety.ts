import type { RouteName } from '../models/shell.ts'

export function resolveSafeRoute(hash: string, supported: readonly RouteName[]): RouteName {
  const candidate = hash.replace('#/', '').split('?')[0] as RouteName
  return supported.includes(candidate) ? candidate : 'dashboard'
}
