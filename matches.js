// Matches Management Script
const API_BASE_URL = 'http://localhost:3000/api';

let matches = [];
let teams = [];
let currentMatchId = null;

// Modal elements
const matchModal = document.getElementById('matchModal');
const confirmModal = document.getElementById('confirmModal');
const matchForm = document.getElementById('matchForm');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    loadMatches();
    loadTeams();
    setupEventListeners();
});

// Event Listeners
function setupEventListeners() {
    document.getElementById('addMatchBtn').addEventListener('click', () => openMatchModal());
    document.getElementById('closeModal').addEventListener('click', closeMatchModal);
    document.getElementById('cancelBtn').addEventListener('click', closeMatchModal);
    matchForm.addEventListener('submit', handleSaveMatch);

    // Confirm modal
    document.getElementById('closeConfirmModal').addEventListener('click', closeConfirmModal);
    document.getElementById('cancelDeleteBtn').addEventListener('click', closeConfirmModal);
    document.getElementById('confirmDeleteBtn').addEventListener('click', handleConfirmDelete);

    // Filter
    document.getElementById('statusFilter').addEventListener('change', handleFilter);

    // Close modal on outside click
    window.addEventListener('click', (e) => {
        if (e.target === matchModal) closeMatchModal();
        if (e.target === confirmModal) closeConfirmModal();
    });

    // Delegated event listeners for edit/delete buttons
    document.getElementById('matchesContainer').addEventListener('click', (e) => {
        if (e.target.classList.contains('edit-btn')) {
            const id = e.target.dataset.id;
            editMatch(id);
        } else if (e.target.classList.contains('delete-btn')) {
            const id = e.target.dataset.id;
            deleteMatch(id);
        }
    });
}

// Load matches from API
async function loadMatches() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/matches`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            matches = await response.json();
            displayMatches(matches);
        } else {
            showNotification('Failed to load matches', 'error');
        }
    } catch (error) {
        console.error('Error loading matches:', error);
        showNotification('Error loading matches', 'error');
    }
}

// Load teams for dropdown
async function loadTeams() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/teams`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            teams = await response.json();
            populateTeamDropdowns();
        }
    } catch (error) {
        console.error('Error loading teams:', error);
    }
}

// Populate team dropdowns
function populateTeamDropdowns() {
    const homeTeamSelect = document.getElementById('homeTeamId');
    const awayTeamSelect = document.getElementById('awayTeamId');

    const options = teams.map(team =>
        `<option value="${team.id}">${escapeHtml(team.name)}</option>`
    ).join('');

    homeTeamSelect.innerHTML = '<option value="">Select Home Team</option>' + options;
    awayTeamSelect.innerHTML = '<option value="">Select Away Team</option>' + options;
}

// Display matches
function displayMatches(matchesToDisplay) {
    const container = document.getElementById('matchesContainer');

    if (!matchesToDisplay.length) {
        container.innerHTML = '<p class="no-data">No matches found</p>';
        return;
    }

    container.innerHTML = matchesToDisplay.map(match => {
        const matchDate = new Date(match.matchDate);
        const formattedDate = matchDate.toLocaleDateString('en-US', {
            weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
        });

        return `
        <div class="match-card status-${match.status.toLowerCase().replace(' ', '-')}">
            <div class="match-header">
                <span class="match-date">${formattedDate} • ${match.matchTime}</span>
                <span class="status-badge status-${match.status.toLowerCase().replace(' ', '-')}">${match.status}</span>
            </div>
            <div class="match-body">
                <div class="team home-team">
                    <h3>${escapeHtml(match.homeTeam)}</h3>
                    ${match.status === 'Completed' ? `<span class="score">${match.homeScore}</span>` : ''}
                </div>
                <div class="match-vs">VS</div>
                <div class="team away-team">
                    <h3>${escapeHtml(match.awayTeam)}</h3>
                    ${match.status === 'Completed' ? `<span class="score">${match.awayScore}</span>` : ''}
                </div>
            </div>
            <div class="match-footer">
                <div class="match-details">
                    <span>📍 ${escapeHtml(match.venue) || 'TBD'}</span>
                    <span>🏆 ${escapeHtml(match.competition) || 'Friendly'}</span>
                </div>
                <div class="match-actions">
                    <button class="btn btn-sm btn-primary edit-btn" data-id="${match.id}">Edit</button>
                    <button class="btn btn-sm btn-danger delete-btn" data-id="${match.id}">Delete</button>
                </div>
            </div>
        </div>`;
    }).join('');
}

