const API_BASE = 'https://aura-backend-1-3uzw.onrender.com/api';

// State
let currentUser = JSON.parse(localStorage.getItem('aura_user')) || null;
let currentEntries = [];
let selectedMood = '';

// DOM Elements
const authScreen = document.getElementById('auth-screen');
const appContainer = document.getElementById('app-container');
const loginBtn = document.getElementById('login-btn');
const registerBtn = document.getElementById('register-btn');
const logoutBtn = document.getElementById('logout-btn');
const authError = document.getElementById('auth-error');

const journalFeed = document.getElementById('journal-feed');
const newEntryBtn = document.getElementById('new-entry-btn');
const createModal = document.getElementById('create-modal');
const closeModal = document.getElementById('close-modal');
const saveEntryBtn = document.getElementById('save-entry-btn');
const moodOptions = document.querySelectorAll('.mood-option');
const tagsList = document.getElementById('tags-list');
const searchInput = document.getElementById('search-input');
const navJournal = document.getElementById('nav-journal');
const navCalendar = document.getElementById('nav-calendar');
const navInsights = document.getElementById('nav-insights');
const comingSoon = document.getElementById('coming-soon');

// Initialization
function init() {
    if (currentUser) {
        showApp();
    } else {
        showAuth();
    }
}

// UI Switching
function showAuth() {
    authScreen.classList.remove('hidden');
    appContainer.classList.add('hidden');
}

function showApp() {
    authScreen.classList.add('hidden');
    appContainer.classList.remove('hidden');
    document.getElementById('current-user-name').innerText = currentUser.name;
    loadEntries();
}

// Navigation functionality
function switchTab(activeNav, showFeed) {
    [navJournal, navCalendar, navInsights].forEach(n => n?.classList.remove('active'));
    activeNav?.classList.add('active');
    if (showFeed) {
        journalFeed.classList.remove('hidden');
        comingSoon.classList.add('hidden');
    } else {
        journalFeed.classList.add('hidden');
        comingSoon.classList.remove('hidden');
    }
}

navJournal?.addEventListener('click', (e) => { e.preventDefault(); switchTab(navJournal, true); });
navCalendar?.addEventListener('click', (e) => { e.preventDefault(); switchTab(navCalendar, false); });
navInsights?.addEventListener('click', (e) => { e.preventDefault(); switchTab(navInsights, false); });

// Authentication
loginBtn.addEventListener('click', async () => {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    try {
        const res = await fetch(`${API_BASE}/users/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        
        if (res.ok) {
            currentUser = await res.json();
            localStorage.setItem('aura_user', JSON.stringify(currentUser));
            showApp();
        } else {
            authError.innerText = "Invalid credentials";
        }
    } catch (e) {
        authError.innerText = "Server error. Is the backend running?";
    }
});

registerBtn.addEventListener('click', async () => {
    const name = document.getElementById('username').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    if (!name || !email || !password) {
        authError.innerText = "Please fill all fields to register.";
        return;
    }
    
    try {
        const res = await fetch(`${API_BASE}/users/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password })
        });
        
        if (res.ok) {
            currentUser = await res.json();
            localStorage.setItem('aura_user', JSON.stringify(currentUser));
            showApp();
        } else {
            authError.innerText = "Registration failed. Email might exist.";
        }
    } catch (e) {
        authError.innerText = "Server error.";
    }
});

logoutBtn.addEventListener('click', () => {
    currentUser = null;
    localStorage.removeItem('aura_user');
    showAuth();
});

// Load Entries
async function loadEntries() {
    try {
        const res = await fetch(`${API_BASE}/entries/user/${currentUser.id}`);
        if (res.ok) {
            currentEntries = await res.json();
            renderEntries(currentEntries);
            updateTagsCloud();
        }
    } catch (e) {
        console.error("Error loading entries", e);
    }
}

// Render Entries
function renderEntries(entriesToRender) {
    journalFeed.innerHTML = '';
    
    if (entriesToRender.length === 0) {
        journalFeed.innerHTML = '<div style="text-align:center;color:var(--text-light);margin-top:50px;">No entries yet. Start your journey by clicking New Entry!</div>';
        return;
    }
    
    entriesToRender.forEach(entry => {
        const dateObj = new Date(entry.date);
        const formattedDate = dateObj.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        
        let imagesHtml = '';
        if (entry.images && entry.images.length > 0) {
            imagesHtml = '<div class="entry-images">';
            entry.images.forEach(img => {
                imagesHtml += `<img src="https://aura-backend-1-3uzw.onrender.com${img.imageUrl}" alt="Memory" loading="lazy" />`;
            });
            imagesHtml += '</div>';
        }

        let tagsHtml = '';
        if (entry.tags && entry.tags.length > 0) {
            tagsHtml = entry.tags.map(t => `<span class="tag">#${t.name}</span>`).join(' ');
        }
        
        const card = document.createElement('div');
        card.className = 'entry-card glass-panel';
        card.innerHTML = `
            <div class="entry-header">
                <div class="entry-meta">
                    <span class="date"><i class="fa-solid fa-calendar"></i> ${formattedDate}</span>
                </div>
                <div class="entry-meta">
                    <span class="mood">${entry.mood || ''}</span>
                    <button class="delete-btn" onclick="deleteEntry(${entry.id})" style="background:none;border:none;color:var(--secondary);cursor:pointer;margin-left:15px;"><i class="fa-solid fa-trash"></i></button>
                </div>
            </div>
            <h3 class="entry-title">${entry.title || 'Untitled Memory'}</h3>
            <div class="entry-content">${escapeHtml(entry.content)}</div>
            ${imagesHtml}
            <div class="entry-footer">
                <div class="entry-tags">${tagsHtml}</div>
            </div>
        `;
        journalFeed.appendChild(card);
    });
}

