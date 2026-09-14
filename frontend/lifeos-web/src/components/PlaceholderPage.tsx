import type { PlaceholderPageData } from '../models/shell'
import { getActiveServiceRegistry } from '../services/serviceRegistry'
import { EmptyState } from './PageState'
import { WeeklyReviewPage } from './WeeklyReviewPage'

interface PlaceholderPageProps { page: PlaceholderPageData; icon: React.ReactNode }

/** Shared presentation for shell destinations awaiting their feature implementation, plus lazily hosted feature routes. */
export function PlaceholderPage({ page, icon }: PlaceholderPageProps) {
  if (page.route === 'weekly-review') return <WeeklyReviewPage service={getActiveServiceRegistry().weeklyReview} />
  return <div className="dashboard placeholder-page"><p className="eyebrow">{page.eyebrow}</p><div className="placeholder-hero"><div className="placeholder-icon">{icon}</div><div><h1>{page.title}</h1><p className="subtitle">{page.description}</p></div></div><EmptyState title={page.status} description={`There is nothing to review in ${page.title} yet. This frontend-only workspace is ready for your first item.`}>{icon}</EmptyState></div>
}
