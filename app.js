// ===== RONIN LOGGER - APP.JS =====

// ===== STATE & CONSTANTS =====
const RING_CIRCUMFERENCE = 534.07; // 2 * PI * 85

const defaultSettings = {
    weeklyGoalHours: 21,
    totalGoalHours: 3000,
    ankiWords: 0,
    presets: [24, 24, 45, 60],
    ankiDeck: ''
};

let state = {
    weekStart: null,
    weekMinutes: 0,
    totalMinutes: 0,
    mangaChapters: 0,
    log: [],
    lastClaim: null,
    streak: 0,
    lastClaimDate: null,
    settings: { ...defaultSettings }
};

// ===== DOM ELEMENTS =====
const elements = {
    powerLevel: document.getElementById('powerLevel'),
    streakCount: document.getElementById('streakCount'),
    ringProgress: document.getElementById('ringProgress'),
    weekHours: document.getElementById('weekHours'),
    weekStatus: document.getElementById('weekStatus'),
    totalHours: document.getElementById('totalHours'),
    mountainProgress: document.getElementById('mountainProgress'),
    rankDisplay: document.getElementById('rankDisplay'),
    minutesInput: document.getElementById('minutesInput'),
    claimBtn: document.getElementById('claimBtn'),
    logList: document.getElementById('logList'),
    settingsBtn: document.getElementById('settingsBtn'),
    settingsModal: document.getElementById('settingsModal'),
    closeSettings: document.getElementById('closeSettings'),
    weeklyGoal: document.getElementById('weeklyGoal'),
    totalGoal: document.getElementById('totalGoal'),
    ankiWords: document.getElementById('ankiWords'),
    manualTotal: document.getElementById('manualTotal'),
    saveManualTotal: document.getElementById('saveManualTotal'),
    exportBtn: document.getElementById('exportBtn'),
    importBtn: document.getElementById('importBtn'),
    importFile: document.getElementById('importFile'),
    claimSound: document.getElementById('claimSound'),
    // New elements
    preset1: document.getElementById('preset1'),
    preset2: document.getElementById('preset2'),
    preset3: document.getElementById('preset3'),
    preset4: document.getElementById('preset4'),
    ankiDeck: document.getElementById('ankiDeck'),
    syncAnkiBtn: document.getElementById('syncAnkiBtn'),
    // Cloud sync
    cloudUserId: document.getElementById('cloudUserId'),
    cloudPushBtn: document.getElementById('cloudPushBtn'),
    cloudPullBtn: document.getElementById('cloudPullBtn'),
    // Manga
    mangaCount: document.getElementById('mangaCount'),
    mangaInput: document.getElementById('mangaInput'),
    mangaClaimBtn: document.getElementById('mangaClaimBtn')
};

// ===== UTILITIES =====
function getWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

function getWeekStart(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday as start
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d.toISOString().split('T')[0];
}

