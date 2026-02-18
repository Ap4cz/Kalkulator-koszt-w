const SUPABASE_URL = 'https://awzryhowoukjngppvuhy.supabase.co';
const SUPABASE_KEY = 'sb_publishable_jzHlyDfQG9R99EXIT5wKVw_whCWzQmd';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

document.addEventListener('DOMContentLoaded', () => {
    // State
    const state = {
        activeTab: 'current',
        sortDirections: {
            fixed: 'desc',
            variable: 'desc'
        },
        current: {
            income: 0,
            expenses: []
        },
        next: {
            income: 0,
            expenses: []
        },
        selectedEmoji: ''
    };

    const emojiData = {
        smileys: ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😋', '😛', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🥸', '🥳'],
        people: ['👋', '🤚', '🖐', '✋', '🖖', '👌', '🤌', '🤏', '✌', '🤞', '🫰', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐'],
        food: ['🍏', '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑', '🥦', '🥬', '🥒', '🌽', '🥕', '🫒', '🧄', '🧅', '🍞', '🍕', '🍔', '🍟', '🥪'],
        activities: ['⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱', '🪀', '🏓', '🏸', '🏒', '🏑', '🥍', '🏏', '🪃', '🥅', '⛳', '🪁', '🏹', '🎣', '🤿', '🥊', '🥋', '🎽', '🛹', '🛼'],
        travel: ['🚗', '🚕', '🚙', '🚌', '🚎', '🏎', '🚓', '🚑', '🚒', '🚐', '🛻', '🚚', '🚛', '🚜', '🏎', '🏍', '🛵', '🚲', '🛼', '🚠', '🚋', '🚃', '🚄', '🚅', '🚆', '🚇', '🚈', '🚉', '🛩', '🛳'],
        objects: ['⌚', '📱', '📲', '💻', '⌨', '🖥', '🖨', '🖱', '🖲', '🕹', '🗜', '💽', ' floppy', '💿', '📀', '📼', '📷', '📸', '📹', '🎥', '📽', '🎞', '📞', '☎', '📟', '📠', '📺', '📻', '🎙', '💡']
    };

    // DOM Elements
    const incomeInput = document.getElementById('income');
    const expenseNameInput = document.getElementById('expense-name');
    const expenseAmountInput = document.getElementById('expense-amount');
    const expenseTypeInput = document.getElementById('expense-type');
    const addExpenseBtn = document.getElementById('add-expense-btn');
    const expensesListFixed = document.getElementById('expenses-list-fixed');
    const expensesListVariable = document.getElementById('expenses-list-variable');

    // Emoji Picker Elements
    const emojiTrigger = document.getElementById('emoji-trigger');
    const emojiPicker = document.getElementById('emoji-picker');
    const emojiSearch = document.getElementById('emoji-search');
    const emojiListContainer = document.getElementById('emoji-list');
    const pickerTabs = document.querySelectorAll('.picker-tab');

    const totalIncomeDisplay = document.getElementById('total-income');
    const totalExpensesDisplay = document.getElementById('total-expenses');
    const balanceDisplay = document.getElementById('balance');
    const balanceMessage = document.getElementById('balance-message');
    const tabBtns = document.querySelectorAll('.tab-btn');

    // -- Initialization --
    initApp();

    async function initApp() {
        await Promise.all([
            fetchInitialData(),
            fetchTheme()
        ]);
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

        // -- Sort Buttons --
        document.querySelectorAll('.sort-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const type = btn.dataset.type;
                sortExpensesByAmount(type);
            });
        });

        // -- Theme Selector --
        document.querySelectorAll('.theme-dot').forEach(dot => {
            dot.addEventListener('click', () => {
                const color = dot.dataset.theme;
                applyTheme(color);
                saveTheme(color);
            });
        });

        // -- Emoji Picker Listeners --
        emojiTrigger.addEventListener('click', (e) => {
            e.stopPropagation();
            emojiPicker.classList.toggle('hidden');
            if (!emojiPicker.classList.contains('hidden')) {
                renderEmojiList('smileys');
            }
        });

        emojiSearch.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            if (query) {
                const filtered = Object.values(emojiData).flat().filter(emoji => emoji.includes(query) || emoji.length > 0); // Simplified search
                renderFilteredEmojis(filtered);
            } else {
                renderEmojiList('smileys');
            }
        });

        pickerTabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                e.stopPropagation();
                pickerTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                renderEmojiList(tab.dataset.cat);
            });
        });

        document.addEventListener('click', (e) => {
            if (!emojiPicker.contains(e.target) && e.target !== emojiTrigger) {
                emojiPicker.classList.add('hidden');
            }
        });
    }

    // -- Emoji Functions --
    function renderEmojiList(category) {
        emojiListContainer.innerHTML = '';
        emojiData[category].forEach(emoji => {
            const btn = document.createElement('button');
            btn.className = 'emoji-item';
            btn.textContent = emoji;
            btn.type = 'button';
            btn.addEventListener('click', () => selectEmoji(emoji));
            emojiListContainer.appendChild(btn);
        });
    }

    function renderFilteredEmojis(emojis) {
        emojiListContainer.innerHTML = '';
        emojis.forEach(emoji => {
            const btn = document.createElement('button');
            btn.className = 'emoji-item';
            btn.textContent = emoji;
            btn.type = 'button';
            btn.addEventListener('click', () => selectEmoji(emoji));
            emojiListContainer.appendChild(btn);
        });
    }

    function selectEmoji(emoji) {
        state.selectedEmoji = emoji;
        emojiTrigger.textContent = emoji;
        emojiTrigger.classList.add('has-emoji');
        emojiPicker.classList.add('hidden');
    }

    // -- Theme Functions --
    function applyTheme(color) {
        document.documentElement.style.setProperty('--primary-color', color);

        const bgMap = {
            '#4f46e5': '#f5f3ff', // Indigo
            '#3b82f6': '#eff6ff', // Blue
            '#10b981': '#ecfdf5', // Green
            '#ec4899': '#fdf2f8', // Pink
            '#8b5cf6': '#f5f3ff'  // Purple
        };

        const bgColor = bgMap[color] || '#f8fafc';
        document.documentElement.style.setProperty('--bg-accent', bgColor);

        // Update active class
        document.querySelectorAll('.theme-dot').forEach(dot => {
            dot.classList.toggle('active', dot.dataset.theme === color);
        });
    }

    async function saveTheme(color) {
        const { error } = await supabaseClient
            .from('settings')
            .upsert({ key: 'theme_color', value: color }, { onConflict: 'key' });

        if (error) console.error('Error saving theme:', error.message);
    }

    async function fetchTheme() {
        try {
            const { data, error } = await supabaseClient
                .from('settings')
                .select('value')
                .eq('key', 'theme_color')
                .single();

            if (error && error.code !== 'PGRST116') throw error; // PGRST116 is code for no rows found

            if (data && data.value) {
                applyTheme(data.value);
            } else {
                applyTheme('#4f46e5'); // Default
            }
        } catch (error) {
            console.error('Error fetching theme:', error.message);
        }
    }

    // -- Database Functions --
    async function fetchInitialData() {
        try {
            // Fetch Expenses ordered by sort_order
            const { data: expenses, error: expError } = await supabaseClient
                .from('expenses')
                .select('*')
                .order('sort_order', { ascending: true });

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
                        emoji: exp.emoji || '',
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
                emoji: expense.emoji || '',
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

    async function batchUpdateExpensesInDb(updates) {
        const { error } = await supabaseClient
            .from('expenses')
            .upsert(updates);

        if (error) console.error('Error batch updating expenses:', error.message);
    }

    // -- UI Functions --
    function setActiveTab(tabId) {
        state.activeTab = tabId;
        tabBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabId);
        });
        updateView();
    }

    async function sortExpensesByAmount(type) {
        const month = state.activeTab;
        const expenses = state[month].expenses.filter(exp => exp.type === type);
        const otherExpenses = state[month].expenses.filter(exp => exp.type !== type);

        // Toggle direction
        state.sortDirections[type] = state.sortDirections[type] === 'desc' ? 'asc' : 'desc';
        const direction = state.sortDirections[type];

        // Sort
        expenses.sort((a, b) => {
            return direction === 'desc' ? b.amount - a.amount : a.amount - b.amount;
        });

        // Combine back
        state[month].expenses = (type === 'fixed')
            ? [...expenses, ...otherExpenses]
            : [...otherExpenses, ...expenses];

        // Update all sort_orders in state
        const updates = state[month].expenses.map((exp, index) => {
            exp.sort_order = index;
            return { id: exp.id, sort_order: index };
        });

        renderExpenses();
        updateSummary();

        // Sync all orders to DB
        await batchUpdateExpensesInDb(updates);
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
        const emoji = state.selectedEmoji;
        const expense = { id: tempId, name, emoji, amount, type };

        state[month].expenses.push(expense);

        // Reset inputs
        expenseNameInput.value = '';
        expenseAmountInput.value = '';
        state.selectedEmoji = '';
        emojiTrigger.textContent = '😊';
        emojiTrigger.classList.remove('has-emoji');
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
                    <span class="expense-emoji-display">${expense.emoji || '•'}</span>
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
        const list = e.currentTarget;
        const draggingItem = document.querySelector('.dragging');
        const afterElement = getDragAfterElement(list, e.clientY);

        const container = list.closest('.expense-column');
        container.classList.add('drag-over');

        if (afterElement == null) {
            list.appendChild(draggingItem);
        } else {
            list.insertBefore(draggingItem, afterElement);
        }
    }

    function getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.expense-item:not(.dragging)')];

        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

    function handleDragLeave(e) {
        const container = e.currentTarget.closest('.expense-column');
        container.classList.remove('drag-over');
    }

    async function handleDrop(e) {
        e.preventDefault();
        const list = e.currentTarget;
        const container = list.closest('.expense-column');
        container.classList.remove('drag-over');

        const draggingItem = document.querySelector('.dragging');
        if (!draggingItem) return;

        const expenseId = draggingItem.dataset.id;
        const newType = list.id === 'expenses-list-fixed' ? 'fixed' : 'variable';
        const month = state.activeTab;

        // Reconstruct local state from DOM order
        const items = [...list.querySelectorAll('.expense-item')];
        const newExpenses = [];
        const updates = [];

        // We need to merge items from BOTH lists into the state, but updated
        // Simplest: Get all items from both lists as they are currently in DOM
        const fixedItems = [...document.getElementById('expenses-list-fixed').querySelectorAll('.expense-item')];
        const variableItems = [...document.getElementById('expenses-list-variable').querySelectorAll('.expense-item')];

        const allDomItems = [...fixedItems.map(li => ({ id: li.dataset.id, type: 'fixed' })),
        ...variableItems.map(li => ({ id: li.dataset.id, type: 'variable' }))];

        // Update state and prep DB updates
        state[month].expenses = allDomItems.map((item, index) => {
            const expense = state[month].expenses.find(exp => exp.id == item.id);
            if (expense) {
                expense.type = item.type;
                expense.sort_order = index;
                updates.push({ id: expense.id, type: expense.type, sort_order: index });
            }
            return expense;
        }).filter(Boolean);

        updateSummary();

        // Optimized: Single batch update instead of loop
        if (updates.length > 0) {
            await batchUpdateExpensesInDb(updates);
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
