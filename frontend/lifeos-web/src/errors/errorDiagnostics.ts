const sensitive = /(token|password|secret|api.?key|credential)=?[^\s&]*/gi

export interface SafeErrorReport { id: string; name: string; componentStack: string }

export function sanitizeDiagnostic(value: string) {
  return value.replace(/https?:\/\/\S+/g, '[url]').replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, '[email]').replace(sensitive, '[redacted]').slice(0, 800)
}

export function createSafeErrorReport(error: unknown, componentStack = ''): SafeErrorReport {
  const name = error instanceof Error ? sanitizeDiagnostic(error.name) : 'UnknownError'
  return { id: `ui-${Date.now().toString(36)}`, name: name || 'Error', componentStack: sanitizeDiagnostic(componentStack) }
}
