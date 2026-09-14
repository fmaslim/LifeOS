import { Component, type ErrorInfo, type ReactNode } from 'react'
import { createSafeErrorReport, type SafeErrorReport } from '../errors/errorDiagnostics'
import './AppErrorBoundary.css'

interface Props { children: ReactNode }
interface State { report?: SafeErrorReport }

export class AppErrorBoundary extends Component<Props, State> {
  state: State = {}
  static getDerivedStateFromError(error: unknown): State { return { report: createSafeErrorReport(error) } }
  componentDidCatch(error: unknown, info: ErrorInfo) {
    const report = createSafeErrorReport(error, info.componentStack ?? '')
    this.setState({ report })
    if (import.meta.env.DEV) console.error('LifeOS UI recovery', report)
  }
  retry = () => this.setState({ report: undefined })
  dashboard = () => { window.location.hash = '#/dashboard'; this.retry() }
  render() {
    if (!this.state.report) return this.props.children
    return <main className="error-boundary"><section className="error-boundary-card" role="alert"><span className="error-boundary-mark" aria-hidden="true">!</span><p className="eyebrow">Workspace recovery</p><h1>LifeOS hit an unexpected problem</h1><p>Your local data is still in this browser. Retry the view, return to the dashboard, or reload the app shell.</p><div className="error-boundary-actions"><button className="primary-button" onClick={this.retry}>Try again</button><button onClick={this.dashboard}>Return to dashboard</button><button onClick={() => window.location.reload()}>Reload LifeOS</button></div>{import.meta.env.DEV && <details><summary>Development diagnostics</summary><code>{this.state.report.id} · {this.state.report.name}</code>{this.state.report.componentStack && <pre>{this.state.report.componentStack}</pre>}</details>}</section></main>
  }
}
