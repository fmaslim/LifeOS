import type { ProviderCapability, ProviderSnapshot } from '../models/integrationProvider'
import './ProviderStatusPanel.css'

const capabilities: ProviderCapability[] = ['read', 'write', 'events', 'actions']
export function ProviderStatusPanel({ providers }: { providers: ProviderSnapshot[] }) {
  return <section className="settings-card provider-card"><div className="settings-card-heading"><div><p className="eyebrow">Integration framework</p><h2>Provider status</h2><p>Credential metadata only. Secret values stay behind the server-side provider boundary.</p></div></div><div className="provider-list">{providers.map(provider => <article key={provider.metadata.id}><div className="provider-heading"><div><strong>{provider.metadata.name}</strong><small>{provider.metadata.category}</small></div><span className={`provider-health ${provider.health}`}>{provider.connection.replace('-', ' ')}</span></div><p>{provider.metadata.description}</p><div className="provider-capabilities" aria-label={`${provider.metadata.name} capabilities`}>{capabilities.map(capability => <span className={provider.capabilities[capability] ? 'supported' : ''} key={capability}>{provider.capabilities[capability] ? '✓' : '—'} {capability}</span>)}</div><footer><span>{provider.message} · credential {provider.credential.state}</span><button disabled>Configure on server</button></footer></article>)}</div></section>
}
