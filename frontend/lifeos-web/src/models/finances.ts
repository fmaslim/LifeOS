export type FinanceTone = 'violet' | 'green' | 'amber' | 'rose' | 'blue' | 'teal'
export type FinanceIcon = 'wallet' | 'home' | 'chart' | 'refresh' | 'users' | 'files' | 'clock' | 'arrow'

export interface FinanceMetric { label: string; value: string; detail: string; change?: string; icon: FinanceIcon; tone: FinanceTone }
export interface PropertyIncome { id: string; property: string; unit: string; tenant: string; rent: string; due: string; status: 'Paid' | 'Due soon' | 'Pending'; occupancy: string }
export interface RecurringBill { id: string; name: string; category: string; due: string; amount: string; icon: FinanceIcon; tone: FinanceTone }
export interface DebtPayment { id: string; name: string; balance: string; payment: string; due: string; progress: number; tone: FinanceTone }
export interface CashFlowMonth { month: string; income: number; expenses: number }
export interface FinanceActivity { id: string; title: string; description: string; time: string; icon: FinanceIcon; tone: FinanceTone }
export interface FinancesData {
  periodLabel: string
  metrics: FinanceMetric[]
  properties: PropertyIncome[]
  recurringBills: RecurringBill[]
  debtPayments: DebtPayment[]
  cashFlow: CashFlowMonth[]
  activity: FinanceActivity[]
}
