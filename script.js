document.addEventListener('DOMContentLoaded', () => {
    // Initial Data
    const defaultExpenses = [
        { id: 1, name: 'opłaty internety telefon itd.', amount: 400, type: 'fixed' },
        { id: 2, name: 'wspólnota', amount: 550, type: 'fixed' },
        { id: 3, name: 'prąd', amount: 600, type: 'fixed' },
        { id: 4, name: 'kredo', amount: 1000, type: 'fixed' },
        { id: 5, name: 'netflixy', amount: 60, type: 'fixed' },
        { id: 8, name: 'złobek', amount: 220, type: 'fixed' },
        { id: 14, name: 'ksiegowość', amount: 300, type: 'fixed' },
        { id: 18, name: 'leasing', amount: 4600, type: 'fixed' },
        { id: 21, name: 'ubezpieczenie', amount: 360, type: 'fixed' },

        { id: 6, name: 'zachcianki', amount: 800, type: 'variable' },
        { id: 7, name: 'paliwo', amount: 600, type: 'variable' },
        { id: 9, name: 'ubrania', amount: 600, type: 'variable' },
        { id: 10, name: 'aktywność sportowa', amount: 300, type: 'variable' },
        { id: 11, name: 'Fizjo', amount: 150, type: 'variable' },
        { id: 12, name: 'bufor', amount: 2000, type: 'variable' },
        { id: 13, name: 'basen', amount: 250, type: 'variable' },
        { id: 15, name: 'jedzenie, picie, życie', amount: 4000, type: 'variable' },
        { id: 16, name: 'Apteka', amount: 200, type: 'variable' },
        { id: 17, name: 'Wypady z małą', amount: 300, type: 'variable' },
        { id: 19, name: 'smoczki', amount: 100, type: 'variable' },
        { id: 20, name: 'stanik Asia', amount: 300, type: 'variable' },
        { id: 22, name: 'stomatolog', amount: 800, type: 'variable' },
        { id: 23, name: 'Kawa', amount: 200, type: 'variable' }
    ];

    // Deep copy helper
    const deepCopy = (arr) => JSON.parse(JSON.stringify(arr));

    // State
    const state = {
        activeTab: 'current',
        current: {
            income: 0,
            expenses: deepCopy(defaultExpenses)
        },
        next: {
            income: 0,
            expenses: deepCopy(defaultExpenses)
        }
    };

    // DOM Elements
    const incomeInput = document.getElementById('income');
    const expenseNameInput = document.getElementById('expense-name');
    const expenseAmountInput = document.getElementById('expense-amount');
    const expenseTypeInput = document.getElementById('expense-type'); // Select element
    const addExpenseBtn = document.getElementById('add-expense-btn');
    const expensesListFixed = document.getElementById('expenses-list-fixed');
    const expensesListVariable = document.getElementById('expenses-list-variable');

    const totalIncomeDisplay = document.getElementById('total-income');
    const totalExpensesDisplay = document.getElementById('total-expenses');
    const balanceDisplay = document.getElementById('balance');
    const balanceMessage = document.getElementById('balance-message');
    const tabBtns = document.querySelectorAll('.tab-btn');

    // Initialize view
    updateView();

    // -- Tab Switching --
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.dataset.tab;
            setActiveTab(tabId);
        });
    });

    function setActiveTab(tabId) {
        state.activeTab = tabId;

        // Update UI buttons
        tabBtns.forEach(btn => {
            if (btn.dataset.tab === tabId) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        updateView();
    }

    // -- Core Functions --
    function getActiveData() {
        return state[state.activeTab];
    }

    function updateView() {
        const data = getActiveData();

        // Update Income Input
        incomeInput.value = data.income > 0 ? data.income : '';

        renderExpenses();
        updateSummary();
    }

    // Event Listeners
    incomeInput.addEventListener('input', (e) => {
        const value = e.target.value;
        const parts = value.split('+');
        let total = 0;

        parts.forEach(part => {
            const num = parseFloat(part.trim());
            if (!isNaN(num)) {
                total += num;
            }
        });

        getActiveData().income = total;
        updateSummary();
    });

    addExpenseBtn.addEventListener('click', addExpense);

    expenseAmountInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addExpense();
        }
    });

    function addExpense() {
        const name = expenseNameInput.value.trim();
        const amount = parseFloat(expenseAmountInput.value);
        const type = expenseTypeInput.value;

        if (name === '' || isNaN(amount) || amount <= 0) {
            alert('Proszę podać poprawną nazwę i kwotę wydatku.');
            return;
        }

        const expense = {
            id: Date.now(),
            name: name,
            amount: amount,
            type: type
        };

        getActiveData().expenses.push(expense);

        // Reset inputs
        expenseNameInput.value = '';
        expenseAmountInput.value = '';
        expenseNameInput.focus();

        renderExpenses();
        updateSummary();
    }

    function removeExpense(id) {
        const data = getActiveData();
        data.expenses = data.expenses.filter(expense => expense.id !== id);
        renderExpenses();
        updateSummary();
    }

    function renderExpenses() {
        const data = getActiveData();

        // Clear both lists
        expensesListFixed.innerHTML = '';
        expensesListVariable.innerHTML = '';

        // Add drop zone listeners to lists
        [expensesListFixed, expensesListVariable].forEach(list => {
            list.addEventListener('dragover', handleDragOver);
            list.addEventListener('dragleave', handleDragLeave);
            list.addEventListener('drop', handleDrop);
        });

        if (data.expenses.length === 0) {
            expensesListFixed.innerHTML = '<li class="empty-state">Brak wydatków</li>';
            expensesListVariable.innerHTML = '<li class="empty-state">Brak wydatków</li>';
            return;
        }

        data.expenses.forEach(expense => {
            const li = document.createElement('li');
            li.className = 'expense-item';
            li.draggable = true;
            li.dataset.id = expense.id;

            li.innerHTML = `
                <div class="expense-info">
                    <input type="text" class="expense-name-input" value="${expense.name}" aria-label="Nazwa wydatku">
                </div>
                <div class="expense-amount-wrapper">
                    <input type="number" class="expense-amount-input" value="${expense.amount}" min="0" step="0.01" aria-label="Kwota wydatku">
                    <span>PLN</span>
                </div>
                <button class="delete-btn" aria-label="Usuń wydatek">&times;</button>
            `;

            // Drag Start/End
            li.addEventListener('dragstart', () => {
                li.classList.add('dragging');
            });

            li.addEventListener('dragend', () => {
                li.classList.remove('dragging');
            });

            // Inputs
            const nameInput = li.querySelector('.expense-name-input');
            const amountInput = li.querySelector('.expense-amount-input');

            // Prevent drag when interacting with inputs
            nameInput.addEventListener('mousedown', (e) => e.stopPropagation());
            amountInput.addEventListener('mousedown', (e) => e.stopPropagation());

            // Event listener for name change
            nameInput.addEventListener('change', (e) => {
                expense.name = e.target.value.trim();
            });

            // Event listener for amount change
            amountInput.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value);
                expense.amount = isNaN(val) ? 0 : val;
                updateSummary();
            });

            const deleteBtn = li.querySelector('.delete-btn');
            const currentId = expense.id;
            // Prevent drag on delete button too
            deleteBtn.addEventListener('mousedown', (e) => e.stopPropagation());
            deleteBtn.addEventListener('click', () => removeExpense(currentId));

            // Append to correct list
            if (expense.type === 'fixed') {
                expensesListFixed.appendChild(li);
            } else {
                expensesListVariable.appendChild(li);
            }
        });

        // Handle empty states per list
        if (expensesListFixed.children.length === 0) {
            expensesListFixed.innerHTML = '<li class="empty-state">Brak kosztów stałych</li>';
        }
        if (expensesListVariable.children.length === 0) {
            expensesListVariable.innerHTML = '<li class="empty-state">Brak kosztów zmiennych</li>';
        }
    }

    // Drag and Drop Handlers
    function handleDragOver(e) {
        e.preventDefault(); // Necessary to allow dropping
        const container = e.currentTarget.closest('.expense-column');
        container.classList.add('drag-over');
    }

    function handleDragLeave(e) {
        const container = e.currentTarget.closest('.expense-column');
        container.classList.remove('drag-over');
    }

    function handleDrop(e) {
        e.preventDefault();
        const container = e.currentTarget.closest('.expense-column');
        container.classList.remove('drag-over');

        const draggingItem = document.querySelector('.dragging');
        if (!draggingItem) return;

        const expenseId = parseInt(draggingItem.dataset.id);
        const targetListId = e.currentTarget.id; // expenses-list-fixed or expenses-list-variable

        const newType = targetListId === 'expenses-list-fixed' ? 'fixed' : 'variable';

        const data = getActiveData();
        const expense = data.expenses.find(exp => exp.id === expenseId);

        if (expense && expense.type !== newType) {
            expense.type = newType;
            renderExpenses();
            updateSummary(); // Summary is same, but good practice
        }
    }

    function updateSummary() {
        const data = getActiveData();
        const totalExpenses = data.expenses.reduce((sum, expense) => sum + expense.amount, 0);
        const balance = data.income - totalExpenses;

        totalIncomeDisplay.textContent = formatCurrency(data.income);
        totalExpensesDisplay.textContent = formatCurrency(totalExpenses);
        balanceDisplay.textContent = formatCurrency(balance);

        balanceDisplay.className = 'big-amount';

        if (data.income === 0 && totalExpenses === 0) {
            balanceDisplay.classList.add('neutral');
            balanceMessage.textContent = 'Wprowadź przychody i wydatki.';
        } else if (balance > 0) {
            balanceDisplay.classList.add('success');
            balanceMessage.textContent = 'Super! Masz wolne środki na nadpłatę kredytu. 🎉';
        } else if (balance === 0) {
            balanceDisplay.classList.add('warning');
            balanceMessage.textContent = 'Wychodzisz na zero. Brak środków na nadpłatę.';
        } else {
            balanceDisplay.classList.add('danger');
            balanceMessage.textContent = 'Uwaga! Wydatki przekraczają przychody. 📉';
        }
    }

    function formatCurrency(amount) {
        return amount.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' PLN';
    }
});
