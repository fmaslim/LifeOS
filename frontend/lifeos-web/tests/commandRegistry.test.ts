import assert from 'node:assert/strict'
import test from 'node:test'
import { createCommandRegistry, InMemoryCommandRegistry } from '../src/services/CommandRegistry.ts'

test('features can register typed commands without palette changes', () => {
  const registry = new InMemoryCommandRegistry()
  registry.register({ id: 'new-task', label: 'New task', category: 'Create', keywords: ['task'], target: { route: 'tasks', action: 'new' }, enabled: true })
  assert.equal(registry.list()[0].target.action, 'new')
  assert.throws(() => registry.register(registry.list()[0]), /already registered/)
})

test('default actions expose safe and unavailable approval states', () => {
  const registry = createCommandRegistry([{ label: 'Tasks', route: 'tasks', icon: 'check' }])
  assert.equal(registry.list().find(command => command.id === 'new-task')?.enabled, true)
  const external = registry.list().find(command => command.id === 'generate-content')
  assert.equal(external?.enabled, false)
  assert.equal(external?.requiresApproval, true)
  assert.match(external?.unavailableReason ?? '', /not configured/)
})
