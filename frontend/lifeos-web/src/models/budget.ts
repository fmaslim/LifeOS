export interface BudgetCategory{id:string;name:string;kind:'income'|'expense';planned:number;actual:number}export interface BudgetData{month:string;categories:BudgetCategory[]}
