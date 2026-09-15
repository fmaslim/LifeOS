import type { RouteName } from './shell'

export type HealthState = 'healthy' | 'degraded' | 'unavailable' | 'stale'
export type HealthTarget = 'frontend' | 'backend' | 'auth' | 'persistence' | 'provider'
export interface ProductionHealthCheck { id: string; target: HealthTarget; label: string; state: HealthState; checkedAt: string; revision?: string; buildId?: string; message: string; route?: RouteName }
export interface ProductionHealthSnapshot { state: HealthState; checkedAt: string; lastSuccessfulAt?: string; checks: ProductionHealthCheck[] }
export interface ProductionHealthProbe { id: string; target: HealthTarget; label: string; route?: RouteName; run(): Promise<Omit<ProductionHealthCheck, 'id' | 'target' | 'label' | 'route' | 'checkedAt'>> }
