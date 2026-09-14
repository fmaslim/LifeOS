import { lazy, StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { PwaUpdatePrompt } from './components/PwaUpdatePrompt.tsx'
import { AppErrorBoundary } from './components/AppErrorBoundary.tsx'

const AuthGate = lazy(() => import('./components/AuthGate.tsx').then(module => ({ default: module.AuthGate })))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <a className="skip-link" href="#main-content">Skip to main content</a>
    <AppErrorBoundary>
      <Suspense fallback={<main id="main-content" aria-busy="true" /> }>
        <AuthGate>
          <App />
          <PwaUpdatePrompt />
        </AuthGate>
      </Suspense>
    </AppErrorBoundary>
  </StrictMode>,
)
