import type { RouteName } from './shell.ts'

export type CommandCategory = 'Navigation' | 'Create' | 'Content' | 'Automation' | 'Integration'
export interface CommandTarget { route: RouteName; action?: string }
export interface LifeOSCommand {
  id: string
  label: string
  category: CommandCategory
  keywords: string[]
  target: CommandTarget
  enabled: boolean
  unavailableReason?: string
  requiresApproval?: boolean
}
