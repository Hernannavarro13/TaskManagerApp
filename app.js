// DOM Elements
const todoForm = document.querySelector('.todo-form');
const todoInput = document.querySelector('.todo-input');
const todoList = document.querySelector('.todo-list');
const filterBtns = document.querySelectorAll('.filter-btn');
const itemsLeftSpan = document.querySelector('.items-left');
const clearCompletedBtn = document.querySelector('.clear-completed');
const themeToggle = document.getElementById('themeToggle');
const syncStatus = document.getElementById('syncStatus');
const todoItemTemplate = document.getElementById('todo-item-template');
const emptyStateTemplate = document.getElementById('empty-state-template');

// App state
let todos = [];
let currentFilter = 'all';
let isSyncing = false;

// API endpoint - Replace with your actual backend API URL when available
const API_URL = 'https://your-backend-api.com/todos';

// Initialize app
async function initApp() {
    // Set theme from localStorage or default to light
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);
    
    // Event Listeners
    todoForm.addEventListener('submit', addTodo);
    todoList.addEventListener('click', handleTodoClick);
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            renderTodos();
        });
    });
    clearCompletedBtn.addEventListener('click', clearCompleted);
    themeToggle.addEventListener('click', toggleTheme);
    
    // Load todos from API or fallback to localStorage
    await loadTodos();
}

// Theme functions
function setTheme(theme) {
    document.body.dataset.theme = theme;
    localStorage.setItem('theme', theme);
}

function toggleTheme() {
    const currentTheme = document.body.dataset.theme || 'light';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
}

// API functions
async function loadTodos() {
    setSyncStatus('syncing');
    
    try {
        // Try to load from API first
        try {
            const response = await axios.get(API_URL);
            todos = response.data;
        } catch (error) {
            console.log('API not available, loading from localStorage');
            // Fallback to localStorage if API fails
            todos = JSON.parse(localStorage.getItem('todos')) || [];
        }
        
        renderTodos();
        updateItemsLeft();
        setSyncStatus('synced');
    } catch (error) {
        console.error('Failed to load todos:', error);
        setSyncStatus('error', 'Failed to load todos');
    }
}

async function saveTodos() {
    // Save to localStorage immediately
    localStorage.setItem('todos', JSON.stringify(todos));
    
    // Then try to sync with API
    setSyncStatus('syncing');
    
    try {
        await axios.put(`${API_URL}`, todos);
        setSyncStatus('synced');
    } catch (error) {
        console.error('Failed to sync with server:', error);
        setSyncStatus('error', 'Sync failed');
    }
}

function setSyncStatus(status, message = '') {
    syncStatus.classList.remove('syncing', 'sync-error');
    
    if (status === 'syncing') {
        syncStatus.classList.add('syncing');
        syncStatus.querySelector('.sync-message').textContent = 'Syncing...';
    } else if (status === 'synced') {
        syncStatus.querySelector('.sync-message').textContent = 'Synced';
    } else if (status === 'error') {
        syncStatus.classList.add('sync-error');
        syncStatus.querySelector('.sync-message').textContent = message || 'Error';
        
        // Reset status after 3 seconds
        setTimeout(() => {
            syncStatus.classList.remove('sync-error');
            syncStatus.querySelector('.sync-message').textContent = 'Sync failed';
        }, 3000);
    }
}

// Todo Functions
async function addTodo(e) {
    e.preventDefault();
    
    const todoText = todoInput.value.trim();
    
    if (todoText.length === 0) return;
    
    const newTodo = {
        id: Date.now(),
        text: todoText,
        completed: false,
        createdAt: new Date().toISOString()
    };
    
    todos.push(newTodo);
    await saveTodos();
    
    todoInput.value = '';
    renderTodos();
    updateItemsLeft();
}

function handleTodoClick(e) {
    const item = e.target.closest('.todo-item');
    
    if (!item) return;
    
    const id = parseInt(item.dataset.id);
    
    // Handle checkbox click
    if (e.target.classList.contains('todo-checkbox')) {
        toggleTodoComplete(id, item);
    }
    
    // Handle delete button click
    if (e.target.classList.contains('delete-btn')) {
        deleteTodo(id, item);
    }
}

async function toggleTodoComplete(id, element) {
    // Find todo index
    const todoIndex = todos.findIndex(todo => todo.id === id);
    if (todoIndex === -1) return;
    
    // Update todo in array
    todos[todoIndex].completed = !todos[todoIndex].completed;
    
    // Update UI with animation before saving
    if (todos[todoIndex].completed) {
        element.classList.add('completed');
    } else {
        element.classList.remove('completed');
    }
    
    // Add animation class
    element.classList.add('completeTask');
    setTimeout(() => {
        element.classList.remove('completeTask');
    }, 500);
    
    // Save changes
    await saveTodos();
    updateItemsLeft();
}

async function deleteTodo(id, element) {
    // Add delete animation
    element.classList.add('deleting');
    
    // Wait for animation to finish before removing from DOM and array
    setTimeout(async () => {
        todos = todos.filter(todo => todo.id !== id);
        await saveTodos();
        renderTodos();
        updateItemsLeft();
    }, 500);
}

async function clearCompleted() {
    // Get all completed items and animate them
    const completedItems = document.querySelectorAll('.todo-item.completed');
    completedItems.forEach(item => {
        item.classList.add('deleting');
    });
    
    // Wait for animation to finish
    setTimeout(async () => {
        todos = todos.filter(todo => !todo.completed);
        await saveTodos();
        renderTodos();
        updateItemsLeft();
    }, 500);
}

function renderTodos() {
    // Filter todos based on current filter
    const filteredTodos = todos.filter(todo => {
        if (currentFilter === 'active') return !todo.completed;
        if (currentFilter === 'completed') return todo.completed;
        return true; // 'all' filter
    });
    
    // Clear current list
    todoList.innerHTML = '';
    
    // Show empty state if no todos
    if (filteredTodos.length === 0) {
        const emptyState = emptyStateTemplate.content.cloneNode(true);
        
        if (todos.length === 0) {
            emptyState.querySelector('.empty-icon').textContent = '📝';
            emptyState.querySelector('.empty-title').textContent = 'Your todo list is empty';
            emptyState.querySelector('.empty-description').textContent = 'Add a new task to get started';
        } else {
            emptyState.querySelector('.empty-icon').textContent = '🔍';
            emptyState.querySelector('.empty-title').textContent = `No ${currentFilter} tasks found`;
            emptyState.querySelector('.empty-description').textContent = '';
        }
        
        todoList.appendChild(emptyState);
        return;
    }
    
    // Render filtered todos
    filteredTodos.forEach(todo => {
        const todoItem = todoItemTemplate.content.cloneNode(true).querySelector('.todo-item');
        
        if (todo.completed) {
            todoItem.classList.add('completed');
        }
        
        todoItem.dataset.id = todo.id;
        todoItem.querySelector('.todo-text').textContent = todo.text;
        todoItem.querySelector('.todo-checkbox').checked = todo.completed;
        
        todoList.appendChild(todoItem);
    });
}

function updateItemsLeft() {
    const activeCount = todos.filter(todo => !todo.completed).length;
    itemsLeftSpan.textContent = `${activeCount} item${activeCount !== 1 ? 's' : ''} left`;
}

// Initialize the app
initApp();