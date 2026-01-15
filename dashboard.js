// ==============================
// Dashboard JavaScript
// ==============================

import { apiRequest } from "./main.js";

// ==============================
// Init
// ==============================
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    loadDashboardData();
});

// ==============================
// Load Dashboard Data
// ==============================
async function loadDashboardData() {
    try {
        /**
         * EXPECTED BACKEND RESPONSE:
         * {
         *   stats: {
         *     totalPlayers: number,
         *     totalTeams: number,
         *     upcomingMatches: number,
         *     totalCoaches: number
         *   },
         *   recentMatches: [],
         *   topPlayers: []
         * }
         */
        const data = await apiRequest('/dashboard');

        updateStats(data.stats);
        loadRecentMatches(data.recentMatches);
        loadTopPlayers(data.topPlayers);

    } catch (error) {
        console.error('Dashboard load error:', error);
        showNotification('Failed to load dashboard data', 'error');
    }
}

// ==============================
// Stats Cards
// ==============================
function updateStats(stats) {
    animateCounter('totalPlayers', stats.totalPlayers ?? 0);
    animateCounter('totalTeams', stats.totalTeams ?? 0);
    animateCounter('upcomingMatches', stats.upcomingMatches ?? 0);
    animateCounter('totalCoaches', stats.totalCoaches ?? 0);
}

function animateCounter(elementId, target) {
    const element = document.getElementById(elementId);
    let current = 0;
    const steps = 40;
    const increment = target / steps;

    const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
            element.textContent = target;
            clearInterval(timer);
        } else {
            element.textContent = Math.floor(current);
        }
    }, 25);
}

// ==============================
// Recent Matches
// ==============================
function loadRecentMatches(matches = []) {
    const tbody = document.querySelector('#recentMatchesTable tbody');

    if (!matches.length) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4" class="text-center">No recent matches</td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = matches.map(match => `
        <tr>
            <td>${formatDate(match.match_date)}</td>
            <td>${escapeHtml(match.homeTeam)} vs ${escapeHtml(match.awayTeam)}</td>
            <td>${match.home_score ?? 0} - ${match.away_score ?? 0}</td>
            <td>
                <span class="badge ${getStatusBadge(match.status)}">
                    ${match.status}
                </span>
            </td>
        </tr>
    `).join('');
}

// ==============================
// Top Players
// ==============================
function loadTopPlayers(players = []) {
    const tbody = document.querySelector('#topPlayersTable tbody');

    if (!players.length) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4" class="text-center">No player data</td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = players.map(player => `
        <tr>
            <td>${escapeHtml(player.playerName)}</td>
            <td>${escapeHtml(player.teamName)}</td>
            <td>${player.goals ?? 0}</td>
            <td>${player.assists ?? 0}</td>
        </tr>
    `).join('');
}

// ==============================
// Helpers
// ==============================
function formatDate(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString();
}

function getStatusBadge(status) {
    if (status === 'Completed') return 'badge-success';
    if (status === 'Scheduled') return 'badge-warning';
    return 'badge-secondary';
}

function escapeHtml(text = '') {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ==============================
// Auth Check
// ==============================
function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'index.html';
    }
}

// ==============================
// Notification
// ==============================
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => notification.classList.add('show'), 100);
    setTimeout(() => {
        notification.classList.remove('show');
        notification.remove();
    }, 3000);
}
