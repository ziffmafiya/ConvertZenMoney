// Импорт необходимых модулей
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Получаем __dirname для ES modules (так как в ES модулях __dirname недоступен)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Создаем экземпляр Express приложения
const app = express();
// Порт для запуска сервера (по умолчанию 3000)
const PORT = process.env.PORT || 3000;

// Middleware для парсинга JSON с увеличенным лимитом для больших файлов
app.use(express.json({ limit: '50mb' }));
// Middleware для парсинга URL-encoded данных с увеличенным лимитом
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Обслуживаем статические файлы из корневой директории (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, 'public')));

// Импорт всех API роутов
import getTransactions from './api/get-transactions.js';
import uploadTransactions from './api/upload-transactions.js';
import deepAnalysis from './api/deep-analysis.js';
import detectAnomalies from './api/detect-anomalies.js';
import analyzeHabits from './api/analyze-habits.js';
import getGoalProgress from './api/get-goal-progress.js';
import getMonthlySummary from './api/get-monthly-summary.js';
import recommendGoal from './api/recommend-goal.js';
import analyzeReceipt from './api/analyze-receipt.js';
import getProductStats from './api/get-product-stats.js';
import updateWorkSchedule from './api/update-work-schedule.js';
import loans from './api/loans.js';
import creditCards from './api/credit-cards.js';

// Регистрируем все API роуты
// GET запросы для получения данных
app.get('/api/get-transactions', getTransactions);
app.get('/api/deep-analysis', deepAnalysis);
app.get('/api/detect-anomalies', detectAnomalies);
app.get('/api/analyze-habits', analyzeHabits);
app.get('/api/get-monthly-summary', getMonthlySummary);
app.get('/api/get-product-stats', getProductStats);

// POST запросы для отправки данных
app.post('/api/upload-transactions', uploadTransactions);
app.post('/api/get-goal-progress', getGoalProgress);
app.post('/api/recommend-goal', recommendGoal);
app.post('/api/analyze-receipt', analyzeReceipt);
app.post('/api/update-work-schedule', updateWorkSchedule);

// Универсальные роуты для кредитов и кредитных карт (поддерживают все HTTP методы)
app.all('/api/loans', loans);
app.all('/api/credit-cards', creditCards);

// Обработка всех остальных запросов - возвращаем index.html для SPA
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Middleware для обработки ошибок
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something broke!' });
});

// Запуск сервера на указанном порту
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