function formatTime(date) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDate(date) {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function minutesToHours(mins) {
    return (mins / 60).toFixed(1);
}

// ===== PERSISTENCE =====
function saveState() {
    localStorage.setItem('roninLogger', JSON.stringify(state));
}

function loadState() {
    const saved = localStorage.getItem('roninLogger');
    if (saved) {
        const parsed = JSON.parse(saved);
        state = {
            ...state,
            ...parsed,
            settings: { ...defaultSettings, ...parsed.settings }
        };
    }

    // Check if we need to reset weekly minutes
    const currentWeekStart = getWeekStart(new Date());
    if (state.weekStart !== currentWeekStart) {
        state.weekStart = currentWeekStart;
        state.weekMinutes = 0;
        state.log = []; // Clear log for new week
        saveState();
    }
}

// ===== RANKS =====
function getRank(totalHours) {
    if (totalHours >= 2500) return { rank: 'S+', title: 'Native-Like', color: '#fbbf24' };
    if (totalHours >= 2000) return { rank: 'S', title: 'Advanced', color: '#f59e0b' };
    if (totalHours >= 1500) return { rank: 'A', title: 'Proficient', color: '#22c55e' };
    if (totalHours >= 1000) return { rank: 'B', title: 'Intermediate', color: '#3b82f6' };
    if (totalHours >= 500) return { rank: 'C', title: 'Pre-Intermediate', color: '#06b6d4' };
    if (totalHours >= 200) return { rank: 'D', title: 'Elementary', color: '#8b5cf6' };
    if (totalHours >= 50) return { rank: 'E', title: 'Newbie', color: '#a855f7' };
    return { rank: 'F', title: 'Beginner', color: '#6b7280' };
}

function getPowerLevel(words) {
    return Math.floor(words / 100);
}

// ===== UI UPDATES =====
function updateUI() {
    // Power Level
    const level = getPowerLevel(state.settings.ankiWords);
    elements.powerLevel.textContent = `Lvl ${level}`;

    // Streak
    if (elements.streakCount) {
        elements.streakCount.textContent = state.streak || 0;
    }

    // Manga chapters
    if (elements.mangaCount) {
        elements.mangaCount.textContent = state.mangaChapters || 0;
    }

    // Weekly Ring
    const weekHours = state.weekMinutes / 60;
    const weekGoal = state.settings.weeklyGoalHours;
    const weekProgress = Math.min(weekHours / weekGoal, 1);
    const offset = RING_CIRCUMFERENCE * (1 - weekProgress);

    elements.ringProgress.style.strokeDashoffset = offset;
    elements.weekHours.textContent = `${minutesToHours(state.weekMinutes)}h`;

    // Ring completion states
    const isComplete = weekHours >= weekGoal;
    const isOvercharge = weekHours > weekGoal * 1.2;

    elements.ringProgress.classList.toggle('complete', isComplete);
    elements.ringProgress.classList.toggle('overcharge', isOvercharge);
    elements.weekHours.classList.toggle('gold', isComplete);

    // Week status (resets Monday 00:00)
    const weekNum = getWeekNumber(new Date());
    const now = new Date();
    const today = now.getDay();

    // Calculate hours until next Monday 00:00
    const daysUntilMonday = today === 0 ? 1 : (8 - today) % 7;
    const nextMonday = new Date(now);
    nextMonday.setDate(now.getDate() + daysUntilMonday);
    nextMonday.setHours(0, 0, 0, 0);
    const hoursLeft = Math.ceil((nextMonday - now) / (1000 * 60 * 60));

    let statusText;
    if (hoursLeft <= 24) {
        statusText = `Week ${weekNum} • ${hoursLeft}h left`;
    } else {
        statusText = `Week ${weekNum} • ${daysUntilMonday} day${daysUntilMonday > 1 ? 's' : ''} left`;
    }
    elements.weekStatus.textContent = statusText;

    // Mountain
    const totalHours = state.totalMinutes / 60;
    const totalGoal = state.settings.totalGoalHours;
    const mountainProgress = Math.min((totalHours / totalGoal) * 100, 100);

    elements.mountainProgress.style.width = `${mountainProgress}%`;
    elements.totalHours.textContent = `${Math.floor(totalHours)}h / ${totalGoal.toLocaleString()}h`;

    // Rank
    const { rank, title, color } = getRank(totalHours);
    elements.rankDisplay.textContent = `Rank ${rank} • ${title}`;
    elements.rankDisplay.style.color = color;

    // Log
    renderLog();
}

function renderLog() {
    if (state.log.length === 0) {
        elements.logList.innerHTML = '<div class="log-empty">No claims yet. Start your grind!</div>';
        return;
    }

    const startIdx = Math.max(0, state.log.length - 10);
    elements.logList.innerHTML = state.log
        .slice(-10)
        .reverse()
        .map((entry, i) => {
            const realIdx = state.log.length - 1 - i;
            return `
      <div class="log-item">
        <span class="log-time">${entry.time}</span>
        <span class="log-mins">+${entry.minutes} mins</span>
        <button class="log-delete" data-idx="${realIdx}" title="Remove">×</button>
      </div>
    `;
        }).join('');

    // Attach delete handlers
    elements.logList.querySelectorAll('.log-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteLogEntry(parseInt(btn.dataset.idx, 10));
        });
    });
}

