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

// Initialize auth screen
function initAuthScreen() {
    if (authScreen) {
        authScreen.style.display = 'block';
    }
    if (todoApp) {
        todoApp.style.display = 'none';
    }
}

// Initialize todo app screen
function initTodoAppScreen() {
    if (authScreen) {
        authScreen.style.display = 'none';
    }
    if (todoApp) {
        todoApp.style.display = 'block';
    }
}

// Initialize app
async function initApp() {
    // Check authentication first
    const authToken = localStorage.getItem('authToken');
    
    if (!authToken) {
        initAuthScreen();
        return;
    }
    
    initTodoAppScreen();
    
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
        updateProgress();
        renderCalendar(); // Initial calendar render
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
    updateProgress();
    updateCalendarView(); // Update calendar view instead of just renderCalendar
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
    const todoIndex = todos.findIndex(todo => todo.id === id);
    if (todoIndex === -1) return;
    
    const wasCompleted = todos[todoIndex].completed;
    todos[todoIndex].completed = !wasCompleted;
    
    if (todos[todoIndex].completed) {
        element.classList.add('completed');
    } else {
        element.classList.remove('completed');
    }
    
    element.classList.add('completeTask');
    setTimeout(() => {
        element.classList.remove('completeTask');
    }, 500);
    
    await saveTodos();
    updateItemsLeft();
    updateProgress();
    updateCalendarView(); // Update calendar view instead of just renderCalendar
}

