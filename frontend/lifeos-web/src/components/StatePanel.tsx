type StateKind = 'empty' | 'loading' | 'error'
interface StatePanelProps { kind: StateKind; title: string; description: string }
/** Shared empty, loading, and error presentation for data-driven workspace panels. */
export function StatePanel({ kind, title, description }: StatePanelProps) { return <div className={`state-panel ${kind}`} role={kind === 'error' ? 'alert' : 'status'}><span className="state-symbol" aria-hidden="true">{kind === 'loading' ? '…' : kind === 'error' ? '!' : '—'}</span><div><strong>{title}</strong><p>{description}</p></div></div> }