function deleteLogEntry(idx) {
    if (idx < 0 || idx >= state.log.length) return;

    const entry = state.log[idx];
    state.weekMinutes = Math.max(0, state.weekMinutes - entry.minutes);
    state.totalMinutes = Math.max(0, state.totalMinutes - entry.minutes);
    state.log.splice(idx, 1);

    saveState();
    updateUI();
}

// ===== CLAIM LOGIC =====
function claimMinutes(minutes) {
    if (!minutes || minutes <= 0 || minutes > 999) return false;

    const now = new Date();
    const today = now.toISOString().split('T')[0];

    // Streak tracking
    if (state.lastClaimDate) {
        const lastDate = new Date(state.lastClaimDate);
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        if (state.lastClaimDate === today) {
            // Same day, streak unchanged
        } else if (state.lastClaimDate === yesterdayStr) {
            // Consecutive day, increment streak
            state.streak++;
        } else {
            // Missed a day, reset streak
            state.streak = 1;
        }
    } else {
        // First ever claim
        state.streak = 1;
    }
    state.lastClaimDate = today;

    // Update state
    state.weekMinutes += minutes;
    state.totalMinutes += minutes;
    state.log.push({
        time: `${formatDate(now)} ${formatTime(now)}`,
        minutes: minutes
    });

    // Keep only last 50 log entries
    if (state.log.length > 50) {
        state.log = state.log.slice(-50);
    }

    saveState();
    updateUI();

    // Auto-sync to cloud if configured
    autoSync();

    // Feedback
    playClaimSound();
    triggerHaptic();
    flashClaimButton();

    return true;
}

function playClaimSound() {
    if (elements.claimSound) {
        elements.claimSound.currentTime = 0;
        elements.claimSound.play().catch(() => { }); // Ignore autoplay errors
    }
}

function triggerHaptic() {
    if ('vibrate' in navigator) {
        navigator.vibrate([50, 30, 50]);
    }
}

function flashClaimButton() {
    elements.claimBtn.classList.add('success');
    setTimeout(() => {
        elements.claimBtn.classList.remove('success');
    }, 400);
}

// ===== EVENT HANDLERS =====
elements.claimBtn.addEventListener('click', () => {
    const value = parseInt(elements.minutesInput.value, 10);
    if (claimMinutes(value)) {
        elements.minutesInput.value = '';
        elements.minutesInput.focus();
    }
});

elements.minutesInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        elements.claimBtn.click();
    }
});

// Manga chapter claim
function claimMangaChapters(chapters) {
    if (!chapters || chapters <= 0 || chapters > 99) return false;

    state.mangaChapters = (state.mangaChapters || 0) + chapters;

    saveState();
    updateUI();
    autoSync();

    // Button feedback
    const btn = elements.mangaClaimBtn;
    btn.classList.add('success');
    btn.textContent = `+${chapters}!`;
    setTimeout(() => {
        btn.classList.remove('success');
        btn.textContent = '+Chapters';
    }, 500);

    return true;
}

if (elements.mangaClaimBtn) {
    elements.mangaClaimBtn.addEventListener('click', () => {
        const value = parseInt(elements.mangaInput?.value, 10) || 1;
        if (claimMangaChapters(value)) {
            elements.mangaInput.value = '';
        }
    });
}

if (elements.mangaInput) {
    elements.mangaInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            elements.mangaClaimBtn?.click();
        }
    });
}

// Preset buttons click handlers
document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const mins = parseInt(btn.dataset.mins, 10);
        if (claimMinutes(mins)) {
            // Optional: clear input if it had something, but main goal is just to claim
            elements.minutesInput.value = '';
        }
    });
});

// Settings Modal
elements.settingsBtn.addEventListener('click', () => {
    elements.weeklyGoal.value = state.settings.weeklyGoalHours;
    elements.totalGoal.value = state.settings.totalGoalHours;
    elements.ankiWords.textContent = state.settings.ankiWords;
    elements.manualTotal.value = '';

    // Load presets
    const presets = state.settings.presets || [24, 24, 45, 60];
    if (elements.preset1) elements.preset1.value = presets[0];
    if (elements.preset2) elements.preset2.value = presets[1];
    if (elements.preset3) elements.preset3.value = presets[2];
    if (elements.preset4) elements.preset4.value = presets[3];

    // Load Anki deck
    if (elements.ankiDeck) elements.ankiDeck.value = state.settings.ankiDeck || '';

    elements.settingsModal.classList.add('active');
});

