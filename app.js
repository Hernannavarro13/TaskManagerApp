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
const registerForm = document.getElementById('registerForm');
const loginForm = document.getElementById('loginForm');
const authScreen = document.querySelector('.auth-screen');
const todoApp = document.querySelector('.todo-app');
const progressRing = document.querySelector('.progress-ring-circle');
const progressPercentage = document.querySelector('.progress-percentage');
const tasksCompletedElement = document.getElementById('tasksCompleted');
const tasksRemainingElement = document.getElementById('tasksRemaining');
const calendarTitle = document.querySelector('.calendar-title');
const calendarGrid = document.querySelector('.calendar-grid');
const prevMonthBtn = document.getElementById('prevMonth');
const nextMonthBtn = document.getElementById('nextMonth');
const yearProgressFill = document.querySelector('.year-progress-fill');
const yearTotalElement = document.getElementById('yearTotal');
const yearCompletedElement = document.getElementById('yearCompleted');
const calendarViewBtns = document.querySelectorAll('.calendar-view-btn');
const calendarTodayBtn = document.querySelector('.calendar-today-btn');
const calendarDayView = document.querySelector('.calendar-day-view');
const calendarWeekView = document.querySelector('.calendar-week-view');
const periodTotalElement = document.getElementById('periodTotal');
const periodCompletedElement = document.getElementById('periodCompleted');
const calendarDatePicker = document.getElementById('calendarDatePicker');
const miniCalendar = document.getElementById('miniCalendar');
const quickNavBtns = document.querySelectorAll('.calendar-quick-nav button');
const taskItemTemplate = document.getElementById('task-item-template');
const taskSearch = document.getElementById('taskSearch');
const filterDropdownBtn = document.getElementById('filterDropdownBtn');
const filterMenu = document.getElementById('filterMenu');
const taskDetailsModal = document.getElementById('taskDetailsModal');
const taskDetailsForm = document.getElementById('taskDetailsForm');
const categoryModal = document.getElementById('categoryModal');
const addCategoryForm = document.getElementById('addCategoryForm');
const categoryList = document.getElementById('categoryList');
const statsTimeRange = document.getElementById('statsTimeRange');
const addCategoryBtn = document.getElementById('addCategoryBtn');

// App state
let todos = [];
let currentFilter = 'all';
let isSyncing = false;
let currentDate = new Date();
let yearStats = {
    total: 0,
    completed: 0
};

// Additional state
let currentView = 'month';
let selectedDate = new Date();
let draggedTask = null;
let currentTimeInterval;
let categories = [];
let holidays = [];
let currentTask = null;
let charts = {};

// API endpoint - Replace with your actual backend API URL when available
const API_URL = 'https://taskmanagerapp-todo-server.onrender.com';

// Initialize app
async function initApp() {
    const authToken = localStorage.getItem('authToken');
    
    // Show appropriate screen based on auth state
    if (authToken) {
        showTodoApp();
    } else {
        showAuthScreen();
        return; // Don't continue initialization if not authenticated
    }
    
    // Load saved todos
    try {
        // Try to load from server first
        try {
            const response = await axios.get(`${API_URL}/todos`, {
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });
            todos = response.data || [];
        } catch (error) {
            console.warn('Failed to load from server, using local storage:', error);
            // Fall back to localStorage
            const savedTodos = localStorage.getItem('todos');
            todos = savedTodos ? JSON.parse(savedTodos) : [];
        }
    } catch (error) {
        console.error('Error loading todos:', error);
        todos = [];
    }
    
    // Set theme
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);
    
    // Setup event listeners
    setupEventListeners();
    
    // Initialize features
    initCalendarFeatures();
    renderTodos();
    updateProgress();
    renderCalendar();
}

function showAuthScreen() {
    document.querySelector('.todo-app').style.display = 'none';
    document.querySelector('.auth-screen').style.display = 'flex';
}

function showTodoApp() {
    document.querySelector('.todo-app').style.display = 'block';
    document.querySelector('.auth-screen').style.display = 'none';
}

function setupEventListeners() {
    // Remove any existing listeners
    const newTodoForm = document.querySelector('.todo-form');
    if (!newTodoForm) {
        console.error('Todo form not found');
        return;
    }
    
    const clonedForm = newTodoForm.cloneNode(true);
    newTodoForm.parentNode.replaceChild(clonedForm, newTodoForm);
    
    // Add new listeners
    clonedForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        await handleTodoSubmit(e);
    });
    
    const newTodoInput = clonedForm.querySelector('.todo-input');
    if (newTodoInput) {
        newTodoInput.addEventListener('keydown', async (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                e.stopPropagation();
                await handleTodoSubmit(e);
            }
        });
    }

    // Todo list interactions
    const todoList = document.querySelector('.todo-list');
    if (todoList) {
        todoList.addEventListener('click', handleTodoClick);
    }
    
    // Filters
    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            renderTodos();
        });
    });
    
    // Clear completed
    const clearCompletedBtn = document.querySelector('.clear-completed');
    if (clearCompletedBtn) {
        clearCompletedBtn.addEventListener('click', clearCompleted);
    }
    
    // Theme toggle
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }
    
    // Search
    const searchInput = document.getElementById('taskSearch');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(() => {
            const searchTerm = searchInput.value.toLowerCase();
            filterTasks({ searchTerm });
        }, 300));
    }
    
    // Category management
    const addCategoryBtn = document.getElementById('addCategoryBtn');
    if (addCategoryBtn) {
        addCategoryBtn.addEventListener('click', () => {
            showCategoryModal();
        });
    }
    
    // Calendar navigation
    const calendarViewBtns = document.querySelectorAll('.calendar-view-btn');
    calendarViewBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const view = btn.dataset.view;
            if (view) {
                calendarViewBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                switchCalendarView(view);
            }
        });
    });
}

