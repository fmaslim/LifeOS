import type { PlaceholderPageData } from '../models/shell'

interface PlaceholderPageProps { page: PlaceholderPageData; icon: React.ReactNode }

/** Shared presentation for shell destinations awaiting their feature implementation. */
export function PlaceholderPage({ page, icon }: PlaceholderPageProps) {
  return <div className="dashboard placeholder-page"><p className="eyebrow">{page.eyebrow}</p><div className="placeholder-hero"><div className="placeholder-icon">{icon}</div><div><h1>{page.title}</h1><p className="subtitle">{page.description}</p></div></div><section className="placeholder-panel"><span className="status-dot" />{page.status}<p>This frontend-only placeholder is ready to connect to a future service.</p></section></div>
}
