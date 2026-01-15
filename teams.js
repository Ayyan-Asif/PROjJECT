const API_BASE_URL = 'http://localhost:3000/api';

let teams = [];
let coaches = [];
let currentTeamId = null;

// Modal elements
const teamModal = document.getElementById('teamModal');
const confirmModal = document.getElementById('confirmModal');
const teamForm = document.getElementById('teamForm');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    loadTeams();
    loadCoaches();
    setupEventListeners();
});

// Event Listeners
function setupEventListeners() {
    document.getElementById('addTeamBtn').addEventListener('click', () => openTeamModal());
    document.getElementById('closeModal').addEventListener('click', closeTeamModal);
    document.getElementById('cancelBtn').addEventListener('click', closeTeamModal);
    teamForm.addEventListener('submit', handleSaveTeam);

    // Confirm modal
    document.getElementById('closeConfirmModal').addEventListener('click', closeConfirmModal);
    document.getElementById('cancelDeleteBtn').addEventListener('click', closeConfirmModal);
    document.getElementById('confirmDeleteBtn').addEventListener('click', handleConfirmDelete);

    // Search
    document.getElementById('searchInput').addEventListener('input', handleSearch);

    // Close modal on outside click
    window.addEventListener('click', (e) => {
        if (e.target === teamModal) closeTeamModal();
        if (e.target === confirmModal) closeConfirmModal();
    });

    // Delegation for edit/delete buttons in team cards
    document.getElementById('teamsGrid').addEventListener('click', (e) => {
        const card = e.target.closest('.team-card');
        if (!card) return;
        const id = parseInt(card.dataset.id);

        if (e.target.classList.contains('btn-primary')) {
            editTeam(id);
        } else if (e.target.classList.contains('btn-danger')) {
            deleteTeam(id);
        }
    });
}

// Load teams from API
async function loadTeams() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/teams`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            teams = await response.json();
            displayTeams(teams);
        } else {
            showNotification('Failed to load teams', 'error');
        }
    } catch (error) {
        console.error(error);
        showNotification('Cannot connect to server', 'error');
    }
}

// Load coaches
async function loadCoaches() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/coaches`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            coaches = await response.json();
            populateCoachDropdown();
        }
    } catch (error) {
        console.error('Error loading coaches:', error);
    }
}

// Populate coach dropdown
function populateCoachDropdown() {
    const coachSelect = document.getElementById('coachId');
    coachSelect.innerHTML = '<option value="">Select Coach</option>';
    coaches.forEach(c => {
        const option = document.createElement('option');
        option.value = c.id;
        option.textContent = c.name;
        coachSelect.appendChild(option);
    });
}

// Display teams
function displayTeams(teamsToDisplay) {
    const teamsGrid = document.getElementById('teamsGrid');

    if (teamsToDisplay.length === 0) {
        teamsGrid.innerHTML = '<p class="no-data">No teams found</p>';
        return;
    }

    teamsGrid.innerHTML = teamsToDisplay.map(team => `
        <div class="team-card" data-id="${team.id}">
            <div class="team-header">
                <h3>${escapeHtml(team.name)}</h3>
                <span class="team-badge">🏆</span>
            </div>
            <div class="team-info">
                <p><strong>Location:</strong> ${escapeHtml(team.city)}, ${escapeHtml(team.country)}</p>
                <p><strong>Founded:</strong> ${team.foundedYear || 'N/A'}</p>
                <p><strong>Stadium:</strong> ${escapeHtml(team.stadium) || 'N/A'}</p>
                <p><strong>Coach:</strong> ${escapeHtml(team.coachName) || 'No coach assigned'}</p>
            </div>
            <div class="team-actions">
                <button class="btn btn-sm btn-primary">Edit</button>
                <button class="btn btn-sm btn-danger">Delete</button>
            </div>
        </div>
    `).join('');
}

// Open modal
function openTeamModal(team = null) {
    const modalTitle = document.getElementById('modalTitle');

    if (team) {
        modalTitle.textContent = 'Edit Team';
        document.getElementById('teamId').value = team.id;
        document.getElementById('teamName').value = team.name;
        document.getElementById('city').value = team.city;
        document.getElementById('country').value = team.country;
        document.getElementById('foundedYear').value = team.foundedYear || '';
        document.getElementById('stadium').value = team.stadium || '';
        document.getElementById('coachId').value = team.coachId || '';
    } else {
        modalTitle.textContent = 'Add New Team';
        teamForm.reset();
        document.getElementById('teamId').value = '';
    }

    teamModal.classList.add('active');
}

function closeTeamModal() {
    teamModal.classList.remove('active');
    teamForm.reset();
}

// Edit team
async function editTeam(id) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/teams/${id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const team = await response.json();
            openTeamModal(team);
        } else {
            showNotification('Failed to load team details', 'error');
        }
    } catch (error) {
        console.error(error);
        showNotification('Error loading team details', 'error');
    }
}

// Save team
async function handleSaveTeam(e) {
    e.preventDefault();

    const teamId = document.getElementById('teamId').value;
    const teamData = {
        name: document.getElementById('teamName').value,
        city: document.getElementById('city').value,
        country: document.getElementById('country').value,
        foundedYear: document.getElementById('foundedYear').value || null,
        stadium: document.getElementById('stadium').value,
        coachId: document.getElementById('coachId').value || null
    };

    try {
        const token = localStorage.getItem('token');
        const url = teamId ? `${API_BASE_URL}/teams/${teamId}` : `${API_BASE_URL}/teams`;
        const method = teamId ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method: method,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(teamData)
        });

        if (response.ok) {
            showNotification(`Team ${teamId ? 'updated' : 'created'} successfully`, 'success');
            closeTeamModal();
            loadTeams();
        } else {
            const error = await response.json();
            showNotification(error.message || 'Failed to save team', 'error');
        }
    } catch (error) {
        console.error(error);
        showNotification('Error saving team', 'error');
    }
}

// Delete team
function deleteTeam(id) {
    currentTeamId = id;
    confirmModal.classList.add('active');
}

// Confirm delete
async function handleConfirmDelete() {
    if (!currentTeamId) return;

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/teams/${currentTeamId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            showNotification('Team deleted successfully', 'success');
            closeConfirmModal();
            loadTeams();
        } else {
            const error = await response.json();
            showNotification(error.message || 'Failed to delete team', 'error');
        }
    } catch (error) {
        console.error(error);
        showNotification('Error deleting team', 'error');
    }
}

function closeConfirmModal() {
    confirmModal.classList.remove('active');
    currentTeamId = null;
}

// Search teams
function handleSearch(e) {
    const searchTerm = e.target.value.toLowerCase();
    const filtered = teams.filter(team =>
        team.name.toLowerCase().includes(searchTerm) ||
        team.city.toLowerCase().includes(searchTerm) ||
        team.country.toLowerCase().includes(searchTerm) ||
        (team.coachName && team.coachName.toLowerCase().includes(searchTerm))
    );
    displayTeams(filtered);
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

// Check authentication
function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) window.location.href = 'index.html';
}