// Create Entry Logic
newEntryBtn.addEventListener('click', () => {
    createModal.classList.remove('hidden');
    // Default to today
    document.getElementById('entry-date').valueAsDate = new Date();
});

closeModal.addEventListener('click', () => {
    createModal.classList.add('hidden');
});

moodOptions.forEach(opt => {
    opt.addEventListener('click', (e) => {
        moodOptions.forEach(o => o.classList.remove('selected'));
        e.target.classList.add('selected');
        selectedMood = e.target.dataset.mood;
    });
});

saveEntryBtn.addEventListener('click', async () => {
    saveEntryBtn.disabled = true;
    saveEntryBtn.innerText = 'Saving...';
    
    const title = document.getElementById('entry-title').value;
    const content = document.getElementById('entry-content').value;
    const date = document.getElementById('entry-date').value;
    const tagsInput = document.getElementById('entry-tags').value;
    
    if (!content || !date) {
        alert("Content and Date are required!");
        saveEntryBtn.disabled = false;
        saveEntryBtn.innerText = 'Save Entry';
        return;
    }
    
    const tagsArray = tagsInput.split(',').map(t => t.trim()).filter(t => t.length > 0);
    const tags = tagsArray.map(t => ({ name: t.replace('#', '') }));
    
    const payload = {
        title,
        content,
        date,
        mood: selectedMood,
        tags
    };
    
    try {
        // 1. Create the entry
        const res = await fetch(`${API_BASE}/entries/user/${currentUser.id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        if (res.ok) {
            const savedEntry = await res.json();
            
            // 2. Upload images if any
            const files = document.getElementById('entry-images').files;
            if (files.length > 0) {
                for (let i = 0; i < files.length; i++) {
                    const formData = new FormData();
                    formData.append('file', files[i]);
                    await fetch(`${API_BASE}/entries/${savedEntry.id}/images`, {
                        method: 'POST',
                        body: formData
                    });
                }
            }
            
            // 3. Reset and reload
            resetForm();
            createModal.classList.add('hidden');
            loadEntries();
        } else {
             alert("Failed to save entry. Validation error.");
        }
    } catch (e) {
        alert("Failed to save entry.");
    } finally {
        saveEntryBtn.disabled = false;
        saveEntryBtn.innerText = 'Save Entry';
    }
});

function resetForm() {
    document.getElementById('entry-title').value = '';
    document.getElementById('entry-content').value = '';
    document.getElementById('entry-tags').value = '';
    document.getElementById('entry-images').value = '';
    moodOptions.forEach(o => o.classList.remove('selected'));
    selectedMood = '';
}

// Delete Entry
window.deleteEntry = async function(id) {
    if (confirm("Are you sure you want to delete this memory?")) {
        await fetch(`${API_BASE}/entries/${id}`, { method: 'DELETE' });
        loadEntries();
    }
}

// Search and Filter
searchInput.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    if (!term) {
        renderEntries(currentEntries);
        return;
    }
    const filtered = currentEntries.filter(entry => 
        (entry.title && entry.title.toLowerCase().includes(term)) ||
        (entry.content && entry.content.toLowerCase().includes(term)) ||
        (entry.tags && entry.tags.some(t => t.name.toLowerCase().includes(term)))
    );
    renderEntries(filtered);
});

function updateTagsCloud() {
    const allTags = new Set();
    currentEntries.forEach(e => {
        if (e.tags) e.tags.forEach(t => allTags.add(t.name));
    });
    
    tagsList.innerHTML = '';
    allTags.forEach(tagName => {
        const span = document.createElement('span');
        span.className = 'tag';
        span.innerText = `#${tagName}`;
        span.addEventListener('click', () => {
            searchInput.value = tagName;
            searchInput.dispatchEvent(new Event('input'));
        });
        tagsList.appendChild(span);
    });
}

function escapeHtml(unsafe) {
    if (!unsafe) return "";
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}

init();