elements.closeSettings.addEventListener('click', closeSettings);
elements.settingsModal.addEventListener('click', (e) => {
    if (e.target === elements.settingsModal) closeSettings();
});

function closeSettings() {
    // Save settings
    state.settings.weeklyGoalHours = parseInt(elements.weeklyGoal.value, 10) || 21;
    state.settings.totalGoalHours = parseInt(elements.totalGoal.value, 10) || 3000;
    // state.settings.ankiWords = parseInt(elements.ankiWords.value, 10) || 0; // Read-only now

    // Save presets
    if (elements.preset1 && elements.preset2 && elements.preset3 && elements.preset4) {
        state.settings.presets = [
            parseInt(elements.preset1.value, 10) || 24,
            parseInt(elements.preset2.value, 10) || 24,
            parseInt(elements.preset3.value, 10) || 45,
            parseInt(elements.preset4.value, 10) || 60
        ];
        updatePresetButtons();
    }

    // Save Anki deck
    if (elements.ankiDeck) {
        state.settings.ankiDeck = elements.ankiDeck.value || '';
    }

    saveState();
    updateUI();
    elements.settingsModal.classList.remove('active');
}

// Update preset button values based on settings
function updatePresetButtons() {
    const presets = state.settings.presets || [24, 24, 45, 60];
    const labels = ['📺', '📖', '🎧', '⏱️'];
    const buttons = document.querySelectorAll('.preset-btn');

    buttons.forEach((btn, i) => {
        if (presets[i] !== undefined) {
            btn.dataset.mins = presets[i];
            btn.innerHTML = `${presets[i]}m<span class="preset-hint">${labels[i]}</span>`;
        }
    });
}

elements.saveManualTotal.addEventListener('click', () => {
    const hours = parseFloat(elements.manualTotal.value);
    if (!isNaN(hours) && hours >= 0) {
        state.totalMinutes = Math.round(hours * 60);
        saveState();
        updateUI();
        elements.manualTotal.value = '';
        alert(`Total hours set to ${hours}h`);
    }
});

// ===== ANKI CONNECT =====
async function syncAnkiConnect() {
    const deckName = elements.ankiDeck?.value || state.settings.ankiDeck || '';

    if (!deckName) {
        alert('Please enter a deck name first');
        return;
    }

    const btn = elements.syncAnkiBtn;
    btn.classList.add('loading');
    btn.textContent = 'Syncing...';

    try {
        // AnkiConnect request to get mature cards
        const response = await fetch('http://127.0.0.1:8765', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'findCards',
                version: 6,
                params: {
                    query: `deck:"${deckName}" prop:ivl>=21`
                }
            })
        });

        const result = await response.json();

        if (result.error) {
            throw new Error(result.error);
        }

        const matureCount = result.result?.length || 0;
        state.settings.ankiWords = matureCount;
        elements.ankiWords.textContent = matureCount;

        saveState();
        updateUI();

        btn.textContent = `✓ ${matureCount} cards`;
        setTimeout(() => {
            btn.textContent = 'Sync';
            btn.classList.remove('loading');
        }, 2000);

    } catch (error) {
        console.error('AnkiConnect error:', error);
        btn.textContent = 'Error';
        setTimeout(() => {
            btn.textContent = 'Sync';
            btn.classList.remove('loading');
        }, 2000);

        if (error.message.includes('Failed to fetch')) {
            alert('Could not connect to AnkiConnect.\n\nMake sure:\n1. Anki is running\n2. AnkiConnect add-on is installed\n3. Port 8765 is accessible');
        } else {
            alert(`AnkiConnect error: ${error.message}`);
        }
    }
}

