// forgot-password.js
import { apiRequest } from "./main.js"; // Using your main.js API helper

document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('forgotPasswordForm');

    form.addEventListener('submit', async function (e) {
        e.preventDefault();

        const email = document.getElementById('email').value;

        if (!email) return showNotification('Please enter your email', 'warning');

        try {
            const response = await apiRequest('/auth/forgot-password', 'POST', { email });

            // Show success notification
            showNotification(response.message || 'Reset link sent to your email', 'success');

            // Optional: redirect to login after 3 seconds
            setTimeout(() => window.location.href = 'index.html', 3000);
        } catch (error) {
            showNotification(error.message || 'Failed to send reset link', 'error');
        }
    });
});

// Sliding notification system (copied/adapted from main.js)
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;

    Object.assign(notification.style, {
        position: 'fixed',
        top: '20px',
        right: '20px',
        padding: '1rem 1.5rem',
        borderRadius: '0.5rem',
        color: 'white',
        fontWeight: '500',
        zIndex: '9999',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
        animation: 'slideIn 0.3s ease-out'
    });

    const colors = {
        success: '#10b981',
        error: '#dc2626',
        warning: '#eab308',
        info: '#3b82f6'
    };
    notification.style.backgroundColor = colors[type] || colors.info;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-in';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}
