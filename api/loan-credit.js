document.addEventListener('DOMContentLoaded', function() {
    // Loan modal elements
    const loanModal = document.getElementById('loanModal');
    const addLoanButton = document.getElementById('addLoanButton');
    const closeLoanModal = document.getElementById('closeLoanModal');
    const saveLoanButton = document.getElementById('saveLoanButton');
    
    // Credit card modal elements
    const creditCardModal = document.getElementById('creditCardModal');
    const addCreditCardButton = document.getElementById('addCreditCardButton');
    const closeCreditCardModal = document.getElementById('closeCreditCardModal');
    const saveCreditCardButton = document.getElementById('saveCreditCardButton');

    // Loan modal handlers
    if (addLoanButton) {
        addLoanButton.addEventListener('click', () => loanModal.classList.remove('hidden'));
    }
    
    if (closeLoanModal) {
        closeLoanModal.addEventListener('click', () => loanModal.classList.add('hidden'));
    }
    
    if (saveLoanButton) {
        saveLoanButton.addEventListener('click', createLoan);
    }

    // Credit card modal handlers
    if (addCreditCardButton) {
        addCreditCardButton.addEventListener('click', () => creditCardModal.classList.remove('hidden'));
    }
    
    if (closeCreditCardModal) {
        closeCreditCardModal.addEventListener('click', () => creditCardModal.classList.add('hidden'));
    }
    
    if (saveCreditCardButton) {
        saveCreditCardButton.addEventListener('click', createCreditCard);
    }

    // Create new loan
    async function createLoan() {
        const principal = parseFloat(document.getElementById('loanPrincipal').value);
        const interestRate = parseFloat(document.getElementById('loanInterestRate').value);
        const termMonths = parseInt(document.getElementById('loanTermMonths').value);
        const startDate = document.getElementById('loanStartDate').value;

        if (!principal || !interestRate || !termMonths || !startDate) {
            alert('Пожалуйста, заполните все поля');
            return;
        }

        try {
            const response = await fetch('/api/track-loan', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    principal,
                    interest_rate: interestRate,
                    term_months: termMonths,
                    start_date: startDate,
                    monthly_payment: 0, // Calculated on server
                    remaining_balance: principal
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Ошибка сервера');
            }

            const data = await response.json();
            alert(`Кредит добавлен! ID: ${data.id}`);
            loanModal.classList.add('hidden');
            fetchLoans(); // Refresh loan list
        } catch (error) {
            console.error('Error creating loan:', error);
            alert(`Ошибка: ${error.message}`);
        }
    }

    // Create new credit card
    async function createCreditCard() {
        const cardName = document.getElementById('creditCardName').value;
        const gracePeriodDays = parseInt(document.getElementById('gracePeriodDays').value);
        const statementDay = parseInt(document.getElementById('statementDay').value);
        const paymentDueDay = parseInt(document.getElementById('paymentDueDay').value);

        if (!cardName || !gracePeriodDays || !statementDay || !paymentDueDay) {
            alert('Пожалуйста, заполните все поля');
            return;
        }

        try {
            const response = await fetch('/api/set-grace-period', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    card_name: cardName,
                    grace_period_days: gracePeriodDays,
                    statement_day: statementDay,
                    payment_due_day: paymentDueDay,
                    unpaid_balance: 0
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Ошибка сервера');
            }

            const data = await response.json();
            alert(`Карта добавлена! ID: ${data.id}`);
            creditCardModal.classList.add('hidden');
            fetchCreditCards(); // Refresh card list
        } catch (error) {
            console.error('Error creating credit card:', error);
            alert(`Ошибка: ${error.message}`);
        }
    }

    // Fetch and display loans
    async function fetchLoans() {
        try {
            const response = await fetch('/api/loan-progress');
            if (!response.ok) throw new Error('Ошибка загрузки кредитов');
            
            const loans = await response.json();
            const container = document.getElementById('loansList');
            container.innerHTML = '';
            
            loans.forEach(loan => {
                const loanEl = document.createElement('div');
                loanEl.className = 'bg-gray-800 p-4 rounded-lg';
                loanEl.innerHTML = `
                    <h4 class="font-semibold">${loan.principal} грн под ${loan.interest_rate}%</h4>
                    <p>Остаток: ${loan.remaining_balance} грн</p>
                    <div class="w-full bg-gray-700 rounded-full h-2 mt-2">
                        <div class="bg-blue-500 h-2 rounded-full" style="width: ${loan.progress.percentComplete}%"></div>
                    </div>
                    <p class="text-sm mt-1">${loan.progress.paymentsMade}/${loan.term_months} платежей</p>
                `;
                container.appendChild(loanEl);
            });
        } catch (error) {
            console.error('Error fetching loans:', error);
        }
    }

    // Fetch and display credit cards
    async function fetchCreditCards() {
        try {
            const response = await fetch('/api/grace-status');
            if (!response.ok) throw new Error('Ошибка загрузки карт');
            
            const cards = await response.json();
            const container = document.getElementById('creditCardsList');
            container.innerHTML = '';
            
            cards.forEach(card => {
                const cardEl = document.createElement('div');
                cardEl.className = 'bg-gray-800 p-4 rounded-lg';
                cardEl.innerHTML = `
                    <h4 class="font-semibold">${card.card_name}</h4>
                    <p>Льготный период: ${card.grace_period_days} дней</p>
                    <p>Минимальный платёж: ${card.min_payment} грн</p>
                    <p>Дней до оплаты: ${card.days_remaining}</p>
                `;
                container.appendChild(cardEl);
            });
        } catch (error) {
            console.error('Error fetching credit cards:', error);
        }
    }

    // Initial fetch
    fetchLoans();
    fetchCreditCards();
});
