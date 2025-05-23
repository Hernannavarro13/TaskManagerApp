// DOM Elements
const authScreen = document.querySelector('.auth-screen');
const authTabs = document.querySelectorAll('.auth-tab');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const tabSlider = document.querySelector('.auth-tab-slider');
const startColor = document.getElementById('startColor');
const middleColor = document.getElementById('middleColor');
const endColor = document.getElementById('endColor');

// API endpoint
const API_URL = 'https://taskmanagerapp-todo-server.onrender.com';

// Initialize auth functionality
function initAuth() {
    // Tab switching
    authTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const isRegister = tab.dataset.tab === 'register';
            
            // Update active tab
            authTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            // Move slider
            tabSlider.classList.toggle('register', isRegister);
            
            // Show/hide forms
            loginForm.style.display = isRegister ? 'none' : 'flex';
            registerForm.style.display = isRegister ? 'flex' : 'none';
        });
    });

    // Form submissions
    loginForm.addEventListener('submit', handleLogin);
    registerForm.addEventListener('submit', handleRegister);
}

async function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('usernameLogin').value;
    const password = document.getElementById('passwordLogin').value;

    try {
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (response.ok) {
            localStorage.setItem('authToken', data.token);
            localStorage.setItem('userId', data.userId);
            if (data.settings) {
                localStorage.setItem('userSettings', JSON.stringify(data.settings));
            }
            
            // Hide auth screen and show todo app
            authScreen.style.display = 'none';
            document.querySelector('.todo-app').style.display = 'block';
            
            // Initialize the todo app
            if (typeof initApp === 'function') {
                initApp();
            }
        } else {
            alert(data.message || 'Login failed');
        }
    } catch (error) {
        console.error('Login error:', error);
        alert('An error occurred during login');
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const username = document.getElementById('usernameRegister').value;
    const password = document.getElementById('passwordRegister').value;

    const settings = {
        startColor: startColor.value,
        middleColor: middleColor.value,
        endColor: endColor.value
    };

    try {
        const response = await fetch(`${API_URL}/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username,
                password,
                settings
            })
        });

        const data = await response.json();

        if (response.ok) {
            // Switch to login tab
            authTabs[0].click();
            alert('Registration successful! Please login.');
            
            // Clear form
            registerForm.reset();
        } else {
            alert(data.message || 'Registration failed');
        }
    } catch (error) {
        console.error('Registration error:', error);
        alert('An error occurred during registration');
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initAuth); 