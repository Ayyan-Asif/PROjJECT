// ==============================
// Player Statistics Script
// ==============================
const API_BASE_URL = 'http://localhost:3000/api';

let statistics = [];
let currentSeason = '2024-25';

// ==============================
// Init
// ==============================
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    setupEventListeners();
    loadStatistics();
});

// ==============================
// Event Listeners
// ==============================
function setupEventListeners() {
    document.getElementById('seasonFilter').addEventListener('change', handleSeasonChange);
    document.getElementById('positionFilter').addEventListener('change', applyFilters);
    document.getElementById('searchInput').addEventListener('input', applyFilters);
}

// ==============================
// API Call
// ==============================
async function loadStatistics() {
    try {
        const token = localStorage.getItem('token');

        const response = await fetch(
            `${API_BASE_URL}/statistics/players?season=${currentSeason}`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (!response.ok) {
            throw new Error('Failed to load statistics');
        }

        statistics = await response.json();

        applyFilters();
        displayTopPerformers(statistics);

    } catch (error) {
        console.error(error);
        showNotification('Failed to load player statistics', 'error');
    }
}

// ==============================
// Filters + Search (Combined)
// ==============================
function applyFilters() {
    const position = document.getElementById('positionFilter').value;
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();

    let filtered = [...statistics];

    if (position) {
        filtered = filtered.filter(s => s.position === position);
    }

    if (searchTerm) {
        filtered = filtered.filter(s =>
            s.playerName.toLowerCase().includes(searchTerm) ||
            s.teamName.toLowerCase().includes(searchTerm)
        );
    }

    displayStatistics(filtered);
}

// ==============================
// Table Rendering
// ==============================
function displayStatistics(data) {
    const tableBody = document.getElementById('statsTableBody');

    if (!data.length) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="10" class="no-data">No statistics found</td>
            </tr>
        `;
        return;
    }

    tableBody.innerHTML = data.map((stat, index) => `
        <tr>
            <td><strong>${index + 1}</strong></td>
            <td>${escapeHtml(stat.playerName)}</td>
            <td>${escapeHtml(stat.position)}</td>
            <td>${escapeHtml(stat.teamName)}</td>
            <td>${stat.matchesPlayed ?? 0}</td>
            <td class="highlight-goals"><strong>${stat.goals ?? 0}</strong></td>
            <td class="highlight-assists"><strong>${stat.assists ?? 0}</strong></td>
            <td>${stat.minutesPlayed ?? 0}</td>
            <td>${stat.yellowCards ?? 0}</td>
            <td>${stat.redCards ?? 0}</td>
        </tr>
    `).join('');
}

// ==============================
// Top Performers
// ==============================
function displayTopPerformers(stats) {
    if (!stats.length) return;

    const topScorer = [...stats].sort((a, b) => (b.goals ?? 0) - (a.goals ?? 0))[0];
    const topAssister = [...stats].sort((a, b) => (b.assists ?? 0) - (a.assists ?? 0))[0];
    const mostMinutes = [...stats].sort((a, b) => (b.minutesPlayed ?? 0) - (a.minutesPlayed ?? 0))[0];

    document.getElementById('topScorer').innerHTML = createPerformerHTML(topScorer, `${topScorer.goals ?? 0} Goals`);
    document.getElementById('topAssists').innerHTML = createPerformerHTML(topAssister, `${topAssister.assists ?? 0} Assists`);
    document.getElementById('mostMinutes').innerHTML = createPerformerHTML(mostMinutes, `${mostMinutes.minutesPlayed ?? 0} Minutes`);
}

function createPerformerHTML(player, statText) {
    return `
        <div class="performer-info">
            <h4>${escapeHtml(player.playerName)}</h4>
            <p>${escapeHtml(player.teamName)}</p>
            <p class="stat-value">${statText}</p>
        </div>
    `;
}

// ==============================
// Season Change
// ==============================
function handleSeasonChange(e) {
    currentSeason = e.target.value;
    loadStatistics();
}

// ==============================
// Utils
// ==============================
function escapeHtml(text = '') {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

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

// ==============================
// Auth Check
// ==============================
function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'index.html';
    }
}
