// Импорт Supabase клиента для работы с базой данных
import { createClient } from '@supabase/supabase-js';

/**
 * Вспомогательная функция: получает предыдущий месяц и год
 * Используется для сравнения с текущим периодом при анализе трендов
 * @param {number} year - Год
 * @param {number} month - Месяц (1-12)
 * @returns {object} - Объект с годом и месяцем предыдущего периода
 */
function getPreviousMonth(year, month) {
  const date = new Date(year, month - 1, 1);
  date.setMonth(date.getMonth() - 1);
  return { year: date.getFullYear(), month: date.getMonth() + 1 };
}

/**
 * Проверяет наличие регулярного паттерна в датах транзакций
 * Определяет, происходят ли транзакции с регулярными интервалами
 * @param {Array} dates - Массив дат транзакций
 * @returns {boolean} - true если найден регулярный паттерн
 */
function hasRegularPattern(dates) {
  if (dates.length < 4) return false; // Нужно минимум 4 транзакции для анализа паттерна
  const sorted = dates.map(d => new Date(d)).sort((a, b) => a - b);
  const intervals = [];
  // Вычисляем интервалы между последовательными транзакциями
  for (let i = 1; i < sorted.length; i++) {
    intervals.push((sorted[i] - sorted[i - 1]) / (1000 * 60 * 60 * 24)); // Конвертируем в дни
  }
  const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length; // Средний интервал
  // Проверяем, что все интервалы близки к среднему (разница менее 3 дней)
  return intervals.every(i => Math.abs(i - avg) < 3);
}

/**
 * Определяет период суток для заданной даты
 * Используется для анализа временных паттернов трат
 * @param {string} dateString - Строка с датой
 * @returns {string} - Период суток: 'night', 'morning', 'afternoon', 'evening'
 */
function getTimePeriod(dateString) {
  const h = new Date(dateString).getHours();
  if (h < 6) return 'night';      // Ночь: 0-5 часов
  if (h < 12) return 'morning';   // Утро: 6-11 часов
  if (h < 18) return 'afternoon'; // День: 12-17 часов
  return 'evening';               // Вечер: 18-23 часа
}

/**
 * Получает день недели для заданной даты
 * @param {string} dateString - Строка с датой
 * @returns {number} - День недели (0-6, где 0 - воскресенье)
 */
function getWeekday(dateString) {
  return new Date(dateString).getDay(); // 0–6
}

/**
 * Подсчитывает количество уникальных недель в массиве дат
 * Используется для определения частоты транзакций
 * @param {Array} dates - Массив дат
 * @returns {number} - Количество уникальных недель
 */
function countWeeks(dates) {
  const weeks = new Set();
  dates.forEach(d => {
    const dt = new Date(d);
    // Создаем уникальный идентификатор недели
    const week = `${dt.getFullYear()}-${dt.getMonth()}-W${Math.floor(dt.getDate() / 7)}`;
    weeks.add(week);
  });
  return weeks.size;
}

/**
 * Генерирует название привычки на основе наиболее частого получателя платежей
 * @param {Array} transactions - Массив транзакций
 * @returns {Promise<string>} - Название привычки
 */
async function generateHabitName(transactions) {
  // Подсчитываем частоту каждого получателя
  const counts = transactions.reduce((a, t) => {
    a[t.payee] = (a[t.payee] || 0) + 1; return a;
  }, {});
  // Находим получателя с максимальной частотой
  const top = Object.entries(counts).sort(([,a],[,b]) => b - a)[0];
  return top ? `Привычка: ${top[0]}` : 'Неизвестная привычка';
}

/**
 * Основной обработчик API для анализа привычек
 * Анализирует транзакции пользователя и выявляет финансовые привычки
 * @param {object} req - Объект запроса
 * @param {object} res - Объект ответа
 */
