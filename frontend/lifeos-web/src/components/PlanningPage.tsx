import { useMemo, useState } from 'react'
import type { GoalData } from '../models/goal'
import type { ProjectData } from '../models/project'
import type { ApprovalService } from '../services/ApprovalService'
import type { PlanningService } from '../services/PlanningService'
import { StatePanel } from './StatePanel'
import './WorkspaceCollection.css'
import './PlanningPage.css'

interface PlanningPageProps { service: PlanningService; approvals: ApprovalService; goals: GoalData; projects: ProjectData }

const suggestionCorrelation = (goalId: string, projectId: string) => `planning-link:${goalId}:${projectId}`

export function PlanningPage({ service, approvals, goals, projects }: PlanningPageProps) {
  const [version, setVersion] = useState(0)
  const refresh = () => setVersion(value => value + 1)

  const goalById = useMemo(() => new Map(goals.goals.map(goal => [goal.id, goal])), [goals])
  const projectById = useMemo(() => new Map(projects.projects.map(project => [project.id, project])), [projects])
  const overview = useMemo(() => service.getOverview(), [service, version])
  const links = useMemo(() => service.listLinks(), [service, version])
  const dependencies = useMemo(() => service.listDependencies(), [service, version])
  const pendingApprovals = useMemo(() => approvals.list(), [approvals, version])
  const projectStatusById = useMemo(() => new Map(overview.projectStatuses.map(status => [status.projectId, status])), [overview])

  const [linkGoalId, setLinkGoalId] = useState(goals.goals[0]?.id ?? '')
  const [linkProjectId, setLinkProjectId] = useState(projects.projects[0]?.id ?? '')
  const [depProjectId, setDepProjectId] = useState(projects.projects[0]?.id ?? '')
  const [depOnId, setDepOnId] = useState(projects.projects[1]?.id ?? projects.projects[0]?.id ?? '')
  const [depReason, setDepReason] = useState('')

  const nextActionLabel = (projectId: string) => {
    const action = projectStatusById.get(projectId)?.nextAction
    if (!action) return 'No deterministic next action available'
    if (action.source === 'task') return `Next: ${action.title}${action.dueDate ? ` (due ${action.dueDate})` : ''}`
    return `Next milestone: ${action.title}`
  }

  const approvalStateFor = (goalId: string, projectId: string) => pendingApprovals.find(item => item.correlationId === suggestionCorrelation(goalId, projectId) && item.state !== 'rejected' && item.state !== 'expired')?.state

  return <div className="dashboard planning-page">
    <section className="workspace-hero">
      <div><p className="eyebrow">Executable plans</p><h1>Planning</h1><p className="subtitle">Connect goals to real projects and see what's blocked, stale, or missing a next action.</p></div>
    </section>

    <section className="planning-summary" aria-label="Planning summary">
      <article><span>{links.length}</span><p>goal-project links</p></article>
      <article><span>{overview.blockedProjectIds.length}</span><p>blocked projects</p></article>
      <article><span>{overview.staleProjectIds.length}</span><p>stale projects</p></article>
      <article><span>{overview.goalsWithoutNextActionIds.length}</span><p>goals with no next action</p></article>
    </section>

    <section className="panel planning-critical-path">
      <div className="panel-heading"><div><p className="eyebrow">Sequencing</p><h2>Critical path</h2></div></div>
      {overview.criticalPath.length ? <ol className="critical-path-list">{overview.criticalPath.map((step, index) => <li key={step.projectId}>{index > 0 && <span className="critical-path-arrow" aria-hidden="true">→</span>}<div><strong>{step.title}</strong><span>{step.targetDate || 'No target date'}</span></div></li>)}</ol> : <StatePanel kind="empty" title="No dependency chain yet" description="Add a project dependency below to see the longest chain of blocking work." />}
    </section>

    <section className="panel planning-goals">
      <div className="panel-heading"><div><p className="eyebrow">Goals</p><h2>Goals & linked projects</h2></div></div>
      <div className="planning-goal-list">
        {goals.goals.map(goal => {
          const goalStatus = overview.goalStatuses.find(status => status.goalId === goal.id)
          const linkedForGoal = links.filter(link => link.goalId === goal.id)
          return <article className={`planning-goal-card ${goalStatus?.hasActiveNextAction ? '' : 'no-next-action'}`} key={goal.id}>
            <header><div><span className="workspace-pill">{goal.area}</span><h3>{goal.title}</h3></div>{goal.status === 'active' && !goalStatus?.hasActiveNextAction && <span className="planning-flag">No active next action</span>}</header>
            {linkedForGoal.length ? <ul className="planning-link-list">{linkedForGoal.map(link => { const project = projectById.get(link.projectId); const status = projectStatusById.get(link.projectId); return <li key={link.id}>
              <div><strong>{project?.title ?? link.projectId}</strong><span>{nextActionLabel(link.projectId)}</span>{status?.blockedReasons.map(reason => <span className="planning-blocked-reason" key={reason}>{reason}</span>)}{status?.stale && status.staleReasons.map(reason => <span className="planning-stale-reason" key={reason}>{reason}</span>)}</div>
              <button className="text-button" onClick={() => { service.unlinkGoalFromProject(link.id); refresh() }}>Unlink</button>
            </li> })}</ul> : <p className="planning-empty-note">No projects linked to this goal yet.</p>}
          </article>
        })}
      </div>
      <form className="planning-link-form" onSubmit={event => { event.preventDefault(); if (linkGoalId && linkProjectId) { service.linkGoalToProject(linkGoalId, linkProjectId); refresh() } }}>
        <p className="eyebrow">Link a project to a goal</p>
        <div className="planning-link-form-row">
          <label>Goal<select aria-label="Goal to link" value={linkGoalId} onChange={event => setLinkGoalId(event.target.value)}>{goals.goals.map(goal => <option key={goal.id} value={goal.id}>{goal.title}</option>)}</select></label>
          <label>Project<select aria-label="Project to link" value={linkProjectId} onChange={event => setLinkProjectId(event.target.value)}>{projects.projects.map(project => <option key={project.id} value={project.id}>{project.title}</option>)}</select></label>
          <button className="primary-button" type="submit">Link</button>
        </div>
      </form>
    </section>

    <section className="panel planning-blocked">
      <div className="panel-heading"><div><p className="eyebrow">Execution risk</p><h2>Blocked & stalled work</h2></div></div>
      {overview.blockedProjectIds.length || overview.staleProjectIds.length ? <div className="planning-risk-list">
        {overview.projectStatuses.filter(status => status.blockedReasons.length || status.stale).map(status => <article className="planning-risk-card" key={status.projectId}>
          <header><strong>{projectById.get(status.projectId)?.title ?? status.projectId}</strong>{status.blockedReasons.length > 0 && <span className="planning-flag">Blocked</span>}{status.stale && <span className="planning-flag stale">Stale</span>}</header>
          <ul>{status.blockedReasons.map(reason => <li key={reason}>{reason}</li>)}{status.staleReasons.map(reason => <li key={reason}>{reason}</li>)}</ul>
        </article>)}
      </div> : <StatePanel kind="empty" title="Nothing is blocked or stale" description="Every active project has a clear dependency chain and a next action." />}
    </section>

    <section className="panel planning-suggestions">
      <div className="panel-heading"><div><p className="eyebrow">Suggested by area match</p><h2>Suggested links</h2></div><a href="#/approvals">Approval Inbox</a></div>
      {overview.suggestions.length ? <div className="planning-suggestion-list">{overview.suggestions.map(suggestion => {
        const state = approvalStateFor(suggestion.goalId, suggestion.projectId)
        return <article className="planning-suggestion-card" key={`${suggestion.goalId}:${suggestion.projectId}`}>
          <div><strong>{projectById.get(suggestion.projectId)?.title}</strong><span>→ {goalById.get(suggestion.goalId)?.title}</span><p>{suggestion.reason}</p></div>
          {!state && <button className="primary-button" onClick={() => { service.requestLinkSuggestion(suggestion.goalId, suggestion.projectId); refresh() }}>Request approval</button>}
          {state === 'pending' && <a className="primary-button" href="#/approvals">Awaiting approval →</a>}
          {(state === 'approved' || state === 'executed') && <span className="planning-flag">{state === 'executed' ? 'Linked' : 'Approved'}</span>}
        </article>
      })}</div> : <StatePanel kind="empty" title="No suggestions right now" description="LifeOS proposes a link when an unlinked project's domain matches an active goal's area." />}
    </section>

    <section className="panel planning-dependencies">
      <div className="panel-heading"><div><p className="eyebrow">Sequencing inputs</p><h2>Project dependencies</h2></div></div>
      {dependencies.length ? <ul className="planning-dependency-list">{dependencies.map(dependency => <li key={dependency.id}>
        <div><strong>{projectById.get(dependency.projectId)?.title ?? dependency.projectId}</strong><span> depends on </span><strong>{projectById.get(dependency.dependsOnProjectId)?.title ?? dependency.dependsOnProjectId}</strong><p>{dependency.reason}</p></div>
        <button className="text-button" onClick={() => { service.removeDependency(dependency.id); refresh() }}>Remove</button>
      </li>)}</ul> : <p className="planning-empty-note">No dependencies recorded yet.</p>}
      <form className="planning-link-form" onSubmit={event => { event.preventDefault(); if (depProjectId && depOnId && depProjectId !== depOnId) { service.addDependency(depProjectId, depOnId, depReason); setDepReason(''); refresh() } }}>
        <p className="eyebrow">Add a dependency</p>
        <div className="planning-link-form-row">
          <label>Project<select aria-label="Blocked project" value={depProjectId} onChange={event => setDepProjectId(event.target.value)}>{projects.projects.map(project => <option key={project.id} value={project.id}>{project.title}</option>)}</select></label>
          <label>Depends on<select aria-label="Depends on project" value={depOnId} onChange={event => setDepOnId(event.target.value)}>{projects.projects.map(project => <option key={project.id} value={project.id}>{project.title}</option>)}</select></label>
          <label>Reason<input value={depReason} onChange={event => setDepReason(event.target.value)} placeholder="Why is this blocking?" /></label>
          <button className="primary-button" type="submit" disabled={depProjectId === depOnId}>Add dependency</button>
        </div>
      </form>
    </section>
  </div>
}
