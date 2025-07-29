// Демонстрационные данные для тестирования кредитной системы
// Этот файл можно использовать для тестирования функциональности

// Пример данных для добавления кредита
const demoLoanData = {
    loan_name: "Ипотека на квартиру",
    loan_type: "mortgage",
    principal_amount: 1500000,
    interest_rate: 0.085, // 8.5% годовых
    loan_term_months: 240, // 20 лет
    start_date: "2024-01-15",
    bank_name: "ПриватБанк",
    account_number: "1234567890",
    notes: "Ипотека на 2-комнатную квартиру"
};

// Пример данных для добавления кредитной карты
const demoCardData = {
    card_name: "Visa Gold",
    bank_name: "Монобанк",
    credit_limit: 50000,
    grace_period_days: 21,
    interest_rate: 0.0299, // 2.99% в месяц
    statement_date: 15, // 15-е число каждого месяца
    payment_due_date: 5, // 5-е число каждого месяца
    minimum_payment_percent: 0.05, // 5% от баланса
    card_type: "credit",
    notes: "Основная кредитная карта"
};

// Пример данных для добавления транзакции по карте
const demoTransactionData = {
    card_id: "card-uuid", // Заменить на реальный ID карты
    transaction_date: "2024-02-10",
    amount: 1500,
    description: "Покупка в супермаркете",
    category: "Продукты",
    merchant: "АТБ",
    transaction_type: "purchase",
    is_grace_period_eligible: true,
    notes: "Еженедельные покупки"
};

// Пример данных для добавления платежа по кредиту
const demoLoanPaymentData = {
    loan_id: "loan-uuid", // Заменить на реальный ID кредита
    payment_date: "2024-02-15",
    payment_amount: 12500,
    payment_type: "regular",
    notes: "Ежемесячный платеж по ипотеке"
};

// Пример данных для добавления платежа по карте
const demoCardPaymentData = {
    card_id: "card-uuid", // Заменить на реальный ID карты
    payment_date: "2024-02-05",
    payment_amount: 2500,
    payment_type: "regular",
    notes: "Платеж по кредитной карте"
};

// Функции для демонстрации работы системы
const demoFunctions = {
    // Добавить демо кредит
    async addDemoLoan() {
        try {
            const result = await creditManager.addLoan(demoLoanData);
            console.log('Демо кредит добавлен:', result);
            alert('Демо кредит успешно добавлен!');
        } catch (error) {
            console.error('Ошибка при добавлении демо кредита:', error);
            alert('Ошибка при добавлении демо кредита');
        }
    },

    // Добавить демо кредитную карту
    async addDemoCard() {
        try {
            const result = await creditManager.addCreditCard(demoCardData);
            console.log('Демо карта добавлена:', result);
            alert('Демо кредитная карта успешно добавлена!');
        } catch (error) {
            console.error('Ошибка при добавлении демо карты:', error);
            alert('Ошибка при добавлении демо карты');
        }
    },

    // Добавить демо транзакцию (требует реальный card_id)
    async addDemoTransaction(cardId) {
        try {
            const transactionData = {
                ...demoTransactionData,
                card_id: cardId
            };
            const result = await creditManager.addCardTransaction(transactionData);
            console.log('Демо транзакция добавлена:', result);
            alert('Демо транзакция успешно добавлена!');
        } catch (error) {
            console.error('Ошибка при добавлении демо транзакции:', error);
            alert('Ошибка при добавлении демо транзакции');
        }
    },

    // Добавить демо платеж по кредиту (требует реальный loan_id)
    async addDemoLoanPayment(loanId) {
        try {
            const paymentData = {
                ...demoLoanPaymentData,
                loan_id: loanId
            };
            const result = await creditManager.addLoanPayment(paymentData);
            console.log('Демо платеж по кредиту добавлен:', result);
            alert('Демо платеж по кредиту успешно добавлен!');
        } catch (error) {
            console.error('Ошибка при добавлении демо платежа:', error);
            alert('Ошибка при добавлении демо платежа');
        }
    },

    // Добавить демо платеж по карте (требует реальный card_id)
    async addDemoCardPayment(cardId) {
        try {
            const paymentData = {
                ...demoCardPaymentData,
                card_id: cardId
            };
            const result = await creditManager.addCardPayment(paymentData);
            console.log('Демо платеж по карте добавлен:', result);
            alert('Демо платеж по карте успешно добавлен!');
        } catch (error) {
            console.error('Ошибка при добавлении демо платежа:', error);
            alert('Ошибка при добавлении демо платежа');
        }
    },

    // Обновить данные
    async refreshData() {
        try {
            await creditManager.loadCreditData();
            console.log('Данные обновлены');
            alert('Данные успешно обновлены!');
        } catch (error) {
            console.error('Ошибка при обновлении данных:', error);
            alert('Ошибка при обновлении данных');
        }
    }
};

// Добавляем функции в глобальную область видимости для использования в консоли
window.demoFunctions = demoFunctions;
window.demoData = {
    loan: demoLoanData,
    card: demoCardData,
    transaction: demoTransactionData,
    loanPayment: demoLoanPaymentData,
    cardPayment: demoCardPaymentData
};

console.log('Демо функции загружены. Используйте:');
console.log('- demoFunctions.addDemoLoan() - добавить демо кредит');
console.log('- demoFunctions.addDemoCard() - добавить демо карту');
console.log('- demoFunctions.refreshData() - обновить данные');
console.log('- demoData - посмотреть демо данные'); 