export default async function handler(req, res) {
  
  // Получаем параметры месяца и года из запроса
  const { month, year } = req.query;
  if (!month || !year) return res.status(400).json({ error: 'Year and month are required' });

  // Создаем клиент Supabase для работы с базой данных
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

  // Определяем текущий период для анализа
  const start = `${year}-${month.padStart(2,'0')}-01`;
  const end   = `${year}-${month.padStart(2,'0')}-${new Date(year, month,0).getDate()}`;
  
  // Получаем транзакции текущего периода (только с эмбеддингами)
  const { data: current, error: e1 } = await supabase
    .from('transactions')
    .select('*')
    .gte('date', start)
    .lte('date', end)
    .not('description_embedding','is',null);
  if (e1) return res.status(500).json({ error: e1.message });

  // Получаем данные предыдущего периода для сравнения трендов
  const prev = getPreviousMonth(Number(year), Number(month));
  const pStart = `${prev.year}-${String(prev.month).padStart(2,'0')}-01`;
  const pEnd   = `${prev.year}-${String(prev.month).padStart(2,'0')}-${new Date(prev.year, prev.month,0).getDate()}`;
  const { data: previous } = await supabase
    .from('transactions')
    .select('*')
    .gte('date', pStart)
    .lte('date', pEnd)
    .not('description_embedding','is',null);

  // Получаем расписание работы пользователя для контекста
  const { data: workSchedule } = await supabase.from('user_work_schedule').select('*');

  // Выполняем анализ привычек с использованием эмбеддингов
  const habits = await analyzeHabitsWithEmbeddings(current, previous, supabase, workSchedule);
  res.status(200).json({ habits });
}

/**
 * Основная логика анализа привычек с использованием векторных эмбеддингов
 * Группирует похожие транзакции и анализирует их паттерны
 * @param {Array} current - Транзакции текущего периода
 * @param {Array} previous - Транзакции предыдущего периода
 * @param {object} supabase - Клиент Supabase
 * @param {Array} workSchedule - Расписание работы пользователя
 * @returns {Promise<Array>} - Массив выявленных привычек
 */
async function analyzeHabitsWithEmbeddings(current, previous, supabase, workSchedule) {
  const habits = {};
  const seen = new Set(); // Для отслеживания уже обработанных транзакций

  for (const tx of current) {
    if (seen.has(tx.id)) continue; // Пропускаем уже обработанные транзакции
    
    // Ищем похожие транзакции с помощью векторного поиска
    const { data: similar } = await supabase.rpc('match_transactions', {
      query_embedding: tx.description_embedding,
      match_threshold: 0.85,
      match_count: 10
    });
    if (similar.length < 4) continue; // Если найдено меньше 4 похожих, пропускаем
    const group = similar.filter(t => !seen.has(t.id)); // Отфильтровываем уже обработанные
    const dates = group.map(t => t.date);
    if (!hasRegularPattern(dates)) continue; // Проверяем регулярность паттерна
    if (countWeeks(dates) < 3) continue; // Проверяем регулярность недель

    const name = await generateHabitName(group);
    const sum   = group.reduce((a,t) => a + t.outcome, 0);

    // Тренд
    const prevGroup = previous.filter(t => t.payee === group[0].payee);
    const prevSum   = prevGroup.reduce((a,t) => a + t.outcome, 0);
    const trendVal  = (sum - prevSum).toFixed(2);

    habits[name] = {
      name,
      count: group.length,
      totalSpent: sum.toFixed(2),
      avgSpent: (sum / group.length).toFixed(2),
      category: group[0].category_name,
      transactions: group.map(t => ({ date: t.date, amount: t.outcome })),
      trend: parseFloat(trendVal),
      mostActivePeriod: null,
      mostCommonWeekday: null,
      dayType: null
    };

    // Время суток
    const periods = {};
    group.forEach(t => {
      const p = getTimePeriod(t.date);
      periods[p] = (periods[p] || 0) + 1;
    });
    habits[name].mostActivePeriod = Object.entries(periods).sort((a,b) => b[1]-a[1])[0][0];

    // День недели
    const weekdays = {};
    group.forEach(t => {
      const d = getWeekday(t.date);
      weekdays[d] = (weekdays[d] || 0) + 1;
    });
    habits[name].mostCommonWeekday = Number(Object.entries(weekdays).sort((a,b) => b[1]-a[1])[0][0]);

    // Тип дня
    const dt = group[0].date;
    const wd = new Date(dt).getDay();
    habits[name].dayType = workSchedule.length
      ? ([1,2,3,4,5].includes(wd) ? 'workday' : 'weekend')
      : null;

    group.forEach(t => seen.add(t.id)); // Отмечаем транзакции как обработанные
  }

  return habits;
}
