import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { mortgageService } from '../services/MortgageService'
import { draftFromMortgage, emptyMortgageDraft } from '../models/mortgage'
import type { Mortgage, MortgageDraft } from '../models/mortgage'
import { StatePanel } from './StatePanel'
import './MortgagesPanel.css'

type Phase = 'loading' | 'ready' | 'unauthorized' | 'unavailable'

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
const percent = (value: number) => `${value.toFixed(3).replace(/\.?0+$/, '')}%`

/**
 * Manual mortgage tracker: create/edit/delete/list against the protected
 * /api/finance/mortgages API. Deliberately keeps all draft state in memory only
 * (useState) - nothing here is written to localStorage/sessionStorage, so signing out
 * (which unmounts this component, see AuthGate) clears it with no extra code needed.
 */
export function MortgagesPanel() {
  const [phase, setPhase] = useState<Phase>('loading')
  const [mortgages, setMortgages] = useState<Mortgage[]>([])
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Mortgage | null>(null)
  const [draft, setDraft] = useState<MortgageDraft>(emptyMortgageDraft)
  const [formErrors, setFormErrors] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [confirmation, setConfirmation] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    mortgageService.list().then(result => {
      if (!active) return
      if (result.status === 'ok') { setMortgages(result.mortgages); setPhase('ready') }
      else setPhase(result.status)
    })
    return () => { active = false }
  }, [])

  function openCreate() { setEditing(null); setDraft(emptyMortgageDraft); setFormErrors([]); setFormOpen(true) }
  function openEdit(mortgage: Mortgage) { setEditing(mortgage); setDraft(draftFromMortgage(mortgage)); setFormErrors([]); setFormOpen(true) }
  function closeForm() { setFormOpen(false); setEditing(null); setFormErrors([]) }
  function update<K extends keyof MortgageDraft>(key: K, value: MortgageDraft[K]) { setDraft(current => ({ ...current, [key]: value })) }

  function clientSideErrors(): string[] {
    const errors: string[] = []
    if (!draft.label.trim()) errors.push('Label is required.')
    if (draft.currentBalance === '' || Number(draft.currentBalance) < 0) errors.push('Current balance must be zero or more.')
    if (draft.annualInterestRatePercent === '' || Number(draft.annualInterestRatePercent) < 0 || Number(draft.annualInterestRatePercent) > 100) errors.push('Annual interest rate must be between 0 and 100.')
    if (draft.monthlyPrincipalAndInterest === '' || Number(draft.monthlyPrincipalAndInterest) < 0) errors.push('Monthly principal and interest must be zero or more.')
    if (!draft.asOfDate) errors.push('As-of date is required.')
    return errors
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const clientErrors = clientSideErrors()
    if (clientErrors.length > 0) { setFormErrors(clientErrors); return }
    setSaving(true)
    setFormErrors([])
    const result = editing ? await mortgageService.update(editing.id, draft, editing.updatedAt) : await mortgageService.create(draft)
    setSaving(false)

    if (result.status === 'ok') {
      setMortgages(current => editing ? current.map(m => m.id === result.mortgage.id ? result.mortgage : m) : [...current, result.mortgage])
      setConfirmation(editing ? 'Mortgage updated.' : 'Mortgage added.')
      window.setTimeout(() => setConfirmation(null), 4000)
      closeForm()
      return
    }
    if (result.status === 'invalid') { setFormErrors(result.errors); return }
    if (result.status === 'conflict') { setFormErrors(['This mortgage changed elsewhere. Close the form and try again.']); return }
    if (result.status === 'notFound') { setFormErrors(['This mortgage no longer exists. Close the form and refresh the list.']); return }
    if (result.status === 'unauthorized') { setFormErrors(['Your session has expired. Sign in again to save changes.']); return }
    setFormErrors(['Mortgage tracking is temporarily unavailable. Try again later.'])
  }

  async function remove(mortgage: Mortgage) {
    if (!window.confirm(`Remove "${mortgage.label}"? This cannot be undone.`)) return
    setDeletingId(mortgage.id)
    const result = await mortgageService.remove(mortgage.id)
    setDeletingId(null)
    if (result.status === 'ok' || result.status === 'notFound') {
      setMortgages(current => current.filter(m => m.id !== mortgage.id))
      setConfirmation('Mortgage removed.')
      window.setTimeout(() => setConfirmation(null), 4000)
      return
    }
    setConfirmation(null)
    setPhase(result.status === 'unauthorized' ? 'unauthorized' : phase)
  }

  const heading = <div className="panel-heading"><div><p className="eyebrow">Manually entered</p><h2>Mortgages</h2></div>{phase === 'ready' && !formOpen && <button className="text-button" onClick={openCreate}>+ Add mortgage</button>}</div>

  if (phase === 'loading') return <section className="panel finance-panel mortgages-panel">{heading}<StatePanel kind="loading" title="Loading mortgages" description="Fetching your saved mortgages." /></section>
  if (phase === 'unauthorized') return <section className="panel finance-panel mortgages-panel">{heading}<StatePanel kind="error" title="Sign in again" description="Your session has expired. Sign in again to view mortgages." /></section>
  if (phase === 'unavailable') return <section className="panel finance-panel mortgages-panel">{heading}<StatePanel kind="empty" title="Mortgage tracking isn't set up yet" description="This workspace hasn't connected mortgage storage yet. Ask the workspace owner to finish setup." /></section>

  return (
    <section className="panel finance-panel mortgages-panel">
      {heading}
      {confirmation && <p className="mortgages-confirmation" role="status" aria-live="polite">{confirmation}</p>}
      {formOpen && (
        <form className="mortgage-form" onSubmit={submit} onKeyDown={event => { if (event.key === 'Escape') closeForm() }} aria-label={editing ? 'Edit mortgage' : 'Add mortgage'}>
          <div className="mortgage-form-head"><h3>{editing ? 'Edit mortgage' : 'Add mortgage'}</h3><button type="button" className="mortgage-close" onClick={closeForm} aria-label="Close mortgage form">×</button></div>
          {formErrors.length > 0 && <ul className="mortgage-form-errors" role="alert">{formErrors.map(error => <li key={error}>{error}</li>)}</ul>}
          <div className="mortgage-form-grid">
            <label className="mortgage-field">Label<input type="text" value={draft.label} onChange={e => update('label', e.target.value)} maxLength={200} required autoFocus /></label>
            <label className="mortgage-field">As-of date<input type="date" value={draft.asOfDate} onChange={e => update('asOfDate', e.target.value)} required /></label>
          </div>
          <div className="mortgage-form-grid">
            <label className="mortgage-field">Current balance (USD)<input type="number" inputMode="decimal" min={0} step="0.01" value={draft.currentBalance} onChange={e => update('currentBalance', e.target.value)} required /></label>
            <label className="mortgage-field">Annual interest rate (%)<input type="number" inputMode="decimal" min={0} max={100} step="0.001" value={draft.annualInterestRatePercent} onChange={e => update('annualInterestRatePercent', e.target.value)} required /></label>
          </div>
          <div className="mortgage-form-grid">
            <label className="mortgage-field">Monthly principal &amp; interest (USD)<input type="number" inputMode="decimal" min={0} step="0.01" value={draft.monthlyPrincipalAndInterest} onChange={e => update('monthlyPrincipalAndInterest', e.target.value)} required /></label>
          </div>
          <div className="mortgage-form-actions"><button type="button" className="mortgage-cancel" onClick={closeForm}>Cancel</button><button className="primary-button" disabled={saving}>{saving ? 'Saving…' : editing ? 'Save changes' : 'Add mortgage'}</button></div>
        </form>
      )}
      {mortgages.length === 0 && !formOpen ? (
        <StatePanel kind="empty" title="No mortgages yet" description="Add a mortgage to track its balance, rate, and payment here." />
      ) : (
        <div className="mortgage-list">
          {mortgages.map(mortgage => (
            <article className="mortgage-row" key={mortgage.id}>
              <div className="mortgage-row-copy">
                <h3>{mortgage.label}</h3>
                <p>{currency.format(mortgage.currentBalance)} balance · {percent(mortgage.annualInterestRatePercent)} · {currency.format(mortgage.monthlyPrincipalAndInterest)}/mo · as of {mortgage.asOfDate}</p>
              </div>
              <div className="mortgage-row-actions">
                <button className="text-button" onClick={() => openEdit(mortgage)} aria-label={`Edit ${mortgage.label}`}>Edit</button>
                <button className="text-button mortgage-delete" onClick={() => remove(mortgage)} disabled={deletingId === mortgage.id} aria-label={`Remove ${mortgage.label}`}>{deletingId === mortgage.id ? 'Removing…' : 'Remove'}</button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
