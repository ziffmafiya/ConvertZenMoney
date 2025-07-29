// Модуль для управления кредитами и кредитными картами
class CreditManager {
    constructor() {
        this.userId = null;
        this.loans = [];
        this.creditCards = [];
        this.summary = null;
        this.init();
    }

    // Инициализация модуля
    init() {
        this.userId = this.getUserId();
        if (this.userId) {
            this.loadCreditData();
        }
    }

    // Получение ID пользователя (заглушка - нужно адаптировать под вашу систему аутентификации)
    getUserId() {
        // TODO: Заменить на реальное получение ID пользователя
        return localStorage.getItem('user_id') || 'demo-user';
    }

    // Загрузка всех данных о кредитах
    async loadCreditData() {
        try {
            console.log('Loading credit data...');
            await Promise.all([
                this.loadLoans(),
                this.loadCreditCards(),
                this.loadSummary()
            ]);
            console.log('Credit data loaded:', {
                loans: this.loans,
                creditCards: this.creditCards,
                summary: this.summary
            });
            this.renderCreditDashboard();
        } catch (error) {
            console.error('Error loading credit data:', error);
        }
    }

    // Загрузка кредитов
    async loadLoans() {
        try {
            console.log('Loading loans for user:', this.userId);
            const response = await fetch('/api/credit-management', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    action: 'get_loans',
                    userId: this.userId 
                })
            });
            if (response.ok) {
                const data = await response.json();
                this.loans = data.loans || [];
                console.log('Loans loaded:', this.loans);
            } else {
                const errorText = await response.text();
                console.error('Failed to load loans:', errorText);
                throw new Error('Failed to load loans');
            }
        } catch (error) {
            console.error('Error in loadLoans:', error);
            this.loans = [];
        }
    }

    // Загрузка кредитных карт
    async loadCreditCards() {
        try {
            console.log('Loading credit cards for user:', this.userId);
            const response = await fetch('/api/credit-management', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    action: 'get_credit_cards',
                    userId: this.userId 
                })
            });
            if (response.ok) {
                const data = await response.json();
                this.creditCards = data.cards || [];
                console.log('Credit cards loaded:', this.creditCards);
            } else {
                const errorText = await response.text();
                console.error('Failed to load credit cards:', errorText);
                throw new Error('Failed to load credit cards');
            }
        } catch (error) {
            console.error('Error in loadCreditCards:', error);
            this.creditCards = [];
        }
    }

    // Загрузка сводки
    async loadSummary() {
        try {
            console.log('Loading summary for user:', this.userId);
            const response = await fetch('/api/credit-management', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    action: 'get_credit_summary',
                    userId: this.userId 
                })
            });
            if (response.ok) {
                this.summary = await response.json();
                console.log('Summary loaded:', this.summary);
            } else {
                const errorText = await response.text();
                console.error('Failed to load summary:', errorText);
                throw new Error('Failed to load summary');
            }
        } catch (error) {
            console.error('Error in loadSummary:', error);
            this.summary = null;
        }
    }

    // Добавление нового кредита
    async addLoan(loanData) {
        const response = await fetch('/api/credit-management', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'add_loan',
                userId: this.userId,
                ...loanData
            })
        });

        if (response.ok) {
            await this.loadLoans();
            return await response.json();
        } else {
            throw new Error('Failed to add loan');
        }
    }

    // Добавление платежа по кредиту
    async addLoanPayment(paymentData) {
        const response = await fetch('/api/credit-management', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'add_loan_payment',
                ...paymentData
            })
        });

        if (response.ok) {
            await this.loadLoans();
            return await response.json();
        } else {
            throw new Error('Failed to add loan payment');
        }
    }

    // Добавление новой кредитной карты
    async addCreditCard(cardData) {
        const response = await fetch('/api/credit-management', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'add_credit_card',
                userId: this.userId,
                ...cardData
            })
        });

        if (response.ok) {
            await this.loadCreditCards();
            return await response.json();
        } else {
            throw new Error('Failed to add credit card');
        }
    }

    // Добавление транзакции по кредитной карте
    async addCardTransaction(transactionData) {
        const response = await fetch('/api/credit-management', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'add_card_transaction',
                ...transactionData
            })
        });

        if (response.ok) {
            await this.loadCreditCards();
            return await response.json();
        } else {
            throw new Error('Failed to add card transaction');
        }
    }

    // Добавление платежа по кредитной карте
    async addCardPayment(paymentData) {
        const response = await fetch('/api/credit-management', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'add_card_payment',
                ...paymentData
            })
        });

        if (response.ok) {
            await this.loadCreditCards();
            return await response.json();
        } else {
            throw new Error('Failed to add card payment');
        }
    }

    // Рендеринг кредитной панели
    renderCreditDashboard() {
        this.renderSummaryCards();
        this.renderLoansSection();
        this.renderCreditCardsSection();
        this.renderUpcomingPayments();
        this.renderAlerts();
    }

    // Рендеринг карточек сводки
    renderSummaryCards() {
        if (!this.summary) return;

        const summaryContainer = document.getElementById('credit-summary-cards');
        if (!summaryContainer) return;

        summaryContainer.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <!-- Общий долг -->
                <div class="bg-[#161b22] rounded-2xl p-6 border border-[#30363d]">
                    <h3 class="text-lg font-semibold text-gray-400 mb-2">Общий долг</h3>
                    <p class="text-3xl font-bold text-red-400">${this.formatCurrency(this.summary.total_debt || 0)}</p>
                    <p class="text-sm text-gray-500 mt-2">Кредиты + Карты</p>
                </div>

                <!-- Ежемесячные обязательства -->
                <div class="bg-[#161b22] rounded-2xl p-6 border border-[#30363d]">
                    <h3 class="text-lg font-semibold text-gray-400 mb-2">Ежемесячные платежи</h3>
                    <p class="text-3xl font-bold text-yellow-400">${this.formatCurrency(this.summary.total_monthly_obligations || 0)}</p>
                    <p class="text-sm text-gray-500 mt-2">По кредитам</p>
                </div>

                <!-- Кредитный рейтинг -->
                <div class="bg-[#161b22] rounded-2xl p-6 border border-[#30363d]">
                    <h3 class="text-lg font-semibold text-gray-400 mb-2">Кредитный рейтинг</h3>
                    <p class="text-3xl font-bold ${this.getCreditScoreColor(this.summary.credit_health_score || 0)}">${this.summary.credit_health_score || 0}</p>
                    <p class="text-sm text-gray-500 mt-2">из 100</p>
                </div>

                <!-- Утилизация кредита -->
                <div class="bg-[#161b22] rounded-2xl p-6 border border-[#30363d]">
                    <h3 class="text-lg font-semibold text-gray-400 mb-2">Утилизация кредита</h3>
                    <p class="text-3xl font-bold ${this.getUtilizationColor(this.summary.utilization_ratio || 0)}">${(this.summary.utilization_ratio || 0).toFixed(1)}%</p>
                    <p class="text-sm text-gray-500 mt-2">Кредитные карты</p>
                </div>
            </div>
        `;
    }

    // Рендеринг секции кредитов
    renderLoansSection() {
        const loansContainer = document.getElementById('loans-section');
        if (!loansContainer) return;

        if (this.loans.length === 0) {
            loansContainer.innerHTML = `
                <div class="bg-[#161b22] rounded-2xl p-8 border border-[#30363d] text-center">
                    <h3 class="text-xl font-semibold text-gray-400 mb-4">Кредиты</h3>
                    <p class="text-gray-500 mb-4">У вас пока нет активных кредитов</p>
                    <button onclick="creditManager.showAddLoanModal()" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg">
                        Добавить кредит
                    </button>
                </div>
            `;
            return;
        }

        const loansHTML = this.loans.map(loan => `
            <div class="bg-[#161b22] rounded-2xl p-6 border border-[#30363d]">
                <div class="flex justify-between items-start mb-4">
                    <div>
                        <h3 class="text-xl font-semibold text-white">${loan.loan_name}</h3>
                        <p class="text-gray-400">${loan.bank_name || 'Банк не указан'}</p>
                    </div>
                    <span class="px-3 py-1 rounded-full text-sm font-semibold ${this.getLoanStatusColor(loan.status)}">
                        ${this.getLoanStatusText(loan.status)}
                    </span>
                </div>

                <div class="grid grid-cols-2 gap-4 mb-4">
                    <div>
                        <p class="text-gray-400 text-sm">Остаток долга</p>
                        <p class="text-xl font-bold text-white">${this.formatCurrency(loan.remaining_balance)}</p>
                    </div>
                    <div>
                        <p class="text-gray-400 text-sm">Ежемесячный платеж</p>
                        <p class="text-xl font-bold text-yellow-400">${this.formatCurrency(loan.monthly_payment)}</p>
                    </div>
                    <div>
                        <p class="text-gray-400 text-sm">Процентная ставка</p>
                        <p class="text-lg font-semibold text-blue-400">${(loan.interest_rate * 100).toFixed(2)}%</p>
                    </div>
                    <div>
                        <p class="text-gray-400 text-sm">Прогресс погашения</p>
                        <p class="text-lg font-semibold text-green-400">${loan.progress_percent.toFixed(1)}%</p>
                    </div>
                </div>

                <div class="w-full bg-gray-700 rounded-full h-2 mb-4">
                    <div class="bg-green-500 h-2 rounded-full" style="width: ${loan.progress_percent}%"></div>
                </div>

                <div class="flex gap-2">
                    <button onclick="creditManager.showAddPaymentModal('${loan.id}')" class="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg text-sm">
                        Добавить платеж
                    </button>
                    <button onclick="creditManager.showLoanDetails('${loan.id}')" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg text-sm">
                        Детали
                    </button>
                </div>
            </div>
        `).join('');

        loansContainer.innerHTML = `
            <div class="mb-8">
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-2xl font-bold text-white">Кредиты</h2>
                    <button onclick="creditManager.showAddLoanModal()" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg">
                        Добавить кредит
                    </button>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    ${loansHTML}
                </div>
            </div>
        `;
    }

    // Рендеринг секции кредитных карт
    renderCreditCardsSection() {
        const cardsContainer = document.getElementById('credit-cards-section');
        if (!cardsContainer) return;

        if (this.creditCards.length === 0) {
            cardsContainer.innerHTML = `
                <div class="bg-[#161b22] rounded-2xl p-8 border border-[#30363d] text-center">
                    <h3 class="text-xl font-semibold text-gray-400 mb-4">Кредитные карты</h3>
                    <p class="text-gray-500 mb-4">У вас пока нет кредитных карт</p>
                    <button onclick="creditManager.showAddCardModal()" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg">
                        Добавить карту
                    </button>
                </div>
            `;
            return;
        }

        const cardsHTML = this.creditCards.map(card => `
            <div class="bg-[#161b22] rounded-2xl p-6 border border-[#30363d]">
                <div class="flex justify-between items-start mb-4">
                    <div>
                        <h3 class="text-xl font-semibold text-white">${card.card_name}</h3>
                        <p class="text-gray-400">${card.bank_name}</p>
                    </div>
                    <span class="px-3 py-1 rounded-full text-sm font-semibold ${card.is_in_grace_period ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}">
                        ${card.is_in_grace_period ? 'Беспроцентный период' : 'Проценты начисляются'}
                    </span>
                </div>

                <div class="grid grid-cols-2 gap-4 mb-4">
                    <div>
                        <p class="text-gray-400 text-sm">Текущий баланс</p>
                        <p class="text-xl font-bold text-white">${this.formatCurrency(card.current_balance)}</p>
                    </div>
                    <div>
                        <p class="text-gray-400 text-sm">Кредитный лимит</p>
                        <p class="text-xl font-bold text-blue-400">${this.formatCurrency(card.credit_limit)}</p>
                    </div>
                    <div>
                        <p class="text-gray-400 text-sm">Доступный кредит</p>
                        <p class="text-lg font-semibold text-green-400">${this.formatCurrency(card.credit_limit - card.current_balance)}</p>
                    </div>
                    <div>
                        <p class="text-gray-400 text-sm">Утилизация</p>
                        <p class="text-lg font-semibold ${this.getUtilizationColor(card.utilization_ratio)}">${card.utilization_ratio.toFixed(1)}%</p>
                    </div>
                </div>

                <div class="w-full bg-gray-700 rounded-full h-2 mb-4">
                    <div class="bg-blue-500 h-2 rounded-full" style="width: ${card.utilization_ratio}%"></div>
                </div>

                <div class="grid grid-cols-2 gap-4 mb-4 text-sm">
                    <div>
                        <p class="text-gray-400">Дата платежа</p>
                        <p class="text-white">${card.payment_due_date_formatted}</p>
                        <p class="text-gray-500">через ${card.days_until_payment_due} дней</p>
                    </div>
                    <div>
                        <p class="text-gray-400">Минимальный платеж</p>
                        <p class="text-yellow-400">${this.formatCurrency(card.minimum_payment)}</p>
                    </div>
                </div>

                <div class="flex gap-2">
                    <button onclick="creditManager.showAddTransactionModal('${card.id}')" class="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg text-sm">
                        Добавить транзакцию
                    </button>
                    <button onclick="creditManager.showAddCardPaymentModal('${card.id}')" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg text-sm">
                        Добавить платеж
                    </button>
                </div>
            </div>
        `).join('');

        cardsContainer.innerHTML = `
            <div class="mb-8">
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-2xl font-bold text-white">Кредитные карты</h2>
                    <button onclick="creditManager.showAddCardModal()" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg">
                        Добавить карту
                    </button>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    ${cardsHTML}
                </div>
            </div>
        `;
    }

    // Рендеринг предстоящих платежей
    renderUpcomingPayments() {
        const paymentsContainer = document.getElementById('upcoming-payments');
        if (!paymentsContainer) return;

        // Создаем список предстоящих платежей из кредитов и карт
        const upcomingPayments = [];
        
        // Добавляем платежи по кредитам
        this.loans.forEach(loan => {
            if (loan.status === 'active') {
                upcomingPayments.push({
                    name: loan.loan_name,
                    type: 'loan',
                    amount: loan.monthly_payment,
                    days_until_due: 30 // Упрощенно - через 30 дней
                });
            }
        });

        // Добавляем платежи по кредитным картам
        this.creditCards.forEach(card => {
            if (card.days_until_payment_due > 0) {
                upcomingPayments.push({
                    name: card.card_name,
                    type: 'card',
                    amount: card.minimum_payment,
                    days_until_due: card.days_until_payment_due
                });
            }
        });

        if (upcomingPayments.length === 0) {
            paymentsContainer.innerHTML = `
                <div class="bg-[#161b22] rounded-2xl p-6 border border-[#30363d]">
                    <h3 class="text-lg font-semibold text-gray-400 mb-2">Предстоящие платежи</h3>
                    <p class="text-gray-500">Нет предстоящих платежей</p>
                </div>
            `;
            return;
        }

        const paymentsHTML = upcomingPayments.map(payment => `
            <div class="flex justify-between items-center p-4 bg-gray-800 rounded-lg">
                <div>
                    <p class="font-semibold text-white">${payment.name}</p>
                    <p class="text-sm text-gray-400">${payment.type === 'loan' ? 'Кредит' : 'Кредитная карта'}</p>
                </div>
                <div class="text-right">
                    <p class="font-bold text-yellow-400">${this.formatCurrency(payment.amount)}</p>
                    <p class="text-sm ${payment.days_until_due <= 3 ? 'text-red-400' : 'text-gray-400'}">
                        ${payment.days_until_due <= 0 ? 'Просрочен' : `через ${payment.days_until_due} дней`}
                    </p>
                </div>
            </div>
        `).join('');

        paymentsContainer.innerHTML = `
            <div class="bg-[#161b22] rounded-2xl p-6 border border-[#30363d]">
                <h3 class="text-lg font-semibold text-gray-400 mb-4">Предстоящие платежи</h3>
                <div class="space-y-2">
                    ${paymentsHTML}
                </div>
            </div>
        `;
    }

    // Рендеринг предупреждений
    renderAlerts() {
        const alertsContainer = document.getElementById('credit-alerts');
        if (!alertsContainer) return;

        const alerts = [];

        // Проверяем предупреждения из summary
        if (this.summary && this.summary.alerts) {
            alerts.push(...this.summary.alerts);
        }

        // Добавляем дополнительные предупреждения
        this.creditCards.forEach(card => {
            // Высокая утилизация
            if (card.utilization_ratio > 80) {
                alerts.push({
                    type: 'high_utilization',
                    severity: 'medium',
                    message: `Высокая загрузка карты ${card.card_name} (${card.utilization_ratio.toFixed(1)}%)`
                });
            }

            // Скоро платеж
            if (card.days_until_payment_due <= 7 && card.days_until_payment_due > 0) {
                alerts.push({
                    type: 'upcoming_payment',
                    severity: 'medium',
                    message: `Скоро платеж по карте ${card.card_name} (через ${card.days_until_payment_due} дней)`
                });
            }

            // Просрочен платеж
            if (card.days_until_payment_due <= 0) {
                alerts.push({
                    type: 'overdue_payment',
                    severity: 'high',
                    message: `Просрочен платеж по карте ${card.card_name}`
                });
            }
        });

        if (alerts.length === 0) {
            alertsContainer.innerHTML = '';
            return;
        }

        const alertsHTML = alerts.map(alert => `
            <div class="p-4 rounded-lg ${this.getAlertColor(alert.severity)}">
                <p class="font-semibold">${alert.message}</p>
            </div>
        `).join('');

        alertsContainer.innerHTML = `
            <div class="mb-8">
                <h3 class="text-lg font-semibold text-gray-400 mb-4">Предупреждения</h3>
                <div class="space-y-2">
                    ${alertsHTML}
                </div>
            </div>
        `;
    }

    // Вспомогательные методы
    formatCurrency(amount) {
        return new Intl.NumberFormat('uk-UA', {
            style: 'currency',
            currency: 'UAH'
        }).format(amount);
    }

    getCreditScoreColor(score) {
        if (score >= 80) return 'text-green-400';
        if (score >= 60) return 'text-yellow-400';
        return 'text-red-400';
    }

    getUtilizationColor(ratio) {
        if (ratio <= 30) return 'text-green-400';
        if (ratio <= 50) return 'text-yellow-400';
        if (ratio <= 80) return 'text-orange-400';
        return 'text-red-400';
    }

    getLoanStatusColor(status) {
        switch (status) {
            case 'active': return 'bg-green-900 text-green-300';
            case 'paid_off': return 'bg-blue-900 text-blue-300';
            case 'defaulted': return 'bg-red-900 text-red-300';
            default: return 'bg-gray-900 text-gray-300';
        }
    }

    getLoanStatusText(status) {
        switch (status) {
            case 'active': return 'Активный';
            case 'paid_off': return 'Погашен';
            case 'defaulted': return 'Просрочен';
            default: return 'Неизвестно';
        }
    }

    getAlertColor(severity) {
        switch (severity) {
            case 'high': return 'bg-red-900 text-red-300 border border-red-700';
            case 'medium': return 'bg-yellow-900 text-yellow-300 border border-yellow-700';
            case 'low': return 'bg-blue-900 text-blue-300 border border-blue-700';
            default: return 'bg-gray-900 text-gray-300 border border-gray-700';
        }
    }

    // Модальные окна (заглушки - нужно реализовать)
    showAddLoanModal() {
        alert('Функция добавления кредита будет реализована');
    }

    showAddPaymentModal(loanId) {
        alert('Функция добавления платежа будет реализована');
    }

    showAddCardModal() {
        alert('Функция добавления карты будет реализована');
    }

    showAddTransactionModal(cardId) {
        alert('Функция добавления транзакции будет реализована');
    }

    showAddCardPaymentModal(cardId) {
        alert('Функция добавления платежа по карте будет реализована');
    }

    showLoanDetails(loanId) {
        alert('Функция просмотра деталей кредита будет реализована');
    }

    // Функция для добавления демо-данных (для тестирования)
    async addDemoData() {
        try {
            console.log('Adding demo data...');
            
            // Добавляем демо кредит
            await this.addLoan({
                loanName: 'Ипотечный кредит',
                loanType: 'mortgage',
                principalAmount: 2500000,
                interestRate: 0.085,
                loanTermMonths: 240,
                startDate: '2023-01-15',
                bankName: 'Сбербанк',
                accountNumber: '1234567890',
                notes: 'Кредит на покупку квартиры'
            });

            // Добавляем демо кредитную карту
            await this.addCreditCard({
                cardName: 'Visa Gold',
                creditLimit: 50000,
                currentBalance: 15000,
                interestRate: 0.0299,
                statementDate: '2024-02-15',
                paymentDueDate: '2024-03-05',
                gracePeriodDays: 21,
                minimumPaymentPercentage: 3,
                bankName: 'Монобанк',
                cardNumber: '****1234',
                notes: 'Основная кредитная карта'
            });

            console.log('Demo data added successfully');
            alert('Демо-данные добавлены успешно!');
        } catch (error) {
            console.error('Error adding demo data:', error);
            alert('Ошибка при добавлении демо-данных: ' + error.message);
        }
    }

    // Функция для отладки (показать текущее состояние)
    debugState() {
        console.log('=== Credit Manager Debug State ===');
        console.log('User ID:', this.userId);
        console.log('Loans:', this.loans);
        console.log('Credit Cards:', this.creditCards);
        console.log('Summary:', this.summary);
        console.log('=== End Debug State ===');
    }
}

// Инициализация менеджера кредитов
const creditManager = new CreditManager();

// Экспорт для использования в других модулях
window.creditManager = creditManager;

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing credit manager...');
    if (window.creditManager) {
        console.log('Credit manager found, loading data...');
        window.creditManager.loadCreditData();
    } else {
        console.error('Credit manager not found!');
    }
}); 