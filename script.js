// Обработчик события, который запускается после полной загрузки и парсинга HTML-документа.
document.addEventListener('DOMContentLoaded', function () {
    // --- Ссылки на DOM-элементы ---
    const csvFile = document.getElementById('csvFile');
    const processDataButton = document.getElementById('processDataButton');
    const excludeDebtsOnUploadCheckbox = document.getElementById('excludeDebtsOnUpload');
    const skipEmbeddingOnUploadCheckbox = document.getElementById('skipEmbeddingOnUpload'); // Ссылка на чекбокс для пропуска эмбеддингов
    const filterMonthSelect = document.getElementById('filterMonth');
    const filterYearInput = document.getElementById('filterYear');
    const deepAnalysisButton = document.getElementById('deepAnalysisButton');
    // Элементы для глубокого анализа (настройки в модальном окне)
    const deepAnalysisMonthSelect = document.getElementById('deepAnalysisMonth');
    const deepAnalysisYearInput = document.getElementById('deepAnalysisYear');
    const deepAnalysisCategoryInput = document.getElementById('deepAnalysisCategory');
    const deepAnalysisModelSelect = document.getElementById('deepAnalysisModel');
    const analysisResultDiv = document.getElementById('analysisResult');
    const analysisLoadingDiv = document.getElementById('analysisLoading');
    const detectAnomaliesButton = document.getElementById('detectAnomaliesButton');
    const habitsResultDiv = document.getElementById('habitsResult');
    const habitsLoadingDiv = document.getElementById('habitsLoading');
    const habitDetailModal = document.getElementById('habitDetailModal');
    const habitDetailTitle = document.getElementById('habitDetailTitle');
    const closeHabitDetailModal = document.getElementById('closeHabitDetailModal');
    let habitTrendChart; // Переменная для хранения экземпляра графика тренда привычки
    
    const avgDailyIncomeEl = document.getElementById('avgDailyIncome');
    const avgDailyExpensesEl = document.getElementById('avgDailyExpenses');

    const headerNetBalanceEl = document.getElementById('headerNetBalance');
    const totalIncomeEl = document.getElementById('totalIncome');
    const totalExpensesEl = document.getElementById('totalExpenses');
    const expensesLegendContainer = document.getElementById('expensesLegend');
    const incomeListContainer = document.getElementById('incomeList');
    const quickFiltersContainer = document.getElementById('quickFilters');
    const anomaliesListEl = document.getElementById('anomaliesList');
    const prevAnomalyPageBtn = document.getElementById('prevAnomalyPage');
    const nextAnomalyPageBtn = document.getElementById('nextAnomalyPage');
    const anomalyPageInfoEl = document.getElementById('anomalyPageInfo');
    const prevTransactionPageBtn = document.getElementById('prevTransactionPage');
    const nextTransactionPageBtn = document.getElementById('nextTransactionPage');
    const transactionPageInfoEl = document.getElementById('transactionPageInfo');
    const prevHabitPageBtn = document.getElementById('prevHabitPage');
    const nextHabitPageBtn = document.getElementById('nextHabitPage');
    const habitPageInfoEl = document.getElementById('habitPageInfo');
    const sortDateHeader = document.getElementById('sortDate');
    const sortDateArrow = document.getElementById('sortDateArrow');

    const netBalanceChangeEl = document.getElementById('netBalanceChange');
    const incomeChangeEl = document.getElementById('incomeChange');
    const expensesChangeEl = document.getElementById('expensesChange');
    const theoreticalSavingsEl = document.getElementById('theoreticalSavings');
    const expensesToIncomeTextEl = document.getElementById('expensesToIncomeText');
    const plannedIncomeInput = document.getElementById('plannedIncome');
    const calculateBudgetButton = document.getElementById('calculateBudgetButton');
    const saveBudgetButton = document.getElementById('saveBudgetButton');
    const budgetResultDiv = document.getElementById('budgetResult');
    let netBalanceSparklineChart;
    let incomeSparklineChart;
    let expensesSparklineChart;
    // Removed expensesToIncomeChart

    // --- Переменные для хранения экземпляров графиков Chart.js ---
    let expensesChart;
    let storesChart;
    let spendIncomeTrendChart;
    let topExpensesTrendChartInstance; // Новая переменная для графика расходов
    // let forecastChart; // Removed

    // --- Ссылки на DOM-элементы для новой карточки ---
    const topExpensesCardTitle = document.getElementById('topExpensesCardTitle');
    const topExpensesCardSubtitle = document.getElementById('topExpensesCardSubtitle');
    const topExpensesTotal = document.getElementById('topExpensesTotal');
    const topExpensesChange = document.getElementById('topExpensesChange');
    const topExpensesCategoriesList = document.getElementById('topExpensesCategoriesList');

    // Переменные для пагинации аномалий
    const anomaliesPerPage = 5;
    let currentAnomalyPage = 1;
    let allAnomalies = [];

    // Переменные для пагинации транзакций
    const transactionsPerPage = 8;
    let currentTransactionPage = 1;
    let allTransactions = [];

    // Переменные для пагинации привычек
    const habitsPerPage = 4; // Например, 4 привычки на страницу
    let currentHabitPage = 1;
    let allHabits = [];

    // Цветовая палитра для графиков
    const COLORS = [
        '#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6', '#8b5cf6', '#d946ef', '#71717a',
        '#f43f5e', '#ec4899', '#a855f7', '#6366f1', '#0ea5e9', '#14b8a6', '#22c55e', '#84cc16', '#f59e0b'
    ];

    // Плагин для кастомизации всплывающих подсказок в Chart.js
    const tooltipPlugin = {
        callbacks: {
            label: function(context) {
                let labelText = context.dataset.label || context.label || '';
                if (labelText) {
                    labelText += ': ';
                }
                let value = 0;
                // For bar charts with indexAxis: 'y', the value is in 'x'
                if (context.chart.config.type === 'bar' && context.chart.config.options.indexAxis === 'y') {
                    if (context.parsed.x !== null && !isNaN(context.parsed.x)) {
                        value = context.parsed.x;
                    }
                } else { // For doughnut and other charts
                    if (context.parsed.y !== null && !isNaN(context.parsed.y)) {
                        value = context.parsed.y;
                    } else if (context.parsed !== null && !isNaN(context.parsed)) {
                        value = context.parsed;
                    }
                }
                
                labelText += new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'UAH' }).format(value);
                return labelText;
            }
        }
    };

    // Стандартное распределение расходов (в процентах от общего дохода)
    const STANDARD_EXPENSE_DISTRIBUTION = {
        "Необходимые расходы": {
            "Платежи, комиссии / Аренда": [0.15, 0.20],
            "Платежи, комиссии / Комуналка": [0.05, 0.05],
            "Платежи, комиссии / Связь": [0.01, 0.02],
            "Платежи, комиссии / Почтовые услуги": [0.00, 0.01],
            "Продукты": [0.15, 0.20],
            "Проезд": [0.05, 0.05],
            "Забота о себе": [0.01, 0.02],
            "Здоровье и фитнес": [0.03, 0.04]
        },
        "Желания": {
            "Кафе и рестораны": [0.05, 0.07],
            "Кафе и рестораны / Кофе": [0.01, 0.02],
            "Отдых и развлечения": [0.05, 0.07],
            "Бар": [0.02, 0.03],
            "Покупки: одежда, техника": [0.05, 0.07],
            "Подарки": [0.02, 0.03],
            "Хотелки": [0.02, 0.03]
        },
        "Сбережения и долги": {
            "Образование": [0.05, 0.10],
            "Остальное — сбережения и погашение кредитов/долгов": [0.10, 0.15]
        }
    };
    
    // Функция для нормализации строк (удаление лишних пробелов, приведение к нижнему регистру)
    function normalize(str) {
        return (str ?? '').replace(/\u00A0/g, ' ').trim().toLowerCase();
    }
    
    // --- Обработка данных и рендеринг ---
    // Асинхронная функция для получения и отображения транзакций
    async function fetchAndRenderTransactions() {
        const selectedMonth = filterMonthSelect.value;
        const selectedYear = filterYearInput.value;

        if (!selectedYear) {
            allTransactions = []; // Очищаем, если год не выбран
            analyzeAndRender([]);
            return;
        }

        let currentYearTransactions = [];
        let prevYearTransactions = [];

        try {
            // Запрос для текущего года
            let response = await fetch(`/api/get-transactions?year=${selectedYear}`);
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Failed to fetch transactions for current year');
            }
            currentYearTransactions = (await response.json()).transactions;

            // Если текущий месяц - январь, также получаем данные за предыдущий год
            if (selectedMonth === '01') {
                const previousYear = parseInt(selectedYear) - 1;
                response = await fetch(`/api/get-transactions?year=${previousYear}`);
                if (!response.ok) {
                    const err = await response.json();
                    throw new Error(err.error || 'Failed to fetch transactions for previous year');
                }
                prevYearTransactions = (await response.json()).transactions;
            }

            // Объединяем все полученные транзакции в allTransactions
            allTransactions = currentYearTransactions.concat(prevYearTransactions);

            // Передаем allTransactions в analyzeAndRender, которая будет фильтровать их внутри себя
            analyzeAndRender(allTransactions);
            fetchAndRenderHabits();
            fetchAndRenderMonthlySummary();
            fetchAndRenderCardUsageAnalysis(); // Убедимся, что эта функция тоже вызывается
            loadBudget(); // И эта тоже

        } catch (error) {
            console.error('Error fetching transactions:', error);
            alert(`Не удалось загрузить транзакции: ${error.message}`);
        }
    }

    // Асинхронная функция для получения и отображения сводки по месяцам
    async function fetchAndRenderMonthlySummary() {
        const selectedMonth = filterMonthSelect.value;
        const selectedYear = filterYearInput.value;

        if (!selectedYear || !selectedMonth) {
            // Очищаем поля, если нет выбранного месяца/года
            incomeChangeEl.textContent = 'Нет данных';
            expensesChangeEl.textContent = 'Нет данных';
            return;
        }

        const params = new URLSearchParams({ year: selectedYear, month: selectedMonth });

        try {
            const response = await fetch(`/api/get-monthly-summary?${params.toString()}`);
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Failed to fetch monthly summary');
            }
            const { incomeChange, outcomeChange } = await response.json();
            
            // Обновляем элементы на странице
            incomeChangeEl.textContent = incomeChange;
            expensesChangeEl.textContent = outcomeChange;

            // Применяем цвета в зависимости от значения
            if (incomeChange.startsWith('+')) {
                incomeChangeEl.className = 'text-sm font-semibold text-green-400';
            } else if (incomeChange.startsWith('-')) {
                incomeChangeEl.className = 'text-sm font-semibold text-red-400';
            } else {
                incomeChangeEl.className = 'text-sm font-semibold text-gray-400';
            }

            if (outcomeChange.startsWith('+')) {
                expensesChangeEl.className = 'text-sm font-semibold text-red-400'; // Расходы растут - плохо
            } else if (outcomeChange.startsWith('-')) {
                expensesChangeEl.className = 'text-sm font-semibold text-green-400'; // Расходы падают - хорошо
            } else {
                expensesChangeEl.className = 'text-sm font-semibold text-gray-400';
            }

        } catch (error) {
            console.error('Error fetching monthly summary:', error);
            alert(`Не удалось загрузить сводку по месяцам: ${error.message}`);
            incomeChangeEl.textContent = 'Ошибка';
            expensesChangeEl.textContent = 'Ошибка';
        }
    }

    // Асинхронная функция для получения и отображения привычек
    async function fetchAndRenderHabits() {
        const selectedMonth = filterMonthSelect.value;
        const selectedYear = filterYearInput.value;

        if (!selectedYear || !selectedMonth) {
            habitsResultDiv.innerHTML = '<p class="text-gray-400 col-span-full">Пожалуйста, выберите год и месяц для анализа привычек.</p>';
            return;
        }

        habitsLoadingDiv.classList.remove('hidden'); // Показываем индикатор загрузки
        const params = new URLSearchParams({ year: selectedYear, month: selectedMonth });

        try {
            // Отправляем запрос на сервер для анализа привычек
            const response = await fetch(`/api/analyze-habits?${params.toString()}`);
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Failed to fetch habits');
            }
            const { habits } = await response.json();
            allHabits = Object.values(habits); // Сохраняем все привычки как массив
            renderHabits(allHabits); // Отображаем первую страницу привычек
        } catch (error) {
            console.error('Error fetching habits:', error);
            alert(`Не удалось загрузить привычки: ${error.message}`);
        } finally {
            habitsLoadingDiv.classList.add('hidden'); // Скрываем индикатор загрузки
        }
    }

    // Функция для отображения карточек привычек с пагинацией
    function renderHabits(habits) {
        habitsResultDiv.innerHTML = '';
        if (habits.length === 0) {
            habitsResultDiv.innerHTML = '<p class="text-gray-400 col-span-full">Привычки не найдены для выбранного периода.</p>';
            habitPageInfoEl.textContent = 'Страница 0 из 0';
            prevHabitPageBtn.disabled = true;
            nextHabitPageBtn.disabled = true;
            return;
        }

        const totalPages = Math.ceil(habits.length / habitsPerPage);
        currentHabitPage = Math.min(Math.max(1, currentHabitPage), totalPages); // Убедимся, что страница в пределах допустимого

        const startIndex = (currentHabitPage - 1) * habitsPerPage;
        const endIndex = startIndex + habitsPerPage;
        const habitsToDisplay = habits.slice(startIndex, endIndex);

        // Иконки для разных категорий привычек
        const categoryIcons = {
            'Продукты': '🛒',
            'Кафе и рестораны': '☕',
            'Транспорт': '🚕',
            'Развлечения': '🎬',
            'Онлайн-сервисы': '💻',
            'default': '💰'
        };

        habitsToDisplay.forEach(habit => {
            const trendColor = habit.trend > 0 ? 'text-red-400' : 'text-green-400';
            const trendArrow = habit.trend > 0 ? '↑' : '↓';
            const icon = categoryIcons[habit.category] || categoryIcons['default'];

            const habitCard = document.createElement('div');
            habitCard.className = 'metric-card p-4 flex flex-col';
            habitCard.innerHTML = `
                <div class="flex-grow">
                    <div class="flex items-center justify-between mb-2">
                        <h3 class="text-lg font-semibold text-gray-300">${habit.name}</h3>
                        <span class="text-2xl">${icon}</span>
                    </div>
                    <p class="text-gray-400 text-sm">Всего потрачено</p>
                    <p class="text-2xl font-bold text-blue-400">${parseFloat(habit.totalSpent).toLocaleString('ru-RU')} грн</p>
                    <div class="flex justify-between items-center text-sm text-gray-400 mt-1">
                        <span>${habit.count} раз за месяц</span>
                        <span class="${trendColor}">${trendArrow} ${Math.abs(habit.trend)}%</span>
                    </div>
                    <p class="text-sm text-gray-500 mt-1">Категория: ${habit.category}</p>
                </div>
                <button class="habit-details-btn mt-4 w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded" data-payee="${habit.payee}" data-habit='${JSON.stringify(habit)}'>Подробнее</button>
            `;
            habitsResultDiv.appendChild(habitCard);
        });

        habitPageInfoEl.textContent = `Страница ${currentHabitPage} из ${totalPages}`;
        prevHabitPageBtn.disabled = currentHabitPage === 1;
        nextHabitPageBtn.disabled = currentHabitPage === totalPages;
    }

    // Асинхронная функция для выполнения глубокого анализа трат с помощью ИИ
    async function performDeepAnalysis() {
        // Используем настройки из модального окна
        const selectedMonth = deepAnalysisMonthSelect.value;
        const selectedYear = deepAnalysisYearInput.value;
        const analysisCategory = deepAnalysisCategoryInput.value.trim();
        const analysisModel = deepAnalysisModelSelect.value;

        if (!selectedMonth || !selectedYear) {
            alert('Пожалуйста, выберите месяц и год для глубокого анализа.');
            return;
        }

        analysisResultDiv.textContent = '';
        analysisLoadingDiv.classList.remove('hidden');

        const params = new URLSearchParams({ month: selectedMonth, year: selectedYear, model: analysisModel });
        if (analysisCategory) {
            params.append('category', analysisCategory);
        }

        try {
            const response = await fetch(`/api/deep-analysis?${params.toString()}`);
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Failed to perform deep analysis');
            }
            const { analysis } = await response.json();
            analysisResultDiv.textContent = analysis;
        } catch (error) {
            console.error('Error performing deep analysis:', error);
            analysisResultDiv.textContent = `Ошибка при выполнении глубокого анализа: ${error.message}`;
        } finally {
            analysisLoadingDiv.classList.add('hidden');
        }
    }

    // Асинхронная функция для обнаружения аномалий
    async function detectAnomalies() {
        const selectedMonth = filterMonthSelect.value;
        const selectedYear = filterYearInput.value;

        if (!selectedYear || !selectedMonth) {
            alert('Пожалуйста, выберите год и месяц для поиска аномалий.');
            return;
        }

        analysisResultDiv.textContent = '';
        analysisLoadingDiv.classList.remove('hidden');
        analysisLoadingDiv.querySelector('p').textContent = 'Идет поиск аномалий, это может занять некоторое время...';

        const params = new URLSearchParams({ year: selectedYear, month: selectedMonth });

        try {
            // Отправляем запрос на сервер для обнаружения аномалий
            const response = await fetch(`/api/detect-anomalies?${params.toString()}`);
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Failed to detect anomalies');
            }
            const result = await response.json();
            alert(`Поиск аномалий завершен. Найдено: ${result.anomalies_found}. Данные на странице будут обновлены.`);
            fetchAndRenderTransactions(); // Обновляем данные на странице, чтобы показать аномалии
        } catch (error) {
            console.error('Error detecting anomalies:', error);
            alert(`Ошибка при поиске аномалий: ${error.message}`);
        } finally {
            analysisLoadingDiv.classList.add('hidden');
            analysisLoadingDiv.querySelector('p').textContent = 'Анализ выполняется, пожалуйста, подождите...'; // Сбрасываем текст
        }
    }

    // Основная функция для анализа и отображения данных
    function analyzeAndRender(transactions) {
        if (!transactions) return;

        const selectedMonth = filterMonthSelect.value;
        const selectedYear = filterYearInput.value;

        // Filter transactions based on selected month and year
        const filteredTransactions = transactions.filter(t => {
            const date = new Date(t.date);
            const transactionYear = date.getFullYear().toString();
            const transactionMonth = String(date.getMonth() + 1).padStart(2, '0');

            if (selectedYear && transactionYear !== selectedYear) {
                return false;
            }
            if (selectedMonth && transactionMonth !== selectedMonth) {
                return false;
            }
            return true;
        });

        let totalIncome = 0;
        let totalExpenses = 0;
        const expensesByCategory = {};
        const expensesByPayee = {};
        const incomeSources = {};
        const dailyData = {}; // Для графика трендов

        filteredTransactions.forEach(t => { // Use filteredTransactions here
            const date = t.date.split('T')[0];
            if (!dailyData[date]) {
                dailyData[date] = { income: 0, expenses: 0 };
            }

            if (t.income > 0 && t.outcome === 0) {
                totalIncome += t.income;
                dailyData[date].income += t.income;
                if (!normalize(t.categoryName).includes('возврат')) {
                   incomeSources[t.categoryName] = (incomeSources[t.categoryName] || 0) + t.income;
                }
            } else if (t.outcome > 0 && t.income === 0) {
                totalExpenses += t.outcome;
                dailyData[date].expenses += t.outcome;
                
                let category = t.categoryName;
                const creditKeywords = ["роутер", "очки", "бритва", "пылесос"];
                const description = normalize(t.payee + ' ' + t.comment + ' ' + t.incomeAccountName);

                if (creditKeywords.some(keyword => description.includes(keyword))) {
                    category = "Платеж по кредиту";
                }
                
                expensesByCategory[category] = (expensesByCategory[category] || 0) + t.outcome;
                expensesByPayee[t.payee] = (expensesByPayee[t.payee] || 0) + t.outcome;
            }
        });

        const netBalance = totalIncome - totalExpenses;

        // Calculate actual expense percentages
        const actualExpensePercentages = {};
        if (totalExpenses > 0) {
            for (const category in expensesByCategory) {
                actualExpensePercentages[category] = (expensesByCategory[category] / totalExpenses);
            }
        }

        // Update main metrics
        headerNetBalanceEl.textContent = `${netBalance.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} грн`;
        headerNetBalanceEl.style.color = netBalance >= 0 ? '#22c55e' : '#ef4444';
        totalIncomeEl.textContent = `${totalIncome.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} грн`;
        totalExpensesEl.textContent = `${totalExpenses.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} грн`;

        // Prepare data for charts and lists
        const expenseDataByCategoryChart = {
            labels: Object.keys(expensesByCategory),
            datasets: [{
                data: Object.values(expensesByCategory),
                backgroundColor: COLORS.slice(0, Object.keys(expensesByCategory).length),
                borderColor: '#1f2937',
                borderWidth: 3,
                hoverOffset: 15
            }]
        };

        const sortedExpensesByPayee = Object.entries(expensesByPayee)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 10); // Топ 10
        const expenseDataByStoreChart = {
            labels: sortedExpensesByPayee.map(([payee]) => payee),
            datasets: [{
                label: 'Расходы',
                data: sortedExpensesByPayee.map(([, amount]) => amount),
                backgroundColor: COLORS.slice(0, sortedExpensesByPayee.length),
                borderColor: '#1f2937',
                borderWidth: 2
            }]
        };
        
        const sortedDates = Object.keys(dailyData).sort((a, b) => new Date(a) - new Date(b));
        const trendData = {
            labels: sortedDates.map(date => new Date(date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })),
            datasets: [
                {
                    label: 'Доходы',
                    data: sortedDates.map(date => dailyData[date].income),
                    borderColor: '#22c55e', // green-500
                    backgroundColor: 'rgba(34, 197, 94, 0.2)',
                    fill: true,
                    tension: 0.4
                },
                {
                    label: 'Расходы',
                    data: sortedDates.map(date => dailyData[date].expenses),
                    borderColor: '#ef4444', // red-500
                    backgroundColor: 'rgba(239, 68, 68, 0.2)',
                    fill: true,
                    tension: 0.4
                }
            ]
        };

        const incomeDataList = Object.entries(incomeSources)
            .map(([source, amount]) => ({ source, amount }))
            .sort((a, b) => b.amount - a.amount);

        renderCharts(expenseDataByCategoryChart, expenseDataByStoreChart, trendData);
        renderLegendsAndLists(expenseDataByCategoryChart, incomeDataList, totalIncome, filteredTransactions, actualExpensePercentages); // Передаем filteredTransactions
        allAnomalies = filteredTransactions.filter(t => t.is_anomaly); // Сохраняем только аномалии для текущего месяца/года
        renderAnomalies(allAnomalies); // Отображаем первую страницу аномалий
        allTransactions = transactions; // Сохраняем все транзакции (нефильтрованные) для таблицы
        renderTransactionsTable(filteredTransactions); // Отображаем только отфильтрованные транзакции
        updateGoalProgress(); // Теперь вызывается здесь, когда allTransactions точно определены
        // renderForecastChart(transactions); // Removed
        renderSparklines(transactions);
        // Calculate number of days in the selected month
        const today = new Date();
        const currentDayOfMonth = today.getDate();
        const daysPassedInMonth = currentDayOfMonth; // Количество дней, прошедших с начала месяца

        const avgDailyIncome = totalIncome / (daysPassedInMonth || 1); // Изменено: учитываются только прошедшие дни
        const avgDailyExpenses = totalExpenses / (daysPassedInMonth || 1); // Изменено: учитываются только прошедшие дни

        avgDailyIncomeEl.textContent = `${avgDailyIncome.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} грн`;
        avgDailyExpensesEl.textContent = `${avgDailyExpenses.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} грн`;

        theoreticalSavingsEl.textContent = `${(totalIncome * 0.20).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} грн`;
        expensesToIncomeTextEl.textContent = `${(totalIncome > 0 ? (totalExpenses / totalIncome) * 100 : 0).toFixed(1)}% от дохода`;
        fetchAndRenderTopExpensesCard(); // Вызываем новую функцию здесь
    }

    // Асинхронная функция для получения и отображения данных для карточки "Расходы по категориям и сравнение"
    async function fetchAndRenderTopExpensesCard() {
        const selectedMonth = filterMonthSelect.value;
        const selectedYear = filterYearInput.value;

        if (!selectedYear || !selectedMonth) {
            // Очищаем карточку, если год или месяц не выбраны
            topExpensesCardTitle.textContent = 'Расходы';
            topExpensesCardSubtitle.textContent = 'Выберите период';
            topExpensesTotal.textContent = '0.00 ₴';
            topExpensesChange.textContent = '';
            topExpensesCategoriesList.innerHTML = '<p class="text-gray-500">Нет данных для отображения.</p>';
            if (topExpensesTrendChartInstance) topExpensesTrendChartInstance.destroy();
            return;
        }

        const currentMonthTransactions = allTransactions.filter(t => {
            const date = new Date(t.date);
            return date.getFullYear() == selectedYear && (date.getMonth() + 1) == parseInt(selectedMonth);
        });

        const previousMonth = parseInt(selectedMonth) === 1 ? 12 : parseInt(selectedMonth) - 1;
        const previousYear = parseInt(selectedMonth) === 1 ? parseInt(selectedYear) - 1 : parseInt(selectedYear);

        const previousMonthTransactions = allTransactions.filter(t => {
            const date = new Date(t.date);
            return date.getFullYear() == previousYear && (date.getMonth() + 1) == previousMonth;
        });

        // Агрегация расходов по категориям для текущего месяца
        const currentMonthExpensesByCategory = {};
        let currentMonthTotalExpenses = 0;
        currentMonthTransactions.forEach(t => {
            if (t.outcome > 0 && t.income === 0) {
                currentMonthExpensesByCategory[t.categoryName] = (currentMonthExpensesByCategory[t.categoryName] || 0) + t.outcome;
                currentMonthTotalExpenses += t.outcome;
            }
        });

        // Агрегация расходов по категориям для предыдущего месяца
        const previousMonthExpensesByCategory = {};
        let previousMonthTotalExpenses = 0;
        previousMonthTransactions.forEach(t => {
            if (t.outcome > 0 && t.income === 0) {
                previousMonthExpensesByCategory[t.categoryName] = (previousMonthExpensesByCategory[t.categoryName] || 0) + t.outcome;
                previousMonthTotalExpenses += t.outcome;
            }
        });

        // Определяем топ-5 самых затратных категорий за текущий месяц
        const sortedCurrentMonthCategories = Object.entries(currentMonthExpensesByCategory)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5);

        // Обновляем заголовок и подзаголовок карточки
        const currentMonthName = new Date(selectedYear, parseInt(selectedMonth) - 1, 1).toLocaleDateString('ru-RU', { month: 'long' });
        const previousMonthName = new Date(previousYear, previousMonth - 1, 1).toLocaleDateString('ru-RU', { month: 'long' });
        
        topExpensesCardTitle.textContent = `Расходы за 1-${new Date(selectedYear, parseInt(selectedMonth), 0).getDate()} ${currentMonthName}`;
        topExpensesCardSubtitle.textContent = `Сравниваем с 1-${new Date(previousYear, previousMonth, 0).getDate()} ${previousMonthName}`;

        // Обновляем общую сумму расходов и изменение
        topExpensesTotal.textContent = `${currentMonthTotalExpenses.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₴`;
        
        const totalChange = currentMonthTotalExpenses - previousMonthTotalExpenses;
        const totalPercentageChange = previousMonthTotalExpenses === 0 ? (currentMonthTotalExpenses === 0 ? 0 : 100) : (totalChange / previousMonthTotalExpenses) * 100;

        let totalChangeText = '';
        let totalChangeClass = '';
        if (totalChange > 0) {
            totalChangeText = `▲ ${Math.abs(totalChange).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₴ (${totalPercentageChange.toFixed(1)}%)`;
            totalChangeClass = 'text-red-400'; // Расходы выросли - плохо
        } else if (totalChange < 0) {
            totalChangeText = `▼ ${Math.abs(totalChange).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₴ (${Math.abs(totalPercentageChange).toFixed(1)}%)`;
            totalChangeClass = 'text-green-400'; // Расходы уменьшились - хорошо
        } else {
            totalChangeText = `0 ₴ (0%)`;
            totalChangeClass = 'text-gray-400';
        }
        topExpensesChange.textContent = totalChangeText;
        topExpensesChange.className = `text-sm font-semibold ${totalChangeClass}`;

        // Рендеринг списка категорий
        topExpensesCategoriesList.innerHTML = '';
        if (sortedCurrentMonthCategories.length === 0) {
            topExpensesCategoriesList.innerHTML = '<p class="text-gray-500">Нет данных по категориям за выбранный период.</p>';
        } else {
            sortedCurrentMonthCategories.forEach(([categoryName, currentMonthAmount]) => {
                const previousMonthAmount = previousMonthExpensesByCategory[categoryName] || 0;
                const categoryChange = currentMonthAmount - previousMonthAmount;
                const categoryPercentageChange = previousMonthAmount === 0 ? (currentMonthAmount === 0 ? 0 : 100) : (categoryChange / previousMonthAmount) * 100;

                let categoryChangeText = '';
                let categoryChangeClass = '';
                if (categoryChange > 0) {
                    categoryChangeText = `▲ ${Math.abs(categoryChange).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₴ (${categoryPercentageChange.toFixed(1)}%)`;
                    categoryChangeClass = 'text-red-400';
                } else if (categoryChange < 0) {
                    categoryChangeText = `▼ ${Math.abs(categoryChange).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₴ (${Math.abs(categoryPercentageChange).toFixed(1)}%)`;
                    categoryChangeClass = 'text-green-400';
                } else {
                    categoryChangeText = `0 ₴ (0%)`;
                    categoryChangeClass = 'text-gray-400';
                }

                const categoryItem = document.createElement('div');
                categoryItem.className = 'flex items-center gap-2';
                categoryItem.innerHTML = `
                    <div class="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-white text-lg">
                        ${getCategoryIcon(categoryName)}
                    </div>
                    <div class="flex-grow">
                        <p class="text-gray-300 font-semibold">${categoryName}</p>
                        <p class="text-white text-lg font-bold">${currentMonthAmount.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₴</p>
                    </div>
                    <div class="text-right">
                        <p class="text-sm ${categoryChangeClass}">${categoryChangeText}</p>
                    </div>
                `;
                topExpensesCategoriesList.appendChild(categoryItem);
            });
        }

        // Подготовка данных для графика кумулятивных расходов
        const currentMonthDailyExpenses = {};
        currentMonthTransactions.forEach(t => {
            if (t.outcome > 0 && t.income === 0) {
                const date = new Date(t.date);
                const day = date.getDate();
                currentMonthDailyExpenses[day] = (currentMonthDailyExpenses[day] || 0) + t.outcome;
            }
        });

        const previousMonthDailyExpenses = {};
        previousMonthTransactions.forEach(t => {
            if (t.outcome > 0 && t.income === 0) {
                const date = new Date(t.date);
                const day = date.getDate();
                previousMonthDailyExpenses[day] = (previousMonthDailyExpenses[day] || 0) + t.outcome;
            }
        });

        const daysInCurrentMonth = new Date(selectedYear, parseInt(selectedMonth), 0).getDate();
        const labels = Array.from({ length: daysInCurrentMonth }, (_, i) => i + 1);

        let cumulativeCurrentMonthExpenses = 0;
        const currentMonthCumulativeData = labels.map(day => {
            cumulativeCurrentMonthExpenses += (currentMonthDailyExpenses[day] || 0);
            return cumulativeCurrentMonthExpenses;
        });

        let cumulativePreviousMonthExpenses = 0;
        const previousMonthCumulativeData = labels.map(day => {
            cumulativePreviousMonthExpenses += (previousMonthDailyExpenses[day] || 0);
            return cumulativePreviousMonthExpenses;
        });

        const topExpensesTrendData = {
            labels: labels,
            datasets: [
                {
                    label: `${currentMonthName}`,
                    data: currentMonthCumulativeData,
                    borderColor: '#8b5cf6', // Фиолетовый
                    backgroundColor: 'rgba(139, 92, 246, 0.2)',
                    fill: false,
                    tension: 0.4,
                    pointRadius: 0,
                    pointHoverRadius: 5,
                    pointBackgroundColor: '#8b5cf6',
                    pointBorderColor: '#fff'
                },
                {
                    label: `${previousMonthName}`,
                    data: previousMonthCumulativeData,
                    borderColor: '#a78bfa', // Светло-фиолетовый
                    backgroundColor: 'rgba(167, 139, 250, 0.1)',
                    fill: false,
                    tension: 0.4,
                    pointRadius: 0,
                    pointHoverRadius: 5,
                    pointBackgroundColor: '#a78bfa',
                    pointBorderColor: '#fff'
                }
            ]
        };

        // Рендеринг графика
        if (topExpensesTrendChartInstance) topExpensesTrendChartInstance.destroy();
        topExpensesTrendChartInstance = new Chart(document.getElementById('topExpensesTrendChart').getContext('2d'), {
            type: 'line',
            data: topExpensesTrendData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        ticks: { color: '#9ca3af' },
                        grid: { color: '#374151' },
                        title: {
                            display: true,
                            text: 'День месяца',
                            color: '#c9d1d9'
                        }
                    },
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: '#9ca3af',
                            callback: function(value) {
                                return value.toLocaleString('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' ₴';
                            }
                        },
                        grid: { color: '#374151' },
                        title: {
                            display: true,
                            text: 'Сумма расходов',
                            color: '#c9d1d9'
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            color: '#d1d5db'
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.parsed.y !== null) {
                                    label += context.parsed.y.toLocaleString('ru-RU', { style: 'currency', currency: 'UAH' });
                                }
                                return label;
                            }
                        }
                    }
                }
            }
        });
    }

    // Вспомогательная функция для получения иконки категории
    function getCategoryIcon(categoryName) {
        const icons = {
            'Платежи, комиссии': '💳',
            'Покупки: одежда, техника': '🛍️',
            'Продукты': '🛒',
            'Перевод на Очки': '👓', // Пример, если это категория
            'Кафе и рестораны': '☕',
            'Транспорт': '🚕',
            'Развлечения': '🎬',
            'Здоровье и фитнес': '💪',
            'Образование': '📚',
            'Подарки': '🎁',
            'Хотелки': '✨',
            'Связь': '📱',
            'Комуналка': '🏠',
            'Аренда': '🏡',
            'Почтовые услуги': '✉️',
            'Забота о себе': '🛀',
            'Бар': '🍻',
            'Проезд': '🚌',
            'Платеж по кредиту': '🏦',
            'default': '💰'
        };
        // Проверяем точное совпадение или частичное для подкатегорий
        for (const key in icons) {
            if (categoryName.includes(key)) {
                return icons[key];
            }
        }
        return icons['default'];
    }

    // Функция для отображения аномалий с пагинацией
    function renderAnomalies(anomalies) {
        anomaliesListEl.innerHTML = '';
        if (anomalies.length === 0) {
            anomaliesListEl.innerHTML = '<p class="text-gray-500">Аномалий не найдено.</p>';
            anomalyPageInfoEl.textContent = 'Страница 0 из 0';
            prevAnomalyPageBtn.disabled = true;
            nextAnomalyPageBtn.disabled = true;
            return;
        }

        const totalPages = Math.ceil(anomalies.length / anomaliesPerPage);
        currentAnomalyPage = Math.min(Math.max(1, currentAnomalyPage), totalPages); // Убедимся, что страница в пределах допустимого

        const startIndex = (currentAnomalyPage - 1) * anomaliesPerPage;
        const endIndex = startIndex + anomaliesPerPage;
        const anomaliesToDisplay = anomalies.slice(startIndex, endIndex);

        anomaliesToDisplay.forEach(anomaly => {
            const anomalyEl = document.createElement('div');
            anomalyEl.className = 'p-3 bg-gray-800 rounded-lg border border-orange-500/30 shadow-lg shadow-black/20';
            anomalyEl.innerHTML = `
                <div class="flex justify-between items-center">
                    <span class="font-semibold text-white">${anomaly.payee}</span>
                    <span class="font-bold text-orange-400">${anomaly.outcome.toLocaleString('ru-RU')} грн</span>
                </div>
                <p class="text-sm text-gray-400">${anomaly.anomaly_reason}</p>
            `;
            anomaliesListEl.appendChild(anomalyEl);
        });

        anomalyPageInfoEl.textContent = `Страница ${currentAnomalyPage} из ${totalPages}`;
        prevAnomalyPageBtn.disabled = currentAnomalyPage === 1;
        nextAnomalyPageBtn.disabled = currentAnomalyPage === totalPages;
    }

    // --- Обработка файла и фильтрация ---
    function handleFileProcessing() {
        if (csvFile.files.length === 0) {
            alert('Пожалуйста, выберите CSV файл.');
            return;
        }

        const file = csvFile.files[0];
        const reader = new FileReader();

        reader.onload = (e) => {
            const csvData = e.target.result;
            const lines = csvData.split('\n').filter(line => line.trim() !== '');

            const headers = [
                "date", "categoryName", "payee", "comment", "outcomeAccountName",
                "outcome", "outcomeCurrencyShortTitle", "incomeAccountName",
                "income", "incomeCurrencyShortTitle", "createdDate", "changedDate", "qrCode"
            ];

            const data = [];
            lines.forEach(line => {
                const values = line.split(';');
                if (values.length >= headers.length - 1) { // Допускаем отсутствие qrCode
                    let row = {};
                    headers.forEach((header, index) => {
                        row[header] = (values[index] || '').replace(/"/g, '');
                    });
                    data.push(row);
                } else {
                    console.warn(`Skipping malformed line: ${line}`);
                }
            });

            const transactionData = data.filter(row => {
                const income = parseFloat(row.income.replace(',', '.')) || 0;
                const outcome = parseFloat(row.outcome.replace(',', '.')) || 0;
                return (income > 0 && outcome === 0) || (outcome > 0 && income === 0);
            }).map(row => ({
                date: row.date,
                categoryName: row.categoryName,
                payee: row.payee,
                comment: row.comment,
                outcomeAccountName: row.outcomeAccountName,
                outcome: parseFloat(row.outcome.replace(',', '.')) || 0,
                incomeAccountName: row.incomeAccountName,
                income: parseFloat(row.income.replace(',', '.')) || 0,
            }));

            if (transactionData.length === 0) {
                alert('В файле не найдено подходящих транзакций для загрузки.');
                return;
            }
            
            // Загружаем все обработанные данные из файла. Сервер обработает дубликаты.
            uploadTransactionsToSupabase(transactionData, excludeDebtsOnUploadCheckbox.checked, skipEmbeddingOnUploadCheckbox.checked);
        };

        reader.onerror = () => {
            alert('Ошибка при чтении файла.');
        };

        reader.readAsText(file, 'UTF-8');
    }

    function renderTransactionsTable(transactions) {
        const tableBody = document.getElementById('transactionsTableBody');
        tableBody.innerHTML = '';
        if (transactions.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="5" class="text-center text-gray-500">Нет транзакций для отображения.</td></tr>`;
            transactionPageInfoEl.textContent = 'Страница 0 из 0';
            prevTransactionPageBtn.disabled = true;
            nextTransactionPageBtn.disabled = true;
            return;
        }

        const totalPages = Math.ceil(transactions.length / transactionsPerPage);
        currentTransactionPage = Math.min(Math.max(1, currentTransactionPage), totalPages);

        const startIndex = (currentTransactionPage - 1) * transactionsPerPage;
        const endIndex = startIndex + transactionsPerPage;
        const transactionsToDisplay = transactions.slice(startIndex, endIndex);

        transactionsToDisplay.forEach(t => {
            const row = document.createElement('tr');
            const amount = t.income > 0 ? t.income : t.outcome;
            const amountClass = t.income > 0 ? 'text-green-500' : 'text-red-500';
            const sign = t.income > 0 ? '+' : '-';

            row.innerHTML = `
                <td class="p-3 md:p-4 border-b border-gray-700 text-left">${new Date(t.date).toLocaleDateString('ru-RU')}</td>
                <td class="p-3 md:p-4 border-b border-gray-700 text-left">${t.categoryName}</td>
                <td class="p-3 md:p-4 border-b border-gray-700 text-left">${t.payee || 'N/A'}</td>
                <td class="p-3 md:p-4 border-b border-gray-700 text-left ${amountClass} font-semibold">${sign}${amount.toLocaleString('ru-RU')} грн</td>
                <td class="p-3 md:p-4 border-b border-gray-700 text-left">${t.income > 0 ? t.incomeAccountName : t.outcomeAccountName}</td>
            `;
            tableBody.appendChild(row);
        });
        // Добавляем эффект при наведении на строки таблицы
        const tableRows = tableBody.querySelectorAll('tr');
        tableRows.forEach(row => {
            row.classList.add('hover:bg-gray-700');
        });

        transactionPageInfoEl.textContent = `Страница ${currentTransactionPage} из ${totalPages}`;
        prevTransactionPageBtn.disabled = currentTransactionPage === 1;
        nextTransactionPageBtn.disabled = currentTransactionPage === totalPages;
    }

    // Логика сортировки таблицы транзакций
    sortDateHeader.addEventListener('click', () => {
        const currentDirection = sortDateHeader.dataset.sortDirection;
        const newDirection = currentDirection === 'asc' ? 'desc' : 'asc';
        sortDateHeader.dataset.sortDirection = newDirection;
        sortDateArrow.textContent = newDirection === 'asc' ? '↑' : '↓';

        allTransactions.sort((a, b) => {
            const dateA = new Date(a.date);
            const dateB = new Date(b.date);
            if (newDirection === 'asc') {
                return dateA - dateB;
            } else {
                return dateB - dateA;
            }
        });
        currentTransactionPage = 1; // Сбрасываем на первую страницу после сортировки
        renderTransactionsTable(allTransactions);
    });

        async function updateGoalProgress() {
        const goal = JSON.parse(localStorage.getItem('userGoal'));
        const goalDescriptionEl = document.getElementById('goalDescription');
        const goalProgressBar = document.getElementById('goalProgressBar');
        const goalProgressText = document.getElementById('goalProgressText');
        const goalTargetText = document.getElementById('goalTargetText');
        const comparisonMonthTextEl = document.getElementById('comparisonMonthText');

        if (!goal) {
            goalDescriptionEl.textContent = 'Цель не задана';
            goalProgressBar.style.width = '0%';
            goalProgressText.textContent = '0%';
            goalTargetText.textContent = 'Цель: -';
            comparisonMonthTextEl.textContent = '';
            return;
        }

        // Update UI with goal details
        if (goal.type === 'reduce') {
            goalDescriptionEl.textContent = `Снизить траты в категории "${goal.category}" на ${goal.value}%`;
            goalTargetText.textContent = `Цель: ${goal.value}%`;
        } else {
            goalDescriptionEl.textContent = `Потратить не более ${goal.value} грн в категории "${goal.category}"`;
            goalTargetText.textContent = `Цель: ${goal.value} грн`;
        }

        const selectedMonth = filterMonthSelect.value;
        const selectedYear = filterYearInput.value;

        if (!selectedYear || !selectedMonth) {
            return; // Need month and year to calculate progress
        }

        try {
            const response = await fetch('/api/get-goal-progress', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ year: selectedYear, month: selectedMonth, goal })
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Failed to get goal progress');
            }

            const { progress1, progress2, comparisonMonth, currentValue, targetValue, status } = await response.json();
            
            // Ограничиваем progress1 100% для отображения на прогресс-баре
            const displayProgress1 = Math.min(100, Math.max(0, progress1));
            
            goalProgressBar.style.width = `${displayProgress1}%`;
            
            if (goal.type === 'limit') {
                goalProgressText.textContent = `${currentValue.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} грн`;
                goalTargetText.textContent = `Цель: ${targetValue.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} грн`;
            } else if (goal.type === 'reduce') {
                let progressText = '';
                if (progress2 > 0) {
                    progressText = `Вы сэкономили ${progress2.toFixed(1)}%`;
                } else if (progress2 < 0) {
                    progressText = `Вы потратили на ${Math.abs(progress2).toFixed(1)}% больше`;
                } else {
                    progressText = `Без изменений`;
                }
                goalProgressText.textContent = progressText;
                goalTargetText.textContent = `Цель: ${targetValue}%`;
            }

            if (comparisonMonth) {
                comparisonMonthTextEl.textContent = `Сравнение с ${comparisonMonth}`;
            } else {
                comparisonMonthTextEl.textContent = '';
            }

            if (status === 'Over Limit' || (goal.type === 'reduce' && progress1 < 100)) {
                goalProgressBar.classList.remove('bg-blue-500');
                goalProgressBar.classList.add('bg-red-500');
            } else {
                goalProgressBar.classList.remove('bg-red-500');
                goalProgressBar.classList.add('bg-blue-500');
            }

        } catch (error) {
            console.error('Error fetching goal progress:', error);
            goalProgressText.textContent = 'Ошибка';
            comparisonMonthTextEl.textContent = '';
        }
    }

    function renderSparklines(transactions) {
        if (netBalanceSparklineChart) netBalanceSparklineChart.destroy();
        if (incomeSparklineChart) incomeSparklineChart.destroy();
        if (expensesSparklineChart) expensesSparklineChart.destroy();

        const selectedMonth = filterMonthSelect.value;
        const selectedYear = filterYearInput.value;

        let dataForSparklines = {};
        let labelsForSparklines = [];
        let currentPeriodTotal = { income: 0, expenses: 0, netBalance: 0 };
        let previousPeriodTotal = { income: 0, expenses: 0, netBalance: 0 };

        if (selectedMonth) {
            // Месячный вид: агрегируем по дням для текущего и предыдущего месяца
            const currentMonthTransactions = transactions.filter(t => {
                const date = new Date(t.date);
                return date.getFullYear() == selectedYear && (date.getMonth() + 1) == parseInt(selectedMonth);
            });

            const previousMonth = parseInt(selectedMonth) === 1 ? 12 : parseInt(selectedMonth) - 1;
            const previousYear = parseInt(selectedMonth) === 1 ? parseInt(selectedYear) - 1 : parseInt(selectedYear);

            const previousMonthTransactions = transactions.filter(t => {
                const date = new Date(t.date);
                return date.getFullYear() == previousYear && (date.getMonth() + 1) == previousMonth;
            });

            // Агрегируем дневные данные для текущего месяца
            currentMonthTransactions.forEach(t => {
                const date = t.date.split('T')[0];
                if (!dataForSparklines[date]) {
                    dataForSparklines[date] = { income: 0, expenses: 0, netBalance: 0 };
                }
                dataForSparklines[date].income += t.income;
                dataForSparklines[date].expenses += t.outcome;
                dataForSparklines[date].netBalance += (t.income - t.outcome);
                currentPeriodTotal.income += t.income;
                currentPeriodTotal.expenses += t.outcome;
                currentPeriodTotal.netBalance += (t.income - t.outcome);
            });

            // Агрегируем общую сумму за предыдущий месяц
            previousMonthTransactions.forEach(t => {
                previousPeriodTotal.income += t.income;
                previousPeriodTotal.expenses += t.outcome;
                previousPeriodTotal.netBalance += (t.income - t.outcome);
            });

            labelsForSparklines = Object.keys(dataForSparklines).sort();
            // Если нет данных за текущий месяц, используем данные за предыдущий для визуализации спарклайнов
            if (labelsForSparklines.length === 0 && Object.keys(previousMonthTransactions).length > 0) {
                previousMonthTransactions.forEach(t => {
                    const date = t.date.split('T')[0];
                    if (!dataForSparklines[date]) {
                        dataForSparklines[date] = { income: 0, expenses: 0, netBalance: 0 };
                    }
                    dataForSparklines[date].income += t.income;
                    dataForSparklines[date].expenses += t.outcome;
                    dataForSparklines[date].netBalance += (t.income - t.outcome);
                });
                labelsForSparklines = Object.keys(dataForSparklines).sort();
            }

        } else {
            // Годовой вид: агрегируем по месяцам
            const monthlyData = {};
            transactions.forEach(t => {
                const monthYear = new Date(t.date).toISOString().substring(0, 7); // YYYY-MM
                if (!monthlyData[monthYear]) {
                    monthlyData[monthYear] = { income: 0, expenses: 0, netBalance: 0 };
                }
                monthlyData[monthYear].income += t.income;
                monthlyData[monthYear].expenses += t.outcome;
                monthlyData[monthYear].netBalance += (t.income - t.outcome);
            });

            const sortedMonths = Object.keys(monthlyData).sort();
            const lastSixMonths = sortedMonths.slice(-6); // Получаем данные за последние 6 месяцев

            lastSixMonths.forEach(month => {
                dataForSparklines[month] = monthlyData[month];
            });
            labelsForSparklines = lastSixMonths;

            // Рассчитываем итоги для текущего и предыдущего периодов в годовом виде
            if (sortedMonths.length >= 2) {
                const currentMonthKey = sortedMonths[sortedMonths.length - 1];
                const previousMonthKey = sortedMonths[sortedMonths.length - 2];
                currentPeriodTotal = monthlyData[currentMonthKey];
                previousPeriodTotal = monthlyData[previousMonthKey];
            }
        }

        const netBalanceData = labelsForSparklines.map(label => dataForSparklines[label]?.netBalance || 0);
        const incomeData = labelsForSparklines.map(label => dataForSparklines[label]?.income || 0);
        const expensesData = labelsForSparklines.map(label => dataForSparklines[label]?.expenses || 0);

        // Используем currentPeriodTotal и previousPeriodTotal для расчета изменений
        // incomeChangeEl и expensesChangeEl теперь обновляются функцией fetchAndRenderMonthlySummary()
        // Здесь нужно обновить только netBalanceChangeEl.
        function calculateNetBalanceChange(current, previous) {
            if (previous === 0) {
                if (current === 0) return 0;
                return current > 0 ? 100 : -100;
            }
            return ((current - previous) / previous) * 100;
        }

        function updateNetBalanceChangeText(element, change) {
            if (isNaN(change) || !isFinite(change)) {
                element.className = 'text-sm font-semibold text-gray-400';
                element.textContent = 'Нет данных';
            } else if (change > 0) {
                element.className = 'text-sm font-semibold text-green-400';
                element.textContent = `+${change.toFixed(1)}%`;
            } else if (change < 0) {
                element.className = 'text-sm font-semibold text-red-400';
                element.textContent = `${change.toFixed(1)}%`;
            } else {
                element.className = 'text-sm font-semibold text-gray-400';
                element.textContent = '0%';
            }
        }

        if (Object.keys(currentPeriodTotal).length > 0 && Object.keys(previousPeriodTotal).length > 0) {
            const netBalanceChange = calculateNetBalanceChange(currentPeriodTotal.netBalance, previousPeriodTotal.netBalance);
            updateNetBalanceChangeText(netBalanceChangeEl, netBalanceChange);
        } else {
            netBalanceChangeEl.textContent = 'Нет данных';
        }

        const sparklineOptions = {
            responsive: true,
            maintainAspectRatio: false,
            elements: { point: { radius: 0 } },
            plugins: { legend: { display: false }, tooltip: { enabled: false } },
            scales: { x: { display: false }, y: { display: false } }
        };

        netBalanceSparklineChart = new Chart(document.getElementById('netBalanceSparkline').getContext('2d'), {
            type: 'line',
            data: { labels: labelsForSparklines, datasets: [{ data: netBalanceData, borderColor: '#8b5cf6', borderWidth: 1 }] },
            options: sparklineOptions
        });

        incomeSparklineChart = new Chart(document.getElementById('incomeSparkline').getContext('2d'), {
            type: 'line',
            data: { labels: labelsForSparklines, datasets: [{ data: incomeData, borderColor: '#22c55e', borderWidth: 1 }] },
            options: sparklineOptions
        });

        expensesSparklineChart = new Chart(document.getElementById('expensesSparkline').getContext('2d'), {
            type: 'line',
            data: { labels: labelsForSparklines, datasets: [{ data: expensesData, borderColor: '#ef4444', borderWidth: 1 }] },
            options: sparklineOptions
        });
    }

    // --- Функции рендеринга ---
    function renderCharts(expenseDataByCategory, expenseDataByStore, trendData) {
        if (expensesChart) expensesChart.destroy();
        if (storesChart) storesChart.destroy();
        if (spendIncomeTrendChart) spendIncomeTrendChart.destroy();
        const ctxCategory = document.getElementById('expensesChart').getContext('2d');
        expensesChart = new Chart(ctxCategory, {
            type: 'doughnut',
            data: expenseDataByCategory,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '65%',
                plugins: { legend: { display: false }, tooltip: tooltipPlugin }
            }
        });

        const ctxStore = document.getElementById('storesChart').getContext('2d');
        storesChart = new Chart(ctxStore, {
            type: 'bar',
            data: expenseDataByStore,
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: { ticks: { color: '#9ca3af' }, grid: { color: '#374151' } },
                    y: { ticks: { color: '#d1d5db' }, grid: { color: '#374151' } }
                },
                plugins: { legend: { display: false }, tooltip: tooltipPlugin }
            }
        });

        const ctxTrend = document.getElementById('spendIncomeTrendChart').getContext('2d');
        spendIncomeTrendChart = new Chart(ctxTrend, {
            type: 'line',
            data: trendData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: { ticks: { color: '#9ca3af' }, grid: { color: '#374151' } },
                    y: { 
                        beginAtZero: true, // Начинаем ось Y с нуля
                        ticks: { 
                            color: '#9ca3af',
                            callback: function(value, index, values) {
                                return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'UAH' }).format(value);
                            }
                        }, 
                        grid: { color: '#374151' } 
                    }
                },
                plugins: { 
                    legend: { 
                        position: 'top',
                        labels: {
                            color: '#d1d5db'
                        }
                     }, 
                    tooltip: tooltipPlugin 
                }
            }
        });
    }

    // Функция renderExpensesToIncomeChart удалена

    function getStandardPercentage(categoryName) {
        for (const group in STANDARD_EXPENSE_DISTRIBUTION) {
            if (STANDARD_EXPENSE_DISTRIBUTION[group][categoryName] !== undefined) {
                return STANDARD_EXPENSE_DISTRIBUTION[group][categoryName]; // Возвращаем массив [min, max]
            }
        }
        return null; // Категория не найдена в стандартном распределении
    }

    function renderLegendsAndLists(expenseDataByCategory, incomeData, totalIncome, transactions, actualExpensePercentages) {
        expensesLegendContainer.innerHTML = '';
        if (expenseDataByCategory.labels.length > 0) {
            // Сортируем категории по значению (по убыванию) для легенды
            const sortedCategories = expenseDataByCategory.labels
                .map((label, i) => ({
                    label,
                    value: expenseDataByCategory.datasets[0].data[i],
                    color: expenseDataByCategory.datasets[0].backgroundColor[i]
                }))
                .sort((a, b) => b.value - a.value);

            sortedCategories.forEach(category => {
                const { label, value, color } = category;
                const actualPercentage = actualExpensePercentages[label] !== undefined ? actualExpensePercentages[label] * 100 : 0;
                const standardRange = getStandardPercentage(label);

                let progressBarColor = 'bg-gray-500';
                let comparisonText = `Факт: ${actualPercentage.toFixed(1)}%`;
                let barWidth = actualPercentage;

                if (standardRange !== null) {
                    const [minStandard, maxStandard] = standardRange.map(p => p * 100);
                    comparisonText += ` | Норма: ${minStandard.toFixed(1)}% - ${maxStandard.toFixed(1)}%`;

                    if (actualPercentage > maxStandard + 0.5) {
                        progressBarColor = 'bg-red-500';
                        comparisonText += ` (Перерасход)`;
                    } else if (actualPercentage < minStandard - 0.5) {
                        progressBarColor = 'bg-green-500';
                        comparisonText += ` (Экономия)`;
                    } else {
                        progressBarColor = 'bg-blue-500';
                        comparisonText += ` (В норме)`;
                    }
                    
                    const referenceValue = Math.max(maxStandard, actualPercentage);
                    barWidth = (actualPercentage / (referenceValue > 0 ? referenceValue : 1)) * 100;
                    barWidth = Math.min(100, barWidth);
                }

                const anomalousTransactions = transactions.filter(t => t.categoryName === label && t.is_anomaly);
                const isCategoryAnomalous = anomalousTransactions.length > 0;
                const anomalyReason = isCategoryAnomalous 
                    ? anomalousTransactions.map(t => t.anomaly_reason).join('<br>')
                    : '';

                // Build the combined tooltip content
                let combinedTooltipHtml = `<div class="font-semibold mb-1">${comparisonText}</div>`;
                if (isCategoryAnomalous) {
                    combinedTooltipHtml += `<div class="mt-2 pt-2 border-t border-slate-500"><h4 class="font-bold text-orange-400 mb-1">Аномалии:</h4>${anomalyReason}</div>`;
                }

                const legendItem = document.createElement('div');
                legendItem.className = 'flex items-center mb-2 text-sm relative group'; 

                legendItem.innerHTML = `
                    <div class="flex w-full items-center">
                        <div class="w-4 h-4 mr-3 rounded-md flex-shrink-0" style="background-color: ${color}"></div>
                        <div class="flex-grow min-w-0">
                            <div class="flex justify-between items-center">
                                <span class="text-gray-300 mr-2 truncate">${label}</span>
                                <span class="font-bold text-white whitespace-nowrap">${value.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} грн</span>
                            </div>
                            <div class="w-full bg-gray-700 rounded-full h-4 mt-1 relative">
                                <div class="${progressBarColor} h-4 rounded-full flex items-center justify-center" style="width: ${barWidth}%">
                                    <span class="text-xs font-bold text-white">${actualPercentage.toFixed(1)}%</span>
                                </div>
                            </div>
                        </div>
                        ${isCategoryAnomalous ? `
                            <div class="ml-2 flex-shrink-0">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-orange-400" viewBox="0 0 20 20" fill="currentColor">
                                    <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.21 3.03-1.742 3.03H4.42c-1.532 0-2.492-1.696-1.742-3.03l5.58-9.92zM10 13a1 1 0 110-2 1 1 0 010 2zm-1-4a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clip-rule="evenodd" />
                                </svg>
                            </div>
                        ` : ''}
                    </div>
                    <div class="absolute bottom-full mb-2 w-72 bg-slate-800 border border-slate-600 text-white text-xs rounded py-2 px-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20 pointer-events-none" style="left: 50%; transform: translateX(-50%);">
                        ${combinedTooltipHtml}
                    </div>
                `;
                expensesLegendContainer.appendChild(legendItem);
            });
        }

        incomeListContainer.innerHTML = '';
        const totalIncomeForList = incomeData.reduce((sum, item) => sum + item.amount, 0);
        if (totalIncomeForList > 0) {
            incomeData.forEach(item => {
                const percentage = (item.amount / totalIncomeForList) * 100;
                const incomeElement = document.createElement('div');
                incomeElement.innerHTML = `<div class="flex justify-between items-center mb-1"><span class="text-gray-300">${item.source}</span><span class="font-semibold text-green-400">${item.amount.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} грн</span></div><div class="w-full bg-gray-600 rounded-full h-2.5"><div class="bg-green-500 h-2.5 rounded-full" style="width: ${percentage}%"></div></div>`;
                incomeListContainer.appendChild(incomeElement);
            });
        }
    }
    // --- Логика вкладок ---
    const tabs = document.querySelectorAll('.tab-button');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => {
                t.classList.remove('text-blue-500', 'border-blue-500');
                t.classList.add('text-gray-400', 'border-gray-700', 'hover:bg-gray-700', 'hover:border-gray-600');
            });
            tab.classList.add('text-blue-500', 'border-blue-500');
            tab.classList.remove('text-gray-400', 'border-gray-700', 'hover:bg-gray-700', 'hover:border-gray-600');
            const target = document.querySelector(tab.dataset.tabTarget);
            document.querySelectorAll('.tab-content').forEach(tc => tc.classList.add('hidden'));
            target.classList.remove('hidden');
        });
    });

    // --- Goal Modal Logic ---
    const setupGoalButton = document.getElementById('setupGoalButton');
    const goalSetupModal = document.getElementById('goalSetupModal');
    const closeGoalModalButton = document.getElementById('closeGoalModalButton');
    const saveGoalButton = document.getElementById('saveGoalButton');
    const goalCategorySelect = document.getElementById('goalCategory');
    const goalTabs = document.querySelectorAll('.goal-tab-button');
    const getGoalRecommendationButton = document.getElementById('getGoalRecommendationButton');
    const recommendationResultDiv = document.getElementById('recommendationResult');

    setupGoalButton.addEventListener('click', () => {
        // Populate categories
        const categories = [...new Set(allTransactions.filter(t => t.outcome > 0).map(t => t.categoryName))];
        goalCategorySelect.innerHTML = categories.map(c => `<option value="${c}">${c}</option>`).join('');
        goalSetupModal.classList.remove('hidden');
    });

    closeGoalModalButton.addEventListener('click', () => {
        goalSetupModal.classList.add('hidden');
    });

    saveGoalButton.addEventListener('click', () => {
        const goal = {
            category: document.getElementById('goalCategory').value,
            type: document.getElementById('goalType').value,
            value: parseFloat(document.getElementById('goalValue').value)
        };

        if (!goal.category || !goal.type || isNaN(goal.value)) {
            alert('Пожалуйста, заполните все поля корректно.');
            return;
        }

        localStorage.setItem('userGoal', JSON.stringify(goal));
        goalSetupModal.classList.add('hidden');
        updateGoalProgress(); // Refresh the goal card
    });

    getGoalRecommendationButton.addEventListener('click', async () => {
        const selectedMonth = filterMonthSelect.value;
        const selectedYear = filterYearInput.value;

        if (!selectedYear || !selectedMonth) {
            alert('Пожалуйста, выберите год и месяц для получения рекомендации.');
            return;
        }
        
        console.log(`Requesting recommendation for ${selectedMonth}/${selectedYear}...`);
        getGoalRecommendationButton.textContent = 'Анализируем...';
        getGoalRecommendationButton.disabled = true;
        recommendationResultDiv.classList.remove('hidden');
        recommendationResultDiv.innerHTML = `<p class="text-gray-400">Загрузка...</p>`;

        try {
            const response = await fetch(`/api/recommend-goal?year=${selectedYear}&month=${selectedMonth}`);
            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || `HTTP error! status: ${response.status}`);
            }
            
            console.log('Received recommendation response:', result);
            const { recommendation } = result;
            
            if (recommendation) {
                console.log('Displaying recommendation:', recommendation);
                recommendationResultDiv.innerHTML = `
                    <p class="text-gray-300">${recommendation.reason}</p>
                    <button id="applyRecommendationButton" class="mt-2 w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded">Применить эту цель</button>
                `;
                document.getElementById('applyRecommendationButton').addEventListener('click', () => {
                    const goalToStore = {
                        category: recommendation.category,
                        type: recommendation.type,
                        value: recommendation.value
                    };
                    localStorage.setItem('userGoal', JSON.stringify(goalToStore));
                    goalSetupModal.classList.add('hidden');
                    updateGoalProgress();
                });
            } else {
                console.log('No recommendation available.');
                recommendationResultDiv.innerHTML = `<p class="text-gray-400">Недостаточно данных для рекомендации за выбранный период.</p>`;
            }

        } catch (error) {
            console.error('Error getting recommendation:', error);
            recommendationResultDiv.innerHTML = `<p class="text-red-400">Ошибка при получении рекомендации: ${error.message}</p>`;
        } finally {
            getGoalRecommendationButton.textContent = 'Получить рекомендацию';
            getGoalRecommendationButton.disabled = false;
        }
    });
    
    goalTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            goalTabs.forEach(t => {
                t.classList.remove('text-blue-500', 'border-blue-500');
                t.classList.add('text-gray-400', 'border-transparent', 'hover:text-gray-300', 'hover:border-gray-300');
            });
            tab.classList.add('text-blue-500', 'border-blue-500');
            tab.classList.remove('text-gray-400', 'border-transparent', 'hover:text-gray-300', 'hover:border-gray-300');
            
            const targetId = tab.dataset.tabTarget;
            document.querySelectorAll('.goal-tab-content').forEach(content => {
                content.classList.add('hidden');
            });
            document.querySelector(targetId).classList.remove('hidden');
        });
    });


    // --- Логика планирования бюджета ---
    function calculateAndDisplayBudget() {
        const income = parseFloat(plannedIncomeInput.value);
        if (isNaN(income) || income <= 0) {
            alert('Пожалуйста, введите корректный планируемый доход.');
            return;
        }

        budgetResultDiv.innerHTML = '';
        let totalMinBudget = 0;
        let totalMaxBudget = 0;

        for (const group in STANDARD_EXPENSE_DISTRIBUTION) {
            const groupEl = document.createElement('div');
            groupEl.className = 'bg-gray-800 rounded-lg p-4';
            groupEl.innerHTML = `<h4 class="text-lg font-semibold text-white mb-2">${group}</h4>`;
            
            const categoryList = document.createElement('div');
            categoryList.className = 'space-y-2';

            for (const category in STANDARD_EXPENSE_DISTRIBUTION[group]) {
                const [minPercent, maxPercent] = STANDARD_EXPENSE_DISTRIBUTION[group][category];
                const minAmount = income * minPercent;
                const maxAmount = income * maxPercent;
                totalMinBudget += minAmount;
                totalMaxBudget += maxAmount;

                const categoryItem = document.createElement('div');
                categoryItem.className = 'text-sm';
                categoryItem.innerHTML = `
                    <div class="flex justify-between">
                        <span class="text-gray-400">${category}</span>
                        <span class="font-semibold text-white">${minAmount.toFixed(2)} - ${maxAmount.toFixed(2)} грн</span>
                    </div>
                `;
                categoryList.appendChild(categoryItem);
            }
            groupEl.appendChild(categoryList);
            budgetResultDiv.appendChild(groupEl);
        }
    }

    function saveBudget() {
        const income = parseFloat(plannedIncomeInput.value);
        const selectedMonth = filterMonthSelect.value;
        const selectedYear = filterYearInput.value;

        if (isNaN(income) || income <= 0) {
            alert('Нечего сохранять. Сначала рассчитайте бюджет.');
            return;
        }
        if (!selectedMonth || !selectedYear) {
            alert('Пожалуйста, выберите месяц и год для сохранения бюджета.');
            return;
        }

        const budgetData = {
            plannedIncome: income,
            distribution: STANDARD_EXPENSE_DISTRIBUTION
        };

        const storageKey = `budget-${selectedYear}-${selectedMonth}`;
        localStorage.setItem(storageKey, JSON.stringify(budgetData));
        alert(`Бюджет на ${selectedMonth}/${selectedYear} сохранен.`);
    }

    function loadBudget() {
        const selectedMonth = filterMonthSelect.value;
        const selectedYear = filterYearInput.value;

        if (!selectedMonth || !selectedYear) {
            budgetResultDiv.innerHTML = '';
            plannedIncomeInput.value = '';
            return;
        }

        const storageKey = `budget-${selectedYear}-${selectedMonth}`;
        const savedData = localStorage.getItem(storageKey);

        if (savedData) {
            const budgetData = JSON.parse(savedData);
            plannedIncomeInput.value = budgetData.plannedIncome;
            calculateAndDisplayBudget();
        } else {
            budgetResultDiv.innerHTML = '';
            plannedIncomeInput.value = '';
        }
    }

    calculateBudgetButton.addEventListener('click', calculateAndDisplayBudget);
    saveBudgetButton.addEventListener('click', saveBudget);


    // --- Обработчики событий и начальный вызов ---
    processDataButton.addEventListener('click', handleFileProcessing);

    const settingsButton = document.getElementById('settingsButton');
    const settingsModal = document.getElementById('settingsModal');
    const closeSettingsModalButton = document.getElementById('closeSettingsModalButton');
    const lightThemeButton = document.getElementById('lightThemeButton');
    const darkThemeButton = document.getElementById('darkThemeButton');
    const ruLangButton = document.getElementById('ruLangButton');
    const enLangButton = document.getElementById('enLangButton');

    settingsButton.addEventListener('click', () => {
        settingsModal.classList.remove('hidden');
        settingsModal.classList.add('flex');
    });

    closeSettingsModalButton.addEventListener('click', () => {
        settingsModal.classList.add('hidden');
        settingsModal.classList.remove('flex');
    });

    lightThemeButton.addEventListener('click', () => {
        document.body.classList.remove('bg-[#0D1117]', 'text-[#c9d1d9]');
        document.body.classList.add('bg-white', 'text-black');
    });

    darkThemeButton.addEventListener('click', () => {
        document.body.classList.remove('bg-white', 'text-black');
        document.body.classList.add('bg-[#0D1117]', 'text-[#c9d1d9]');
    });

    i18next.init({
        lng: 'ru',
        debug: true,
        resources: {
            en: {
                translation: {
                    "settings": "Settings",
                    "theme": "Theme",
                    "light": "Light",
                    "dark": "Dark",
                    "language": "Language",
                    "russian": "Русский",
                    "english": "English",
                    "update_data": "Update data from file",
                    "upload_csv": "Upload a CSV file to add new transactions to the database. Existing transactions will be ignored.",
                    "exclude_debts": "Exclude 'Debts' category on upload",
                    "skip_embedding": "Do not generate embeddings on upload (to save quota)",
                    "upload_to_db": "Upload to database",
                    "close": "Close"
                }
            },
            ru: {
                translation: {
                    "settings": "Настройки",
                    "theme": "Тема",
                    "light": "Светлая",
                    "dark": "Темная",
                    "language": "Язык",
                    "russian": "Русский",
                    "english": "English",
                    "update_data": "Обновить данные из файла",
                    "upload_csv": "Загрузите CSV-файл, чтобы добавить новые транзакции в базу данных. Существующие транзакции будут проигнорированы.",
                    "exclude_debts": "Исключить категорию \"Долги\" при загрузке",
                    "skip_embedding": "Не генерировать эмбеддинги при загрузке (для экономии квоты)",
                    "upload_to_db": "Загрузить в базу данных",
                    "close": "Закрыть"
                }
            }
        }
    }, function(err, t) {
        updateContent();
    });

    function updateContent() {
        document.getElementById('settingsButton').innerHTML = i18next.t('settings');
        document.querySelector('#settingsModal h2').innerHTML = i18next.t('settings');
        document.querySelector('#settingsModal label:nth-child(1)').innerHTML = i18next.t('theme');
        document.getElementById('lightThemeButton').innerHTML = i18next.t('light');
        document.getElementById('darkThemeButton').innerHTML = i18next.t('dark');
        document.querySelector('#settingsModal label:nth-child(2)').innerHTML = i18next.t('language');
        document.getElementById('ruLangButton').innerHTML = i18next.t('russian');
        document.getElementById('enLangButton').innerHTML = i18next.t('english');
        document.querySelector('#file-upload-section h2').innerHTML = i18next.t('update_data');
        document.querySelector('#file-upload-section p').innerHTML = i18next.t('upload_csv');
        document.querySelector('label[for="excludeDebtsOnUpload"]').innerHTML = i18next.t('exclude_debts');
        document.querySelector('label[for="skipEmbeddingOnUpload"]').innerHTML = i18next.t('skip_embedding');
        document.getElementById('processDataButton').innerHTML = i18next.t('upload_to_db');
        document.getElementById('closeSettingsModalButton').innerHTML = i18next.t('close');
    }

    ruLangButton.addEventListener('click', () => {
        i18next.changeLanguage('ru', updateContent);
    });

    enLangButton.addEventListener('click', () => {
        i18next.changeLanguage('en', updateContent);
    });

    filterMonthSelect.addEventListener('change', () => {
        fetchAndRenderTransactions();
        fetchAndRenderCardUsageAnalysis(); // Добавляем вызов
        loadBudget();
    });
    filterYearInput.addEventListener('change', () => {
        fetchAndRenderTransactions();
        fetchAndRenderCardUsageAnalysis(); // Добавляем вызов
        loadBudget();
    });
    deepAnalysisButton.addEventListener('click', performDeepAnalysis);
    detectAnomaliesButton.addEventListener('click', () => {
        const selectedMonth = filterMonthSelect.value;
        const selectedYear = filterYearInput.value;
        detectAnomalies(selectedYear, selectedMonth);
    });
    
    // Обработчики для модального окна настроек глубокого анализа
    const deepAnalysisSettingsButton = document.getElementById('deepAnalysisSettingsButton');
    const deepAnalysisSettingsModal = document.getElementById('deepAnalysisSettingsModal');
    const closeDeepAnalysisSettingsButton = document.getElementById('closeDeepAnalysisSettingsButton');
    const saveDeepAnalysisSettingsButton = document.getElementById('saveDeepAnalysisSettingsButton');
    
    deepAnalysisSettingsButton.addEventListener('click', () => {
        deepAnalysisMonthSelect.value = filterMonthSelect.value;
        deepAnalysisYearInput.value = filterYearInput.value;
        deepAnalysisSettingsModal.classList.remove('hidden');
        deepAnalysisSettingsModal.classList.add('flex');
    });
    
    closeDeepAnalysisSettingsButton.addEventListener('click', () => {
        deepAnalysisSettingsModal.classList.add('hidden');
    });
    
    saveDeepAnalysisSettingsButton.addEventListener('click', () => {
        deepAnalysisSettingsModal.classList.add('hidden');
    });
    closeHabitDetailModal.addEventListener('click', () => habitDetailModal.classList.add('hidden'));

    prevAnomalyPageBtn.addEventListener('click', () => {
        if (currentAnomalyPage > 1) {
            currentAnomalyPage--;
            renderAnomalies(allAnomalies);
        }
    });

    nextAnomalyPageBtn.addEventListener('click', () => {
        const totalPages = Math.ceil(allAnomalies.length / anomaliesPerPage);
        if (currentAnomalyPage < totalPages) {
            currentAnomalyPage++;
            renderAnomalies(allAnomalies);
        }
    });

    prevHabitPageBtn.addEventListener('click', () => {
        if (currentHabitPage > 1) {
            currentHabitPage--;
            renderHabits(allHabits);
        }
    });

    nextHabitPageBtn.addEventListener('click', () => {
        const totalPages = Math.ceil(allHabits.length / habitsPerPage);
        if (currentHabitPage < totalPages) {
            currentHabitPage++;
            renderHabits(allHabits);
        }
    });

    prevTransactionPageBtn.addEventListener('click', () => {
        if (currentTransactionPage > 1) {
            currentTransactionPage--;
            renderTransactionsTable(allTransactions);
        }
    });

    nextTransactionPageBtn.addEventListener('click', () => {
        const totalPages = Math.ceil(allTransactions.length / transactionsPerPage);
        if (currentTransactionPage < totalPages) {
            currentTransactionPage++;
            renderTransactionsTable(allTransactions);
        }
    });

    quickFiltersContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('quick-filter-btn')) {
            document.querySelectorAll('.quick-filter-btn').forEach(btn => btn.classList.remove('active'));
            e.target.classList.add('active');
            
            const period = e.target.dataset.period;
            const today = new Date();
            filterYearInput.value = today.getFullYear();

            if (period === 'month') {
                filterMonthSelect.value = String(today.getMonth() + 1).padStart(2, '0');
            } else if (period === 'quarter') {
            const quarter = Math.floor(today.getMonth() / 3);
            // Для простоты мы просто выбираем весь год для квартала,
            // так как бэкенд не поддерживает получение данных поквартально напрямую.
            // Более сложная реализация потребовала бы фильтрации транзакций на клиенте.
            filterMonthSelect.value = ''; 
            } else { // year
                filterMonthSelect.value = '';
            }
            fetchAndRenderTransactions();
        }
    });

    habitsResultDiv.addEventListener('click', (e) => {
        if (e.target.classList.contains('habit-details-btn')) {
            const habitData = JSON.parse(e.target.dataset.habit);
            
            habitDetailTitle.textContent = `Динамика трат: ${habitData.name}`;
            
            const chartData = {
                labels: habitData.transactions.map(t => new Date(t.date).toLocaleDateString('ru-RU')),
                datasets: [{
                    label: 'Сумма траты',
                    data: habitData.transactions.map(t => t.amount),
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.2)',
                    fill: true,
                    tension: 0.4
                }]
            };

            if (habitTrendChart) {
                habitTrendChart.destroy();
            }

            habitTrendChart = new Chart(document.getElementById('habitTrendChart').getContext('2d'), {
                type: 'line',
                data: chartData,
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: { color: '#9ca3af' }, 
                            grid: { color: '#374151' }
                        },
                        x: {
                            ticks: { color: '#9ca3af' }, 
                            grid: { color: '#374151' }
                        }
                    },
                    plugins: {
                        legend: { display: false }
                    }
                }
            });

            habitDetailModal.classList.remove('hidden');
        }
    });
    
    // --- Функция загрузки в Supabase ---
    async function uploadTransactionsToSupabase(transactions, excludeDebts, skipEmbedding) {
        try {
            const response = await fetch('/api/upload-transactions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ transactions, excludeDebts, skipEmbedding }),
            });

            const result = await response.json();

            if (response.ok) {
                console.log('Transactions uploaded successfully:', result);
                alert(result.message || 'Транзакции успешно загружены в Supabase!');
                fetchAndRenderTransactions(); // Обновляем данные из БД
            } else {
                console.error('Error uploading transactions:', result.error);
                alert(`Ошибка при загрузке транзакций: ${result.error}`);
            }
        } catch (error) {
            console.error('Network or server error during upload:', error);
            alert('Произошла ошибка при загрузке транзакций. Проверьте консоль для деталей.');
        }
    }

    // --- Функциональность кредитов и кредитных карт ---
    
    // Элементы для кредитов
    const addLoanButton = document.getElementById('addLoanButton');
    const addLoanModal = document.getElementById('addLoanModal');
    const closeAddLoanModalButton = document.getElementById('closeAddLoanModalButton');
    const saveLoanButton = document.getElementById('saveLoanButton');
    const loansList = document.getElementById('loansList');
    const loansLoading = document.getElementById('loansLoading');
    
    // Элементы для кредитных карт
    const addCreditCardButton = document.getElementById('addCreditCardButton');
    const addCreditCardModal = document.getElementById('addCreditCardModal');
    const closeAddCreditCardModalButton = document.getElementById('closeAddCreditCardModalButton');
    const saveCreditCardButton = document.getElementById('saveCreditCardButton');
    const creditCardsList = document.getElementById('creditCardsList');
    const creditCardsLoading = document.getElementById('creditCardsLoading');
    const cardUsageAnalysisResultDiv = document.getElementById('cardUsageAnalysisResult');
    const cardUsageAnalysisLoadingDiv = document.getElementById('cardUsageAnalysisLoading');
    const cardUsageAnalysisSection = document.getElementById('cardUsageAnalysisSection');
    const cardUsageContentDiv = document.getElementById('cardUsageContent');
    const toggleCardUsageVisibilityButton = document.getElementById('toggleCardUsageVisibility');
    const budgetPlanningSection = document.getElementById('budgetPlanningSection');
    const budgetContentDiv = document.getElementById('budgetContent');
    const toggleBudgetVisibilityButton = document.getElementById('toggleBudgetVisibility');
    const spendIncomeTrendSection = document.getElementById('spendIncomeTrendSection');
    const spendIncomeContentDiv = document.getElementById('spendIncomeContent');
    const toggleSpendIncomeVisibilityButton = document.getElementById('toggleSpendIncomeVisibility');
    const anomaliesSection = document.getElementById('anomaliesSection');
    const anomaliesContentDiv = document.getElementById('anomaliesContent');
    const toggleAnomaliesVisibilityButton = document.getElementById('toggleAnomaliesVisibility');
    const transactionsSection = document.getElementById('transactionsSection');
    const transactionsContentDiv = document.getElementById('transactionsContent');
    const toggleTransactionsVisibilityButton = document.getElementById('toggleTransactionsVisibility');
    const deepAnalysisSection = document.getElementById('deepAnalysisSection');
    const deepAnalysisContentDiv = document.getElementById('deepAnalysisContent');
    const toggleDeepAnalysisVisibilityButton = document.getElementById('toggleDeepAnalysisVisibility');

    // Обработчики событий для кредитов
    addLoanButton.addEventListener('click', () => {
        addLoanModal.classList.remove('hidden');
        addLoanModal.classList.add('flex');
    });

    closeAddLoanModalButton.addEventListener('click', () => {
        addLoanModal.classList.add('hidden');
        document.getElementById('addLoanForm').reset();
    });

    // Обработчик отправки формы по Enter
    document.getElementById('addLoanForm').addEventListener('submit', (e) => {
        e.preventDefault();
        saveLoanButton.click();
    });

    // Закрытие модального окна по клику вне его
    addLoanModal.addEventListener('click', (e) => {
        if (e.target === addLoanModal) {
            addLoanModal.classList.add('hidden');
            document.getElementById('addLoanForm').reset();
        }
    });

    saveLoanButton.addEventListener('click', async () => {
        const loanName = document.getElementById('loanName').value;
        const principal = document.getElementById('loanPrincipal').value;
        const interestRate = document.getElementById('loanInterestRate').value;
        const termMonths = document.getElementById('loanTermMonths').value;
        const startDate = document.getElementById('loanStartDate').value;
        const paidAmount = document.getElementById('loanPaidAmount').value;

        // Отладочная информация
        console.log('Form values:', {
            loanName: loanName,
            principal: principal,
            interestRate: interestRate,
            termMonths: termMonths,
            startDate: startDate,
            paidAmount: paidAmount
        });

        // Проверяем валидность HTML формы
        const form = document.getElementById('addLoanForm');
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        // Улучшенная валидация с проверкой на пустые строки и нули
        if (!principal || principal.trim() === '' || parseFloat(principal) <= 0) {
            alert('Пожалуйста, введите корректную основную сумму кредита');
            return;
        }
        
        if (!interestRate || interestRate.trim() === '' || parseFloat(interestRate) < 0) {
            alert('Пожалуйста, введите корректную процентную ставку');
            return;
        }
        
        if (!termMonths || termMonths.trim() === '' || parseInt(termMonths) <= 0) {
            alert('Пожалуйста, введите корректный срок кредита в месяцах');
            return;
        }
        
        if (!startDate || startDate.trim() === '') {
            alert('Пожалуйста, выберите дату открытия кредита');
            return;
        }

                         try {
             const response = await fetch('/api/loans', {
                 method: 'POST',
                 headers: {
                     'Content-Type': 'application/json',
                 },
                 body: JSON.stringify({
                     loan_name: loanName,
                     principal: parseFloat(principal),
                     interest_rate: parseFloat(interestRate),
                     term_months: parseInt(termMonths),
                     start_date: startDate,
                     paid_amount: parseFloat(paidAmount || 0)
                 }),
             });

            const result = await response.json();

            if (response.ok) {
                alert('Кредит успешно добавлен!');
                addLoanModal.classList.add('hidden');
                document.getElementById('addLoanForm').reset();
                fetchAndRenderLoans();
            } else {
                console.error('Server error:', result);
                alert(`Ошибка при добавлении кредита: ${result.error}`);
            }
        } catch (error) {
            console.error('Network error adding loan:', error);
            alert('Произошла ошибка сети при добавлении кредита');
        }
    });

    // Обработчики событий для кредитных карт
    addCreditCardButton.addEventListener('click', () => {
        addCreditCardModal.classList.remove('hidden');
        addCreditCardModal.classList.add('flex');
    });

    closeAddCreditCardModalButton.addEventListener('click', () => {
        addCreditCardModal.classList.add('hidden');
        document.getElementById('addCreditCardForm').reset();
    });

    saveCreditCardButton.addEventListener('click', async () => {
        const cardName = document.getElementById('cardName').value;
        const gracePeriodDays = document.getElementById('gracePeriodDays').value;
        const statementDay = document.getElementById('statementDay').value;
        const paymentDueDay = document.getElementById('paymentDueDay').value;
        const firstTransactionDate = document.getElementById('firstTransactionDate').value;
        const unpaidBalance = document.getElementById('unpaidBalance').value;

        // Отладочная информация
        console.log('Credit card form values:', {
            cardName,
            gracePeriodDays,
            statementDay,
            paymentDueDay,
            firstTransactionDate,
            unpaidBalance
        });

        // Проверяем валидность HTML формы
        const form = document.getElementById('addCreditCardForm');
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        // Улучшенная валидация
        if (!cardName || cardName.trim() === '') {
            alert('Пожалуйста, введите название кредитной карты');
            return;
        }

        if (!gracePeriodDays || gracePeriodDays.trim() === '' || parseInt(gracePeriodDays) <= 0) {
            alert('Пожалуйста, введите корректный льготный период');
            return;
        }

        try {
            const response = await fetch('/api/credit-cards', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    card_name: cardName,
                    grace_period_days: parseInt(gracePeriodDays),
                    statement_day: statementDay ? parseInt(statementDay) : null,
                    payment_due_day: paymentDueDay ? parseInt(paymentDueDay) : null,
                    first_transaction_date: firstTransactionDate || null,
                    unpaid_balance: parseFloat(unpaidBalance || 0)
                }),
            });

            const result = await response.json();

            if (response.ok) {
                alert('Кредитная карта успешно добавлена!');
                addCreditCardModal.classList.add('hidden');
                document.getElementById('addCreditCardForm').reset();
                fetchAndRenderCreditCards();
            } else {
                console.error('Server error:', result);
                alert(`Ошибка при добавлении кредитной карты: ${result.error}`);
            }
        } catch (error) {
            console.error('Network error adding credit card:', error);
            alert('Произошла ошибка сети при добавлении кредитной карты');
        }
    });

    // Обработчик отправки формы кредитной карты по Enter
    document.getElementById('addCreditCardForm').addEventListener('submit', (e) => {
        e.preventDefault();
        saveCreditCardButton.click();
    });

    // Закрытие модального окна кредитной карты по клику вне его
    addCreditCardModal.addEventListener('click', (e) => {
        if (e.target === addCreditCardModal) {
            addCreditCardModal.classList.add('hidden');
            document.getElementById('addCreditCardForm').reset();
        }
    });

    // Функция загрузки кредитов
    async function fetchAndRenderLoans() {
        loansLoading.classList.remove('hidden');
        loansList.innerHTML = '';

                         try {
             const response = await fetch('/api/loans');
            const result = await response.json();

            if (response.ok) {
                renderLoans(result.loans);
            } else {
                console.error('Error fetching loans:', result.error);
                loansList.innerHTML = '<p class="text-red-400">Ошибка при загрузке кредитов</p>';
            }
        } catch (error) {
            console.error('Network error fetching loans:', error);
            loansList.innerHTML = '<p class="text-red-400">Ошибка сети при загрузке кредитов</p>';
        } finally {
            loansLoading.classList.add('hidden');
        }
    }

    // Функция отображения кредитов
    function renderLoans(loans) {
        if (loans.length === 0) {
            loansList.innerHTML = '<p class="text-gray-500 col-span-full text-center">Кредиты не найдены</p>';
            return;
        }

        loansList.innerHTML = loans.map(loan => {
            const progressPercent = ((loan.paid_amount / loan.principal) * 100).toFixed(1);
            const remainingMonths = Math.ceil(loan.remaining_balance / loan.monthly_payment);
            
            return `
                <div class="bg-[#1f2937] rounded-lg p-4 border border-[#374151]">
                    <div class="flex justify-between items-start mb-3">
                        <h3 class="text-lg font-semibold text-white">${loan.loan_name || `Кредит #${loan.id}`}</h3>
                        <div class="flex items-center gap-2">
                            <span class="text-sm text-gray-400">#${loan.id}</span>
                            <button onclick="deleteLoan(${loan.id})" class="text-red-400 hover:text-red-300 text-sm font-medium">Удалить</button>
                        </div>
                    </div>
                    <div class="space-y-2 text-sm">
                        <div class="flex justify-between">
                            <span class="text-gray-400">Основная сумма:</span>
                            <span class="text-white">${loan.principal.toLocaleString('ru-RU')} грн</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-400">Ставка:</span>
                            <span class="text-white">${loan.interest_rate}%</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-400">Срок:</span>
                            <span class="text-white">${loan.term_months} мес.</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-400">Ежемесячный платеж:</span>
                            <span class="text-white">${loan.monthly_payment.toLocaleString('ru-RU')} грн</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-400">Оплачено:</span>
                            <span class="text-green-400">${loan.paid_amount.toLocaleString('ru-RU')} грн</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-400">Остаток:</span>
                            <span class="text-red-400">${loan.remaining_balance.toLocaleString('ru-RU')} грн</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-400">Прогресс:</span>
                            <span class="text-blue-400">${progressPercent}%</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-400">Осталось месяцев:</span>
                            <span class="text-yellow-400">~${remainingMonths}</span>
                        </div>
                    </div>
                    <div class="w-full bg-gray-600 rounded-full h-2 mt-3">
                        <div class="bg-blue-500 h-2 rounded-full" style="width: ${progressPercent}%"></div>
                    </div>
                    ${loan.remaining_balance > 0 ? `
                    <div class="mt-4 flex gap-2">
                        <input type="number" id="payment-${loan.id}" placeholder="Сумма платежа" step="0.01" class="flex-1 bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2">
                        <button onclick="recordLoanPayment(${loan.id})" class="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md transition duration-300 text-sm">Записать платеж</button>
                    </div>
                    ` : '<div class="mt-4 text-center text-green-400 font-semibold">Кредит полностью погашен!</div>'}
                </div>
            `;
        }).join('');
    }

    // Функция загрузки кредитных карт
    async function fetchAndRenderCreditCards() {
        creditCardsLoading.classList.remove('hidden');
        creditCardsList.innerHTML = '';

        try {
            const response = await fetch('/api/credit-cards');
            const result = await response.json();

            if (response.ok) {
                renderCreditCards(result.creditCards);
            } else {
                console.error('Error fetching credit cards:', result.error);
                creditCardsList.innerHTML = '<p class="text-red-400">Ошибка при загрузке кредитных карт</p>';
            }
        } catch (error) {
            console.error('Network error fetching credit cards:', error);
            creditCardsList.innerHTML = '<p class="text-red-400">Ошибка сети при загрузке кредитных карт</p>';
        } finally {
            creditCardsLoading.classList.add('hidden');
        }
    }

    // Глобальная функция для записи платежа по кредиту
    window.recordLoanPayment = async function(loanId) {
        const paymentInput = document.getElementById(`payment-${loanId}`);
        const paymentAmount = paymentInput.value;

        if (!paymentAmount || paymentAmount <= 0) {
            alert('Пожалуйста, введите корректную сумму платежа');
            return;
        }

                         try {
             const response = await fetch('/api/loans', {
                 method: 'PATCH',
                 headers: {
                     'Content-Type': 'application/json',
                 },
                 body: JSON.stringify({
                     loan_id: loanId,
                     payment_amount: parseFloat(paymentAmount)
                 }),
             });

            const result = await response.json();

            if (response.ok) {
                alert(`Платеж в размере ${paymentAmount} грн успешно записан!`);
                paymentInput.value = '';
                fetchAndRenderLoans();
            } else {
                console.error('Server error:', result);
                alert(`Ошибка при записи платежа: ${result.error}`);
            }
        } catch (error) {
            console.error('Network error recording payment:', error);
            alert('Произошла ошибка сети при записи платежа');
        }
    };

    // Функция отображения кредитных карт
    function renderCreditCards(creditCards) {
        if (creditCards.length === 0) {
            creditCardsList.innerHTML = '<p class="text-gray-500 col-span-full text-center">Кредитные карты не найдены</p>';
            return;
        }

        creditCardsList.innerHTML = creditCards.map(card => {
            const today = new Date();
            
            // Функция для расчета льготного периода по новой логике
            function calculateGracePeriod(card) {
                if (!card.first_transaction_date) {
                    return { status: 'Неизвестно', class: 'text-gray-400', daysLeft: null };
                }

                const firstTransaction = new Date(card.first_transaction_date);
                const today = new Date();
                
                // Находим начало расчетного периода (месяц первой операции)
                const billingPeriodStart = new Date(firstTransaction.getFullYear(), firstTransaction.getMonth(), 1);
                
                // Конец расчетного периода - конец месяца первой операции
                const billingPeriodEnd = new Date(firstTransaction.getFullYear(), firstTransaction.getMonth() + 1, 0);
                
                // Конец льготного периода - конец следующего месяца после расчетного периода
                const gracePeriodEnd = new Date(billingPeriodEnd.getFullYear(), billingPeriodEnd.getMonth() + 1, billingPeriodEnd.getDate());
                
                // Вычисляем дни до конца льготного периода
                const daysUntilGraceEnd = Math.ceil((gracePeriodEnd - today) / (1000 * 60 * 60 * 24));
                
                if (daysUntilGraceEnd > 0) {
                    return { 
                        status: `Льготный период активен (${daysUntilGraceEnd} дн.)`, 
                        class: 'text-green-400', 
                        daysLeft: daysUntilGraceEnd 
                    };
                } else if (daysUntilGraceEnd === 0) {
                    return { 
                        status: 'Последний день льготного периода', 
                        class: 'text-yellow-400', 
                        daysLeft: 0 
                    };
                } else {
                    return { 
                        status: 'Льготный период истек', 
                        class: 'text-red-400', 
                        daysLeft: null 
                    };
                }
            }

            // Вычисляем даты выписки и платежа для текущего месяца
            const statementDate = card.statement_day ? new Date(today.getFullYear(), today.getMonth(), card.statement_day) : null;
            const paymentDueDate = card.payment_due_day ? new Date(today.getFullYear(), today.getMonth(), card.payment_due_day) : null;
            
            // Если день выписки/платежа уже прошел в этом месяце, берем следующий месяц
            if (statementDate && statementDate < today) {
                statementDate.setMonth(statementDate.getMonth() + 1);
            }
            if (paymentDueDate && paymentDueDate < today) {
                paymentDueDate.setMonth(paymentDueDate.getMonth() + 1);
            }

            // Вычисляем количество дней до платежа
            let daysUntilPayment = null;
            if (paymentDueDate) {
                const diffTime = paymentDueDate - today;
                daysUntilPayment = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            }

            // Определяем статус льготного периода по новой логике
            const gracePeriodInfo = calculateGracePeriod(card);

            return `
                <div class="bg-[#1f2937] rounded-lg p-4 border border-[#374151]">
                    <div class="flex justify-between items-start mb-3">
                        <h3 class="text-lg font-semibold text-white">${card.card_name}</h3>
                        <div class="flex items-center gap-2">
                            <span class="text-sm text-gray-400">#${card.id}</span>
                            <button onclick="deleteCreditCard(${card.id})" class="text-red-400 hover:text-red-300 text-sm font-medium">Удалить</button>
                        </div>
                    </div>
                    <div class="space-y-2 text-sm">
                        <div class="flex justify-between">
                            <span class="text-gray-400">Льготный период:</span>
                            <span class="text-white">${card.grace_period_days} дн.</span>
                        </div>
                        ${card.first_transaction_date ? `
                        <div class="flex justify-between">
                            <span class="text-gray-400">Первая операция:</span>
                            <span class="text-white">${new Date(card.first_transaction_date).toLocaleDateString('ru-RU')}</span>
                        </div>
                        ` : ''}
                        ${card.statement_day ? `
                        <div class="flex justify-between">
                            <span class="text-gray-400">День выписки:</span>
                            <span class="text-white">${card.statement_day}</span>
                        </div>
                        ` : ''}
                        ${card.payment_due_day ? `
                        <div class="flex justify-between">
                            <span class="text-gray-400">День платежа:</span>
                            <span class="text-white">${card.payment_due_day}</span>
                        </div>
                        ` : ''}
                        <div class="flex justify-between">
                            <span class="text-gray-400">Задолженность:</span>
                            <span class="text-red-400">${card.unpaid_balance.toLocaleString('ru-RU')} грн</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-400">Статус льготного периода:</span>
                            <span class="${gracePeriodInfo.class}">${gracePeriodInfo.status}</span>
                        </div>
                        ${daysUntilPayment !== null ? `
                        <div class="flex justify-between">
                            <span class="text-gray-400">До платежа:</span>
                            <span class="${daysUntilPayment > 7 ? 'text-green-400' : daysUntilPayment > 0 ? 'text-yellow-400' : 'text-red-400'}">${daysUntilPayment} дн.</span>
                        </div>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');
    }

    // Глобальная функция для удаления кредита
    window.deleteLoan = async function(loanId) {
        if (!confirm('Вы уверены, что хотите удалить этот кредит?')) {
            return;
        }

        try {
            const response = await fetch(`/api/loans?id=${loanId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            const result = await response.json();

            if (response.ok) {
                alert('Кредит успешно удален!');
                fetchAndRenderLoans();
            } else {
                console.error('Server error:', result);
                alert(`Ошибка при удалении кредита: ${result.error}`);
            }
        } catch (error) {
            console.error('Network error deleting loan:', error);
            alert('Произошла ошибка сети при удалении кредита');
        }
    };

    // Глобальная функция для удаления кредитной карты
    window.deleteCreditCard = async function(cardId) {
        if (!confirm('Вы уверены, что хотите удалить эту кредитную карту?')) {
            return;
        }

        try {
            const response = await fetch(`/api/credit-cards?id=${cardId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            const result = await response.json();

            if (response.ok) {
                alert('Кредитная карта успешно удалена!');
                fetchAndRenderCreditCards();
            } else {
                console.error('Server error:', result);
                alert(`Ошибка при удалении кредитной карты: ${result.error}`);
            }
        } catch (error) {
            console.error('Network error deleting credit card:', error);
            alert('Произошла ошибка сети при удалении кредитной карты');
        }
    };

    // --- Начальная загрузка ---
    // Устанавливаем текущий год и месяц и запускаем начальную загрузку данных
    const today = new Date();
    filterYearInput.value = today.getFullYear();
    filterMonthSelect.value = String(today.getMonth() + 1).padStart(2, '0'); // Устанавливаем текущий месяц
    fetchAndRenderTransactions();
    fetchAndRenderLoans();
    fetchAndRenderCreditCards();
    fetchAndRenderCardUsageAnalysis(); // Добавляем вызов новой функции
    loadBudget();

    // Логика скрытия/отображения содержимого карточки "Использование карт по категориям"
    const isCardUsageHidden = localStorage.getItem('cardUsageHidden') === 'true';
    if (isCardUsageHidden) {
        cardUsageContentDiv.classList.add('hidden');
        toggleCardUsageVisibilityButton.textContent = 'Показать';
    } else {
        cardUsageContentDiv.classList.remove('hidden');
        toggleCardUsageVisibilityButton.textContent = 'Скрыть';
    }

    toggleCardUsageVisibilityButton.addEventListener('click', () => {
        const isHidden = cardUsageContentDiv.classList.toggle('hidden');
        localStorage.setItem('cardUsageHidden', isHidden);
        toggleCardUsageVisibilityButton.textContent = isHidden ? 'Показать' : 'Скрыть';
    });

    // Логика скрытия/отображения содержимого карточки "Планирование бюджета на месяц"
    const isBudgetHidden = localStorage.getItem('budgetHidden') === 'true';
    if (isBudgetHidden) {
        budgetContentDiv.classList.add('hidden');
        toggleBudgetVisibilityButton.textContent = 'Показать';
    } else {
        budgetContentDiv.classList.remove('hidden');
        toggleBudgetVisibilityButton.textContent = 'Скрыть';
    }

    toggleBudgetVisibilityButton.addEventListener('click', () => {
        const isHidden = budgetContentDiv.classList.toggle('hidden');
        localStorage.setItem('budgetHidden', isHidden);
        toggleBudgetVisibilityButton.textContent = isHidden ? 'Показать' : 'Скрыть';
    });

    // Логика скрытия/отображения содержимого карточки "Траты vs. Доходы"
    const isSpendIncomeHidden = localStorage.getItem('spendIncomeHidden') === 'true';
    if (isSpendIncomeHidden) {
        spendIncomeContentDiv.classList.add('hidden');
        toggleSpendIncomeVisibilityButton.textContent = 'Показать';
    } else {
        spendIncomeContentDiv.classList.remove('hidden');
        toggleSpendIncomeVisibilityButton.textContent = 'Скрыть';
    }

    toggleSpendIncomeVisibilityButton.addEventListener('click', () => {
        const isHidden = spendIncomeContentDiv.classList.toggle('hidden');
        localStorage.setItem('spendIncomeHidden', isHidden);
        toggleSpendIncomeVisibilityButton.textContent = isHidden ? 'Показать' : 'Скрыть';
    });

    // Логика скрытия/отображения содержимого карточки "Аномалии"
    const isAnomaliesHidden = localStorage.getItem('anomaliesHidden') === 'true';
    if (isAnomaliesHidden) {
        anomaliesContentDiv.classList.add('hidden');
        toggleAnomaliesVisibilityButton.textContent = 'Показать';
    } else {
        anomaliesContentDiv.classList.remove('hidden');
        toggleAnomaliesVisibilityButton.textContent = 'Скрыть';
    }

    toggleAnomaliesVisibilityButton.addEventListener('click', () => {
        const isHidden = anomaliesContentDiv.classList.toggle('hidden');
        localStorage.setItem('anomaliesHidden', isHidden);
        toggleAnomaliesVisibilityButton.textContent = isHidden ? 'Показать' : 'Скрыть';
    });

    // Логика скрытия/отображения содержимого карточки "Последние транзакции"
    const isTransactionsHidden = localStorage.getItem('transactionsHidden') === 'true';
    if (isTransactionsHidden) {
        transactionsContentDiv.classList.add('hidden');
        toggleTransactionsVisibilityButton.textContent = 'Показать';
    } else {
        transactionsContentDiv.classList.remove('hidden');
        toggleTransactionsVisibilityButton.textContent = 'Скрыть';
    }

    toggleTransactionsVisibilityButton.addEventListener('click', () => {
        const isHidden = transactionsContentDiv.classList.toggle('hidden');
        localStorage.setItem('transactionsHidden', isHidden);
        toggleTransactionsVisibilityButton.textContent = isHidden ? 'Показать' : 'Скрыть';
    });

    // Логика скрытия/отображения содержимого карточки "Глубокий анализ трат"
    const isDeepAnalysisHidden = localStorage.getItem('deepAnalysisHidden') === 'true';
    if (isDeepAnalysisHidden) {
        deepAnalysisContentDiv.classList.add('hidden');
        toggleDeepAnalysisVisibilityButton.textContent = 'Показать';
    } else {
        deepAnalysisContentDiv.classList.remove('hidden');
        toggleDeepAnalysisVisibilityButton.textContent = 'Скрыть';
    }

    toggleDeepAnalysisVisibilityButton.addEventListener('click', () => {
        const isHidden = deepAnalysisContentDiv.classList.toggle('hidden');
        localStorage.setItem('deepAnalysisHidden', isHidden);
        toggleDeepAnalysisVisibilityButton.textContent = isHidden ? 'Показать' : 'Скрыть';
    });
});

// Асинхронная функция для получения и отображения анализа использования карт
async function fetchAndRenderCardUsageAnalysis() {
    const filterMonthSelect = document.getElementById('filterMonth');
    const filterYearInput = document.getElementById('filterYear');
    const cardUsageAnalysisResultDiv = document.getElementById('cardUsageAnalysisResult');
    const cardUsageAnalysisLoadingDiv = document.getElementById('cardUsageAnalysisLoading');
    const cardUsageMainContentDiv = document.getElementById('cardUsageMainContent');
    const cardCategoriesContentDiv = document.getElementById('cardCategoriesContent');
    const cardCategoriesListDiv = document.getElementById('cardCategoriesList');
    const cardCategoriesLoadingDiv = document.getElementById('cardCategoriesLoading');
    const showCardUsageMainButton = document.getElementById('showCardUsageMainButton');
    const showCardCategoriesButton = document.getElementById('showCardCategoriesButton');

    const selectedMonth = filterMonthSelect.value;
    const selectedYear = filterYearInput.value;

    if (!selectedYear) {
        cardUsageAnalysisResultDiv.innerHTML = '<p class="text-gray-400">Пожалуйста, выберите год для анализа использования карт.</p>';
        cardCategoriesListDiv.innerHTML = '<p class="text-gray-400">Пожалуйста, выберите год для анализа использования карт.</p>';
        return;
    }

    cardUsageAnalysisLoadingDiv.classList.remove('hidden');
    cardCategoriesLoadingDiv.classList.remove('hidden');

    const params = new URLSearchParams({ year: selectedYear, analysisType: 'cardUsage' });
    if (selectedMonth) {
        params.append('month', selectedMonth);
    }

    try {
        const response = await fetch(`/api/get-transactions?${params.toString()}`);
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Failed to fetch card usage analysis');
        }
        const { cardUsage, categoriesWithMostUsedCard } = await response.json();
        renderCardUsageAnalysis(cardUsage);
        renderCardCategoriesList(categoriesWithMostUsedCard);
    } catch (error) {
        console.error('Error fetching card usage analysis:', error);
        cardUsageAnalysisResultDiv.innerHTML = `<p class="text-red-400">Ошибка при загрузке анализа использования карт: ${error.message}</p>`;
        cardCategoriesListDiv.innerHTML = `<p class="text-red-400">Ошибка при загрузке категорий: ${error.message}</p>`;
    } finally {
        cardUsageAnalysisLoadingDiv.classList.add('hidden');
        cardCategoriesLoadingDiv.classList.add('hidden');
    }
}

// Функция для отображения результатов анализа использования карт (основной вид)
function renderCardUsageAnalysis(cardUsage) {
    const cardUsageAnalysisResultDiv = document.getElementById('cardUsageAnalysisResult');
    cardUsageAnalysisResultDiv.innerHTML = '';
    const cardNames = Object.keys(cardUsage);

    if (cardNames.length === 0) {
        cardUsageAnalysisResultDiv.innerHTML = '<p class="text-gray-500">Данные об использовании карт не найдены для выбранного периода.</p>';
        return;
    }

    cardNames.forEach(cardName => {
        const cardData = cardUsage[cardName];
        const sortedCategories = Object.entries(cardData.categories)
            .sort(([, catA], [, catB]) => catB.count - catA.count) // Сортировка по убыванию числа операций
            .slice(0, 3); // Берем топ-3

        const topCategoriesHtml = sortedCategories.map(([category, data]) => 
            `<span class="inline-block bg-gray-700 text-gray-300 text-xs px-2 py-1 rounded-full">${category} (${data.count})</span>`
        ).join(' ');

        const cardDiv = document.createElement('div');
        cardDiv.className = 'bg-gray-800 rounded-lg p-4 border border-gray-700';
        cardDiv.innerHTML = `
            <div class="flex justify-between items-center mb-2">
                <h3 class="text-lg font-semibold text-white">${cardName}</h3>
                <div class="flex gap-2">
                    ${topCategoriesHtml}
                </div>
            </div>
            <p class="text-gray-400 text-sm mb-2">Всего потрачено: <span class="font-semibold text-blue-400">${cardData.totalSpent.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} грн</span></p>
        `;

        const categoriesList = document.createElement('ul');
        categoriesList.className = 'list-disc list-inside text-gray-300 space-y-1';

        // Отображаем все категории, отсортированные по сумме
        Object.entries(cardData.categories)
            .sort(([, catA], [, catB]) => catB.amount - catA.amount)
            .forEach(([category, data]) => {
                const listItem = document.createElement('li');
                listItem.innerHTML = `${category}: <span class="font-semibold text-blue-400">${data.amount.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} грн</span> (${data.count} операций)`;
                categoriesList.appendChild(listItem);
            });
        cardDiv.appendChild(categoriesList);
        cardUsageAnalysisResultDiv.appendChild(cardDiv);
    });
}

// Функция для отображения списка категорий с наиболее используемыми картами
function renderCardCategoriesList(categoriesWithMostUsedCard) {
    const cardCategoriesListDiv = document.getElementById('cardCategoriesList');
    cardCategoriesListDiv.innerHTML = '';

    if (Object.keys(categoriesWithMostUsedCard).length === 0) {
        cardCategoriesListDiv.innerHTML = '<p class="text-gray-500">Данные по категориям не найдены для выбранного периода.</p>';
        return;
    }

    // Преобразуем объект в массив для сортировки, затем сортируем по убыванию числа операций
    const sortedCategories = Object.entries(categoriesWithMostUsedCard)
        .sort(([, a], [, b]) => b.count - a.count);

    sortedCategories.forEach(([categoryName, mostUsedCard]) => {
        const categoryDiv = document.createElement('div');
        categoryDiv.className = 'bg-gray-800 rounded-lg p-4 border border-gray-700';
        categoryDiv.innerHTML = `
            <h3 class="text-lg font-semibold text-white mb-2">${categoryName}</h3>
            <p class="text-gray-400 text-sm">Чаще всего используется карта: <span class="font-semibold text-blue-400">${mostUsedCard.cardName}</span> (${mostUsedCard.count} операций)</p>
        `;
        cardCategoriesListDiv.appendChild(categoryDiv);
    });
}

// Добавляем обработчики для новых кнопок
document.addEventListener('DOMContentLoaded', function() {
    const showCardUsageMainButton = document.getElementById('showCardUsageMainButton');
    const showCardCategoriesButton = document.getElementById('showCardCategoriesButton');
    const cardUsageMainContentDiv = document.getElementById('cardUsageMainContent');
    const cardCategoriesContentDiv = document.getElementById('cardCategoriesContent');

    // Инициализация: по умолчанию активна вкладка "Категории"
    cardUsageMainContentDiv.classList.add('hidden');
    cardCategoriesContentDiv.classList.remove('hidden');
    showCardCategoriesButton.classList.add('bg-blue-600', 'hover:bg-blue-700');
    showCardCategoriesButton.classList.remove('bg-gray-700', 'hover:bg-gray-600');
    showCardUsageMainButton.classList.add('bg-gray-700', 'hover:bg-gray-600');
    showCardUsageMainButton.classList.remove('bg-blue-600', 'hover:bg-blue-700');

    showCardUsageMainButton.addEventListener('click', () => {
        cardUsageMainContentDiv.classList.remove('hidden');
        cardCategoriesContentDiv.classList.add('hidden');
        showCardUsageMainButton.classList.add('bg-blue-600', 'hover:bg-blue-700');
        showCardUsageMainButton.classList.remove('bg-gray-700', 'hover:bg-gray-600');
        showCardCategoriesButton.classList.add('bg-gray-700', 'hover:bg-gray-600');
        showCardCategoriesButton.classList.remove('bg-blue-600', 'hover:bg-blue-700');
    });

    showCardCategoriesButton.addEventListener('click', () => {
        cardUsageMainContentDiv.classList.add('hidden');
        cardCategoriesContentDiv.classList.remove('hidden');
        showCardCategoriesButton.classList.add('bg-blue-600', 'hover:bg-blue-700');
        showCardCategoriesButton.classList.remove('bg-gray-700', 'hover:bg-gray-600');
        showCardUsageMainButton.classList.add('bg-gray-700', 'hover:bg-gray-600');
        showCardUsageMainButton.classList.remove('bg-blue-600', 'hover:bg-blue-700');
    });
});
