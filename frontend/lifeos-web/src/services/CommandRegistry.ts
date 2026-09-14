import type { LifeOSCommand } from '../models/command.ts'
import type { ShellNavigationItem } from '../models/shell.ts'

export interface CommandRegistry { list(): readonly LifeOSCommand[]; register(command: LifeOSCommand): void }

export class InMemoryCommandRegistry implements CommandRegistry {
  private readonly commands = new Map<string, LifeOSCommand>()
  constructor(seed: LifeOSCommand[] = []) { seed.forEach(command => this.register(command)) }
  register(command: LifeOSCommand) { if (this.commands.has(command.id)) throw new Error(`Command already registered: ${command.id}`); this.commands.set(command.id, command) }
  list() { return [...this.commands.values()] }
}

export function createCommandRegistry(navigation: ShellNavigationItem[]) {
  const registry = new InMemoryCommandRegistry(navigation.map(item => ({ id: `open-${item.route}`, label: `Open ${item.label}`, category: 'Navigation', keywords: ['open', item.label.toLowerCase()], target: { route: item.route }, enabled: true })))
  registry.register({ id: 'new-task', label: 'New task', category: 'Create', keywords: ['todo', 'add', 'task'], target: { route: 'tasks', action: 'new' }, enabled: true })
  registry.register({ id: 'new-note', label: 'New note', category: 'Create', keywords: ['capture', 'write', 'note'], target: { route: 'notes', action: 'new' }, enabled: true })
  registry.register({ id: 'generate-content', label: 'Generate content', category: 'Content', keywords: ['short', 'long', 'youtube'], target: { route: 'content' }, enabled: false, unavailableReason: 'Content generator provider is not configured.', requiresApproval: true })
  registry.register({ id: 'build-automation', label: 'Build automation draft', category: 'Automation', keywords: ['workflow', 'schedule'], target: { route: 'automation-builder' }, enabled: true })
  registry.register({ id: 'connect-provider', label: 'Configure an integration', category: 'Integration', keywords: ['provider', 'connect'], target: { route: 'settings' }, enabled: false, unavailableReason: 'Integration setup is not available in this frontend preview.', requiresApproval: true })
  return registry
}
