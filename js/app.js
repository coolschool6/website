import { getTodos, addTodo, updateTodo, deleteTodo } from './supabase.js';

class TodoApp {
    constructor() {
        this.currentEditId = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadTodos();
    }

    setupEventListeners() {
        // Task form
        document.getElementById('task-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveTask();
        });

        // Reset form
        document.getElementById('reset-btn').addEventListener('click', () => {
            this.resetForm();
        });

        // Filters
        document.getElementById('status-filter').addEventListener('change', () => {
            this.loadTodos();
        });

        document.getElementById('category-filter').addEventListener('change', () => {
            this.loadTodos();
        });

        document.getElementById('sort-by').addEventListener('change', () => {
            this.loadTodos();
        });

        // Clear completed
        document.getElementById('clear-completed').addEventListener('click', () => {
            this.clearCompleted();
        });
    }

    async loadTodos() {
        // Only load todos if user is logged in
        if (!document.body.classList.contains('logged-in')) {
            this.renderTodos([]);
            return;
        }

        try {
            const todos = await getTodos();
            this.renderTodos(todos);
        } catch (error) {
            console.error('Error loading todos:', error);
        }
    }

    renderTodos(todos) {
        const taskList = document.getElementById('task-list');
        const emptyState = document.getElementById('empty-state');
        const summary = document.getElementById('summary');

        // Apply filters
        const statusFilter = document.getElementById('status-filter').value;
        const categoryFilter = document.getElementById('category-filter').value;
        
        let filteredTodos = todos.filter(todo => {
            const statusMatch = statusFilter === 'all' || 
                              (statusFilter === 'active' && !todo.is_complete) ||
                              (statusFilter === 'completed' && todo.is_complete);
            
            const categoryMatch = categoryFilter === 'all' || todo.category === categoryFilter;
            
            return statusMatch && categoryMatch;
        });

        // Apply sorting
        const sortBy = document.getElementById('sort-by').value;
        filteredTodos.sort((a, b) => {
            switch (sortBy) {
                case 'created_asc':
                    return new Date(a.created_at) - new Date(b.created_at);
                case 'created_desc':
                    return new Date(b.created_at) - new Date(a.created_at);
                case 'due_asc':
                    return (a.due_date || '9999-99-99').localeCompare(b.due_date || '9999-99-99');
                case 'due_desc':
                    return (b.due_date || '0000-00-00').localeCompare(a.due_date || '0000-00-00');
                case 'priority_desc':
                    return b.priority - a.priority;
                case 'priority_asc':
                    return a.priority - b.priority;
                default:
                    return 0;
            }
        });

        // Render todos
        if (filteredTodos.length === 0) {
            taskList.innerHTML = '';
            emptyState.style.display = 'block';
        } else {
            emptyState.style.display = 'none';
            taskList.innerHTML = filteredTodos.map(todo => `
                <li class="task-item ${todo.is_complete ? 'completed' : ''}" data-id="${todo.id}">
                    <div class="task-main">
                        <button class="complete-btn" aria-label="${todo.is_complete ? 'Mark as incomplete' : 'Mark as complete'}">
                            <span class="checkmark">${todo.is_complete ? '✓' : ''}</span>
                        </button>
                        <div class="task-content">
                            <h3 class="task-title">${this.escapeHtml(todo.task)}</h3>
                            ${todo.description ? `<p class="task-desc">${this.escapeHtml(todo.description)}</p>` : ''}
                            <div class="task-meta">
                                <span class="task-category">${todo.category}</span>
                                <span class="task-priority priority-${todo.priority}">
                                    ${todo.priority === 3 ? 'High' : todo.priority === 2 ? 'Medium' : 'Low'}
                                </span>
                                ${todo.due_date ? `<span class="task-due">Due: ${new Date(todo.due_date).toLocaleDateString()}</span>` : ''}
                            </div>
                        </div>
                    </div>
                    <div class="task-actions">
                        <button class="edit-btn" aria-label="Edit task">✏️</button>
                        <button class="delete-btn" aria-label="Delete task">🗑️</button>
                    </div>
                </li>
            `).join('');

            // Add event listeners to dynamically created elements
            taskList.querySelectorAll('.complete-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const taskItem = e.target.closest('.task-item');
                    this.toggleComplete(taskItem.dataset.id);
                });
            });

            taskList.querySelectorAll('.edit-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const taskItem = e.target.closest('.task-item');
                    this.editTask(taskItem.dataset.id, filteredTodos);
                });
            });

            taskList.querySelectorAll('.delete-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const taskItem = e.target.closest('.task-item');
                    this.deleteTask(taskItem.dataset.id);
                });
            });
        }

        // Update summary
        const total = todos.length;
        const completed = todos.filter(todo => todo.is_complete).length;
        const active = total - completed;
        summary.textContent = `${active} active, ${completed} completed`;
    }

    escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    async saveTask() {
        const task = document.getElementById('title').value;
        const description = document.getElementById('description').value;
        const category = document.getElementById('category').value;
        const priority = document.getElementById('priority').value;
        const dueDate = document.getElementById('dueDate').value;

        if (!task.trim()) return;

        try {
            if (this.currentEditId) {
                // Update existing task
                await updateTodo(this.currentEditId, {
                    task,
                    description,
                    category,
                    priority: parseInt(priority),
                    due_date: dueDate || null
                });
            } else {
                // Add new task
                await addTodo(task, description, category, priority, dueDate);
            }

            this.resetForm();
            await this.loadTodos();
        } catch (error) {
            console.error('Error saving task:', error);
        }
    }

    async toggleComplete(id) {
        try {
            const taskItem = document.querySelector(`[data-id="${id}"]`);
            const isComplete = taskItem.classList.contains('completed');
            
            await updateTodo(id, { is_complete: !isComplete });
            await this.loadTodos();
        } catch (error) {
            console.error('Error toggling complete:', error);
        }
    }

    editTask(id, todos) {
        const todo = todos.find(t => t.id == id);
        if (!todo) return;

        document.getElementById('task-id').value = id;
        document.getElementById('title').value = todo.task;
        document.getElementById('description').value = todo.description || '';
        document.getElementById('category').value = todo.category;
        document.getElementById('priority').value = todo.priority;
        document.getElementById('dueDate').value = todo.due_date || '';
        document.getElementById('save-btn').textContent = 'Update Task';
        
        this.currentEditId = id;
        document.getElementById('title').focus();
    }

    async deleteTask(id) {
        if (confirm('Are you sure you want to delete this task?')) {
            try {
                await deleteTodo(id);
                await this.loadTodos();
            } catch (error) {
                console.error('Error deleting task:', error);
            }
        }
    }

    async clearCompleted() {
        try {
            const todos = await getTodos();
            const completedTodos = todos.filter(todo => todo.is_complete);
            
            for (const todo of completedTodos) {
                await deleteTodo(todo.id);
            }
            
            await this.loadTodos();
        } catch (error) {
            console.error('Error clearing completed:', error);
        }
    }

    resetForm() {
        document.getElementById('task-form').reset();
        document.getElementById('task-id').value = '';
        document.getElementById('save-btn').textContent = 'Add Task';
        this.currentEditId = null;
    }

    clearTodos() {
        this.renderTodos([]);
    }
}

// Initialize todo app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.todoApp = new TodoApp();
});