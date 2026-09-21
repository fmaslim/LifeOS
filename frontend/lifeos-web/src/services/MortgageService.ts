import type { Mortgage, MortgageDraft } from '../models/mortgage'

/**
 * Live, server-backed mortgage CRUD against /api/finance/mortgages. Deliberately has no
 * mock/local fallback: mortgage values are real financial data and must come from the
 * protected API or not be shown at all (see docs/finance-mortgage-firestore.md). Nothing
 * here reads or writes localStorage/sessionStorage - state lives only where the caller
 * (a React component) keeps it, so it clears automatically when the workspace unmounts
 * on sign-out.
 */
export type MortgageSaveResult =
  | { status: 'ok'; mortgage: Mortgage }
  | { status: 'invalid'; errors: string[] }
  | { status: 'conflict' }
  | { status: 'notFound' }
  | { status: 'unauthorized' }
  | { status: 'unavailable' }

export type MortgageDeleteResult = { status: 'ok' } | { status: 'notFound' } | { status: 'unauthorized' } | { status: 'unavailable' }
export type MortgageListResult = { status: 'ok'; mortgages: Mortgage[] } | { status: 'unauthorized' } | { status: 'unavailable' }

const apiBase = (import.meta.env.VITE_LIFEOS_API_BASE_URL ?? '').replace(/\/$/, '')

function toRequestBody(draft: MortgageDraft) {
  return {
    label: draft.label.trim(),
    currentBalance: Number(draft.currentBalance),
    annualInterestRatePercent: Number(draft.annualInterestRatePercent),
    monthlyPrincipalAndInterest: Number(draft.monthlyPrincipalAndInterest),
    asOfDate: draft.asOfDate,
  }
}

async function readErrors(response: Response): Promise<string[]> {
  try {
    const body = (await response.json()) as { errors?: string[] }
    return body.errors ?? ['This mortgage could not be saved.']
  } catch {
    return ['This mortgage could not be saved.']
  }
}

export class MortgageService {
  async list(): Promise<MortgageListResult> {
    try {
      const response = await fetch(`${apiBase}/api/finance/mortgages/`, { credentials: 'include', headers: { Accept: 'application/json' } })
      if (response.status === 401) return { status: 'unauthorized' }
      if (!response.ok) return { status: 'unavailable' }
      return { status: 'ok', mortgages: (await response.json()) as Mortgage[] }
    } catch {
      return { status: 'unavailable' }
    }
  }

  async create(draft: MortgageDraft): Promise<MortgageSaveResult> {
    try {
      const response = await fetch(`${apiBase}/api/finance/mortgages/`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-LifeOS-Client': 'web' },
        body: JSON.stringify(toRequestBody(draft)),
      })
      if (response.status === 401) return { status: 'unauthorized' }
      if (response.status === 503) return { status: 'unavailable' }
      if (response.status === 400) return { status: 'invalid', errors: await readErrors(response) }
      if (!response.ok) return { status: 'unavailable' }
      return { status: 'ok', mortgage: (await response.json()) as Mortgage }
    } catch {
      return { status: 'unavailable' }
    }
  }

  async update(id: string, draft: MortgageDraft, expectedUpdatedAt: string): Promise<MortgageSaveResult> {
    try {
      const response = await fetch(`${apiBase}/api/finance/mortgages/${encodeURIComponent(id)}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-LifeOS-Client': 'web' },
        body: JSON.stringify({ ...toRequestBody(draft), expectedUpdatedAt }),
      })
      if (response.status === 401) return { status: 'unauthorized' }
      if (response.status === 503) return { status: 'unavailable' }
      if (response.status === 400) return { status: 'invalid', errors: await readErrors(response) }
      if (response.status === 409) return { status: 'conflict' }
      if (response.status === 404) return { status: 'notFound' }
      if (!response.ok) return { status: 'unavailable' }
      return { status: 'ok', mortgage: (await response.json()) as Mortgage }
    } catch {
      return { status: 'unavailable' }
    }
  }

  async remove(id: string): Promise<MortgageDeleteResult> {
    try {
      const response = await fetch(`${apiBase}/api/finance/mortgages/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'X-LifeOS-Client': 'web' },
      })
      if (response.status === 401) return { status: 'unauthorized' }
      if (response.status === 503) return { status: 'unavailable' }
      if (response.status === 404) return { status: 'notFound' }
      if (!response.ok) return { status: 'unavailable' }
      return { status: 'ok' }
    } catch {
      return { status: 'unavailable' }
    }
  }
}

export const mortgageService = new MortgageService()
