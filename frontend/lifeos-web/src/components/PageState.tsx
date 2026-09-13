import type { ReactNode } from 'react'
import './PageState.css'

interface StateAction {
  label: string
  onClick: () => void
}

interface StateCardProps {
  title: string
  description: string
  action?: StateAction
  children?: ReactNode
}

/** A compact, reusable page-level loading indicator for asynchronous views. */
export function LoadingState({ title = 'Loading your workspace', description = 'Just a moment while we prepare everything.' }: Omit<StateCardProps, 'action' | 'children'>) {
  return <section className="page-state page-state-loading" aria-live="polite" aria-busy="true"><span className="state-spinner" aria-hidden="true" /><div><h2>{title}</h2><p>{description}</p></div></section>
}

/** A consistent recovery state for frontend requests or actions that cannot finish. */
export function ErrorState({ title = 'Something went wrong', description = 'We could not load this part of your workspace. Please try again.', action }: Omit<StateCardProps, 'children'>) {
  return <section className="page-state page-state-error" role="alert"><span className="state-symbol" aria-hidden="true">!</span><div><h2>{title}</h2><p>{description}</p>{action && <button className="state-action" onClick={action.onClick}>{action.label}</button>}</div></section>
}

/** A consistent, action-oriented state for workspaces with nothing to show yet. */
export function EmptyState({ title, description, action, children }: StateCardProps) {
  return <section className="page-state page-state-empty"><div className="state-symbol" aria-hidden="true">{children ?? '✦'}</div><div><h2>{title}</h2><p>{description}</p>{action && <button className="state-action" onClick={action.onClick}>{action.label}</button>}</div></section>
}
