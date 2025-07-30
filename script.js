document.addEventListener('DOMContentLoaded', function () {
    const moneyFlowCtx = document.getElementById('moneyFlowChart').getContext('2d');
    let moneyFlowChart;

    async function fetchTransactions() {
        try {
            const response = await fetch('/api/get-transactions?year=2024'); // Example: Fetching for a specific year
            if (!response.ok) {
                throw new Error('Failed to fetch transactions');
            }
            const { transactions } = await response.json();
            renderDashboard(transactions);
        } catch (error) {
            console.error('Error fetching transactions:', error);
        }
    }

    function renderDashboard(transactions) {
        renderMoneyFlowChart(transactions);
        renderRecentTransactions(transactions);
    }

    function renderMoneyFlowChart(transactions) {
        const monthlyData = transactions.reduce((acc, t) => {
            const month = new Date(t.date).toLocaleString('default', { month: 'short' });
            if (!acc[month]) {
                acc[month] = { income: 0, expenses: 0 };
            }
            acc[month].income += t.income;
            acc[month].expenses += t.outcome;
            return acc;
        }, {});

        const labels = Object.keys(monthlyData);
        const incomeData = labels.map(month => monthlyData[month].income);
        const expensesData = labels.map(month => monthlyData[month].expenses);

        if (moneyFlowChart) {
            moneyFlowChart.destroy();
        }

        moneyFlowChart = new Chart(moneyFlowCtx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Income',
                    data: incomeData,
                    borderColor: 'rgb(75, 192, 192)',
                    tension: 0.1
                }, {
                    label: 'Expenses',
                    data: expensesData,
                    borderColor: 'rgb(255, 99, 132)',
                    tension: 0.1
                }]
            }
        });
    }

    function renderRecentTransactions(transactions) {
        const recentTransactionsList = document.querySelector('#recent-transactions-list');
        if (!recentTransactionsList) return;

        recentTransactionsList.innerHTML = '';
        transactions.slice(0, 5).forEach(t => {
            const listItem = document.createElement('li');
            listItem.className = 'flex justify-between items-center py-2 border-b';
            listItem.innerHTML = `
                <span>${t.categoryName}</span>
                <span class="${t.income > 0 ? 'text-green-500' : 'text-red-500'}">
                    ${t.income > 0 ? '+' : '-'}$${(t.income || t.outcome).toFixed(2)}
                </span>
            `;
            recentTransactionsList.appendChild(listItem);
        });
    }

    fetchTransactions();
});
