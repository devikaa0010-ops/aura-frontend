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
const calendarView = document.getElementById('calendar-view');
const insightsView = document.getElementById('insights-view');

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
function switchTab(activeNav) {
    [navJournal, navCalendar, navInsights].forEach(n => n?.classList.remove('active'));
    activeNav?.classList.add('active');
    
    journalFeed.classList.add('hidden');
    if(calendarView) calendarView.classList.add('hidden');
    if(insightsView) insightsView.classList.add('hidden');
    
    if (activeNav === navJournal) {
        journalFeed.classList.remove('hidden');
    } else if (activeNav === navCalendar) {
        if(calendarView) calendarView.classList.remove('hidden');
        renderCalendar();
    } else if (activeNav === navInsights) {
        if(insightsView) insightsView.classList.remove('hidden');
        renderInsights();
    }
}

navJournal?.addEventListener('click', (e) => { e.preventDefault(); switchTab(navJournal); });
navCalendar?.addEventListener('click', (e) => { e.preventDefault(); switchTab(navCalendar); });
navInsights?.addEventListener('click', (e) => { e.preventDefault(); switchTab(navInsights); });

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

// --- NEW FEATURES: Calendar & Insights ---
function renderCalendar() {
    const grid = document.getElementById('calendar-grid');
    if (!grid || currentEntries.length === 0) return;
    
    grid.innerHTML = '';
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    days.forEach(d => {
        grid.innerHTML += `<div style="font-weight: bold; color: var(--text-light); padding-bottom: 10px;">${d}</div>`;
    });

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    for (let i = 0; i < firstDay; i++) {
        grid.innerHTML += `<div></div>`;
    }
    
    for (let i = 1; i <= daysInMonth; i++) {
        // Check if there are entries precisely on this day
        const dateStr = `${year}-${String(month+1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        const hasEntry = currentEntries.some(e => e.date === dateStr);
        
        const bg = hasEntry ? 'var(--primary)' : 'rgba(0,0,0,0.05)';
        const color = hasEntry ? '#fff' : 'inherit';
        const cursor = hasEntry ? 'pointer' : 'default';
        
        const dayDiv = document.createElement('div');
        dayDiv.style.cssText = `padding: 15px 5px; border-radius: 8px; background: ${bg}; color: ${color}; cursor: ${cursor}; transition: 0.2s; box-shadow: 0 4px 6px rgba(0,0,0,0.05);`;
        dayDiv.innerText = i;
        
        if (hasEntry) {
            dayDiv.onmouseover = () => dayDiv.style.transform = 'scale(1.1)';
            dayDiv.onmouseout = () => dayDiv.style.transform = 'scale(1)';
            dayDiv.onclick = () => {
                const dayEntries = currentEntries.filter(e => e.date === dateStr);
                const entriesContainer = document.getElementById('calendar-entries');
                entriesContainer.innerHTML = `<h3 style="margin-bottom:15px; color: var(--text-dark);">Memories on ${dateStr}</h3>`;
                
                dayEntries.forEach(e => {
                    entriesContainer.innerHTML += `<div style="background:rgba(255,255,255,0.7); padding:15px; border-radius:8px; margin-bottom:10px; border:1px solid var(--glass-border);">
                        <strong>${e.title || 'Untitled'} ${e.mood || ''}</strong><br>
                        <p style="font-size:0.9em; margin-top:5px; color:var(--text-light);">${escapeHtml(e.content).substring(0, 100)}...</p>
                    </div>`;
                });
            };
        }
        grid.appendChild(dayDiv);
    }
}

function renderInsights() {
    if(!document.getElementById('total-entries-stat')) return;
    document.getElementById('total-entries-stat').innerText = currentEntries.length;
    
    const moodCounts = {};
    currentEntries.forEach(e => {
        if(e.mood) {
            moodCounts[e.mood] = (moodCounts[e.mood] || 0) + 1;
        }
    });

    const statsContainer = document.getElementById('mood-stats');
    statsContainer.innerHTML = '';
    
    if(Object.keys(moodCounts).length === 0) {
        statsContainer.innerHTML = "<p>No moods tracked yet!</p>";
        return;
    }

    const maxCount = Math.max(...Object.values(moodCounts));
    
    for (const [mood, count] of Object.entries(moodCounts)) {
        const percentage = Math.round((count / maxCount) * 100);
        statsContainer.innerHTML += `
            <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 1.5rem; width: 30px;">${mood}</span>
                <div style="flex: 1; height: 12px; background: rgba(0,0,0,0.1); border-radius: 6px; overflow: hidden;">
                    <div style="width: ${percentage}%; height: 100%; background: var(--primary); border-radius: 6px;"></div>
                </div>
                <span style="font-size: 0.9rem; font-weight: bold; width: 30px; text-align: right; color: var(--text-dark);">${count}</span>
            </div>
        `;
    }
}
