const API_BASE_URL = 'http://localhost:3000/api';

let coaches = [];
let currentCoachId = null;

// Modal elements
const coachModal = document.getElementById('coachModal');
const confirmModal = document.getElementById('confirmModal');
const coachForm = document.getElementById('coachForm');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    loadCoaches();
    setupEventListeners();
});

// Event Listeners
function setupEventListeners() {
    document.getElementById('addCoachBtn').addEventListener('click', () => openCoachModal());
    document.getElementById('closeModal').addEventListener('click', closeCoachModal);
    document.getElementById('cancelBtn').addEventListener('click', closeCoachModal);
    coachForm.addEventListener('submit', handleSaveCoach);

    // Confirm modal
    document.getElementById('closeConfirmModal').addEventListener('click', closeConfirmModal);
    document.getElementById('cancelDeleteBtn').addEventListener('click', closeConfirmModal);
    document.getElementById('confirmDeleteBtn').addEventListener('click', handleConfirmDelete);

    // Search
    document.getElementById('searchInput').addEventListener('input', handleSearch);

    // Close modal on outside click
    window.addEventListener('click', (e) => {
        if (e.target === coachModal) closeCoachModal();
        if (e.target === confirmModal) closeConfirmModal();
    });

    // Event delegation for Edit/Delete buttons
    document.getElementById('coachesTableBody').addEventListener('click', (e) => {
        const tr = e.target.closest('tr');
        if (!tr) return;
        const id = parseInt(tr.dataset.id);

        if (e.target.classList.contains('btn-primary')) {
            editCoach(id);
        } else if (e.target.classList.contains('btn-danger')) {
            deleteCoach(id);
        }
    });
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
            displayCoaches(coaches);
        } else {
            showNotification('Failed to load coaches', 'error');
        }
    } catch (error) {
        console.error(error);
        showNotification('Error loading coaches', 'error');
    }
}

// Display coaches
function displayCoaches(coachesToDisplay) {
    const tbody = document.getElementById('coachesTableBody');

    if (coachesToDisplay.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="no-data">No coaches found</td></tr>';
        return;
    }

    tbody.innerHTML = coachesToDisplay.map(coach => `
        <tr data-id="${coach.id}">
            <td>${escapeHtml(coach.name)}</td>
            <td>${escapeHtml(coach.nationality)}</td>
            <td>${coach.experienceYears ? coach.experienceYears + ' years' : 'N/A'}</td>
            <td>${escapeHtml(coach.specialty) || 'N/A'}</td>
            <td>${escapeHtml(coach.licenseLevel) || 'N/A'}</td>
            <td>${escapeHtml(coach.teamName) || 'No team'}</td>
            <td><span class="status-badge status-${coach.status.toLowerCase()}">${coach.status}</span></td>
            <td class="actions">
                <button class="btn btn-sm btn-primary">Edit</button>
                <button class="btn btn-sm btn-danger">Delete</button>
            </td>
        </tr>
    `).join('');
}

// Open modal
function openCoachModal(coach = null) {
    const modalTitle = document.getElementById('modalTitle');

    if (coach) {
        modalTitle.textContent = 'Edit Coach';
        document.getElementById('coachId').value = coach.id;
        document.getElementById('coachName').value = coach.name;
        document.getElementById('nationality').value = coach.nationality;
        document.getElementById('dateOfBirth').value = coach.date_of_birth ? coach.date_of_birth.split('T')[0] : '';
        document.getElementById('experienceYears').value = coach.experienceYears || '';
        document.getElementById('specialty').value = coach.specialty || '';
        document.getElementById('licenseLevel').value = coach.licenseLevel || '';
        document.getElementById('status').value = coach.status || 'Active';
    } else {
        modalTitle.textContent = 'Add New Coach';
        coachForm.reset();
        document.getElementById('coachId').value = '';
        document.getElementById('status').value = 'Active';
    }

    coachModal.classList.add('active');
}

function closeCoachModal() {
    coachModal.classList.remove('active');
    coachForm.reset();
}

// Edit coach
async function editCoach(id) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/coaches/${id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const coach = await response.json();
            openCoachModal(coach);
        } else {
            showNotification('Failed to load coach details', 'error');
        }
    } catch (error) {
        console.error(error);
        showNotification('Error loading coach details', 'error');
    }
}

// Save coach
async function handleSaveCoach(e) {
    e.preventDefault();

    const coachId = document.getElementById('coachId').value;
    const coachData = {
    name: document.getElementById('coachName').value,
    nationality: document.getElementById('nationality').value,
    date_of_birth: document.getElementById('dateOfBirth').value || null,
    experience_years: document.getElementById('experienceYears').value || null,
    specialization: document.getElementById('specialty').value,  // <--- match DB
    license_type: document.getElementById('licenseLevel').value, // <--- match DB
    status: document.getElementById('status').value
};


    try {
        const token = localStorage.getItem('token');
        const url = coachId ? `${API_BASE_URL}/coaches/${coachId}` : `${API_BASE_URL}/coaches`;
        const method = coachId ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method: method,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(coachData)
        });

        if (response.ok) {
            showNotification(`Coach ${coachId ? 'updated' : 'created'} successfully`, 'success');
            closeCoachModal();
            loadCoaches();
        } else {
            const error = await response.json();
            showNotification(error.message || 'Failed to save coach', 'error');
        }
    } catch (error) {
        console.error(error);
        showNotification('Error saving coach', 'error');
    }
}

// Delete coach
function deleteCoach(id) {
    currentCoachId = id;
    confirmModal.classList.add('active');
}

// Confirm delete
async function handleConfirmDelete() {
    if (!currentCoachId) return;

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/coaches/${currentCoachId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            showNotification('Coach deleted successfully', 'success');
            closeConfirmModal();
            loadCoaches();
        } else {
            const error = await response.json();
            showNotification(error.message || 'Failed to delete coach', 'error');
        }
    } catch (error) {
        console.error(error);
        showNotification('Error deleting coach', 'error');
    }
}

function closeConfirmModal() {
    confirmModal.classList.remove('active');
    currentCoachId = null;
}

// Search coaches
function handleSearch(e) {
    const searchTerm = e.target.value.toLowerCase();
    const filtered = coaches.filter(coach =>
        coach.name.toLowerCase().includes(searchTerm) ||
        coach.nationality.toLowerCase().includes(searchTerm) ||
        (coach.specialty && coach.specialty.toLowerCase().includes(searchTerm)) ||
        (coach.teamName && coach.teamName.toLowerCase().includes(searchTerm))
    );
    displayCoaches(filtered);
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