if (elements.syncAnkiBtn) {
    elements.syncAnkiBtn.addEventListener('click', syncAnkiConnect);
}
// ===== FIREBASE CLOUD SYNC =====
const firebaseConfig = {
    apiKey: "AIzaSyBwJx33EHAVBtpfIfebZ_mOMlFs_2xiFx4",
    authDomain: "jp-logger.firebaseapp.com",
    databaseURL: "https://jp-logger-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "jp-logger",
    storageBucket: "jp-logger.firebasestorage.app",
    messagingSenderId: "505128531234",
    appId: "1:505128531234:web:546b2b1dfec7128d32a17b"
};

// Initialize Firebase
let firebaseApp = null;
let firebaseDb = null;

function initFirebase() {
    if (!firebaseApp && typeof firebase !== 'undefined') {
        firebaseApp = firebase.initializeApp(firebaseConfig);
        firebaseDb = firebase.database();
    }
    return firebaseDb;
}

// ===== FIREBASE AUTH =====
let firebaseAuth = null;
let currentUser = null;

function initAuth() {
    if (!firebaseAuth && typeof firebase !== 'undefined') {
        initFirebase();
        firebaseAuth = firebase.auth();

        // Auth state listener
        firebaseAuth.onAuthStateChanged((user) => {
            currentUser = user;
            updateAuthUI();

            if (user) {
                // Start real-time sync with auth uid
                setupRealtimeSync(user.uid);
            }
        });
    }
    return firebaseAuth;
}

function updateAuthUI() {
    const loggedOut = document.getElementById('authLoggedOut');
    const loggedIn = document.getElementById('authLoggedIn');
    const userEmail = document.getElementById('authUserEmail');
    const status = document.getElementById('authStatus');

    if (currentUser) {
        if (loggedOut) loggedOut.style.display = 'none';
        if (loggedIn) loggedIn.style.display = 'block';
        if (userEmail) userEmail.textContent = currentUser.email;
        if (status) status.textContent = '✓ Syncing automatically';
    } else {
        if (loggedOut) loggedOut.style.display = 'block';
        if (loggedIn) loggedIn.style.display = 'none';
        if (status) status.textContent = 'Login to sync across devices';
    }
}

// Auto-sync (uses auth uid)
async function autoSync() {
    if (!currentUser) return; // Not logged in

    try {
        const db = initFirebase();
        if (!db) return;

        await db.ref(`users/${currentUser.uid}`).set(state);
        console.log('Auto-synced to cloud');
    } catch (error) {
        console.error('Auto-sync failed:', error);
    }
}

// Real-time sync listener (updates when data changes on Firebase)
let realtimeUnsubscribe = null;

function setupRealtimeSync(userId) {
    const db = initFirebase();
    if (!db || !userId) return;

    // Unsubscribe from previous listener
    if (realtimeUnsubscribe) {
        realtimeUnsubscribe();
    }

    const userRef = db.ref(`users/${userId}`);
    realtimeUnsubscribe = userRef.on('value', (snapshot) => {
        const data = snapshot.val();
        if (data && data.lastClaimDate !== state.lastClaimDate) {
            // Only update if data is different (avoid infinite loop)
            state = {
                ...state,
                ...data,
                settings: { ...defaultSettings, ...data.settings }
            };
            saveState();
            updatePresetButtons();
            updateUI();
            console.log('Real-time sync: data updated from cloud');
        }
    });
}

// Initialize auth on load
function initAutoSync() {
    initAuth();
}

async function cloudPush() {
    const userId = elements.cloudUserId?.value?.trim();
    if (!userId) {
        alert('Please enter a unique user ID');
        return;
    }

    // Save userId to settings
    state.settings.cloudUserId = userId;
    saveState();

    const btn = elements.cloudPushBtn;
    btn.textContent = 'Pushing...';

    try {
        const db = initFirebase();
        if (!db) throw new Error('Firebase not loaded');

        await db.ref(`users/${userId}`).set(state);

        // Start real-time sync
        setupRealtimeSync(userId);

        btn.textContent = '✓ Syncing!';
        setTimeout(() => btn.textContent = 'Push ↑', 2000);

    } catch (error) {
        console.error('Cloud push error:', error);
        btn.textContent = 'Error';
        setTimeout(() => btn.textContent = 'Push ↑', 2000);
        alert(`Cloud sync failed: ${error.message}`);
    }
}

