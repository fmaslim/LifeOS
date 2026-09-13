import { useState } from 'react'
import type { SettingsData, AppearanceMode, ApprovalBehavior } from '../models/settings'
import type { DashboardIcon } from '../models/dashboard'
import { EmptyState, ErrorState, LoadingState } from './PageState'
import './SettingsPage.css'

type PageState = 'ready' | 'loading' | 'empty' | 'error'
interface IconProps { name: DashboardIcon; size?: number }
interface SettingsPageProps { data: SettingsData; icon: (props: IconProps) => React.ReactNode; state?: PageState }

const appearanceOptions: { value: AppearanceMode; title: string; detail: string }[] = [
  { value: 'dark', title: 'Dark', detail: 'Easy on the eyes' }, { value: 'system', title: 'System', detail: 'Match your device' }, { value: 'light', title: 'Light', detail: 'Bright and focused' },
]
const approvalOptions: { value: ApprovalBehavior; label: string }[] = [
  { value: 'ask', label: 'Ask before important actions' }, { value: 'always', label: 'Run approved workflows automatically' }, { value: 'never', label: 'Keep every workflow manual' },
]

export function SettingsPage({ data, icon: Icon, state = 'ready' }: SettingsPageProps) {
  const [profile, setProfile] = useState(data.profile)
  const [appearance, setAppearance] = useState(data.appearance)
  const [notifications, setNotifications] = useState(data.notifications)
  const [automation, setAutomation] = useState(data.automationDefaults)
  const [saved, setSaved] = useState(false)
  const header = <section className="settings-hero"><div><p className="eyebrow">Workspace preferences</p><h1>Settings</h1><p className="subtitle">Shape a calmer, more personal LifeOS workspace.</p></div><span className="settings-local">Local preview only</span></section>
  if (state === 'loading') return <div className="dashboard settings-page">{header}<LoadingState title="Loading settings" description="Preparing your workspace preferences." /></div>
  if (state === 'error') return <div className="dashboard settings-page">{header}<ErrorState title="Unable to load settings" description="Your local preferences could not be prepared." action={{ label: 'Try again', onClick: () => window.location.reload() }} /></div>
  if (state === 'empty') return <div className="dashboard settings-page">{header}<EmptyState title="No preferences yet" description="Your local settings will appear here when they are ready." /></div>
  const updateNotification = (id: string) => setNotifications(items => items.map(item => item.id === id ? { ...item, enabled: !item.enabled } : item))
  return <div className="dashboard settings-page">{header}
    <div className="settings-layout"><div className="settings-main">
      <section className="settings-card"><div className="settings-card-heading"><div><p className="eyebrow">Identity</p><h2>Profile & workspace</h2></div><span className="profile-avatar">{profile.initials}</span></div><div className="settings-fields"><label>Display name<input value={profile.name} onChange={event => setProfile({ ...profile, name: event.target.value })} /></label><label>Workspace name<input value={profile.workspaceName} onChange={event => setProfile({ ...profile, workspaceName: event.target.value })} /></label><label>Email <span>Local placeholder</span><input value={profile.email} onChange={event => setProfile({ ...profile, email: event.target.value })} /></label><label>Timezone<select value={profile.timezone} onChange={event => setProfile({ ...profile, timezone: event.target.value })}><option>America/New_York</option><option>America/Chicago</option><option>America/Los_Angeles</option><option>UTC</option></select></label></div><div className="settings-actions"><span>{saved ? 'Saved locally for this session' : 'Changes stay in this browser session'}</span><button className="primary-button" onClick={() => setSaved(true)}>Save changes</button></div></section>
      <section className="settings-card"><div className="settings-card-heading"><div><p className="eyebrow">Appearance</p><h2>Make it yours</h2></div></div><div className="appearance-options">{appearanceOptions.map(option => <button key={option.value} className={`appearance-option ${appearance === option.value ? 'selected' : ''}`} onClick={() => setAppearance(option.value)}><span className={`theme-preview ${option.value}`}><i /><i /><i /></span><strong>{option.title}</strong><small>{option.detail}</small></button>)}</div></section>
      <section className="settings-card"><div className="settings-card-heading"><div><p className="eyebrow">Notifications</p><h2>Stay in the loop</h2><p>Choose the moments that deserve your attention.</p></div></div><div className="setting-list">{notifications.map(item => <div className="setting-row" key={item.id}><div><h3>{item.label}</h3><p>{item.description}</p></div><button className={`toggle ${item.enabled ? 'on' : ''}`} aria-label={`Toggle ${item.label}`} aria-pressed={item.enabled} onClick={() => updateNotification(item.id)}><span /></button></div>)}</div></section>
      <section className="settings-card"><div className="settings-card-heading"><div><p className="eyebrow">Automations</p><h2>Default behavior</h2><p>These preferences are local examples; no workflows run from this page.</p></div></div><div className="automation-defaults"><label>Preferred daily run time<select value={automation.runTime} onChange={event => setAutomation({ ...automation, runTime: event.target.value })}><option>6:00 AM</option><option>7:00 AM</option><option>8:00 AM</option><option>9:00 AM</option></select></label><fieldset><legend>Approval behavior</legend>{approvalOptions.map(option => <label className="radio-row" key={option.value}><input type="radio" name="approval" checked={automation.approvalBehavior === option.value} onChange={() => setAutomation({ ...automation, approvalBehavior: option.value })} />{option.label}</label>)}</fieldset><div className="setting-row compact"><div><h3>Weekly review reminder</h3><p>Reserve a small moment to reset your systems.</p></div><button className={`toggle ${automation.weeklyReview ? 'on' : ''}`} aria-label="Toggle weekly review reminder" aria-pressed={automation.weeklyReview} onClick={() => setAutomation({ ...automation, weeklyReview: !automation.weeklyReview })}><span /></button></div></div></section>
    </div><aside className="settings-side"><section className="settings-card integrations-card"><div className="settings-card-heading"><div><p className="eyebrow">Future integrations</p><h2>Connected when you are</h2><p>These are visual previews only. Nothing is linked.</p></div></div><div className="integration-list">{data.integrations.map(item => <article className="integration-row" key={item.id}><div className={`small-icon ${item.tone}`}><Icon name={item.icon} size={17} /></div><div><h3>{item.name}</h3><p>{item.description}</p><small>{item.detail}</small></div><button className="connect-button" disabled>Connect</button></article>)}</div></section><section className="settings-card privacy-card"><div className="settings-card-heading"><div><p className="eyebrow">Privacy & data</p><h2>You stay in control</h2></div></div><div className="privacy-list">{data.privacyItems.map(item => <article key={item.title}><div><h3>{item.title}</h3><p>{item.description}</p></div><button className="text-button" disabled>{item.action}</button></article>)}</div></section></aside></div>
  </div>
}
