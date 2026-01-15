// Login Page JavaScript
import { apiRequest } from "./main.js";

document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        
        try {
            // 🔹 DEMO LOGIN REMOVED
            // 🔹 REAL API LOGIN STARTS HERE

            const response = await apiRequest('/auth/login', 'POST', {
                email: email,
                password: password
            });

            console.log(response)
            if (response && response.token) {
                // Save token & user
                localStorage.setItem('token', response.token);
                localStorage.setItem('user', JSON.stringify(response.user));

                // Redirect to dashboard
                window.location.href = 'dashboard.html';
            } else {
                alert('Invalid credentials');
            }

        } catch (error) {
            console.error('Login error:', error);
            alert('Login failed. Please try again.');
        }
    });
});
