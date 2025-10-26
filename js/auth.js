import { signUp, signIn, signOut, onAuthChange } from '../supabase.js';

class AuthManager {
    constructor() {
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupAuthListener();
    }

    setupEventListeners() {
        // Tab switching
        document.querySelectorAll('.auth-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });

        // Form submissions
        document.getElementById('login-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        document.getElementById('signup-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSignup();
        });

        // Logout
        document.getElementById('logout-btn').addEventListener('click', () => {
            this.handleLogout();
        });
    }

    setupAuthListener() {
        onAuthChange((event, session) => {
            this.handleAuthChange(event, session);
        });
    }

    switchTab(tab) {
        // Update tabs
        document.querySelectorAll('.auth-tab').forEach(t => {
            t.classList.toggle('active', t.dataset.tab === tab);
        });

        // Update forms
        document.querySelectorAll('.auth-form').forEach(form => {
            form.classList.toggle('active', form.id === `${tab}-form`);
        });
    }

    async handleLogin() {
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;

        try {
            await signIn(email, password);
            this.showMessage('Login successful!', 'success');
        } catch (error) {
            this.showMessage(error.message, 'error');
        }
    }

    async handleSignup() {
        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;

        try {
            await signUp(email, password);
            this.showMessage('Signup successful! Please check your email for verification.', 'success');
        } catch (error) {
            this.showMessage(error.message, 'error');
        }
    }

    async handleLogout() {
        try {
            await signOut();
            this.showMessage('Logged out successfully!', 'success');
        } catch (error) {
            this.showMessage(error.message, 'error');
        }
    }

    handleAuthChange(event, session) {
        const authForms = document.getElementById('auth-forms');
        const userInfo = document.getElementById('user-info');
        const userEmail = document.getElementById('user-email');

        if (session?.user) {
            // User is logged in
            authForms.style.display = 'none';
            userInfo.style.display = 'flex';
            userEmail.textContent = session.user.email;
            document.body.classList.add('logged-in');
        } else {
            // User is logged out
            authForms.style.display = 'block';
            userInfo.style.display = 'none';
            document.body.classList.remove('logged-in');
        }
    }

    showMessage(message, type) {
        // Remove existing messages
        const existingMessage = document.querySelector('.auth-message');
        if (existingMessage) {
            existingMessage.remove();
        }

        // Create new message
        const messageEl = document.createElement('div');
        messageEl.className = `auth-message auth-message-${type}`;
        messageEl.textContent = message;

        // Insert message
        const authContainer = document.getElementById('auth-container');
        authContainer.insertBefore(messageEl, authContainer.firstChild);

        // Auto remove after 5 seconds
        setTimeout(() => {
            if (messageEl.parentNode) {
                messageEl.remove();
            }
        }, 5000);
    }
}

// Initialize auth manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new AuthManager();
});