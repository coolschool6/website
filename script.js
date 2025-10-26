// State management
let todos = [];
let currentFilter = 'all';
let currentCategoryFilter = 'all';
let currentSort = 'date-desc';
let editingTodoId = null;

// DOM elements
const todoForm = document.getElementById('todo-form');
const todoInput = document.getElementById('todo-input');
const categorySelect = document.getElementById('category-select');
const prioritySelect = document.getElementById('priority-select');
const dueDateInput = document.getElementById('due-date-input');
const todoList = document.getElementById('todo-list');
const themeToggle = document.getElementById('theme-toggle');
const filterBtns = document.querySelectorAll('.filter-btn[data-filter]');
const categoryFilterBtns = document.querySelectorAll('.filter-btn[data-category]');
const sortSelect = document.getElementById('sort-select');
const activeCount = document.getElementById('active-count');
const editModal = document.getElementById('edit-modal');
const editForm = document.getElementById('edit-form');
const editTodoInput = document.getElementById('edit-todo-input');
const editCategorySelect = document.getElementById('edit-category-select');
const editPrioritySelect = document.getElementById('edit-priority-select');
const editDueDateInput = document.getElementById('edit-due-date-input');
const cancelEditBtn = document.getElementById('cancel-edit');

// Initialize app
function init() {
    loadTodos();
    loadTheme();
    renderTodos();
    updateStats();
    attachEventListeners();
}

// Event listeners
function attachEventListeners() {
    todoForm.addEventListener('submit', handleAddTodo);
    themeToggle.addEventListener('click', toggleTheme);
    
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => handleFilterChange(btn));
    });
    
    categoryFilterBtns.forEach(btn => {
        btn.addEventListener('click', () => handleCategoryFilterChange(btn));
    });
    
    sortSelect.addEventListener('change', handleSortChange);
    editForm.addEventListener('submit', handleEditSubmit);
    cancelEditBtn.addEventListener('click', closeEditModal);
    
    // Close modal when clicking outside
    editModal.addEventListener('click', (e) => {
        if (e.target === editModal) {
            closeEditModal();
        }
    });
}

// Add new todo
function handleAddTodo(e) {
    e.preventDefault();
    
    const todo = {
        id: Date.now(),
        text: todoInput.value.trim(),
        category: categorySelect.value,
        priority: prioritySelect.value,
        dueDate: dueDateInput.value,
        completed: false,
        createdAt: new Date().toISOString()
    };
    
    todos.push(todo);
    saveTodos();
    renderTodos();
    updateStats();
    
    // Reset form
    todoForm.reset();
    todoInput.focus();
}

// Toggle todo completion
function toggleTodo(id) {
    const todo = todos.find(t => t.id === id);
    if (todo) {
        todo.completed = !todo.completed;
        saveTodos();
        renderTodos();
        updateStats();
    }
}

// Delete todo
function deleteTodo(id) {
    if (confirm('Are you sure you want to delete this task?')) {
        todos = todos.filter(t => t.id !== id);
        saveTodos();
        renderTodos();
        updateStats();
    }
}

// Open edit modal
function openEditModal(id) {
    const todo = todos.find(t => t.id === id);
    if (!todo) return;
    
    editingTodoId = id;
    editTodoInput.value = todo.text;
    editCategorySelect.value = todo.category;
    editPrioritySelect.value = todo.priority;
    editDueDateInput.value = todo.dueDate;
    
    editModal.classList.add('active');
}

// Close edit modal
function closeEditModal() {
    editModal.classList.remove('active');
    editingTodoId = null;
    editForm.reset();
}

// Handle edit submit
function handleEditSubmit(e) {
    e.preventDefault();
    
    const todo = todos.find(t => t.id === editingTodoId);
    if (todo) {
        todo.text = editTodoInput.value.trim();
        todo.category = editCategorySelect.value;
        todo.priority = editPrioritySelect.value;
        todo.dueDate = editDueDateInput.value;
        
        saveTodos();
        renderTodos();
        closeEditModal();
    }
}

// Filter todos
function handleFilterChange(btn) {
    filterBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = btn.dataset.filter;
    renderTodos();
}

function handleCategoryFilterChange(btn) {
    categoryFilterBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentCategoryFilter = btn.dataset.category;
    renderTodos();
}

// Sort todos
function handleSortChange(e) {
    currentSort = e.target.value;
    renderTodos();
}