async function cloudPull() {
    const userId = elements.cloudUserId?.value?.trim();
    if (!userId) {
        alert('Please enter your user ID');
        return;
    }

    const btn = elements.cloudPullBtn;
    btn.textContent = 'Pulling...';

    try {
        const db = initFirebase();
        if (!db) throw new Error('Firebase not loaded');

        const snapshot = await db.ref(`users/${userId}`).once('value');
        const data = snapshot.val();

        if (data) {
            state = {
                ...state,
                ...data,
                settings: { ...defaultSettings, ...data.settings }
            };
            saveState();
            updatePresetButtons();
            updateUI();

            btn.textContent = '✓ Pulled!';
            setTimeout(() => btn.textContent = 'Pull ↓', 2000);
        } else {
            throw new Error('No data found for this user ID');
        }

    } catch (error) {
        console.error('Cloud pull error:', error);
        btn.textContent = 'Error';
        setTimeout(() => btn.textContent = 'Pull ↓', 2000);
        alert(`Cloud sync failed: ${error.message}`);
    }
}

if (elements.cloudPushBtn) {
    elements.cloudPushBtn.addEventListener('click', cloudPush);
}

if (elements.cloudPullBtn) {
    elements.cloudPullBtn.addEventListener('click', cloudPull);
}

// Load cloud user ID on settings open
elements.settingsBtn.addEventListener('click', () => {
    if (elements.cloudUserId && state.settings.cloudUserId) {
        elements.cloudUserId.value = state.settings.cloudUserId;
    }
});

// Export/Import
elements.exportBtn.addEventListener('click', () => {
    const data = JSON.stringify(state, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ronin-logger-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
});

elements.importBtn.addEventListener('click', () => {
    elements.importFile.click();
});

elements.importFile.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const imported = JSON.parse(event.target.result);
            state = {
                ...state,
                ...imported,
                settings: { ...defaultSettings, ...imported.settings }
            };
            saveState();
            updateUI();
            alert('Data imported successfully!');
            closeSettings();
        } catch (err) {
            alert('Failed to import data. Invalid JSON file.');
        }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input
});

// ===== PWA SERVICE WORKER =====
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').catch(() => { });
    });
}

// ===== AUTH HANDLERS =====
document.getElementById('loginBtn')?.addEventListener('click', async () => {
    const email = document.getElementById('authEmail')?.value;
    const password = document.getElementById('authPassword')?.value;
    const status = document.getElementById('authStatus');

    if (!email || !password) {
        if (status) status.textContent = 'Please enter email and password';
        return;
    }

    try {
        const auth = initAuth();
        if (status) status.textContent = 'Logging in...';
        await auth.signInWithEmailAndPassword(email, password);
        if (status) status.textContent = '✓ Logged in!';
    } catch (error) {
        console.error('Login error:', error);
        if (status) status.textContent = `Error: ${error.message}`;
    }
});

document.getElementById('signupBtn')?.addEventListener('click', async () => {
    const email = document.getElementById('authEmail')?.value;
    const password = document.getElementById('authPassword')?.value;
    const status = document.getElementById('authStatus');

    if (!email || !password) {
        if (status) status.textContent = 'Please enter email and password';
        return;
    }

    if (password.length < 6) {
        if (status) status.textContent = 'Password must be at least 6 characters';
        return;
    }

    try {
        const auth = initAuth();
        if (status) status.textContent = 'Creating account...';
        await auth.createUserWithEmailAndPassword(email, password);
        if (status) status.textContent = '✓ Account created!';
        autoSync();
    } catch (error) {
        console.error('Signup error:', error);
        if (status) status.textContent = `Error: ${error.message}`;
    }
});

document.getElementById('logoutBtn')?.addEventListener('click', async () => {
    try {
        const auth = initAuth();
        await auth.signOut();
    } catch (error) {
        console.error('Logout error:', error);
    }
});

// ===== INIT =====
loadState();
updatePresetButtons();
updateUI();
initAutoSync(); // Start real-time sync if user ID exists

// Focus input on load (desktop)
if (window.innerWidth > 600) {
    elements.minutesInput.focus();
}
