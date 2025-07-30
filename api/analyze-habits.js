<<<<<<< HEAD
import { createClient } from '@supabase/supabase-js';

// Helper: получить предыдущий месяц и год
function getPreviousMonth(year, month) {
  const date = new Date(year, month - 1, 1);
  date.setMonth(date.getMonth() - 1);
  return { year: date.getFullYear(), month: date.getMonth() + 1 };
}

// Проверка регулярного паттерна
function hasRegularPattern(dates) {
  if (dates.length < 4) return false;
  const sorted = dates.map(d => new Date(d)).sort((a, b) => a - b);
  const intervals = [];
  for (let i = 1; i < sorted.length; i++) {
    intervals.push((sorted[i] - sorted[i - 1]) / (1000 * 60 * 60 * 24));
  }
  const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
  return intervals.every(i => Math.abs(i - avg) < 3);
}

// Периоды суток
function getTimePeriod(dateString) {
  const h = new Date(dateString).getHours();
  if (h < 6) return 'night';
  if (h < 12) return 'morning';
  if (h < 18) return 'afternoon';
  return 'evening';
}

// Дни недели
function getWeekday(dateString) {
  return new Date(dateString).getDay(); // 0–6
}

// Счетчик уникальных недель
function countWeeks(dates) {
  const weeks = new Set();
  dates.forEach(d => {
    const dt = new Date(d);
    const week = `${dt.getFullYear()}-${dt.getMonth()}-W${Math.floor(dt.getDate() / 7)}`;
    weeks.add(week);
  });
  return weeks.size;
}

// Генерация названия по наиболее частому получателю
async function generateHabitName(transactions) {
  const counts = transactions.reduce((a, t) => {
    a[t.payee] = (a[t.payee] || 0) + 1; return a;
  }, {});
  const top = Object.entries(counts).sort(([,a],[,b]) => b - a)[0];
  return top ? `Привычка: ${top[0]}` : 'Неизвестная привычка';
}

// API-handler
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method Not Allowed' });
  const { month, year } = req.query;
  if (!month || !year) return res.status(400).json({ error: 'Year and month are required' });

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

  // Текущий период
  const start = `${year}-${month.padStart(2,'0')}-01`;
  const end   = `${year}-${month.padStart(2,'0')}-${new Date(year, month,0).getDate()}`;
  const { data: current, error: e1 } = await supabase
    .from('transactions')
    .select('*')
    .gte('date', start)
    .lte('date', end)
    .not('description_embedding','is',null);
  if (e1) return res.status(500).json({ error: e1.message });

  // Предыдущий период для тренда
  const prev = getPreviousMonth(Number(year), Number(month));
  const pStart = `${prev.year}-${String(prev.month).padStart(2,'0')}-01`;
  const pEnd   = `${prev.year}-${String(prev.month).padStart(2,'0')}-${new Date(prev.year, prev.month,0).getDate()}`;
  const { data: previous } = await supabase
    .from('transactions')
    .select('*')
    .gte('date', pStart)
    .lte('date', pEnd)
    .not('description_embedding','is',null);

  // Расписание
  const { data: workSchedule } = await supabase.from('user_work_schedule').select('*');

  const habits = await analyzeHabitsWithEmbeddings(current, previous, supabase, workSchedule);
  res.status(200).json({ habits });
}

// Логика анализа
async function analyzeHabitsWithEmbeddings(current, previous, supabase, workSchedule) {
  const habits = {};
  const seen = new Set();

  for (const tx of current) {
    if (seen.has(tx.id)) continue;
    const { data: similar } = await supabase.rpc('match_transactions', {
      query_embedding: tx.description_embedding,
      match_threshold: 0.85,
      match_count: 10
    });
    if (similar.length < 4) continue;
    const group = similar.filter(t => !seen.has(t.id));
    const dates = group.map(t => t.date);
    if (!hasRegularPattern(dates)) continue;
    if (countWeeks(dates) < 3) continue;

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

    group.forEach(t => seen.add(t.id));
  }

  return habits;
}
=======
import { createClient } from '@supabase/supabase-js';