async function deleteTodo(id, element) {
    element.classList.add('deleting');
    
    setTimeout(async () => {
        todos = todos.filter(todo => todo.id !== id);
        await saveTodos();
        renderTodos();
        updateItemsLeft();
        updateProgress();
        updateCalendarView(); // Update calendar view instead of just renderCalendar
    }, 500);
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

// Handle Register Form Submission
registerForm.addEventListener('submit', async (e) => {
    e.preventDefault(); // Prevent form from reloading the page

    const username = document.getElementById('usernameRegister').value;
    const password = document.getElementById('passwordRegister').value;

    const payload = { username, password };

    try {
        const response = await fetch(`${API_URL}/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        if (response.ok) {
            alert('Registration successful! Please log in.');
        } else {
            alert(data.message || 'Registration failed');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Registration failed');
    }
});

// Handle Login Form Submission
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault(); // Prevent form from reloading the page

    const username = document.getElementById('usernameLogin').value;
    const password = document.getElementById('passwordLogin').value;

    const payload = { username, password };

    try {
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        if (response.ok) {
            // Save the JWT token
            localStorage.setItem('authToken', data.token);
            // Initialize the todo app after successful login
            initApp();
        } else {
            alert(data.message || 'Login failed');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Login failed');
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

// Calendar navigation
prevMonthBtn.addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    renderCalendar();
});

nextMonthBtn.addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    renderCalendar();
});

// Calendar view switching
calendarViewBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const view = btn.dataset.view;
        switchCalendarView(view);
    });
});

// Today button
calendarTodayBtn.addEventListener('click', () => {
    currentDate = new Date();
    selectedDate = new Date();
    updateCalendarView();
});

function switchCalendarView(view) {
    currentView = view;
    calendarViewBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.view === view);
    });
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
    const remaining = total - completed;
    
    // Update task counts
    tasksCompletedElement.textContent = completed;
    tasksRemainingElement.textContent = remaining;
    
    // Update progress ring
    const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);
    const offset = progressCircumference - (progressCircumference * percentage) / 100;
    progressRing.style.strokeDashoffset = offset;
    progressPercentage.textContent = `${percentage}%`;
    
    // Update year stats
    yearStats.total = total;
    yearStats.completed = completed;
    yearTotalElement.textContent = total;
    yearCompletedElement.textContent = completed;
    
    // Update year progress bar
    const yearPercentage = (completed / (total || 1)) * 100;
    yearProgressFill.style.width = `${yearPercentage}%`;
    
    // Trigger confetti on task completion
    if (completed > 0 && completed === total) {
        triggerConfetti();
    }
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

// Initialize calendar features
function initCalendarFeatures() {
    // Set up date picker
    updateDatePickerValue();
    calendarDatePicker.addEventListener('click', toggleMiniCalendar);
    
    // Set up quick navigation
    quickNavBtns.forEach(btn => {
        btn.addEventListener('click', () => handleQuickNav(btn.dataset.jump));
    });
    
    // Set up drag and drop
    setupDragAndDrop();
    
    // Start current time indicator
    updateCurrentTimeIndicator();
    currentTimeInterval = setInterval(updateCurrentTimeIndicator, 60000); // Update every minute
}

// Date picker functions
function updateDatePickerValue() {
    const options = { month: 'long', year: 'numeric' };
    calendarDatePicker.value = selectedDate.toLocaleDateString('default', options);
}

function toggleMiniCalendar() {
    if (miniCalendar.classList.contains('show')) {
        miniCalendar.classList.remove('show');
    } else {
        renderMiniCalendar();
        miniCalendar.classList.add('show');
    }
}

function renderMiniCalendar() {
    // Similar to main calendar but more compact
    // Implementation here...
}

// Quick navigation functions
function handleQuickNav(type) {
    const today = new Date();
    switch(type) {
        case 'today':
            selectedDate = today;
            currentView = 'day';
            break;
        case 'work-week':
            selectedDate = today;
            currentView = 'week';
            // Adjust view to show Monday-Friday
            break;
        case 'weekend':
            selectedDate = today;
            currentView = 'week';
            // Adjust view to show Saturday-Sunday
            break;
    }
    updateCalendarView();
}

// Drag and drop functionality
function setupDragAndDrop() {
    document.addEventListener('dragstart', handleDragStart);
    document.addEventListener('dragend', handleDragEnd);
    document.addEventListener('dragover', handleDragOver);
    document.addEventListener('drop', handleDrop);
}

function handleDragStart(e) {
    const taskItem = e.target.closest('.task-item');
    if (!taskItem) return;
    
    draggedTask = taskItem;
    taskItem.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
}

function handleDragEnd(e) {
    if (draggedTask) {
        draggedTask.classList.remove('dragging');
        draggedTask = null;
    }
}

function handleDragOver(e) {
    e.preventDefault();
    const timeSlot = e.target.closest('.time-slot') || e.target.closest('.week-timeline-slot');
    if (timeSlot) {
        timeSlot.classList.add('drag-over');
    }
}

function handleDrop(e) {
    e.preventDefault();
    const timeSlot = e.target.closest('.time-slot') || e.target.closest('.week-timeline-slot');
    if (timeSlot && draggedTask) {
        const taskId = draggedTask.dataset.id;
        const newTime = timeSlot.dataset.time;
        updateTaskTime(taskId, newTime);
    }
    
    // Remove drag-over class from all elements
    document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
}

// Current time indicator
function updateCurrentTimeIndicator() {
    const now = new Date();
    const currentTimeIndicators = document.querySelectorAll('.current-time-indicator');
    
    currentTimeIndicators.forEach(indicator => {
        const top = (now.getHours() * 60 + now.getMinutes()) * (600 / 1440); // 600px height / 1440 minutes in day
        indicator.style.top = `${top}px`;
    });
}

// Update task time
async function updateTaskTime(taskId, newTime) {
    const todoIndex = todos.findIndex(todo => todo.id === parseInt(taskId));
    if (todoIndex === -1) return;
    
    const todo = todos[todoIndex];
    const todoDate = new Date(todo.createdAt);
    const [hours, minutes] = newTime.split(':');
    
    todoDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    todo.createdAt = todoDate.toISOString();
    
    await saveTodos();
    updateCalendarView();
}

// Clean up on page unload
window.addEventListener('beforeunload', () => {
    if (currentTimeInterval) {
        clearInterval(currentTimeInterval);
    }
});

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
    // Update category list in modal
    categoryList.innerHTML = '';
    categories.forEach(category => {
        const categoryItem = document.createElement('div');
        categoryItem.className = 'category-item';
        categoryItem.innerHTML = `
            <div class="category-color" style="background-color: ${category.color}"></div>
            <div class="category-name">${category.name}</div>
            <div class="category-actions">
                <button class="edit-category" data-id="${category.id}">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="delete-category" data-id="${category.id}">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </div>
        `;
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

function filterTasks(filters) {
    const filteredTodos = todos.filter(todo => {
        // Search term filter
        if (filters.searchTerm && !todo.text.toLowerCase().includes(filters.searchTerm)) {
            return false;
        }
        
        // Category filter
        if (filters.categories.length > 0 && !filters.categories.includes(todo.categoryId)) {
            return false;
        }
        
        // Priority filter
        if (filters.priorities.length > 0 && !filters.priorities.includes(todo.priority)) {
            return false;
        }
        
        // Status filter
        if (filters.status.length > 0) {
            if (filters.status.includes('completed') && !todo.completed) return false;
            if (filters.status.includes('pending') && todo.completed) return false;
            if (filters.status.includes('recurring') && !todo.recurrence) return false;
        }
        
        return true;
    });
    
    renderTodos(filteredTodos);
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

// Initialize additional features when app starts
document.addEventListener('DOMContentLoaded', () => {
    initApp().then(() => {
        initAdditionalFeatures();
        setupSearchAndFilter();
        setupTaskDetailsModal();
    });
});