function filterTasks(filters = {}) {
    const filteredTodos = todos.filter(todo => {
        // Search filter
        if (filters.searchTerm && !todo.text.toLowerCase().includes(filters.searchTerm)) {
            return false;
        }
        
        // Status filter
        if (currentFilter === 'active' && todo.completed) return false;
        if (currentFilter === 'completed' && !todo.completed) return false;
        
        // Category filter
        if (filters.category && todo.categoryId !== filters.category) {
            return false;
        }
        
        return true;
    });
    
    renderTodos(filteredTodos);
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
    try {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            console.warn('No auth token found');
            return;
        }

        const response = await axios.get(`${API_URL}/todos`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        todos = response.data || [];
        renderTodos();
        updateItemsLeft();
        updateProgress();
        updateCalendarView();
    } catch (error) {
        console.error('Failed to load todos:', error);
        // Try to load from localStorage as fallback
        const savedTodos = localStorage.getItem(`todos_${getUserId()}`);
        if (savedTodos) {
            todos = JSON.parse(savedTodos);
            renderTodos();
            updateItemsLeft();
            updateProgress();
            updateCalendarView();
        }
    }
}

async function saveTodos() {
    try {
        // Always save to localStorage first
        localStorage.setItem('todos', JSON.stringify(todos));
        
        // Try to sync with server if authenticated
        const authToken = localStorage.getItem('authToken');
        if (authToken) {
            try {
                // We don't wait for this to complete
                todos.forEach(async (todo) => {
                    if (!todo.synced) {
                        try {
                            await axios.post(`${API_URL}/todos`, todo, {
                                headers: {
                                    'Authorization': `Bearer ${authToken}`
                                }
                            });
                            todo.synced = true;
                        } catch (error) {
                            console.warn('Failed to sync todo with server:', error);
                        }
                    }
                });
            } catch (error) {
                console.warn('Failed to sync with server:', error);
            }
        }
        
        return true;
    } catch (error) {
        console.error('Error saving todos:', error);
        return false;
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

// Update form submission handler
async function handleTodoSubmit(e) {
    if (e) {
        e.preventDefault();
        e.stopPropagation();
    }

    const todoInput = document.querySelector('.todo-input');
    const todoText = todoInput.value.trim();
    
    if (todoText.length === 0) {
        return false;
    }

    await addTodo(e);
    return false;
}

// Update addTodo to accept text directly
async function addTodo(e) {
    if (e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    const todoInput = document.querySelector('.todo-input');
    const todoText = todoInput.value.trim();
    if (todoText.length === 0) return;
    
    const newTodo = {
        id: Date.now(),
        text: todoText,
        completed: false,
        createdAt: new Date().toISOString()
    };
    
    try {
        const authToken = localStorage.getItem('authToken');
        if (authToken) {
            // Try to save to server first
            try {
                const response = await axios.post(`${API_URL}/todos`, newTodo, {
                    headers: {
                        'Authorization': `Bearer ${authToken}`
                    }
                });
                // If successful, use the server's version of the todo
                newTodo.id = response.data.id || newTodo.id;
            } catch (error) {
                console.warn('Failed to save to server, saving locally only:', error);
            }
        }
        
        // Add to local array
        todos.unshift(newTodo);
        
        // Clear input
        todoInput.value = '';
        
        // Save to localStorage
        await saveTodos();
        
        // Update UI
        renderTodos();
        updateProgress();
        updateCalendarView();
        
        // Show success feedback
        const todoForm = document.querySelector('.todo-form');
        if (todoForm) {
            todoForm.classList.add('success');
            setTimeout(() => todoForm.classList.remove('success'), 500);
        }
        
        return false;
    } catch (error) {
        console.error('Error adding todo:', error);
        alert('Failed to add todo. Please try again.');
    }
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
    try {
        const todoIndex = todos.findIndex(todo => todo.id === id);
        if (todoIndex === -1) return;
        
        const updatedTodo = {
            ...todos[todoIndex],
            completed: !todos[todoIndex].completed
        };
        
        // Update on server
        await axios.put(`${API_URL}/todos/${id}`, updatedTodo, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });
        
        // Update local state and UI
        todos[todoIndex] = updatedTodo;
        
        if (updatedTodo.completed) {
            element.classList.add('completed');
        } else {
            element.classList.remove('completed');
        }
        
        element.querySelector('.todo-checkbox').checked = updatedTodo.completed;
        
        await saveTodos();
        updateItemsLeft();
        updateProgress();
        updateCalendarView();
    } catch (error) {
        console.error('Failed to update todo:', error);
        // Revert checkbox state
        element.querySelector('.todo-checkbox').checked = !element.querySelector('.todo-checkbox').checked;
        alert('Failed to update todo. Please try again.');
    }
}

async function deleteTodo(id, element) {
    try {
        element.classList.add('deleting');
        
        // Delete from server
        await axios.delete(`${API_URL}/todos/${id}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });
        
        // Remove from local array and update UI
        setTimeout(async () => {
            todos = todos.filter(todo => todo.id !== id);
            await saveTodos();
            filterTasks();
            updateItemsLeft();
            updateProgress();
            updateCalendarView();
        }, 500);
    } catch (error) {
        console.error('Failed to delete todo:', error);
        element.classList.remove('deleting');
        alert('Failed to delete todo. Please try again.');
    }
}

async function clearCompleted() {
    const completedItems = document.querySelectorAll('.todo-item.completed');
    completedItems.forEach(item => {
        item.classList.add('deleting');
    });
    
    setTimeout(async () => {
        todos = todos.filter(todo => !todo.completed);
        await saveTodos();
        renderTodos();
        updateItemsLeft();
        updateProgress();
        updateCalendarView(); // Update calendar view instead of just renderCalendar
    }, 500);
}

function renderTodos(filteredTodos = todos) {
    // Get the todo list container
    const todoList = document.querySelector('.todo-list');
    if (!todoList) {
        console.error('Todo list container not found');
        return;
    }
    
    // Clear current list
    todoList.innerHTML = '';
    
    // Show empty state if no todos
    if (filteredTodos.length === 0) {
        const emptyState = document.createElement('div');
        emptyState.className = 'empty-state';
        emptyState.innerHTML = `
            <span class="empty-icon">📝</span>
            <h2 class="empty-title">${todos.length === 0 ? 'Your todo list is empty' : `No ${currentFilter} tasks found`}</h2>
            <p class="empty-description">${todos.length === 0 ? 'Add a new task to get started' : ''}</p>
        `;
        todoList.appendChild(emptyState);
        return;
    }
    
    // Create and append todo items
    filteredTodos.forEach(todo => {
        const todoItem = document.createElement('li');
        todoItem.className = `todo-item${todo.completed ? ' completed' : ''}`;
        todoItem.dataset.id = todo.id;
        
        todoItem.innerHTML = `
            <div class="checkbox-wrapper">
                <input type="checkbox" class="todo-checkbox" ${todo.completed ? 'checked' : ''}>
                <div class="custom-checkbox"></div>
            </div>
            <span class="todo-text">${todo.text}</span>
            <button class="delete-btn" aria-label="Delete todo">×</button>
        `;
        
        // Add event listeners
        const checkbox = todoItem.querySelector('.todo-checkbox');
        checkbox.addEventListener('change', () => {
            toggleTodoComplete(todo.id, todoItem);
        });
        
        const deleteBtn = todoItem.querySelector('.delete-btn');
        deleteBtn.addEventListener('click', () => {
            deleteTodo(todo.id, todoItem);
        });
        
        todoList.appendChild(todoItem);
    });
    
    // Update counts
    updateItemsLeft();
    updateProgress();
}

function updateItemsLeft() {
    const activeCount = todos.filter(todo => !todo.completed).length;
    itemsLeftSpan.textContent = `${activeCount} item${activeCount !== 1 ? 's' : ''} left`;
}

// Handle Register Form Submission
async function handleRegister(e) {
    e.preventDefault();
    e.stopPropagation();

    const username = document.getElementById('usernameRegister').value;
    const password = document.getElementById('passwordRegister').value;
    const startColor = document.getElementById('startColor').value;
    const middleColor = document.getElementById('middleColor').value;
    const endColor = document.getElementById('endColor').value;

    const payload = {
        username,
        password,
        gradient: {
            isEnabled: true,
            startColor,
            middleColor,
            endColor
        }
    };

    try {
        const response = await axios.post(`${API_URL}/register`, payload, {
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (response.status === 201) {
            alert('Registration successful! Please log in.');
            // Switch to login tab
            document.querySelector('[data-tab="login"]').click();
        } else {
            alert(response.data.message || 'Registration failed');
        }
    } catch (error) {
        console.error('Registration error:', error);
        alert(error.response?.data?.message || 'Registration failed');
    }
}

// Handle Login Form Submission
async function handleLogin(e) {
    e.preventDefault();
    e.stopPropagation();

    const username = document.getElementById('usernameLogin').value;
    const password = document.getElementById('passwordLogin').value;

    try {
        const response = await axios.post(`${API_URL}/login`, {
            username,
            password
        });

        if (response.data.token) {
            localStorage.setItem('authToken', response.data.token);
            if (response.data.settings) {
                localStorage.setItem('userSettings', JSON.stringify(response.data.settings));
            }
            showTodoApp();
            await initApp();
        } else {
            alert('Login failed: Invalid credentials');
        }
    } catch (error) {
        console.error('Login error:', error);
        alert(error.response?.data?.message || 'Login failed');
    }
}

// Setup auth related event listeners
function setupAuthEventListeners() {
    const registerForm = document.getElementById('registerForm');
    const loginForm = document.getElementById('loginForm');
    const authTabs = document.querySelectorAll('.auth-tab');
    
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }
    
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    // Handle tab switching
    authTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetForm = tab.dataset.tab;
            
            // Update active tab
            authTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            // Show corresponding form
            document.getElementById('loginForm').style.display = targetForm === 'login' ? 'flex' : 'none';
            document.getElementById('registerForm').style.display = targetForm === 'register' ? 'flex' : 'none';
            
            // Move the slider
            document.querySelector('.auth-tab-slider').classList.toggle('register', targetForm === 'register');
        });
    });
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    setupAuthEventListeners();
    const authToken = localStorage.getItem('authToken');
    
    if (authToken) {
        showTodoApp();
        initApp();
    } else {
        showAuthScreen();
    }
});

// Check if user is logged in
const authToken = localStorage.getItem('authToken');

if (authToken) {
    document.body.classList.add('logged-in');
} else {
    document.body.classList.remove('logged-in');
}

// Initialize progress ring
const progressCircumference = 2 * Math.PI * 54; // 54 is the radius of our circle
progressRing.style.strokeDasharray = `${progressCircumference} ${progressCircumference}`;
progressRing.style.strokeDashoffset = progressCircumference;

// Calendar Navigation
function initCalendarFeatures() {
    // Set up date picker
    updateDatePickerValue();
    calendarDatePicker.addEventListener('click', toggleMiniCalendar);
    document.addEventListener('click', (e) => {
        if (!calendarDatePicker.contains(e.target) && !miniCalendar.contains(e.target)) {
            miniCalendar.classList.remove('show');
        }
    });

    // Navigation buttons
    prevMonthBtn.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        updateCalendarView();
    });

    nextMonthBtn.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        updateCalendarView();
    });

    // View switching and quick navigation
    document.querySelectorAll('.calendar-view-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const view = btn.dataset.view;
            const jump = btn.dataset.jump;

            if (view) {
                document.querySelectorAll('.calendar-view-btn[data-view]').forEach(b => 
                    b.classList.toggle('active', b === btn)
                );
                switchCalendarView(view);
            } else if (jump) {
                handleQuickNav(jump);
            }
        });
    });
}

function updateDatePickerValue() {
    const options = { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric' };
    calendarDatePicker.value = selectedDate.toLocaleDateString(undefined, options);
}

function renderMiniCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startingDay = firstDay.getDay();
    const monthLength = lastDay.getDate();
    
    const today = new Date();
    const isCurrentMonth = today.getMonth() === month && today.getFullYear() === year;

    let html = `
        <div class="mini-calendar-header">
            <span>${firstDay.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</span>
        </div>
        <div class="mini-calendar-weekdays">
            ${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
                .map(day => `<div class="mini-weekday">${day}</div>`).join('')}
        </div>
        <div class="mini-calendar-days">
    `;

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDay; i++) {
        html += '<div class="mini-day empty"></div>';
    }

    // Add the days of the month
    for (let day = 1; day <= monthLength; day++) {
        const date = new Date(year, month, day);
        const isToday = isCurrentMonth && today.getDate() === day;
        const isSelected = date.toDateString() === selectedDate.toDateString();
        
        html += `
            <div class="mini-day ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}" 
                 data-date="${date.toISOString()}">
                ${day}
            </div>
        `;
    }

    html += '</div>';
    miniCalendar.innerHTML = html;

    // Add click event listeners to days
    miniCalendar.querySelectorAll('.mini-day:not(.empty)').forEach(dayElement => {
        dayElement.addEventListener('click', () => {
            selectedDate = new Date(dayElement.dataset.date);
            currentDate = new Date(selectedDate);
            updateDatePickerValue();
            updateCalendarView();
            miniCalendar.classList.remove('show');
        });
    });
}

function handleQuickNav(type) {
    const today = new Date();
    
    switch(type) {
        case 'today':
            selectedDate = today;
            currentDate = new Date(today);
            currentView = 'day';
            break;
            
        case 'work-week':
            selectedDate = today;
            currentDate = new Date(today);
            // Find Monday of current week
            while (currentDate.getDay() !== 1) {
                currentDate.setDate(currentDate.getDate() - 1);
            }
            currentView = 'week';
            break;
            
        case 'weekend':
            selectedDate = today;
            currentDate = new Date(today);
            // Find Saturday of current week
            while (currentDate.getDay() !== 6) {
                currentDate.setDate(currentDate.getDate() + 1);
            }
            currentView = 'week';
            break;
    }
    
    updateDatePickerValue();
    updateCalendarView();
}

function switchCalendarView(view) {
    calendarGrid.style.display = view === 'month' ? 'grid' : 'none';
    calendarDayView.style.display = view === 'day' ? 'block' : 'none';
    calendarWeekView.style.display = view === 'week' ? 'block' : 'none';
    
    currentView = view;
    updateCalendarView();
}

function updateCalendarView() {
    // Hide all views first
    calendarGrid.style.display = 'none';
    calendarDayView.style.display = 'none';
    calendarWeekView.style.display = 'none';

    // Update view based on current selection
    switch(currentView) {
        case 'month':
            calendarGrid.style.display = 'grid';
            renderCalendar();
            break;
        case 'week':
            calendarWeekView.style.display = 'block';
            renderWeekView();
            break;
        case 'day':
            calendarDayView.style.display = 'block';
            renderDayView();
            break;
    }

    // Update period stats
    updatePeriodStats();
}

function renderWeekView() {
    const weekStart = getWeekStart(selectedDate);
    const weekTimeline = calendarWeekView.querySelector('.week-timeline');
    weekTimeline.innerHTML = '';

    // Add time column
    const timeCol = document.createElement('div');
    timeCol.className = 'week-timeline-header';
    timeCol.textContent = 'Time';
    weekTimeline.appendChild(timeCol);

    // Add day headers
    for (let i = 0; i < 7; i++) {
        const date = new Date(weekStart);
        date.setDate(weekStart.getDate() + i);
        const dayCol = document.createElement('div');
        dayCol.className = 'week-timeline-header';
        dayCol.textContent = date.toLocaleDateString('default', { weekday: 'short' }) + 
                           '\n' + date.getDate();
        weekTimeline.appendChild(dayCol);
    }

    // Add time slots
    for (let hour = 0; hour < 24; hour++) {
        // Time label
        const timeLabel = document.createElement('div');
        timeLabel.className = 'week-timeline-slot';
        timeLabel.textContent = `${hour}:00`;
        weekTimeline.appendChild(timeLabel);

        // Slots for each day
        for (let day = 0; day < 7; day++) {
            const slot = document.createElement('div');
            slot.className = 'week-timeline-slot';
            
            // Find tasks for this time slot
            const date = new Date(weekStart);
            date.setDate(weekStart.getDate() + day);
            date.setHours(hour);
            
            const tasksForSlot = getTodosForDateTime(date);
            tasksForSlot.forEach(todo => {
                const taskElement = createTaskElement(todo);
                slot.appendChild(taskElement);
            });
            
            weekTimeline.appendChild(slot);
        }
    }
}

function renderDayView() {
    const daySchedule = calendarDayView.querySelector('.day-schedule');
    daySchedule.innerHTML = '';

    // Create 24 hour slots
    for (let hour = 0; hour < 24; hour++) {
        const timeSlot = document.createElement('div');
        timeSlot.className = 'time-slot';

        const timeLabel = document.createElement('div');
        timeLabel.className = 'time-slot-label';
        timeLabel.textContent = `${hour}:00`;

        const content = document.createElement('div');
        content.className = 'time-slot-content';

        // Find tasks for this hour
        const slotDate = new Date(selectedDate);
        slotDate.setHours(hour);
        const tasksForSlot = getTodosForDateTime(slotDate);
        
        tasksForSlot.forEach(todo => {
            const taskElement = createTaskElement(todo);
            content.appendChild(taskElement);
        });

        timeSlot.appendChild(timeLabel);
        timeSlot.appendChild(content);
        daySchedule.appendChild(timeSlot);
    }
}

function createTaskElement(todo) {
    const template = taskItemTemplate.content.cloneNode(true);
    const taskItem = template.querySelector('.task-item');
    
    // Set task properties
    taskItem.dataset.id = todo.id;
    taskItem.draggable = true;
    
    // Add time
    const timeElement = taskItem.querySelector('.task-time');
    const todoDate = new Date(todo.createdAt);
    timeElement.textContent = todoDate.toLocaleTimeString('default', { 
        hour: '2-digit', 
        minute: '2-digit'
    });
    
    // Add text
    const textElement = taskItem.querySelector('.task-text');
    textElement.textContent = todo.text;
    
    // Add priority indicator if exists
    if (todo.priority) {
        const priorityElement = taskItem.querySelector('.task-priority');
        priorityElement.classList.add(todo.priority);
    }
    
    // Add labels if exist
    if (todo.labels && todo.labels.length > 0) {
        const labelsContainer = taskItem.querySelector('.task-labels');
        todo.labels.forEach(label => {
            const labelElement = document.createElement('span');
            labelElement.className = 'task-label';
            labelElement.textContent = label;
            labelsContainer.appendChild(labelElement);
        });
    }
    
    if (todo.completed) {
        taskItem.classList.add('completed');
    }
    
    return taskItem;
}

function getTodosForDateTime(date) {
    return todos.filter(todo => {
        const todoDate = new Date(todo.createdAt);
        return todoDate.getHours() === date.getHours() &&
               todoDate.getDate() === date.getDate() &&
               todoDate.getMonth() === date.getMonth() &&
               todoDate.getFullYear() === date.getFullYear();
    });
}

function getWeekStart(date) {
    const start = new Date(date);
    start.setDate(start.getDate() - start.getDay());
    start.setHours(0, 0, 0, 0);
    return start;
}

function updatePeriodStats() {
    let periodTodos = [];
    
    switch(currentView) {
        case 'month':
            periodTodos = getTodosForMonth(selectedDate);
            break;
        case 'week':
            periodTodos = getTodosForWeek(selectedDate);
            break;
        case 'day':
            periodTodos = getTodosForDay(selectedDate);
            break;
    }
    
    const total = periodTodos.length;
    const completed = periodTodos.filter(todo => todo.completed).length;
    
    periodTotalElement.textContent = total;
    periodCompletedElement.textContent = completed;
}

function getTodosForMonth(date) {
    return todos.filter(todo => {
        const todoDate = new Date(todo.createdAt);
        return todoDate.getMonth() === date.getMonth() &&
               todoDate.getFullYear() === date.getFullYear();
    });
}

function getTodosForWeek(date) {
    const weekStart = getWeekStart(date);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    
    return todos.filter(todo => {
        const todoDate = new Date(todo.createdAt);
        return todoDate >= weekStart && todoDate < weekEnd;
    });
}

function getTodosForDay(date) {
    return todos.filter(todo => {
        const todoDate = new Date(todo.createdAt);
        return todoDate.getDate() === date.getDate() &&
               todoDate.getMonth() === date.getMonth() &&
               todoDate.getFullYear() === date.getFullYear();
    });
}

// Update progress displays
function updateProgress() {
    const total = todos.length;
    const completed = todos.filter(todo => todo.completed).length;
    
    // Update progress ring
    const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);
    const progressCircumference = 2 * Math.PI * 54;
    const offset = progressCircumference - (progressCircumference * percentage) / 100;
    progressRing.style.strokeDashoffset = offset;
    
    // Update percentage text
    progressPercentage.textContent = `${percentage}%`;
    
    // Update task counts
    tasksCompletedElement.textContent = completed;
    tasksRemainingElement.textContent = total - completed;
    
    // Update year progress
    yearTotalElement.textContent = total;
    yearCompletedElement.textContent = completed;
    yearProgressFill.style.width = `${percentage}%`;
}

// Confetti animation
function triggerConfetti() {
    confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#57ddff', '#c058f3', '#484b6a'],
    });
}

// Initialize calendar features when app starts
document.addEventListener('DOMContentLoaded', initCalendarFeatures);

// Initialize the app
initApp();

// Initialize additional features
async function initAdditionalFeatures() {
    // Load categories
    loadCategories();
    
    // Load holidays
    loadHolidays();
    
    // Initialize charts
    initCharts();
    
    // Set up event listeners
    setupEventListeners();
    
    // Initial statistics update
    updateStatistics();
}

// Category Management
function loadCategories() {
    categories = JSON.parse(localStorage.getItem('categories')) || [
        { id: 1, name: 'Work', color: '#4361ee' },
        { id: 2, name: 'Personal', color: '#4cc9f0' },
        { id: 3, name: 'Shopping', color: '#f72585' },
        { id: 4, name: 'Health', color: '#4caf50' }
    ];
    renderCategories();
}

function renderCategories() {
    categoryList.innerHTML = '';
    categories.forEach(category => {
        const categoryItem = document.createElement('div');
        categoryItem.className = 'category-item';
        categoryItem.innerHTML = `
            <div class="category-color" style="background-color: ${category.color}"></div>
            <div class="category-name">${category.name}</div>
        `;
        categoryItem.addEventListener('click', () => handleCategoryClick(category.id));
        categoryList.appendChild(categoryItem);
    });
    
    // Update category select in task details
    const categorySelect = document.getElementById('categorySelect');
    categorySelect.innerHTML = '<option value="">Select Category</option>';
    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category.id;
        option.textContent = category.name;
        categorySelect.appendChild(option);
    });
    
    // Update category filters
    const categoryFilters = document.getElementById('categoryFilters');
    categoryFilters.innerHTML = '';
    categories.forEach(category => {
        const label = document.createElement('label');
        label.innerHTML = `
            <input type="checkbox" value="${category.id}">
            <span class="category-color" style="background-color: ${category.color}"></span>
            ${category.name}
        `;
        categoryFilters.appendChild(label);
    });
    
    // Save to localStorage
    localStorage.setItem('categories', JSON.stringify(categories));
}

// Holiday Management
async function loadHolidays() {
    try {
        const response = await fetch('https://date.nager.at/api/v3/publicholidays/2024/US');
        holidays = await response.json();
        updateHolidayIndicator();
    } catch (error) {
        console.error('Failed to load holidays:', error);
    }
}

function updateHolidayIndicator() {
    const today = new Date();
    const upcomingHoliday = holidays.find(holiday => {
        const holidayDate = new Date(holiday.date);
        return holidayDate >= today;
    });
    
    if (upcomingHoliday) {
        const holidayName = document.querySelector('.holiday-name');
        const holidayDate = document.querySelector('.holiday-date');
        
        holidayName.textContent = upcomingHoliday.name;
        holidayDate.textContent = new Date(upcomingHoliday.date).toLocaleDateString();
        
        document.querySelector('.holiday-indicator').style.display = 'flex';
    } else {
        document.querySelector('.holiday-indicator').style.display = 'none';
    }
}

// Statistics and Charts
function initCharts() {
    // Completion Rate Chart
    const completionCtx = document.getElementById('completionChart').getContext('2d');
    charts.completion = new Chart(completionCtx, {
        type: 'doughnut',
        data: {
            labels: ['Completed', 'Remaining'],
            datasets: [{
                data: [0, 0],
                backgroundColor: [
                    getComputedStyle(document.documentElement).getPropertyValue('--gradient-2'),
                    getComputedStyle(document.documentElement).getPropertyValue('--border-color')
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });
    
    // Priority Distribution Chart
    const priorityCtx = document.getElementById('priorityChart').getContext('2d');
    charts.priority = new Chart(priorityCtx, {
        type: 'bar',
        data: {
            labels: ['High', 'Medium', 'Low'],
            datasets: [{
                data: [0, 0, 0],
                backgroundColor: ['#f72585', '#4361ee', '#4cc9f0']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });
    
    // Category Distribution Chart
    const categoryCtx = document.getElementById('categoryChart').getContext('2d');
    charts.category = new Chart(categoryCtx, {
        type: 'pie',
        data: {
            labels: [],
            datasets: [{
                data: [],
                backgroundColor: []
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });
    
    // Productivity Hours Chart
    const productivityCtx = document.getElementById('productivityChart').getContext('2d');
    charts.productivity = new Chart(productivityCtx, {
        type: 'line',
        data: {
            labels: Array.from({length: 24}, (_, i) => `${i}:00`),
            datasets: [{
                label: 'Tasks',
                data: Array(24).fill(0),
                borderColor: getComputedStyle(document.documentElement).getPropertyValue('--gradient-1'),
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });
}

function updateStatistics() {
    const timeRange = statsTimeRange.value;
    const stats = calculateStats(timeRange);
    
    // Update completion rate
    document.getElementById('completionRate').textContent = `${stats.completionRate}%`;
    charts.completion.data.datasets[0].data = [stats.completed, stats.total - stats.completed];
    charts.completion.update();
    
    // Update priority distribution
    charts.priority.data.datasets[0].data = [
        stats.priorities.high,
        stats.priorities.medium,
        stats.priorities.low
    ];
    charts.priority.update();
    
    // Update category distribution
    charts.category.data.labels = categories.map(c => c.name);
    charts.category.data.datasets[0].data = categories.map(c => stats.categories[c.id] || 0);
    charts.category.data.datasets[0].backgroundColor = categories.map(c => c.color);
    charts.category.update();
    
    // Update productivity hours
    charts.productivity.data.datasets[0].data = stats.hourlyDistribution;
    charts.productivity.update();
    
    // Update summary stats
    document.getElementById('productiveDay').textContent = stats.mostProductiveDay;
    document.getElementById('avgDailyTasks').textContent = stats.averageDailyTasks.toFixed(1);
    document.getElementById('longestStreak').textContent = `${stats.longestStreak} days`;
}

function calculateStats(timeRange) {
    // Filter todos based on time range
    const now = new Date();
    const filteredTodos = todos.filter(todo => {
        const todoDate = new Date(todo.createdAt);
        switch(timeRange) {
            case 'day':
                return isSameDay(todoDate, now);
            case 'week':
                return isThisWeek(todoDate, now);
            case 'month':
                return isSameMonth(todoDate, now);
            case 'year':
                return isSameYear(todoDate, now);
            default:
                return true;
        }
    });
    
    // Calculate basic stats
    const total = filteredTodos.length;
    const completed = filteredTodos.filter(todo => todo.completed).length;
    const completionRate = total === 0 ? 0 : Math.round((completed / total) * 100);
    
    // Calculate priority distribution
    const priorities = {
        high: filteredTodos.filter(todo => todo.priority === 'high').length,
        medium: filteredTodos.filter(todo => todo.priority === 'medium').length,
        low: filteredTodos.filter(todo => todo.priority === 'low').length
    };
    
    // Calculate category distribution
    const categories = {};
    filteredTodos.forEach(todo => {
        if (todo.categoryId) {
            categories[todo.categoryId] = (categories[todo.categoryId] || 0) + 1;
        }
    });
    
    // Calculate hourly distribution
    const hourlyDistribution = Array(24).fill(0);
    filteredTodos.forEach(todo => {
        const hour = new Date(todo.createdAt).getHours();
        hourlyDistribution[hour]++;
    });
    
    // Calculate most productive day
    const dailyTasks = {};
    filteredTodos.forEach(todo => {
        const date = new Date(todo.createdAt).toLocaleDateString();
        dailyTasks[date] = (dailyTasks[date] || 0) + 1;
    });
    
    const mostProductiveDay = Object.entries(dailyTasks)
        .sort(([,a], [,b]) => b - a)[0]?.[0] || '-';
    
    // Calculate average daily tasks
    const uniqueDays = Object.keys(dailyTasks).length;
    const averageDailyTasks = uniqueDays === 0 ? 0 : total / uniqueDays;
    
    // Calculate longest streak
    const longestStreak = calculateLongestStreak(filteredTodos);
    
    return {
        total,
        completed,
        completionRate,
        priorities,
        categories,
        hourlyDistribution,
        mostProductiveDay,
        averageDailyTasks,
        longestStreak
    };
}

// Task Search and Filter
function setupSearchAndFilter() {
    taskSearch.addEventListener('input', debounce(() => {
        const searchTerm = taskSearch.value.toLowerCase();
        filterTasks({ searchTerm });
    }, 300));
    
    filterDropdownBtn.addEventListener('click', () => {
        filterMenu.classList.toggle('show');
    });
    
    document.addEventListener('click', (e) => {
        if (!filterMenu.contains(e.target) && !filterDropdownBtn.contains(e.target)) {
            filterMenu.classList.remove('show');
        }
    });
    
    // Set up filter checkboxes
    const filterCheckboxes = filterMenu.querySelectorAll('input[type="checkbox"]');
    filterCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            const activeFilters = getActiveFilters();
            filterTasks(activeFilters);
        });
    });
}

function getActiveFilters() {
    const filters = {
        categories: [],
        priorities: [],
        status: [],
        searchTerm: taskSearch.value.toLowerCase()
    };
    
    // Get selected categories
    document.querySelectorAll('#categoryFilters input:checked').forEach(checkbox => {
        filters.categories.push(parseInt(checkbox.value));
    });
    
    // Get selected priorities
    document.querySelectorAll('.filter-section:nth-child(2) input:checked').forEach(checkbox => {
        filters.priorities.push(checkbox.value);
    });
    
    // Get selected status
    document.querySelectorAll('.filter-section:nth-child(3) input:checked').forEach(checkbox => {
        filters.status.push(checkbox.value);
    });
    
    return filters;
}

// Task Details Modal
function setupTaskDetailsModal() {
    // Open modal on task click
    todoList.addEventListener('click', (e) => {
        const todoItem = e.target.closest('.todo-item');
        if (todoItem && !e.target.classList.contains('todo-checkbox') && 
            !e.target.classList.contains('delete-btn')) {
            const taskId = parseInt(todoItem.dataset.id);
            openTaskDetails(taskId);
        }
    });
    
    // Close modal
    document.querySelector('.close-modal').addEventListener('click', () => {
        taskDetailsModal.classList.remove('show');
    });
    
    // Handle form submission
    taskDetailsForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveTaskDetails();
    });
    
    // Handle recurrence type change
    const recurrenceType = taskDetailsForm.querySelector('[name="recurrenceType"]');
    recurrenceType.addEventListener('change', () => {
        const customRecurrence = taskDetailsForm.querySelector('.custom-recurrence');
        customRecurrence.style.display = recurrenceType.value === 'custom' ? 'flex' : 'none';
    });
    
    // Handle recurrence end type change
    const recurrenceEndInputs = taskDetailsForm.querySelectorAll('[name="recurrenceEnd"]');
    recurrenceEndInputs.forEach(input => {
        input.addEventListener('change', () => {
            const countInput = taskDetailsForm.querySelector('[name="recurrenceCount"]');
            const dateInput = taskDetailsForm.querySelector('[name="recurrenceEndDate"]');
            
            countInput.disabled = input.value !== 'after';
            dateInput.disabled = input.value !== 'on';
        });
    });
}

async function openTaskDetails(taskId) {
    currentTask = todos.find(todo => todo.id === taskId);
    if (!currentTask) return;
    
    // Populate form
    const form = taskDetailsForm;
    form.querySelector('[name="title"]').value = currentTask.text;
    form.querySelector('[name="description"]').value = currentTask.description || '';
    form.querySelector('[name="dueDate"]').value = currentTask.dueDate || '';
    form.querySelector('[name="priority"]').value = currentTask.priority || 'medium';
    form.querySelector('[name="category"]').value = currentTask.categoryId || '';
    
    // Set recurrence options
    if (currentTask.recurrence) {
        form.querySelector('[name="recurrenceType"]').value = currentTask.recurrence.type;
        if (currentTask.recurrence.type === 'custom') {
            form.querySelector('[name="recurrenceInterval"]').value = currentTask.recurrence.interval;
            form.querySelector('[name="recurrenceUnit"]').value = currentTask.recurrence.unit;
        }
        
        // Set end options
        const endType = currentTask.recurrence.end.type;
        form.querySelector(`[name="recurrenceEnd"][value="${endType}"]`).checked = true;
        if (endType === 'after') {
            form.querySelector('[name="recurrenceCount"]').value = currentTask.recurrence.end.count;
        } else if (endType === 'on') {
            form.querySelector('[name="recurrenceEndDate"]').value = currentTask.recurrence.end.date;
        }
    } else {
        form.querySelector('[name="recurrenceType"]').value = 'none';
    }
    
    // Show modal
    taskDetailsModal.classList.add('show');
}

async function saveTaskDetails() {
    if (!currentTask) return;
    
    const form = taskDetailsForm;
    const formData = new FormData(form);
    
    // Update task
    currentTask.text = formData.get('title');
    currentTask.description = formData.get('description');
    currentTask.dueDate = formData.get('dueDate');
    currentTask.priority = formData.get('priority');
    currentTask.categoryId = parseInt(formData.get('category')) || null;
    
    // Handle recurrence
    const recurrenceType = formData.get('recurrenceType');
    if (recurrenceType !== 'none') {
        currentTask.recurrence = {
            type: recurrenceType,
            interval: recurrenceType === 'custom' ? parseInt(formData.get('recurrenceInterval')) : 1,
            unit: recurrenceType === 'custom' ? formData.get('recurrenceUnit') : recurrenceType,
            end: {
                type: formData.get('recurrenceEnd'),
                count: parseInt(formData.get('recurrenceCount')) || null,
                date: formData.get('recurrenceEndDate') || null
            }
        };
    } else {
        delete currentTask.recurrence;
    }
    
    // Save changes
    await saveTodos();
    
    // Close modal and refresh view
    taskDetailsModal.classList.remove('show');
    renderTodos();
    updateStatistics();
}

// Helper functions
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function isSameDay(date1, date2) {
    return date1.getDate() === date2.getDate() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getFullYear() === date2.getFullYear();
}

function isThisWeek(date1, date2) {
    const week1 = getWeekNumber(date1);
    const week2 = getWeekNumber(date2);
    return week1 === week2 && date1.getFullYear() === date2.getFullYear();
}

function isSameMonth(date1, date2) {
    return date1.getMonth() === date2.getMonth() &&
           date1.getFullYear() === date2.getFullYear();
}

function isSameYear(date1, date2) {
    return date1.getFullYear() === date2.getFullYear();
}

function getWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
    return Math.ceil((((d - yearStart) / 86400000) + 1)/7);
}

function calculateLongestStreak(todos) {
    if (todos.length === 0) return 0;
    
    const completedDates = todos
        .filter(todo => todo.completed)
        .map(todo => new Date(todo.completedAt).toLocaleDateString())
        .sort();
    
    let currentStreak = 1;
    let maxStreak = 1;
    let prevDate = new Date(completedDates[0]);
    
    for (let i = 1; i < completedDates.length; i++) {
        const currentDate = new Date(completedDates[i]);
        const diffDays = (currentDate - prevDate) / (1000 * 60 * 60 * 24);
        
        if (diffDays === 1) {
            currentStreak++;
            maxStreak = Math.max(maxStreak, currentStreak);
        } else if (diffDays > 1) {
            currentStreak = 1;
        }
        
        prevDate = currentDate;
    }
    
    return maxStreak;
}

// Swipe Navigation
function initSwipeNavigation() {
    const swipeArea = document.querySelector('.calendar-swipe-area');
    const leftOverlay = document.querySelector('.swipe-overlay.left');
    const rightOverlay = document.querySelector('.swipe-overlay.right');
    const leftIndicator = document.querySelector('.swipe-indicator.left');
    const rightIndicator = document.querySelector('.swipe-indicator.right');
    
    let touchStartX = 0;
    let touchEndX = 0;
    let isDragging = false;
    let startTime = 0;
    
    // Touch events
    swipeArea.addEventListener('touchstart', (e) => {
        touchStartX = e.touches[0].clientX;
        startTime = Date.now();
        isDragging = true;
    });
    
    swipeArea.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        
        touchEndX = e.touches[0].clientX;
        const deltaX = touchEndX - touchStartX;
        
        // Show appropriate indicator based on swipe direction
        leftIndicator.classList.toggle('active', deltaX > 50);
        rightIndicator.classList.toggle('active', deltaX < -50);
    });
    
    swipeArea.addEventListener('touchend', () => {
        const deltaX = touchEndX - touchStartX;
        const deltaTime = Date.now() - startTime;
        
        // Only navigate if the swipe was fast enough and long enough
        if (deltaTime < 300 && Math.abs(deltaX) > 50) {
            if (deltaX > 0) {
                navigateToPreviousDay();
            } else {
                navigateToNextDay();
            }
        }
        
        // Reset indicators and state
        leftIndicator.classList.remove('active');
        rightIndicator.classList.remove('active');
        isDragging = false;
    });
    
    // Mouse events (for desktop)
    swipeArea.addEventListener('mousedown', (e) => {
        touchStartX = e.clientX;
        startTime = Date.now();
        isDragging = true;
    });
    
    swipeArea.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        
        touchEndX = e.clientX;
        const deltaX = touchEndX - touchStartX;
        
        // Show appropriate indicator based on swipe direction
        leftIndicator.classList.toggle('active', deltaX > 50);
        rightIndicator.classList.toggle('active', deltaX < -50);
    });
    
    swipeArea.addEventListener('mouseup', () => {
        if (!isDragging) return;
        
        const deltaX = touchEndX - touchStartX;
        const deltaTime = Date.now() - startTime;
        
        // Only navigate if the swipe was fast enough and long enough
        if (deltaTime < 300 && Math.abs(deltaX) > 50) {
            if (deltaX > 0) {
                navigateToPreviousDay();
            } else {
                navigateToNextDay();
            }
        }
        
        // Reset indicators and state
        leftIndicator.classList.remove('active');
        rightIndicator.classList.remove('active');
        isDragging = false;
    });
    
    // Click events for overlay arrows
    leftOverlay.addEventListener('click', navigateToPreviousDay);
    rightOverlay.addEventListener('click', navigateToNextDay);
    
    // Cancel dragging if mouse leaves the area
    swipeArea.addEventListener('mouseleave', () => {
        if (isDragging) {
            leftIndicator.classList.remove('active');
            rightIndicator.classList.remove('active');
            isDragging = false;
        }
    });
}

function navigateToNextDay() {
    selectedDate.setDate(selectedDate.getDate() + 1);
    currentDate = new Date(selectedDate);
    updateDatePickerValue();
    updateCalendarView();
    
    // Add a subtle animation
    const views = document.querySelector('.calendar-views');
    views.style.transform = 'translateX(-20px)';
    views.style.opacity = '0.5';
    
    setTimeout(() => {
        views.style.transform = 'translateX(0)';
        views.style.opacity = '1';
    }, 50);
}

function navigateToPreviousDay() {
    selectedDate.setDate(selectedDate.getDate() - 1);
    currentDate = new Date(selectedDate);
    updateDatePickerValue();
    updateCalendarView();
    
    // Add a subtle animation
    const views = document.querySelector('.calendar-views');
    views.style.transform = 'translateX(20px)';
    views.style.opacity = '0.5';
    
    setTimeout(() => {
        views.style.transform = 'translateX(0)';
        views.style.opacity = '1';
    }, 50);
}

// Initialize swipe navigation when app starts
document.addEventListener('DOMContentLoaded', () => {
    initApp().then(() => {
        initAdditionalFeatures();
        setupSearchAndFilter();
        setupTaskDetailsModal();
        initSwipeNavigation();
    });
});

// Add this function to handle category clicks
function handleCategoryClick(categoryId) {
    filterTasks({ category: categoryId });
}

// Add function to get user ID from token
function getUserId() {
    const token = localStorage.getItem('authToken');
    if (!token) return null;
    
    try {
        // Decode JWT token to get user ID
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        
        return JSON.parse(jsonPayload).userId;
    } catch (error) {
        console.error('Failed to decode token:', error);
        return null;
    }
}

// Update logout functionality
function logout() {
    localStorage.removeItem('authToken');
    todos = [];
    document.querySelector('.todo-app').style.display = 'none';
    document.querySelector('.auth-screen').style.display = 'flex';
}

// Add logout button handler
document.querySelector('.user-menu-btn').addEventListener('click', () => {
    if (confirm('Are you sure you want to logout?')) {
        logout();
    }
});

// Add this CSS class for loading state
const style = document.createElement('style');
style.textContent = `
    .todo-form.loading {
        opacity: 0.7;
        pointer-events: none;
    }
    
    .todo-form.success {
        animation: successPulse 0.5s ease;
    }
    
    @keyframes successPulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.02); }
        100% { transform: scale(1); }
    }
    
    .fa-spinner {
        animation: spin 1s linear infinite;
    }
    
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
`;
document.head.appendChild(style);

// Listen for auth events
window.addEventListener('auth:login:success', async () => {
    await initApp();
});

window.addEventListener('auth:logout', () => {
    todos = [];
    renderTodos();
});

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', initApp);