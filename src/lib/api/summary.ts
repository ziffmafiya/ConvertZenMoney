/**
 * API функции для работы со сводными данными
 */

export interface MonthlySummary {
  netBalance: number
  totalIncome: number
  totalExpenses: number
  savings: number
  balanceChange: number
  incomeChange: number
  expensesChange: number
  savingsChange: number
  cashflowData: CashflowData[]
}

export interface CashflowData {
  date: string
  income: number
  expenses: number
  balance: number
}



/**
 * Получает сводные данные за месяц
 */
export async function getMonthlySummary(month: number, year: number): Promise<MonthlySummary> {
  try {
    const response = await fetch(`/api/get-monthly-summary?month=${month}&year=${year}`)
    
    if (!response.ok) {
      throw new Error('Failed to fetch monthly summary')
    }
    
    const data = await response.json()
    
    // Преобразуем данные в нужный формат
    return {
      netBalance: data.netBalance || 0,
      totalIncome: data.totalIncome || 0,
      totalExpenses: data.totalExpenses || 0,
      savings: data.savings || 0,
      balanceChange: data.balanceChange || 0,
      incomeChange: data.incomeChange || 0,
      expensesChange: data.expensesChange || 0,
      savingsChange: data.savingsChange || 0,
      cashflowData: generateMockCashflowData(),
    }
  } catch (error) {
    console.error('Error fetching monthly summary:', error)
    
    // Возвращаем мок данные в случае ошибки
    return {
      netBalance: 45000,
      totalIncome: 80000,
      totalExpenses: 35000,
      savings: 15000,
      balanceChange: 5000,
      incomeChange: 2000,
      expensesChange: -1000,
      savingsChange: 3000,
      cashflowData: generateMockCashflowData(),
    }
  }
}

/**
 * Генерирует мок данные для cashflow
 */
function generateMockCashflowData(): CashflowData[] {
  const data: CashflowData[] = []
  const today = new Date()
  
  for (let i = 29; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    
    data.push({
      date: date.toISOString().split('T')[0],
      income: Math.random() > 0.7 ? Math.floor(Math.random() * 5000) + 1000 : 0,
      expenses: Math.floor(Math.random() * 2000) + 500,
      balance: Math.floor(Math.random() * 10000) + 20000,
    })
  }
  
  return data
}