// Open modal for add/edit
function openMatchModal(match = null) {
    const modalTitle = document.getElementById('modalTitle');

    if (match) {
        modalTitle.textContent = 'Edit Match';
        document.getElementById('matchId').value = match.id;
        document.getElementById('homeTeamId').value = match.home_team_id;
        document.getElementById('awayTeamId').value = match.away_team_id;
        document.getElementById('matchDate').value = match.match_date ? match.match_date.split('T')[0] : '';
        document.getElementById('matchTime').value = match.match_time || '';
        document.getElementById('venue').value = match.venue || '';
        document.getElementById('competition').value = match.competition || '';
        document.getElementById('status').value = match.status || 'Scheduled';
    } else {
        modalTitle.textContent = 'Schedule New Match';
        matchForm.reset();
        document.getElementById('matchId').value = '';
        document.getElementById('status').value = 'Scheduled';
    }

    matchModal.classList.add('active');
}

function closeMatchModal() {
    matchModal.classList.remove('active');
    matchForm.reset();
}

// Edit match
async function editMatch(id) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/matches/${id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const match = await response.json();
            openMatchModal(match);
        } else {
            showNotification('Failed to load match details', 'error');
        }
    } catch (error) {
        console.error('Error loading match:', error);
        showNotification('Error loading match details', 'error');
    }
}

// Save match
async function handleSaveMatch(e) {
    e.preventDefault();

    const matchId = document.getElementById('matchId').value;
    const homeTeamId = document.getElementById('homeTeamId').value;
    const awayTeamId = document.getElementById('awayTeamId').value;

    if (homeTeamId === awayTeamId) {
        showNotification('Home and away teams must be different', 'error');
        return;
    }

    const matchData = {
        homeTeamId: parseInt(homeTeamId),
        awayTeamId: parseInt(awayTeamId),
        matchDate: document.getElementById('matchDate').value,
        matchTime: document.getElementById('matchTime').value,
        venue: document.getElementById('venue').value,
        competition: document.getElementById('competition').value,
        status: document.getElementById('status').value
    };

    try {
        const token = localStorage.getItem('token');
        const url = matchId ? `${API_BASE_URL}/matches/${matchId}` : `${API_BASE_URL}/matches`;
        const method = matchId ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method,
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(matchData)
        });

        if (response.ok) {
            showNotification(`Match ${matchId ? 'updated' : 'scheduled'} successfully`, 'success');
            closeMatchModal();
            loadMatches();
        } else {
            const error = await response.json();
            showNotification(error.message || 'Failed to save match', 'error');
        }
    } catch (error) {
        console.error('Error saving match:', error);
        showNotification('Error saving match', 'error');
    }
}

// Delete match
function deleteMatch(id) {
    currentMatchId = id;
    confirmModal.classList.add('active');
}

// Confirm delete
async function handleConfirmDelete() {
    if (!currentMatchId) return;

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/matches/${currentMatchId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            showNotification('Match deleted successfully', 'success');
            closeConfirmModal();
            loadMatches();
        } else {
            const error = await response.json();
            showNotification(error.message || 'Failed to delete match', 'error');
        }
    } catch (error) {
        console.error('Error deleting match:', error);
        showNotification('Error deleting match', 'error');
    }
}

function closeConfirmModal() {
    confirmModal.classList.remove('active');
    currentMatchId = null;
}

// Filter matches by status
function handleFilter(e) {
    const status = e.target.value;
    const filtered = status ? matches.filter(match => match.status === status) : matches;
    displayMatches(filtered);
}

// Escape HTML
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Notification
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => { notification.classList.add('show'); }, 100);
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Authentication check
function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) window.location.href = 'index.html';
}
