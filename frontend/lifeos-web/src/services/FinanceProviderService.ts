import { financesMockData } from '../data/financesMockData'
import type { FinancesData, FinanceMetric, RecurringBill, DebtPayment, CashFlowMonth, FinanceActivity } from '../models/finances'
import { localStore } from '../storage/LocalStore'

export type FinanceProviderStatus = 'connected' | 'disconnected' | 'unauthorized' | 'rate-limited' | 'stale' | 'unavailable'
interface Account { id: string; name: string; type: string; balance: number; currency?: string }
interface Bill { id: string; name: string; category: string; dueDate: string; amount: number }
interface Spending { category: string; amount: number; periodStart: string; periodEnd: string }
interface CashFlow { month: string; income: number; expenses: number }
interface Debt { id: string; name: string; balance: number; minimumPayment?: number | null; dueDate?: string | null }
interface Investment { id: string; name: string; value: number; assetClass?: string | null }
export interface FinanceSignal { id: string; title: string; detail: string; severity: string; timestamp: string }
interface Snapshot { status: Exclude<FinanceProviderStatus, 'stale'>; checkedAt: string; accounts: Account[]; recurringBills: Bill[]; spending: Spending[]; cashFlow: CashFlow[]; debts: Debt[]; investments: Investment[]; signals: FinanceSignal[]; message?: string | null }
export interface FinanceProviderCache { status: FinanceProviderStatus; checkedAt?: string; data: FinancesData; signals: FinanceSignal[]; message?: string }

const CACHE_KEY = 'finance-provider-cache'
const apiBase = (import.meta.env.VITE_LIFEOS_API_BASE_URL ?? '').replace(/\/$/, '')
const money = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)

export function mapFinanceSnapshot(snapshot: Snapshot): FinanceProviderCache {
  const age = Date.now() - new Date(snapshot.checkedAt).getTime()
  const status: FinanceProviderStatus = snapshot.status === 'connected' && age > 15 * 60_000 ? 'stale' : snapshot.status
  const liquid = snapshot.accounts.reduce((sum, account) => sum + account.balance, 0)
  const investments = snapshot.investments.reduce((sum, investment) => sum + investment.value, 0)
  const spending = snapshot.spending.reduce((sum, item) => sum + item.amount, 0)
  const debt = snapshot.debts.reduce((sum, item) => sum + item.balance, 0)
  const metrics: FinanceMetric[] = [
    { label: 'Account balances', value: money(liquid), detail: `${snapshot.accounts.length} connected account${snapshot.accounts.length === 1 ? '' : 's'}`, icon: 'wallet', tone: 'green' },
    { label: 'Investments', value: money(investments), detail: `${snapshot.investments.length} investment snapshot${snapshot.investments.length === 1 ? '' : 's'}`, icon: 'chart', tone: 'violet' },
    { label: 'Categorized spending', value: money(spending), detail: `${snapshot.spending.length} spending categor${snapshot.spending.length === 1 ? 'y' : 'ies'}`, icon: 'files', tone: 'blue' },
    { label: 'Debt balance', value: money(debt), detail: `${snapshot.debts.length} tracked balance${snapshot.debts.length === 1 ? '' : 's'}`, icon: 'refresh', tone: 'amber' },
  ]
  const recurringBills: RecurringBill[] = snapshot.recurringBills.map(item => ({ id: item.id, name: item.name, category: item.category, due: item.dueDate, amount: money(item.amount), icon: 'clock', tone: 'blue' }))
  const debtPayments: DebtPayment[] = snapshot.debts.map(item => ({ id: item.id, name: item.name, balance: money(item.balance), payment: money(item.minimumPayment ?? 0), due: item.dueDate ?? '—', progress: 0, tone: 'amber' }))
  const cashFlow: CashFlowMonth[] = snapshot.cashFlow.map(item => ({ month: item.month, income: item.income, expenses: item.expenses }))
  const activity: FinanceActivity[] = snapshot.signals.slice(0, 8).map(item => ({ id: item.id, title: item.title, description: item.detail, time: new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', hour: 'numeric' }).format(new Date(item.timestamp)), icon: /debt|bill/i.test(item.title) ? 'clock' : 'wallet', tone: /critical|high|warning/i.test(item.severity) ? 'rose' : 'green' }))
  const data: FinancesData = { periodLabel: status === 'stale' ? 'Provider data is stale' : status === 'connected' ? 'Live read-only provider data' : snapshot.message ?? 'Finance provider unavailable', metrics, properties: financesMockData.properties, recurringBills, debtPayments, cashFlow, activity }
  return { status, checkedAt: snapshot.checkedAt, data, signals: snapshot.signals, message: snapshot.message ?? undefined }
}

export class FinanceProviderService {
  getCached(): FinanceProviderCache | null { return localStore.read<FinanceProviderCache | null>(CACHE_KEY, null) }
  async refresh(): Promise<FinanceProviderCache> {
    try {
      const response = await fetch(`${apiBase}/api/finance/summary`, { credentials: 'include', headers: { Accept: 'application/json' } })
      if (!response.ok) {
        const status: FinanceProviderStatus = response.status === 401 ? 'unauthorized' : 'unavailable'
        const fallback = { status, data: financesMockData, signals: [], message: 'Finance provider is unavailable.' } satisfies FinanceProviderCache
        localStore.write(CACHE_KEY, fallback); return fallback
      }
      const mapped = mapFinanceSnapshot(await response.json() as Snapshot)
      localStore.write(CACHE_KEY, mapped); return mapped
    } catch {
      const existing = this.getCached()
      if (existing) return { ...existing, status: 'stale', message: 'Using the last successful finance snapshot.' }
      return { status: 'unavailable', data: financesMockData, signals: [], message: 'Finance provider is unavailable.' }
    }
  }
}

export const financeProviderService = new FinanceProviderService()
