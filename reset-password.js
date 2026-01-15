// reset-password.js
import { apiRequest } from "./main.js"; // Using your main.js API helper

document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('resetPasswordForm');

    // Optional: get token from URL query (e.g., reset-password.html?token=abcd)
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    if (!token) {
        showNotification('Invalid or expired reset link', 'error');
        form.querySelector('button').disabled = true;
        return;
    }

    form.addEventListener('submit', async function (e) {
        e.preventDefault();

        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        if (!password || !confirmPassword) return showNotification('All fields are required', 'warning');
        if (password !== confirmPassword) return showNotification('Passwords do not match', 'error');

        try {
            const response = await apiRequest('/auth/reset-password', 'POST', { password, token });

            showNotification(response.message || 'Password reset successfully', 'success');

            // Redirect to login after 3 seconds
            setTimeout(() => window.location.href = 'index.html', 3000);
        } catch (error) {
            showNotification(error.message || 'Failed to reset password', 'error');
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
