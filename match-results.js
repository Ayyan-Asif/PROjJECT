// Match Results Script
const API_BASE_URL = 'http://localhost:3000/api';

let matches = [];
let currentMatch = null;

// Modal elements
const resultModal = document.getElementById('resultModal');
const resultForm = document.getElementById('resultForm');
const resultsGrid = document.getElementById('resultsGrid');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    loadMatches();
    setupEventListeners();
});

// Event Listeners
function setupEventListeners() {
    document.getElementById('closeModal').addEventListener('click', closeResultModal);
    document.getElementById('cancelBtn').addEventListener('click', closeResultModal);
    resultForm.addEventListener('submit', handleSaveResult);

    // Filters
    document.getElementById('competitionFilter').addEventListener('change', handleFilter);
    document.getElementById('dateFilter').addEventListener('change', handleFilter);

    // Close modal on outside click
    window.addEventListener('click', (e) => {
        if (e.target === resultModal) closeResultModal();
    });

    // Delegated click for update/edit buttons
    resultsGrid.addEventListener('click', (e) => {
        if (e.target.classList.contains('update-btn')) {
            const id = e.target.dataset.id;
            loadMatchForUpdate(id);
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
            populateCompetitionFilter();
            displayResults(matches);
        } else {
            showNotification('Failed to load matches', 'error');
        }
    } catch (error) {
        console.error('Error loading matches:', error);
        showNotification('Error loading matches', 'error');
    }
}

// Populate competition filter
function populateCompetitionFilter() {
    const competitions = [...new Set(matches.map(m => m.competition).filter(c => c))];
    const select = document.getElementById('competitionFilter');

    const options = competitions.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
    select.innerHTML = '<option value="">All Competitions</option>' + options;
}

// Display results
function displayResults(matchesToDisplay) {
    if (!matchesToDisplay.length) {
        resultsGrid.innerHTML = '<p class="no-data">No matches found</p>';
        return;
    }

    const sorted = [...matchesToDisplay].sort((a, b) => new Date(b.matchDate) - new Date(a.matchDate));

    resultsGrid.innerHTML = sorted.map(match => {
        const matchDate = new Date(match.matchDate);
        const formattedDate = matchDate.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });

        const hasScore = match.homeScore !== null && match.awayScore !== null;
        const isCompleted = match.status === 'Completed';

        return `
        <div class="result-card ${isCompleted ? 'completed' : ''}">
            <div class="result-header">
                <span class="result-date">${formattedDate}</span>
                <span class="status-badge status-${match.status.toLowerCase().replace(' ', '-')}">${match.status}</span>
            </div>
            <div class="result-body">
                <div class="result-team home-team">
                    <h3>${escapeHtml(match.homeTeam)}</h3>
                </div>
                <div class="result-score">
                    ${hasScore ? `<span class="score-display">${match.homeScore} - ${match.awayScore}</span>` : `<span class="score-placeholder">- : -</span>`}
                </div>
                <div class="result-team away-team">
                    <h3>${escapeHtml(match.awayTeam)}</h3>
                </div>
            </div>
            <div class="result-footer">
                <div class="result-info">
                    <span>🏆 ${escapeHtml(match.competition) || 'Friendly'}</span>
                    <span>📍 ${escapeHtml(match.venue) || 'TBD'}</span>
                </div>
                <button class="btn btn-sm ${isCompleted ? 'btn-secondary' : 'btn-primary'} update-btn" data-id="${match.id}">
                    ${isCompleted ? 'Edit Result' : 'Update Result'}
                </button>
            </div>
        </div>
        `;
    }).join('');
}

// Load match for update
async function loadMatchForUpdate(id) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/matches/${id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            currentMatch = await response.json();
            openResultModal(currentMatch);
        } else {
            showNotification('Failed to load match details', 'error');
        }
    } catch (error) {
        console.error('Error loading match:', error);
        showNotification('Error loading match details', 'error');
    }
}

// Open result modal
function openResultModal(match) {
    document.getElementById('matchId').value = match.id;
    document.getElementById('matchTeams').textContent = `${match.homeTeam} vs ${match.awayTeam}`;

    const matchDate = new Date(match.matchDate);
    document.getElementById('matchDetails').textContent =
        `${matchDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} • ${match.matchTime} • ${match.venue || 'TBD'}`;

    document.getElementById('homeScore').value = match.homeScore !== null ? match.homeScore : '';
    document.getElementById('awayScore').value = match.awayScore !== null ? match.awayScore : '';
    document.getElementById('status').value = match.status || 'Scheduled';

    resultModal.classList.add('active');
}

// Close result modal
function closeResultModal() {
    resultModal.classList.remove('active');
    resultForm.reset();
    currentMatch = null;
}

// Save result
async function handleSaveResult(e) {
    e.preventDefault();
    if (!currentMatch) return;

    const matchId = document.getElementById('matchId').value;
    const homeScore = parseInt(document.getElementById('homeScore').value);
    const awayScore = parseInt(document.getElementById('awayScore').value);
    const status = document.getElementById('status').value;

   const payload = {
    homeTeamId: currentMatch.home_team_id,
    awayTeamId: currentMatch.away_team_id,
    matchDate: new Date(currentMatch.match_date).toISOString().split('T')[0],

    matchTime: currentMatch.match_time,
    venue: currentMatch.venue,
    competition: currentMatch.competition,
    homeScore,
    awayScore,
    status
};


    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/matches/${matchId}`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            showNotification('Match result updated successfully', 'success');
            closeResultModal();
            loadMatches();
        } else {
            const error = await response.json();
            showNotification(error.message || 'Failed to update result', 'error');
        }
    } catch (error) {
        console.error('Error saving result:', error);
        showNotification('Error saving result', 'error');
    }
}

// Filters
function handleFilter() {
    const competition = document.getElementById('competitionFilter').value;
    const date = document.getElementById('dateFilter').value;

    let filtered = matches;
    if (competition) filtered = filtered.filter(m => m.competition === competition);
    if (date) filtered = filtered.filter(m => new Date(m.matchDate).toISOString().split('T')[0] === date);

    displayResults(filtered);
}

// Escape HTML
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Show notification
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => notification.classList.add('show'), 100);
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Authentication check
function checkAuth() {
    if (!localStorage.getItem('token')) window.location.href = 'index.html';
}