// Helper: получить предыдущий месяц и год
function getPreviousMonth(year, month) {
  const date = new Date(year, month - 1, 1);
  date.setMonth(date.getMonth() - 1);
  return { year: date.getFullYear(), month: date.getMonth() + 1 };
}

// Проверка регулярного паттерна
function hasRegularPattern(dates) {
  if (dates.length < 4) return false;
  const sorted = dates.map(d => new Date(d)).sort((a, b) => a - b);
  const intervals = [];
  for (let i = 1; i < sorted.length; i++) {
    intervals.push((sorted[i] - sorted[i - 1]) / (1000 * 60 * 60 * 24));
  }
  const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
  return intervals.every(i => Math.abs(i - avg) < 3);
}

// Периоды суток
function getTimePeriod(dateString) {
  const h = new Date(dateString).getHours();
  if (h < 6) return 'night';
  if (h < 12) return 'morning';
  if (h < 18) return 'afternoon';
  return 'evening';
}

// Дни недели
function getWeekday(dateString) {
  return new Date(dateString).getDay(); // 0–6
}

// Счетчик уникальных недель
function countWeeks(dates) {
  const weeks = new Set();
  dates.forEach(d => {
    const dt = new Date(d);
    const week = `${dt.getFullYear()}-${dt.getMonth()}-W${Math.floor(dt.getDate() / 7)}`;
    weeks.add(week);
  });
  return weeks.size;
}

// Генерация названия по наиболее частому получателю
async function generateHabitName(transactions) {
  const counts = transactions.reduce((a, t) => {
    a[t.payee] = (a[t.payee] || 0) + 1; return a;
  }, {});
  const top = Object.entries(counts).sort(([,a],[,b]) => b - a)[0];
  return top ? `Привычка: ${top[0]}` : 'Неизвестная привычка';
}

// API-handler
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method Not Allowed' });
  const { month, year } = req.query;
  if (!month || !year) return res.status(400).json({ error: 'Year and month are required' });

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

  // Текущий период
  const start = `${year}-${month.padStart(2,'0')}-01`;
  const end   = `${year}-${month.padStart(2,'0')}-${new Date(year, month,0).getDate()}`;
  const { data: current, error: e1 } = await supabase
    .from('transactions')
    .select('*')
    .gte('date', start)
    .lte('date', end)
    .not('description_embedding','is',null);
  if (e1) return res.status(500).json({ error: e1.message });

  // Предыдущий период для тренда
  const prev = getPreviousMonth(Number(year), Number(month));
  const pStart = `${prev.year}-${String(prev.month).padStart(2,'0')}-01`;
  const pEnd   = `${prev.year}-${String(prev.month).padStart(2,'0')}-${new Date(prev.year, prev.month,0).getDate()}`;
  const { data: previous } = await supabase
    .from('transactions')
    .select('*')
    .gte('date', pStart)
    .lte('date', pEnd)
    .not('description_embedding','is',null);

  // Расписание
  const { data: workSchedule } = await supabase.from('user_work_schedule').select('*');

  const habits = await analyzeHabitsWithEmbeddings(current, previous, supabase, workSchedule);
  res.status(200).json({ habits });
}

// Логика анализа
async function analyzeHabitsWithEmbeddings(current, previous, supabase, workSchedule) {
  const habits = {};
  const seen = new Set();

  for (const tx of current) {
    if (seen.has(tx.id)) continue;
    const { data: similar } = await supabase.rpc('match_transactions', {
      query_embedding: tx.description_embedding,
      match_threshold: 0.85,
      match_count: 10
    });
    if (similar.length < 4) continue;
    const group = similar.filter(t => !seen.has(t.id));
    const dates = group.map(t => t.date);
    if (!hasRegularPattern(dates)) continue;
    if (countWeeks(dates) < 3) continue;

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

    group.forEach(t => seen.add(t.id));
  }

  return habits;
}
>>>>>>> 8a095f2c87df41106baf87b1b22b0f0dde11e0c2
