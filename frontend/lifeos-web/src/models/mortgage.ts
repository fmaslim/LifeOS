export interface Mortgage {
  id: string
  label: string
  currentBalance: number
  annualInterestRatePercent: number
  monthlyPrincipalAndInterest: number
  asOfDate: string
  updatedAt: string
}

export interface MortgageDraft {
  label: string
  currentBalance: string
  annualInterestRatePercent: string
  monthlyPrincipalAndInterest: string
  asOfDate: string
}

export const emptyMortgageDraft: MortgageDraft = { label: '', currentBalance: '', annualInterestRatePercent: '', monthlyPrincipalAndInterest: '', asOfDate: '' }

export function draftFromMortgage(mortgage: Mortgage): MortgageDraft {
  return {
    label: mortgage.label,
    currentBalance: String(mortgage.currentBalance),
    annualInterestRatePercent: String(mortgage.annualInterestRatePercent),
    monthlyPrincipalAndInterest: String(mortgage.monthlyPrincipalAndInterest),
    asOfDate: mortgage.asOfDate,
  }
}
