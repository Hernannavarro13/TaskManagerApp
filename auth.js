// API endpoint
const API_URL = 'https://taskmanagerapp-todo-server.onrender.com';

// DOM Elements
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const authScreen = document.querySelector('.auth-screen');
const todoApp = document.querySelector('.todo-app');
const authTabs = document.querySelectorAll('.auth-tab');
const tabSlider = document.querySelector('.auth-tab-slider');
const startColor = document.getElementById('startColor');
const middleColor = document.getElementById('middleColor');
const endColor = document.getElementById('endColor');

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    setupAuthEventListeners();
    checkAuthStatus();
});

function setupAuthEventListeners() {
    // Tab switching
    authTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetForm = tab.dataset.tab === 'login' ? loginForm : registerForm;
            switchAuthForm(targetForm, tab);
        });
    });

    // Login form submission
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        e.stopPropagation();

        const formData = new FormData(loginForm);
        const username = formData.get('username');
        const password = formData.get('password');

        try {
            const response = await axios.post(`${API_URL}/login`, {
                username,
                password
            });

            if (response.data.token) {
                localStorage.setItem('authToken', response.data.token);
                showTodoApp();
                // Emit custom event for app initialization
                window.dispatchEvent(new CustomEvent('auth:login:success'));
            } else {
                showError('Login failed: Invalid credentials');
            }
        } catch (error) {
            console.error('Login error:', error);
            showError('Login failed: ' + (error.response?.data?.message || 'Unknown error'));
        }

        return false;
    });

    // Register form submission
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        e.stopPropagation();

        const formData = new FormData(registerForm);
        const username = formData.get('username');
        const password = formData.get('password');

        try {
            const response = await axios.post(`${API_URL}/register`, {
                username,
                password
            });

            if (response.data.success) {
                showSuccess('Registration successful! Please log in.');
                switchAuthForm(loginForm, document.querySelector('[data-tab="login"]'));
            } else {
                showError(response.data.message || 'Registration failed');
            }
        } catch (error) {
            console.error('Registration error:', error);
            showError('Registration failed: ' + (error.response?.data?.message || 'Unknown error'));
        }

        return false;
    });
}

// Auth status check
async function checkAuthStatus() {
    const authToken = localStorage.getItem('authToken');
    if (!authToken) {
        showAuthScreen();
        return false;
    }

    try {
        const response = await axios.get(`${API_URL}/verify-token`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (response.data.valid) {
            showTodoApp();
            return true;
        } else {
            localStorage.removeItem('authToken');
            showAuthScreen();
            return false;
        }
    } catch (error) {
        console.error('Token verification failed:', error);
        localStorage.removeItem('authToken');
        showAuthScreen();
        return false;
    }
}

// UI Functions
function showAuthScreen() {
    authScreen.style.display = 'flex';
    todoApp.style.display = 'none';
}

function showTodoApp() {
    authScreen.style.display = 'none';
    todoApp.style.display = 'block';
}

function switchAuthForm(targetForm, targetTab) {
    // Update tabs
    authTabs.forEach(tab => tab.classList.remove('active'));
    targetTab.classList.add('active');

    // Update forms
    loginForm.style.display = 'none';
    registerForm.style.display = 'none';
    targetForm.style.display = 'block';

    // Move slider
    const slider = document.querySelector('.auth-tab-slider');
    slider.style.transform = `translateX(${targetTab.offsetLeft}px)`;
}

function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'auth-error';
    errorDiv.textContent = message;
    
    // Remove any existing error
    const existingError = document.querySelector('.auth-error');
    if (existingError) {
        existingError.remove();
    }
    
    // Add new error
    authScreen.querySelector('.auth-container').appendChild(errorDiv);
    
    // Remove after 5 seconds
    setTimeout(() => errorDiv.remove(), 5000);
}

function showSuccess(message) {
    const successDiv = document.createElement('div');
    successDiv.className = 'auth-success';
    successDiv.textContent = message;
    
    // Remove any existing message
    const existingSuccess = document.querySelector('.auth-success');
    if (existingSuccess) {
        existingSuccess.remove();
    }
    
    // Add new message
    authScreen.querySelector('.auth-container').appendChild(successDiv);
    
    // Remove after 5 seconds
    setTimeout(() => successDiv.remove(), 5000);
}

// Logout function
function logout() {
    localStorage.removeItem('authToken');
    showAuthScreen();
    // Emit custom event for app cleanup
    window.dispatchEvent(new CustomEvent('auth:logout'));
}

// Export functions for use in main app
window.Auth = {
    checkAuthStatus,
    showAuthScreen,
    showTodoApp,
    logout,
    verifyToken: async () => {
        return checkAuthStatus();
    }
}; 