// Get filtered and sorted todos
function getFilteredTodos() {
    let filtered = [...todos];
    
    // Apply status filter
    if (currentFilter === 'active') {
        filtered = filtered.filter(t => !t.completed);
    } else if (currentFilter === 'completed') {
        filtered = filtered.filter(t => t.completed);
    }
    
    // Apply category filter
    if (currentCategoryFilter !== 'all') {
        filtered = filtered.filter(t => t.category === currentCategoryFilter);
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
        switch (currentSort) {
            case 'date-asc':
                return new Date(a.createdAt) - new Date(b.createdAt);
            case 'date-desc':
                return new Date(b.createdAt) - new Date(a.createdAt);
            case 'priority':
                const priorityOrder = { high: 1, medium: 2, low: 3 };
                return priorityOrder[a.priority] - priorityOrder[b.priority];
            case 'due-date':
                return new Date(a.dueDate) - new Date(b.dueDate);
            default:
                return 0;
        }
    });
    
    return filtered;
}

// Render todos
function renderTodos() {
    const filtered = getFilteredTodos();
    
    if (filtered.length === 0) {
        todoList.innerHTML = `
            <div class="empty-state">
                <h3>No tasks found</h3>
                <p>Add a new task to get started!</p>
            </div>
        `;
        return;
    }
    
    todoList.innerHTML = filtered.map(todo => createTodoElement(todo)).join('');
    
    // Attach event listeners to new elements
    filtered.forEach(todo => {
        const checkbox = document.querySelector(`[data-todo-id="${todo.id}"] .todo-checkbox`);
        const editBtn = document.querySelector(`[data-todo-id="${todo.id}"] .edit-btn`);
        const deleteBtn = document.querySelector(`[data-todo-id="${todo.id}"] .delete-btn`);
        
        if (checkbox) {
            checkbox.addEventListener('change', () => toggleTodo(todo.id));
        }
        if (editBtn) {
            editBtn.addEventListener('click', () => openEditModal(todo.id));
        }
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => deleteTodo(todo.id));
        }
    });
}

// Create todo element HTML
function createTodoElement(todo) {
    const isOverdue = !todo.completed && new Date(todo.dueDate) < new Date();
    const formattedDate = formatDate(todo.dueDate);
    
    return `
        <div class="todo-item ${todo.completed ? 'completed' : ''}" data-todo-id="${todo.id}">
            <input 
                type="checkbox" 
                class="todo-checkbox" 
                ${todo.completed ? 'checked' : ''}
            >
            <div class="todo-details">
                <div class="todo-content">${escapeHtml(todo.text)}</div>
                <div class="todo-meta">
                    <span class="badge category-${todo.category}">${capitalize(todo.category)}</span>
                    <span class="badge priority-${todo.priority}">${capitalize(todo.priority)} Priority</span>
                    <span class="due-date ${isOverdue ? 'overdue' : ''}">
                        📅 ${formattedDate}${isOverdue ? ' (Overdue)' : ''}
                    </span>
                </div>
            </div>
            <div class="todo-actions">
                <button class="action-btn edit-btn" aria-label="Edit task">✏️</button>
                <button class="action-btn delete-btn" aria-label="Delete task">🗑️</button>
            </div>
        </div>
    `;
}

// Update stats
function updateStats() {
    const activeTodos = todos.filter(t => !t.completed).length;
    activeCount.textContent = `${activeTodos} active task${activeTodos !== 1 ? 's' : ''}`;
}

// Theme management
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    
    // Update icon
    const icon = themeToggle.querySelector('.theme-icon');
    icon.textContent = newTheme === 'dark' ? '☀️' : '🌙';
}

function loadTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    
    const icon = themeToggle.querySelector('.theme-icon');
    icon.textContent = savedTheme === 'dark' ? '☀️' : '🌙';
}

// Local storage management
function saveTodos() {
    localStorage.setItem('todos', JSON.stringify(todos));
}

function loadTodos() {
    const saved = localStorage.getItem('todos');
    if (saved) {
        try {
            todos = JSON.parse(saved);
        } catch (e) {
            console.error('Error loading todos:', e);
            todos = [];
        }
    }
}

// Utility functions
function formatDate(dateString) {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Reset time parts for comparison
    today.setHours(0, 0, 0, 0);
    tomorrow.setHours(0, 0, 0, 0);
    const compareDate = new Date(date);
    compareDate.setHours(0, 0, 0, 0);
    
    if (compareDate.getTime() === today.getTime()) {
        return 'Today';
    } else if (compareDate.getTime() === tomorrow.getTime()) {
        return 'Tomorrow';
    } else {
        return date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric' 
        });
    }
}

function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Initialize the app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
