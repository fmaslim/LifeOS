import { useCallback, useEffect, useState } from 'react'
import type { BackupData, BackupIntegrityResult, RestorePreview } from '../models/backup'
import type { BackupService } from '../services/BackupService'
import './BackupRecoveryPage.css'

function totalRecords(counts: Record<string, number>) { return Object.values(counts).reduce((sum, value) => sum + value, 0) }

export function BackupRecoveryPage({ service }: { service: BackupService }) {
  const [data, setData] = useState<BackupData>()
  const [integrity, setIntegrity] = useState<Record<string, BackupIntegrityResult>>({})
  const [previews, setPreviews] = useState<Record<string, RestorePreview>>({})
  const [requested, setRequested] = useState<Record<string, boolean>>({})

  const refresh = useCallback(() => setData(service.checkStaleness()), [service])
  useEffect(refresh, [refresh])

  const runBackup = () => { service.runBackup(); refresh() }
  const verify = (id: string) => { const result = service.verifyIntegrity(id); if (result) setIntegrity(current => ({ ...current, [id]: result })); refresh() }
  const preview = (id: string) => { const result = service.previewRestore(id); if (result) setPreviews(current => ({ ...current, [id]: result })) }
  const restore = (id: string) => { const request = service.requestRestore(id); if (request) setRequested(current => ({ ...current, [id]: true })) }

  if (!data) return <div className="dashboard"><p>Loading backups…</p></div>

  return <div className="dashboard backups-page">
    <section className="welcome">
      <div>
        <p className="eyebrow">Disaster recovery</p>
        <h1>Backups</h1>
        <p className="subtitle">Scheduled snapshots of LifeOS's durable local data, with integrity checks and approval-gated restore.</p>
      </div>
      <button className="primary-button" onClick={runBackup}>Run backup now</button>
    </section>

    <section className={`backup-health ${data.health}`}>
      <strong>{data.health.replace('-', ' ')}</strong>
      {data.lastSuccessAt && <span>Last success {new Date(data.lastSuccessAt).toLocaleString()}</span>}
      {data.nextDueAt && <span>Next due {new Date(data.nextDueAt).toLocaleString()}</span>}
      <span>Retention: last {data.retention.maxSnapshots} snapshots, {data.retention.maxAgeDays} days</span>
    </section>

    {data.snapshots.length === 0 ? <p className="backups-empty">No backups yet. Run one to create the first restorable snapshot.</p> : <section className="backups-grid">
      {data.snapshots.map(snapshot => {
        const check = integrity[snapshot.id] ?? (snapshot.integrityCheckedAt ? { snapshotId: snapshot.id, checkedAt: snapshot.integrityCheckedAt, status: snapshot.integrity, issues: snapshot.integrityIssues } : undefined)
        const restorePreview = previews[snapshot.id]
        return <article className={`panel backup-card ${snapshot.status}`} key={snapshot.id}>
          <header><strong>{new Date(snapshot.createdAt).toLocaleString()}</strong><span className={snapshot.status}>{snapshot.status}</span></header>
          {snapshot.status === 'failed' ? <p className="backup-failure">{snapshot.failureReason}</p> : <>
            <dl>
              <div><dt>Records</dt><dd>{totalRecords(snapshot.counts)} across {Object.keys(snapshot.counts).length} collections, {snapshot.preferenceCount} preference(s)</dd></div>
              <div><dt>Size</dt><dd>{snapshot.sizeBytes.toLocaleString()} bytes</dd></div>
              <div><dt>Checksum</dt><dd>{snapshot.checksum}</dd></div>
              <div><dt>Integrity</dt><dd className={check?.status ?? snapshot.integrity}>{check?.status ?? snapshot.integrity}</dd></div>
            </dl>
            <div className="backup-actions">
              <button className="text-button" onClick={() => verify(snapshot.id)}>Verify integrity</button>
              <button className="text-button" onClick={() => preview(snapshot.id)}>Preview restore</button>
              {requested[snapshot.id] ? <a href="#/approvals">Approval requested · Open inbox</a> : <button className="danger-button" onClick={() => restore(snapshot.id)}>Request restore</button>}
            </div>
            {check?.issues && check.issues.length > 0 && <p className="backup-issues">{check.issues.join(' · ')}</p>}
            {restorePreview && <div className="restore-preview">
              <p>Restoring would change: {restorePreview.changedCollections.length ? restorePreview.changedCollections.join(', ') : 'nothing (identical to current data)'}.</p>
              {restorePreview.warnings.map(warning => <p className="backup-issues" key={warning}>{warning}</p>)}
            </div>}
          </>}
        </article>
      })}
    </section>}
  </div>
}
