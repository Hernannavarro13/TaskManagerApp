// DOM Elements
const authScreen = document.querySelector('.auth-screen');
const authTabs = document.querySelectorAll('.auth-tab');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const tabSlider = document.querySelector('.auth-tab-slider');
const gradientEnabled = document.getElementById('gradientEnabled');
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
            
            // Toggle gradient background
            if (isRegister && gradientEnabled.checked) {
                authScreen.classList.add('gradient-bg');
            } else if (!isRegister) {
                authScreen.classList.remove('gradient-bg');
            }
        });
    });

    // Gradient controls functionality
    gradientEnabled.addEventListener('change', () => {
        if (gradientEnabled.checked) {
            authScreen.classList.add('gradient-bg');
            updateGradient();
        } else {
            authScreen.classList.remove('gradient-bg');
        }
    });

    [startColor, middleColor, endColor].forEach(input => {
        input.addEventListener('input', updateGradient);
    });

    // Form submissions
    loginForm.addEventListener('submit', handleLogin);
    registerForm.addEventListener('submit', handleRegister);
}

function updateGradient() {
    document.documentElement.style.setProperty('--gradient-start', startColor.value);
    document.documentElement.style.setProperty('--gradient-middle', middleColor.value);
    document.documentElement.style.setProperty('--gradient-end', endColor.value);
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
            
            window.location.reload();
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

    const gradient = {
        isEnabled: gradientEnabled.checked,
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
                gradient
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