import { useMemo, useState } from 'react'
import type { NextActionKind, NextActionRecommendation, RecommendationPriority } from '../models/nextAction'
import type { ApprovalService } from '../services/ApprovalService'
import type { AcceptOverrides, NextActionService } from '../services/NextActionService'
import { StatePanel } from './StatePanel'
import './WorkspaceCollection.css'
import './NextActionsPage.css'

interface NextActionsPageProps { service: NextActionService; approvals: ApprovalService }

const kindLabel: Record<NextActionKind, string> = {
  task: 'Task', 'project-next-action': 'Project', 'blocked-project': 'Blocked project', 'goal-next-action': 'Goal',
  calendar: 'Calendar', routine: 'Routine', kpi: 'KPI', 'weekly-review': 'Weekly Review', 'system-signal': 'System signal',
}
const priorityLabel: Record<RecommendationPriority, string> = { critical: 'Critical', high: 'High', medium: 'Medium', low: 'Low' }

/** Mirrors PlanningPage's approvalStateFor: locates the approval this recommendation's accept action would create/has created, so the UI can show pending/approved/applied instead of a second Accept button. */
function effectCorrelation(recommendation: NextActionRecommendation): string | undefined {
  if (recommendation.effect.type === 'bump-task-priority') return `next-action-priority:${recommendation.effect.taskId}`
  if (recommendation.effect.type === 'create-task') return `next-action-task:${recommendation.id}`
  if (recommendation.effect.type === 'weekly-review-priority') return `${recommendation.effect.reviewId}:${recommendation.effect.priorityId}`
  return undefined
}

function RecommendationCard({ recommendation, approvalState, onAccept, onDefer, onDismiss }: {
  recommendation: NextActionRecommendation
  approvalState: string | undefined
  onAccept: (overrides: AcceptOverrides) => void
  onDefer: () => void
  onDismiss: () => void
}) {
  const editable = recommendation.effect.type === 'create-task' || recommendation.effect.type === 'weekly-review-priority'
  const [title, setTitle] = useState(recommendation.title)
  const [editing, setEditing] = useState(false)
  const canAccept = recommendation.effect.type !== 'navigate'

  return <article className={`panel next-action-card next-action-${recommendation.priority}`}>
    <header>
      <div><span className="workspace-pill">{kindLabel[recommendation.kind]}</span><h3>{recommendation.title}</h3></div>
      <span className={`next-action-priority-flag next-action-priority-${recommendation.priority}`}>{priorityLabel[recommendation.priority]}</span>
    </header>
    <p className="next-action-reason">{recommendation.reason}</p>
    <dl className="next-action-evidence">{recommendation.evidence.map(item => <div key={item.label}><dt>{item.label}</dt><dd>{item.detail}</dd></div>)}</dl>
    {editing && editable && <label className="next-action-edit">Edit title before accepting<input value={title} onChange={event => setTitle(event.target.value)} aria-label={`Edit title for ${recommendation.title}`} /></label>}
    <div className="next-action-actions">
      <a className="text-button" href={`#/${recommendation.route}`}>Open {kindLabel[recommendation.kind]} →</a>
      {canAccept && !approvalState && <>
        {editable && !editing && <button className="text-button" onClick={() => setEditing(true)}>Edit</button>}
        <button className="primary-button" onClick={() => onAccept(editable ? { title } : {})}>Accept</button>
      </>}
      {approvalState === 'pending' && <a className="primary-button" href="#/approvals">Awaiting approval →</a>}
      {(approvalState === 'approved' || approvalState === 'executed') && <span className="planning-flag">{approvalState === 'executed' ? 'Applied' : 'Approved'}</span>}
      <button className="text-button" onClick={onDefer}>Defer</button>
      <button className="text-button" onClick={onDismiss}>Dismiss</button>
    </div>
  </article>
}

export function NextActionsPage({ service, approvals }: NextActionsPageProps) {
  const [version, setVersion] = useState(0)
  const refresh = () => setVersion(value => value + 1)
  const overview = useMemo(() => service.getOverview(), [service, version])
  const pendingApprovals = useMemo(() => approvals.list(), [approvals, version])

  const approvalStateFor = (recommendation: NextActionRecommendation) => {
    const correlationId = effectCorrelation(recommendation)
    if (!correlationId) return undefined
    return pendingApprovals.find(item => item.correlationId === correlationId && item.state !== 'rejected' && item.state !== 'expired')?.state
  }

  const criticalCount = overview.recommendations.filter(recommendation => recommendation.priority === 'critical').length

  return <div className="dashboard next-actions-page">
    <section className="workspace-hero">
      <div><p className="eyebrow">Context-aware suggestions</p><h1>Next Actions</h1><p className="subtitle">The most useful next steps across tasks, goals, projects, calendar, routines, and KPIs - ranked, explained, and never applied without your say-so.</p></div>
    </section>

    <section className="next-actions-summary" aria-label="Next actions summary">
      <article><span>{overview.recommendations.length}</span><p>recommended actions</p></article>
      <article><span>{criticalCount}</span><p>critical</p></article>
      <article><span>{overview.suppressedCount}</span><p>deferred or dismissed</p></article>
    </section>

    {overview.warnings.length > 0 && <section className="next-actions-warnings" role="status">{overview.warnings.map(warning => <p key={warning}>{warning}</p>)}</section>}

    {overview.recommendations.length ? <section className="next-action-list" aria-label="Recommendations">
      {overview.recommendations.map(recommendation => <RecommendationCard
        key={recommendation.id}
        recommendation={recommendation}
        approvalState={approvalStateFor(recommendation)}
        onAccept={overrides => { service.accept(recommendation.id, overrides); refresh() }}
        onDefer={() => { service.defer(recommendation.id); refresh() }}
        onDismiss={() => { service.dismiss(recommendation.id); refresh() }}
      />)}
    </section> : <StatePanel kind="empty" title="Nothing needs your attention right now" description="LifeOS will surface a recommendation here as soon as a task, goal, project, event, routine, or KPI needs a decision." />}
  </div>
}
