/// <reference types="vite/client" />

import type { CreateExpenseInput, UpdateExpenseInput, ExpenseRecord } from '../shared/types'

declare global {
  interface Window {
    electronAPI: {
      platform: string
      getAllExpenses: () => Promise<ExpenseRecord[]>
      addExpense: (input: CreateExpenseInput) => Promise<ExpenseRecord>
      updateExpense: (id: string, input: UpdateExpenseInput) => Promise<ExpenseRecord | null>
      deleteExpense: (id: string) => Promise<boolean>
      getMonthTotal: (year: number, month: number) => Promise<number>
      exportCsv: () => Promise<{ success: boolean; message: string }>
      importCsv: () => Promise<{ success: boolean; message: string; count?: number }>
      clearAll: () => Promise<number>
    }
  }
}

export {}
