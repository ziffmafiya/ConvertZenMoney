import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Получаем __dirname для ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware для парсинга JSON
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Обслуживаем статические файлы из корневой директории
app.use(express.static(__dirname));

// API роуты
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

// Регистрируем API роуты
app.get('/api/get-transactions', getTransactions);
app.post('/api/upload-transactions', uploadTransactions);
app.get('/api/deep-analysis', deepAnalysis);
app.get('/api/detect-anomalies', detectAnomalies);
app.get('/api/analyze-habits', analyzeHabits);
app.post('/api/get-goal-progress', getGoalProgress);
app.get('/api/get-monthly-summary', getMonthlySummary);
app.post('/api/recommend-goal', recommendGoal);
app.post('/api/analyze-receipt', analyzeReceipt);
app.get('/api/get-product-stats', getProductStats);
app.post('/api/update-work-schedule', updateWorkSchedule);
app.all('/api/loans', loans);
app.all('/api/credit-cards', creditCards);

// Обработка всех остальных запросов - возвращаем index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Обработка ошибок
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something broke!' });
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
}); 