// Players Management JavaScript
import { apiRequest } from "./main.js";

let players = [];
let teams = [];

// ===========================
// Initialize Players Page
// ===========================
document.addEventListener('DOMContentLoaded', async () => {
    try {
        players = await apiRequest('/players');
        teams = await apiRequest('/teams');

        loadPlayers();
        populateTeamDropdown();
        setupEventListeners();
    } catch (error) {
        console.error('Error loading data:', error);
        showNotification('Failed to load players or teams', 'error');
    }
});

// ===========================
// Load Players Table
// ===========================
function loadPlayers(searchTerm = '') {
    const tbody = document.querySelector('#playersTable tbody');
    let filtered = players;

    if (searchTerm) {
        filtered = players.filter(p =>
            p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (p.team && p.team.toLowerCase().includes(searchTerm.toLowerCase())) ||
            p.position.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center">No players found</td></tr>';
        return;
    }

    tbody.innerHTML = filtered.map(p => `
        <tr data-id="${p.id}">
            <td>${p.name}</td>
            <td>${p.position}</td>
            <td>${p.team || ''}</td>
            <td>${p.age}</td>
            <td>${p.nationality}</td>
            <td>${p.jerseyNumber}</td>
            <td><span class="badge badge-${getStatusClass(p.status)}">${p.status}</span></td>
            <td>
                <div class="action-buttons">
                    <button class="edit-btn">Edit</button>
                    <button class="delete-btn">Delete</button>
                </div>
            </td>
        </tr>
    `).join('');

    // Attach event listeners to buttons
    tbody.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', e => {
            const id = parseInt(e.target.closest('tr').dataset.id);
            openPlayerModal(id);
        });
    });

    tbody.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', e => {
            const id = parseInt(e.target.closest('tr').dataset.id);
            deletePlayer(id);
        });
    });
}


function getStatusClass(status) {
    switch (status) {
        case 'Active': return 'success';
        case 'Injured': return 'danger';
        case 'Suspended': return 'warning';
        default: return 'info';
    }
}

// ===========================
// Populate Team Dropdown
// ===========================
function populateTeamDropdown() {
    const select = document.getElementById('teamId');
    select.innerHTML = '<option value="">Select Team</option>' +
        teams.map(t => `<option value="${t.id}">${t.name}</option>`).join('');
}

// ===========================
// Event Listeners
// ===========================
function setupEventListeners() {
    document.getElementById('searchInput').addEventListener('input', e => loadPlayers(e.target.value));
    document.getElementById('addPlayerBtn').addEventListener('click', () => openPlayerModal());
    document.getElementById('closeModal').addEventListener('click', closePlayerModal);
    document.getElementById('cancelBtn').addEventListener('click', closePlayerModal);
    document.getElementById('playerForm').addEventListener('submit', handlePlayerSubmit);

    document.getElementById('playerModal').addEventListener('click', e => {
        if (e.target === e.currentTarget) closePlayerModal();
    });
}

// ===========================
// Open / Close Modal
// ===========================
function openPlayerModal(playerId = null) {
    const modal = document.getElementById('playerModal');
    const title = document.getElementById('modalTitle');
    const form = document.getElementById('playerForm');

    form.reset();

    if (playerId) {
        const p = players.find(x => x.id === playerId);
        if (p) {
            title.textContent = 'Edit Player';
            document.getElementById('playerId').value = p.id;
            document.getElementById('playerName').value = p.name;
            document.getElementById('position').value = p.position;
            document.getElementById('teamId').value = p.teamId;
            document.getElementById('age').value = p.age;
            document.getElementById('nationality').value = p.nationality;
            document.getElementById('jerseyNumber').value = p.jerseyNumber;
            document.getElementById('height').value = p.height;
            document.getElementById('weight').value = p.weight;
            document.getElementById('status').value = p.status;
        }
    } else {
        title.textContent = 'Add New Player';
        document.getElementById('playerId').value = '';
    }

    modal.classList.add('active');
}

function closePlayerModal() {
    document.getElementById('playerModal').classList.remove('active');
}

// ===========================
// Handle Form Submission
// ===========================
async function handlePlayerSubmit(e) {
    e.preventDefault();

    const playerId = document.getElementById('playerId').value;
    const teamId = parseInt(document.getElementById('teamId').value);
    const team = teams.find(t => t.id === teamId);

    const data = {
        name: document.getElementById('playerName').value,
        position: document.getElementById('position').value,
        teamId: teamId,
        team: team ? team.name : '',
        age: parseInt(document.getElementById('age').value),
        nationality: document.getElementById('nationality').value,
        jerseyNumber: parseInt(document.getElementById('jerseyNumber').value),
        height: parseInt(document.getElementById('height').value) || null,
        weight: parseInt(document.getElementById('weight').value) || null,
        status: document.getElementById('status').value
    };

    try {
        if (playerId) {
            // Update player
            await apiRequest(`/players/${playerId}`, 'PUT', data);
            players = players.map(p => p.id === parseInt(playerId) ? { ...p, ...data } : p);
            showNotification('Player updated successfully', 'success');
        } else {
            // Add player
            const newPlayer = await apiRequest('/players', 'POST', data);
            players.push(newPlayer);
            showNotification('Player added successfully', 'success');
        }

        loadPlayers();
        closePlayerModal();

    } catch (err) {
        console.error(err);
        showNotification('Error saving player', 'error');
    }
}

// ===========================
// Edit / Delete
// ===========================
function editPlayer(id) {
    openPlayerModal(id);
}

async function deletePlayer(id) {
    if (!confirm('Are you sure you want to delete this player?')) return;

    try {
        await apiRequest(`/players/${id}`, 'DELETE');
        players = players.filter(p => p.id !== id);
        loadPlayers();
        showNotification('Player deleted successfully', 'success');
    } catch (err) {
        console.error(err);
        showNotification('Error deleting player', 'error');
    }
}

// ===========================
// Notification Helper
// ===========================
function showNotification(msg, type = 'info') {
    const notif = document.createElement('div');
    notif.className = `notification ${type}`;
    notif.innerText = msg;
    document.body.appendChild(notif);
    setTimeout(() => notif.remove(), 3000);
}
