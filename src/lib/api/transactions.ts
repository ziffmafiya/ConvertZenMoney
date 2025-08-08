/**
 * API функции для работы с транзакциями
 */

export interface Transaction {
  id: string
  description: string
  amount: number
  type: 'income' | 'expense'
  category: string
  date: string
  account: string
  location?: string
}

export interface GetTransactionsParams {
  limit?: number
  offset?: number
  category?: string
  type?: 'income' | 'expense'
  startDate?: string
  endDate?: string
  search?: string
}

/**
 * Получает список транзакций
 */
export async function getTransactions(params: GetTransactionsParams = {}): Promise<Transaction[]> {
  try {
    const searchParams = new URLSearchParams()
    
    if (params.limit) searchParams.append('limit', params.limit.toString())
    if (params.offset) searchParams.append('offset', params.offset.toString())
    if (params.category) searchParams.append('category', params.category)
    if (params.type) searchParams.append('type', params.type)
    if (params.startDate) searchParams.append('startDate', params.startDate)
    if (params.endDate) searchParams.append('endDate', params.endDate)
    if (params.search) searchParams.append('search', params.search)
    
    const response = await fetch(`/api/get-transactions?${searchParams.toString()}`)
    
    if (!response.ok) {
      throw new Error('Failed to fetch transactions')
    }
    
    const data = await response.json()
    
    // Преобразуем данные в нужный формат
    return data.transactions?.map((t: any) => ({
      id: t.id || t.transaction_id,
      description: t.description || t.narration,
      amount: parseFloat(t.amount) || 0,
      type: t.type || (parseFloat(t.amount) > 0 ? 'income' : 'expense'),
      category: t.category || 'Другое',
      date: t.date || t.transaction_date,
      account: t.account || 'Основной счет',
      location: t.location,
    })) || []
  } catch (error) {
    console.error('Error fetching transactions:', error)
    
    // Возвращаем мок данные в случае ошибки
    return generateMockTransactions(params.limit || 10)
  }
}

/**
 * Генерирует мок данные транзакций
 */
function generateMockTransactions(limit: number): Transaction[] {
  const categories = ['Продукты', 'Транспорт', 'Развлечения', 'Покупки', 'Жилье', 'Зарплата', 'Фриланс']
  const descriptions = [
    'Покупка в супермаркете',
    'Такси',
    'Кинотеатр',
    'Онлайн покупки',
    'Коммунальные услуги',
    'Зарплата',
    'Фриланс проект',
    'Ресторан',
    'Бензин',
    'Одежда',
  ]
  
  const transactions: Transaction[] = []
  const today = new Date()
  
  for (let i = 0; i < limit; i++) {
    const date = new Date(today)
    date.setDate(date.getDate() - Math.floor(Math.random() * 30))
    
    const isIncome = Math.random() > 0.7
    const amount = isIncome 
      ? Math.floor(Math.random() * 50000) + 10000
      : Math.floor(Math.random() * 2000) + 100
    
    transactions.push({
      id: `transaction-${i}`,
      description: descriptions[Math.floor(Math.random() * descriptions.length)],
      amount: isIncome ? amount : -amount,
      type: isIncome ? 'income' : 'expense',
      category: categories[Math.floor(Math.random() * categories.length)],
      date: date.toISOString().split('T')[0],
      account: 'Основной счет',
    })
  }
  
  return transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

/**
 * Загружает транзакции из файла
 */
export async function uploadTransactions(file: File): Promise<{ success: boolean; message: string }> {
  try {
    const formData = new FormData()
    formData.append('file', file)
    
    const response = await fetch('/api/upload-transactions', {
      method: 'POST',
      body: formData,
    })
    
    if (!response.ok) {
      throw new Error('Failed to upload transactions')
    }
    
    const data = await response.json()
    return { success: true, message: data.message || 'Транзакции успешно загружены' }
  } catch (error) {
    console.error('Error uploading transactions:', error)
    return { success: false, message: 'Ошибка при загрузке транзакций' }
  }
}

/**
 * Анализирует привычки трат
 */
export async function analyzeHabits(): Promise<any> {
  try {
    const response = await fetch('/api/analyze-habits')
    
    if (!response.ok) {
      throw new Error('Failed to analyze habits')
    }
    
    return await response.json()
  } catch (error) {
    console.error('Error analyzing habits:', error)
    return null
  }
}

/**
 * Получает глубокий анализ
 */
export async function getDeepAnalysis(): Promise<any> {
  try {
    const response = await fetch('/api/deep-analysis')
    
    if (!response.ok) {
      throw new Error('Failed to get deep analysis')
    }
    
    return await response.json()
  } catch (error) {
    console.error('Error getting deep analysis:', error)
    return null
  }
}
