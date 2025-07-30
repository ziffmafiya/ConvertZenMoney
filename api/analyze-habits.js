import { createClient } from '@supabase/supabase-js';
import Chart from 'chart.js/auto'; // Для визуализации на фронтенде

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

// API-handler для Next.js: возвращает JSON с привычками и метриками
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

  const habits = await analyzeHabitsWithEmbeddings(current, previous, workSchedule);
  res.status(200).json({ habits });
}

// Логика анализа
async function analyzeHabitsWithEmbeddings(current, previous, workSchedule) {
  const habits = {};
  const seen = new Set();

  for (const tx of current) {
    if (seen.has(tx.id)) continue;
    const { data: similar } = await supabase.rpc('match_transactions', {
      query_embedding: tx.description_embedding,
      match_threshold: 0.85,
      match_count: 10
    });
    if (!similar || similar.length < 4) continue;
    const group = similar.filter(t => !seen.has(t.id));
    const dates = group.map(t => t.date);
    if (!hasRegularPattern(dates) || countWeeks(dates) < 3) continue;

    const name = await generateHabitName(group);
    const sum   = group.reduce((a,t) => a + t.outcome, 0);
    const prevGroup = previous.filter(t => t.payee === group[0].payee);
    const prevSum   = prevGroup.reduce((a,t) => a + t.outcome, 0);
    const trendVal  = (sum - prevSum).toFixed(2);

    habits[name] = {
      name,
      count: group.length,
      totalSpent: sum.toFixed(2),
      avgSpent: (sum / group.length).toFixed(2),
      category: group[0].category_name,
      trend: Number(trendVal),
      distribution: {
        periods: {}, weekdays: {}
      },
      transactions: group
    };

    group.forEach(t => {
      const p = getTimePeriod(t.date);
      habits[name].distribution.periods[p] = (habits[name].distribution.periods[p]||0) + 1;
      const wd = getWeekday(t.date);
      habits[name].distribution.weekdays[wd] = (habits[name].distribution.weekdays[wd]||0) + 1;
      seen.add(t.id);
    });
  }

  return habits;
}

// ---
// Фронтенд: пример визуализации (React + Chart.js)
// Используй этот компонент в вашей странице, передав month и year как props:
//
// import { useEffect, useRef, useState } from 'react';
// import Chart from 'chart.js/auto';
//
// export default function HabitChart({ month, year }) {
//   const [data, setData] = useState(null);
//   const chartRef = useRef(null);
//
//   useEffect(() => {
//     fetch(`/api/habits?month=${month}&year=${year}`)
//       .then(res => res.json())
//       .then(json => setData(json.habits));
//   }, [month, year]);
//
//   useEffect(() => {
//     if (!data) return;
//     const labels = Object.keys(data);
//     const totals = labels.map(k => data[k].totalSpent);
//     const ctx = chartRef.current.getContext('2d');
//     new Chart(ctx, {
//       type: 'bar',
//       data: { labels, datasets: [{ label: 'Total Spent', data: totals }] }
//     });
//   }, [data]);
//
//   return <canvas ref={chartRef} width={600} height={400} />;
// }

// Внедрение: подключи <HabitChart month="07" year="2025" /> на страницу пользователя.
