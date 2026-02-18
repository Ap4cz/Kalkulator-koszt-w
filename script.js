const SUPABASE_URL = 'https://awzryhowoukjngppvuhy.supabase.co';
const SUPABASE_KEY = 'sb_publishable_jzHlyDfQG9R99EXIT5wKVw_whCWzQmd';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

document.addEventListener('DOMContentLoaded', () => {
    // State
    const state = {
        activeTab: 'current',
        current: {
            income: 0,
            expenses: []
        },
        next: {
            income: 0,
            expenses: []
        }
    };

    // DOM Elements
    const incomeInput = document.getElementById('income');
    const expenseNameInput = document.getElementById('expense-name');
    const expenseAmountInput = document.getElementById('expense-amount');
    const expenseTypeInput = document.getElementById('expense-type');
    const addExpenseBtn = document.getElementById('add-expense-btn');
    const expensesListFixed = document.getElementById('expenses-list-fixed');
    const expensesListVariable = document.getElementById('expenses-list-variable');

    const totalIncomeDisplay = document.getElementById('total-income');
    const totalExpensesDisplay = document.getElementById('total-expenses');
    const balanceDisplay = document.getElementById('balance');
    const balanceMessage = document.getElementById('balance-message');
    const tabBtns = document.querySelectorAll('.tab-btn');

    // -- Initialization --
    initApp();

    async function initApp() {
        await fetchInitialData();
        updateView();

        // -- Event Listeners --
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const tabId = btn.dataset.tab;
                setActiveTab(tabId);
            });
        });

        incomeInput.addEventListener('change', async (e) => {
            const value = e.target.value;
            const parts = value.split('+');
            let total = 0;

            parts.forEach(part => {
                const num = parseFloat(part.trim());
                if (!isNaN(num)) {
                    total += num;
                }
            });

            const activeMonth = state.activeTab;
            state[activeMonth].income = total;

            await syncIncomeToDb(activeMonth, total);
            updateSummary();
        });

        addExpenseBtn.addEventListener('click', addExpense);
        expenseAmountInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') addExpense();
        });
    }

    // -- Database Functions --
    async function fetchInitialData() {
        try {
            // Fetch Expenses
            const { data: expenses, error: expError } = await supabaseClient
                .from('expenses')
                .select('*');

            if (expError) throw expError;

            // Fetch Incomes
            const { data: incomes, error: incError } = await supabaseClient
                .from('incomes')
                .select('*');

            if (incError) throw incError;

            // Reset state expenses
            state.current.expenses = [];
            state.next.expenses = [];

            expenses.forEach(exp => {
                if (state[exp.month]) {
                    state[exp.month].expenses.push({
                        id: exp.id,
                        name: exp.name,
                        amount: exp.amount,
                        type: exp.type
                    });
                }
            });

            incomes.forEach(inc => {
                if (state[inc.month]) {
                    state[inc.month].income = inc.amount;
                }
            });

        } catch (error) {
            console.error('Error fetching data:', error.message);
            alert('Błąd podczas ładowania danych z bazy.');
        }
    }

    async function syncIncomeToDb(month, amount) {
        const { error } = await supabaseClient
            .from('incomes')
            .upsert({ month, amount }, { onConflict: 'month' });

        if (error) console.error('Error syncing income:', error.message);
    }

    async function addExpenseToDb(expense, month) {
        const { data, error } = await supabaseClient
            .from('expenses')
            .insert([{
                name: expense.name,
                amount: expense.amount,
                type: expense.type,
                month: month
            }])
            .select();

        if (error) {
            console.error('Error adding expense:', error.message);
            return null;
        }
        return data[0].id;
    }

    async function removeExpenseFromDb(id) {
        const { error } = await supabaseClient
            .from('expenses')
            .delete()
            .eq('id', id);

        if (error) console.error('Error removing expense:', error.message);
    }

    async function updateExpenseInDb(id, updates) {
        const { error } = await supabaseClient
            .from('expenses')
            .update(updates)
            .eq('id', id);

        if (error) console.error('Error updating expense:', error.message);
    }

    // -- UI Functions --
    function setActiveTab(tabId) {
        state.activeTab = tabId;
        tabBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabId);
        });
        updateView();
    }

    function updateView() {
        const data = state[state.activeTab];
        incomeInput.value = data.income > 0 ? data.income : '';
        renderExpenses();
        updateSummary();
    }

    async function addExpense() {
        const name = expenseNameInput.value.trim();
        const amount = parseFloat(expenseAmountInput.value);
        const type = expenseTypeInput.value;
        const month = state.activeTab;

        if (name === '' || isNaN(amount) || amount <= 0) {
            alert('Proszę podać poprawną nazwę i kwotę wydatku.');
            return;
        }

        const tempId = Date.now().toString(); // Temporary ID until DB returns real one
        const expense = { id: tempId, name, amount, type };

        state[month].expenses.push(expense);

        // Reset inputs immediately for better UX
        expenseNameInput.value = '';
        expenseAmountInput.value = '';
        expenseNameInput.focus();

        renderExpenses();
        updateSummary();

        // Sync to DB
        const realId = await addExpenseToDb(expense, month);
        if (realId) {
            expense.id = realId; // Update with real DB ID
            // Refresh listener dataset if needed, but since we re-render often it's ok
            renderExpenses();
        }
    }

    async function removeExpense(id) {
        state[state.activeTab].expenses = state[state.activeTab].expenses.filter(exp => exp.id !== id);
        renderExpenses();
        updateSummary();
        await removeExpenseFromDb(id);
    }

    function renderExpenses() {
        const data = state[state.activeTab];
        expensesListFixed.innerHTML = '';
        expensesListVariable.innerHTML = '';

        [expensesListFixed, expensesListVariable].forEach(list => {
            list.addEventListener('dragover', handleDragOver);
            list.addEventListener('dragleave', handleDragLeave);
            list.addEventListener('drop', handleDrop);
        });

        if (data.expenses.length === 0) {
            expensesListFixed.innerHTML = '<li class="empty-state">Brak kosztów stałych</li>';
            expensesListVariable.innerHTML = '<li class="empty-state">Brak kosztów zmiennych</li>';
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

            li.addEventListener('dragstart', () => li.classList.add('dragging'));
            li.addEventListener('dragend', () => li.classList.remove('dragging'));

            const nameInput = li.querySelector('.expense-name-input');
            const amountInput = li.querySelector('.expense-amount-input');
            const deleteBtn = li.querySelector('.delete-btn');

            nameInput.addEventListener('mousedown', (e) => e.stopPropagation());
            amountInput.addEventListener('mousedown', (e) => e.stopPropagation());
            deleteBtn.addEventListener('mousedown', (e) => e.stopPropagation());

            nameInput.addEventListener('change', async (e) => {
                const newName = e.target.value.trim();
                expense.name = newName;
                await updateExpenseInDb(expense.id, { name: newName });
            });

            amountInput.addEventListener('change', async (e) => {
                const newVal = parseFloat(e.target.value);
                expense.amount = isNaN(newVal) ? 0 : newVal;
                updateSummary();
                await updateExpenseInDb(expense.id, { amount: expense.amount });
            });

            deleteBtn.addEventListener('click', () => removeExpense(expense.id));

            if (expense.type === 'fixed') {
                expensesListFixed.appendChild(li);
            } else {
                expensesListVariable.appendChild(li);
            }
        });

        if (expensesListFixed.children.length === 0) {
            expensesListFixed.innerHTML = '<li class="empty-state">Brak kosztów stałych</li>';
        }
        if (expensesListVariable.children.length === 0) {
            expensesListVariable.innerHTML = '<li class="empty-state">Brak kosztów zmiennych</li>';
        }
    }

    function handleDragOver(e) {
        e.preventDefault();
        const container = e.currentTarget.closest('.expense-column');
        container.classList.add('drag-over');
    }

    function handleDragLeave(e) {
        const container = e.currentTarget.closest('.expense-column');
        container.classList.remove('drag-over');
    }

    async function handleDrop(e) {
        e.preventDefault();
        const container = e.currentTarget.closest('.expense-column');
        container.classList.remove('drag-over');

        const draggingItem = document.querySelector('.dragging');
        if (!draggingItem) return;

        const expenseId = draggingItem.dataset.id;
        const targetListId = e.currentTarget.id;
        const newType = targetListId === 'expenses-list-fixed' ? 'fixed' : 'variable';

        const expense = state[state.activeTab].expenses.find(exp => exp.id == expenseId);

        if (expense && expense.type !== newType) {
            expense.type = newType;
            renderExpenses();
            await updateExpenseInDb(expenseId, { type: newType });
        }
    }

    function updateSummary() {
        const data = state[state.activeTab];
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
