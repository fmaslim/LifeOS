import { useRef, useState } from 'react'
import { createBackup, importBackup, parseBackup, serializeBackup, type BackupPreview } from '../services/LocalDataTransfer'
import { localStore } from '../storage/LocalStore'
import './DataTransferPanel.css'

export function DataTransferPanel() {
  const input = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<BackupPreview>()
  const [error, setError] = useState('')
  const exportData = () => {
    const blob = new Blob([serializeBackup(createBackup(localStore))], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url; link.download = `lifeos-backup-${new Date().toISOString().slice(0, 10)}.json`; link.click()
    URL.revokeObjectURL(url)
  }
  const inspect = async (file?: File) => {
    if (!file) return
    try { setPreview(parseBackup(await file.text())); setError('') } catch (reason) { setPreview(undefined); setError(reason instanceof Error ? reason.message : 'Unable to inspect this backup.') }
    if (input.current) input.current.value = ''
  }
  const apply = () => { if (!preview) return; importBackup(localStore, preview.backup); window.location.reload() }
  return <section className="settings-card transfer-card"><div className="settings-card-heading"><div><p className="eyebrow">Local backup</p><h2>Import & export</h2><p>Move user-created workspace data between browsers. Credentials and integration secrets are never included.</p></div></div><div className="transfer-actions"><button className="primary-button" onClick={exportData}>Export JSON</button><button className="connect-button transfer-import" onClick={() => input.current?.click()}>Choose backup</button><input ref={input} type="file" accept="application/json,.json" onChange={event => inspect(event.target.files?.[0])} /></div>{error && <p className="transfer-error" role="alert">{error}</p>}{preview && <div className="transfer-preview"><strong>Ready to import</strong><p>{Object.entries(preview.counts).map(([key, count]) => `${count} ${key}`).join(' · ')}</p><p>{preview.preferenceCount} dashboard preferences</p><span>Import replaces these local collections. Review the counts before continuing.</span><button className="primary-button" onClick={apply}>Import and reload</button></div>}</section>
}
