import { useEffect, useState } from 'react'
import './PwaUpdatePrompt.css'

export function PwaUpdatePrompt() {
  const [waiting, setWaiting] = useState<ServiceWorker>()
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    let reloading = false
    const refresh = () => { if (!reloading) { reloading = true; window.location.reload() } }
    navigator.serviceWorker.addEventListener('controllerchange', refresh)
    navigator.serviceWorker.register('/sw.js').then(registration => {
      if (registration.waiting) setWaiting(registration.waiting)
      registration.addEventListener('updatefound', () => {
        const worker = registration.installing
        worker?.addEventListener('statechange', () => { if (worker.state === 'installed' && navigator.serviceWorker.controller) setWaiting(worker) })
      })
    }).catch(() => { /* The online app remains fully usable when registration is unavailable. */ })
    return () => navigator.serviceWorker.removeEventListener('controllerchange', refresh)
  }, [])
  if (!waiting) return null
  return <aside className="pwa-update" role="status"><div><strong>LifeOS update ready</strong><span>Refresh when you are ready.</span></div><button onClick={() => waiting.postMessage({ type: 'SKIP_WAITING' })}>Update</button><button className="pwa-dismiss" aria-label="Dismiss update" onClick={() => setWaiting(undefined)}>×</button></aside>
}
