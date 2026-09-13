import type { FinancesData } from '../models/finances'

// Centralized frontend-only finance data. This can be replaced by an API adapter without changing the view.
export const financesMockData: FinancesData = {
  periodLabel: 'September 2026',
  metrics: [
    { label: 'Monthly rental income', value: '$8,420', detail: '3 properties · 100% occupied', change: '+$320 vs. August', icon: 'home', tone: 'green' },
    { label: 'Recurring expenses', value: '$2,186', detail: '9 bills this month', change: '$614 remaining', icon: 'refresh', tone: 'rose' },
    { label: 'Mortgage balance', value: '$384,260', detail: 'Across 3 properties', change: '61% paid down', icon: 'home', tone: 'blue' },
    { label: 'Debt & financing', value: '$1,140', detail: 'Monthly payments', change: 'Next due Sep 18', icon: 'wallet', tone: 'amber' },
    { label: 'Cash flow', value: '+$4,708', detail: 'After recurring costs', change: '+12.6% this month', icon: 'chart', tone: 'teal' },
    { label: 'Savings & investments', value: '$96,840', detail: 'Cash, brokerage & retirement', change: '+$1,260 this month', icon: 'files', tone: 'violet' },
  ],
  properties: [
    { id: 'maple', property: 'Maple Street Duplex', unit: 'Unit A', tenant: 'Maya Chen', rent: '$2,640', due: 'Paid Sep 1', status: 'Paid', occupancy: 'Lease through May 2027' },
    { id: 'harbor', property: 'Harbor View Condo', unit: 'Unit 302', tenant: 'Noah Williams', rent: '$2,780', due: 'Paid Sep 1', status: 'Paid', occupancy: 'Lease through Jan 2027' },
    { id: 'cedar', property: 'Cedar Lane Townhome', unit: 'Entire home', tenant: 'Olivia Martin', rent: '$3,000', due: 'Due Sep 15', status: 'Due soon', occupancy: 'Lease through Aug 2027' },
  ],
  recurringBills: [
    { id: 'insurance', name: 'Property insurance', category: 'Insurance', due: 'Sep 14', amount: '$286', icon: 'home', tone: 'blue' },
    { id: 'utilities', name: 'Water & utilities', category: 'Properties', due: 'Sep 16', amount: '$174', icon: 'refresh', tone: 'teal' },
    { id: 'internet', name: 'Internet & mobile', category: 'Personal', due: 'Sep 18', amount: '$148', icon: 'files', tone: 'violet' },
    { id: 'software', name: 'Software subscriptions', category: 'Business', due: 'Sep 22', amount: '$96', icon: 'chart', tone: 'amber' },
  ],
  debtPayments: [
    { id: 'maple-mortgage', name: 'Maple Street mortgage', balance: '$162,400 remaining', payment: '$1,086', due: 'Sep 18', progress: 58, tone: 'blue' },
    { id: 'harbor-mortgage', name: 'Harbor View mortgage', balance: '$121,860 remaining', payment: '$812', due: 'Sep 23', progress: 66, tone: 'teal' },
    { id: 'auto', name: 'Auto financing', balance: '$14,900 remaining', payment: '$328', due: 'Sep 26', progress: 41, tone: 'amber' },
  ],
  cashFlow: [
    { month: 'Apr', income: 7550, expenses: 3090 }, { month: 'May', income: 7850, expenses: 2960 }, { month: 'Jun', income: 8020, expenses: 3250 }, { month: 'Jul', income: 8110, expenses: 3000 }, { month: 'Aug', income: 8100, expenses: 3390 }, { month: 'Sep', income: 8420, expenses: 3712 },
  ],
  activity: [
    { id: 'rent', title: 'Rent received', description: 'Harbor View Condo · $2,780 deposited', time: 'Today, 9:14 AM', icon: 'home', tone: 'green' },
    { id: 'mortgage', title: 'Mortgage payment scheduled', description: 'Maple Street · $1,086 on Sep 18', time: 'Yesterday', icon: 'wallet', tone: 'blue' },
    { id: 'transfer', title: 'Investment transfer complete', description: '$500 moved to brokerage account', time: 'Sep 10', icon: 'chart', tone: 'violet' },
  ],
}
