import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { PwaUpdatePrompt } from './components/PwaUpdatePrompt.tsx'
import { AppErrorBoundary } from './components/AppErrorBoundary.tsx'
import { AuthGate } from './components/AuthGate.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <a className="skip-link" href="#main-content">Skip to main content</a>
    <AppErrorBoundary>
      <AuthGate>
        <App />
        <PwaUpdatePrompt />
      </AuthGate>
    </AppErrorBoundary>
  </StrictMode>,
)
