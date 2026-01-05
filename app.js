// ===== RONIN LOGGER - APP.JS =====

// ===== STATE & CONSTANTS =====
const RING_CIRCUMFERENCE = 534.07; // 2 * PI * 85
let freqMap = null; // Loaded from freq_map.json

// ===== BOSS THEMES (Rotating Weekly) =====
const BOSS_THEMES = [
    { name: 'THE VOID', class: 'theme-void', hue: 270 },      // Purple
    { name: 'THE GLITCH', class: 'theme-glitch', hue: 180 },  // Cyan
    { name: 'THE INFERNO', class: 'theme-inferno', hue: 15 }, // Orange/Red
    { name: 'THE ABYSS', class: 'theme-abyss', hue: 220 }     // Deep Blue
];

function getCurrentBoss() {
    const weekNum = getWeekNumber(new Date());
    return BOSS_THEMES[weekNum % BOSS_THEMES.length];
}

// Critical claim chance (15%)
const CRITICAL_CHANCE = 0.15;

// ===== ACHIEVEMENTS SYSTEM =====
const ACHIEVEMENTS = {
    // Hour milestones
    first_steps: { id: 'first_steps', icon: 'I', name: 'First Steps', desc: 'Log your first hour', condition: (s) => s.totalMinutes >= 60 },
    seedling: { id: 'seedling', icon: 'II', name: 'Seedling', desc: 'Reach 10 hours', condition: (s) => s.totalMinutes >= 600 },
    growing: { id: 'growing', icon: 'III', name: 'Growing', desc: 'Reach 50 hours', condition: (s) => s.totalMinutes >= 3000 },
    rooted: { id: 'rooted', icon: 'IV', name: 'Rooted', desc: 'Reach 100 hours', condition: (s) => s.totalMinutes >= 6000 },
    climber: { id: 'climber', icon: 'V', name: 'Climber', desc: 'Reach 250 hours', condition: (s) => s.totalMinutes >= 15000 },
    mountaineer: { id: 'mountaineer', icon: 'VI', name: 'Mountaineer', desc: 'Reach 500 hours', condition: (s) => s.totalMinutes >= 30000 },
    summit: { id: 'summit', icon: 'VII', name: 'Summit', desc: 'Reach 1000 hours', condition: (s) => s.totalMinutes >= 60000 },
    legend: { id: 'legend', icon: 'VIII', name: 'Legend', desc: 'Reach 2000 hours', condition: (s) => s.totalMinutes >= 120000 },
    dragon: { id: 'dragon', icon: 'IX', name: 'Dragon', desc: 'Reach 3000 hours', condition: (s) => s.totalMinutes >= 180000 },

    // Streak achievements
    spark: { id: 'spark', icon: 'S1', name: 'Spark', desc: '3 day streak', condition: (s) => s.maxStreak >= 3 },
    flame: { id: 'flame', icon: 'S2', name: 'Flame', desc: '7 day streak', condition: (s) => s.maxStreak >= 7 },
    blaze: { id: 'blaze', icon: 'S3', name: 'Blaze', desc: '14 day streak', condition: (s) => s.maxStreak >= 14 },
    inferno: { id: 'inferno', icon: 'S4', name: 'Inferno', desc: '30 day streak', condition: (s) => s.maxStreak >= 30 },
    eternal: { id: 'eternal', icon: 'S5', name: 'Eternal Flame', desc: '100 day streak', condition: (s) => s.maxStreak >= 100 },

    // Special achievements
    night_owl: { id: 'night_owl', icon: 'N', name: 'Night Owl', desc: 'Claim after midnight', condition: null },
    early_bird: { id: 'early_bird', icon: 'E', name: 'Early Bird', desc: 'Claim before 6am', condition: null },
    crit_master: { id: 'crit_master', icon: 'C', name: 'Critical Master', desc: 'Get 10 critical hits', condition: (s) => s.critCount >= 10 },
    manga_fan: { id: 'manga_fan', icon: 'M', name: 'Manga Fan', desc: 'Read 50 chapters', condition: (s) => s.mangaChapters >= 50 },
    weekly_warrior: { id: 'weekly_warrior', icon: 'W1', name: 'Weekly Warrior', desc: 'Defeat 4 weekly bosses', condition: (s) => s.bossesDefeated >= 4 },
    boss_slayer: { id: 'boss_slayer', icon: 'W2', name: 'Boss Slayer', desc: 'Defeat 12 weekly bosses', condition: (s) => s.bossesDefeated >= 12 },
    dedicated: { id: 'dedicated', icon: 'D', name: 'Dedicated', desc: 'Log 4+ hours in one day', condition: null },
    marathon: { id: 'marathon', icon: 'X', name: 'Marathon', desc: 'Log 8+ hours in one day', condition: null },
};

const defaultSettings = {
    weeklyGoalHours: 21,
    totalGoalHours: 3000,
    ankiWords: 0,
    frontier: 0, // Mining frontier (median frequency rank)
    presets: [24, 24, 45, 60],
    ankiDeck: '',
    ankiField: 'Expression' // Field containing the word
};

let state = {
    weekStart: null,
    weekMinutes: 0,
    totalMinutes: 0,
    mangaChapters: 0,
    log: [],
    lastClaim: null,
    streak: 0,
    maxStreak: 0,
    lastClaimDate: null,
    critCount: 0,
    bossesDefeated: 0,
    bossDefeatedThisWeek: false,
    achievements: [], // Array of unlocked achievement IDs
    // Corruption system
    todayMinutes: 0,
    corruptionLevel: 100,
    lastLogicalDate: null,
    settings: { ...defaultSettings }
};

// ===== DOM ELEMENTS =====
const elements = {
    powerLevel: document.getElementById('powerLevel'),
    streakCount: document.getElementById('streakCount'),
    // Boss HP bar elements
    bossName: document.getElementById('bossName'),
    bossTimer: document.getElementById('bossTimer'),
    hpFill: document.getElementById('hpFill'),
    hpText: document.getElementById('hpText'),
    weekHours: document.getElementById('weekHours'),
    totalHours: document.getElementById('totalHours'),
    mountainProgress: document.getElementById('mountainProgress'),
    rankDisplay: document.getElementById('rankDisplay'),
    forecastDisplay: document.getElementById('forecastDisplay'),
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
    ankiField: document.getElementById('ankiField'),
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

// Get logical date (4 AM boundary - before 4am counts as previous day)
function getLogicalDate(date = new Date()) {
    const d = new Date(date);
    if (d.getHours() < 4) {
        d.setDate(d.getDate() - 1); // Before 4am = still "yesterday"
    }
    d.setHours(4, 0, 0, 0);
    return d.toISOString().split('T')[0];
}

function getWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

function getWeekStart(date) {
    const d = new Date(date);
    // Adjust for 4am boundary
    if (d.getHours() < 4) {
        d.setDate(d.getDate() - 1);
    }
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday as start
    d.setDate(diff);
    d.setHours(4, 0, 0, 0); // Week starts Monday 4am
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

// Get daily target based on weekday/weekend (9-unit split)
// Weekday = 1 unit, Weekend = 2 units (total = 5*1 + 2*2 = 9)
function getDailyTarget(dateStr = null) {
    const weeklyGoal = (state.settings.weeklyGoalHours || 21) * 60; // in minutes

    let dayOfWeek;
    if (dateStr) {
        const date = new Date(dateStr + 'T12:00:00'); // Noon to avoid timezone issues
        dayOfWeek = date.getDay();
    } else {
        // Use current logical date
        const now = new Date();
        const logicalDate = new Date(now);
        if (logicalDate.getHours() < 4) {
            logicalDate.setDate(logicalDate.getDate() - 1);
        }
        dayOfWeek = logicalDate.getDay();
    }

    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    // Total units: 5 weekdays × 1 + 2 weekend days × 2 = 9
    const unitValue = weeklyGoal / 9;
    return isWeekend ? unitValue * 2 : unitValue;
}

// ===== PERSISTENCE =====
function saveState() {
    localStorage.setItem('roninLogger', JSON.stringify(state));
}

// Merge logs: combine local and remote, deduplicate by date+minutes
function mergeLogs(localLog, remoteLog) {
    if (!remoteLog || !Array.isArray(remoteLog)) return localLog || [];
    if (!localLog || !Array.isArray(localLog)) return remoteLog;

    const seen = new Set();
    const merged = [];

    // Combine both logs, local first (priority)
    for (const entry of [...localLog, ...remoteLog]) {
        if (!entry.date) continue;
        const key = `${entry.date}-${entry.minutes}`;
        if (!seen.has(key)) {
            seen.add(key);
            merged.push(entry);
        }
    }

    // Sort by date
    merged.sort((a, b) => new Date(a.date) - new Date(b.date));
    return merged;
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
        // Keep state.log for heatmap and forecast history
        state.bossDefeatedThisWeek = false; // Reset for new week
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

function getPowerLevel() {
    const frontier = state.settings.frontier || 0;
    if (frontier === 0) return 0;
    return frontier; // Return the actual frontier value
}

// Calculate rolling average hours per day from log data (last N days)
function calculateRollingAverage(days = 28) {
    const dailyMinutes = {};
    const today = new Date();

    // Aggregate log entries by date
    for (const entry of state.log) {
        if (!entry.date) continue;
        const date = entry.date.split('T')[0];
        dailyMinutes[date] = (dailyMinutes[date] || 0) + entry.minutes;
    }

    // Sum minutes for the last N days
    let totalMins = 0;
    let daysWithData = 0;

    for (let i = 0; i < days; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        if (dailyMinutes[dateStr]) {
            totalMins += dailyMinutes[dateStr];
            daysWithData++;
        }
    }

    // Return average hours per day (use actual days elapsed, not just days with data)
    return totalMins / 60 / days;
}

// Calculate projected completion date
function getProjectedCompletion() {
    const totalHours = state.totalMinutes / 60;
    const totalGoal = state.settings.totalGoalHours;
    const remainingHours = totalGoal - totalHours;

    if (remainingHours <= 0) {
        return { completed: true, date: null, pace: 0 };
    }

    const avgHoursPerDay = calculateRollingAverage(28);

    if (avgHoursPerDay <= 0.01) {
        return { completed: false, date: null, pace: 0, noData: true };
    }

    const daysRemaining = remainingHours / avgHoursPerDay;
    const projectedDate = new Date();
    projectedDate.setDate(projectedDate.getDate() + Math.ceil(daysRemaining));

    return {
        completed: false,
        date: projectedDate,
        pace: avgHoursPerDay,
        daysRemaining: Math.ceil(daysRemaining)
    };
}

function updateUI() {
    // Power Level (Mining Frontier)
    const frontier = getPowerLevel();
    if (frontier > 0) {
        elements.powerLevel.textContent = `Lv ${frontier.toLocaleString()}`;
    } else {
        elements.powerLevel.textContent = `Lv 0`;
    }

    // Streak
    if (elements.streakCount) {
        elements.streakCount.textContent = state.streak || 0;
    }

    // Manga chapters
    if (elements.mangaCount) {
        elements.mangaCount.textContent = state.mangaChapters || 0;
    }

    // Weekly progress
    const weekHours = state.weekMinutes / 60;
    const weekGoal = state.settings.weeklyGoalHours;
    const isComplete = weekHours >= weekGoal;

    // Week timing
    const now = new Date();
    const today = now.getDay();
    const daysUntilMonday = today === 0 ? 1 : (8 - today) % 7 || 7;
    const nextMonday = new Date(now);
    nextMonday.setDate(now.getDate() + daysUntilMonday);
    nextMonday.setHours(0, 0, 0, 0);
    const hoursLeft = Math.ceil((nextMonday - now) / (1000 * 60 * 60));

    // Boss system
    const boss = getCurrentBoss();
    const maxHP = Math.round(weekGoal * 60); // Max HP = goal in minutes
    const currentHP = Math.max(0, Math.round((weekGoal - weekHours) * 60)); // Remaining HP
    const hpPercent = (currentHP / maxHP) * 100;

    // Apply boss theme to document
    BOSS_THEMES.forEach(t => document.body.classList.remove(t.class));
    document.body.classList.add(boss.class);

    // Update HP bar elements
    if (elements.bossName) {
        elements.bossName.textContent = isComplete ? `${boss.name} DEFEATED` : boss.name;
    }
    if (elements.bossTimer) {
        if (isComplete) {
            elements.bossTimer.textContent = 'Victory!';
        } else if (hoursLeft <= 24) {
            elements.bossTimer.textContent = `${hoursLeft}h left`;
        } else {
            elements.bossTimer.textContent = `${daysUntilMonday}d left`;
        }
    }
    if (elements.hpFill) {
        elements.hpFill.style.width = `${hpPercent}%`;
        elements.hpFill.classList.toggle('defeated', isComplete);
    }
    if (elements.hpText) {
        elements.hpText.textContent = `${currentHP} / ${maxHP} HP`;
    }
    if (elements.weekHours) {
        elements.weekHours.textContent = `${minutesToHours(state.weekMinutes)}h logged`;
    }

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

    // Fluency Forecast
    if (elements.forecastDisplay) {
        const forecast = getProjectedCompletion();
        if (forecast.completed) {
            elements.forecastDisplay.textContent = 'Goal reached!';
            elements.forecastDisplay.classList.add('complete');
        } else if (forecast.noData) {
            elements.forecastDisplay.textContent = 'Log more to see forecast';
        } else {
            const dateStr = forecast.date.toLocaleDateString(undefined, {
                month: 'short',
                year: 'numeric'
            });
            const paceStr = forecast.pace.toFixed(1);
            elements.forecastDisplay.textContent = `${dateStr} @ ${paceStr}h/day`;

            // Highlight if on track for 2-year goal (730 days from start)
            // For now just show the date
        }
    }

    // Heatmap
    renderHeatmap();

    // Achievements
    renderAchievements();

    // Log
    renderLog();
}

// ===== CORRUPTION SYSTEM =====

// Recalculate today's minutes from log entries
function recalculateTodayMinutes(logicalDate) {
    return state.log
        .filter(entry => {
            if (!entry.date) return false;
            return getLogicalDate(new Date(entry.date)) === logicalDate;
        })
        .reduce((sum, entry) => sum + entry.minutes, 0);
}

// Update corruption level based on today's progress
function updateCorruption() {
    const today = getLogicalDate();

    // Reset on new logical day (4am boundary)
    if (state.lastLogicalDate !== today) {
        state.todayMinutes = recalculateTodayMinutes(today);
        state.lastLogicalDate = today;
    }

    const target = getDailyTarget();
    const progress = state.todayMinutes / target;

    if (progress >= 1) {
        // Overdrive! Exceeded daily goal
        // Goes from 0 to -50 as you exceed by up to 100%
        state.corruptionLevel = -Math.min(50, (progress - 1) * 50);
    } else {
        state.corruptionLevel = Math.max(0, 100 - (progress * 100));
    }

    applyCorruptionVisuals(state.corruptionLevel);
    saveState();
}

// Apply visual corruption effects
function applyCorruptionVisuals(level) {
    document.body.style.setProperty('--corruption', Math.max(0, level));

    // Remove all corruption/overdrive classes
    document.body.classList.remove(
        'corruption-0', 'corruption-25', 'corruption-50',
        'corruption-75', 'corruption-100', 'overdrive'
    );

    if (level < 0) {
        // Overdrive mode!
        document.body.classList.add('overdrive');
    } else if (level === 0) {
        document.body.classList.add('corruption-0');
    } else if (level <= 25) {
        document.body.classList.add('corruption-25');
    } else if (level <= 50) {
        document.body.classList.add('corruption-50');
    } else if (level <= 75) {
        document.body.classList.add('corruption-75');
    } else {
        document.body.classList.add('corruption-100');
    }
}

// Trigger purification shockwave animation
function triggerPurification(button) {
    if (!button) return;

    const rect = button.getBoundingClientRect();
    const wave = document.createElement('div');
    wave.className = 'purify-shockwave';
    wave.style.left = rect.left + rect.width / 2 + 'px';
    wave.style.top = rect.top + rect.height / 2 + 'px';
    document.body.appendChild(wave);

    setTimeout(() => wave.remove(), 500);
}

// ===== HEATMAP =====

// Get heatmap level based on percentage of daily target (retroactive weekday/weekend aware)
function getHeatmapLevel(mins, dateStr) {
    if (mins === 0) return 0;

    const dailyTarget = getDailyTarget(dateStr);
    const ratio = mins / dailyTarget;

    if (ratio >= 1.5) return 5;  // 150%+ = gold (overdrive)
    if (ratio >= 1.0) return 4;  // 100%+ = full target
    if (ratio >= 0.75) return 3; // 75%+
    if (ratio >= 0.5) return 2;  // 50%+
    return 1;                    // Any activity
}

function renderHeatmap() {
    const container = document.getElementById('heatmapContainer');
    if (!container) return;

    // Aggregate log entries by date
    const dailyMinutes = {};
    for (const entry of state.log) {
        if (!entry.date) continue; // Skip legacy entries
        const date = entry.date.split('T')[0]; // YYYY-MM-DD
        dailyMinutes[date] = (dailyMinutes[date] || 0) + entry.minutes;
    }

    // Generate last 84 days (12 weeks)
    try {
        const today = new Date();
        const cells = [];

        for (let i = 83; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            const mins = dailyMinutes[dateStr] || 0;

            // Calculate color level dynamically based on daily target
            const level = getHeatmapLevel(mins, dateStr);

            cells.push({ date: dateStr, mins, level });
        }

        // Render cells
        container.innerHTML = cells.map(c => {
            const hours = Math.floor(c.mins / 60);
            const minutes = c.mins % 60;
            const target = getDailyTarget(c.date);
            const targetHours = Math.floor(target / 60);
            const targetMins = Math.round(target % 60);
            const targetStr = targetHours > 0 ? `${targetHours}h${targetMins}m` : `${targetMins}m`;
            const timeStr = c.mins === 0 ? 'No activity' :
                (hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`);
            return `<div class="heatmap-cell" data-level="${c.level}"
                title="${c.date}: ${timeStr} / ${targetStr} target"></div>`;
        }).join('');
    } catch (e) {
        console.error('Heatmap render error:', e);
        // Fallback or ignore
    }
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

    // Decrement critCount if this was a critical claim
    if (entry.isCritical && state.critCount > 0) {
        state.critCount--;
    }

    // Subtract bonusDamage from weekMinutes (or minutes for old entries)
    const weekDamage = entry.bonusDamage || entry.minutes;
    state.weekMinutes = Math.max(0, state.weekMinutes - weekDamage);
    state.totalMinutes = Math.max(0, state.totalMinutes - entry.minutes);
    state.log.splice(idx, 1);

    saveState();
    updateUI();
    updateCorruption(); // Recalculate todayMinutes from log
}

// ===== ACHIEVEMENT LOGIC =====
function unlockAchievement(achievementId) {
    if (!state.achievements) state.achievements = [];
    if (state.achievements.includes(achievementId)) return false;

    state.achievements.push(achievementId);
    saveState();

    const achievement = ACHIEVEMENTS[achievementId];
    if (achievement) {
        showAchievementPopup(achievement);
    }
    renderAchievements();
    return true;
}

function showAchievementPopup(achievement) {
    const popup = document.createElement('div');
    popup.className = 'achievement-popup';
    popup.innerHTML = `
        <div class="achievement-popup-icon">${achievement.icon}</div>
        <div class="achievement-popup-content">
            <div class="achievement-popup-title">Achievement Unlocked!</div>
            <div class="achievement-popup-name">${achievement.name}</div>
            <div class="achievement-popup-desc">${achievement.desc}</div>
        </div>
    `;
    document.body.appendChild(popup);

    // Trigger animation
    requestAnimationFrame(() => popup.classList.add('show'));

    // Remove after animation
    setTimeout(() => {
        popup.classList.remove('show');
        setTimeout(() => popup.remove(), 300);
    }, 3000);

    // Play sound if available
    playClaimSound();
}

function checkAchievements(context = {}) {
    if (!state.achievements) state.achievements = [];

    // Update maxStreak
    if (state.streak > (state.maxStreak || 0)) {
        state.maxStreak = state.streak;
    }

    // Check all condition-based achievements
    for (const [id, achievement] of Object.entries(ACHIEVEMENTS)) {
        if (state.achievements.includes(id)) continue;
        if (achievement.condition && achievement.condition(state)) {
            unlockAchievement(id);
        }
    }

    // Check time-based achievements (manual)
    if (context.claimTime) {
        const hour = context.claimTime.getHours();
        if (hour >= 0 && hour < 6) {
            if (hour >= 0 && hour < 5) {
                unlockAchievement('night_owl');
            }
            if (hour >= 4 && hour < 6) {
                unlockAchievement('early_bird');
            }
        }
    }

    // Check daily total for dedicated/marathon
    if (context.dailyTotal) {
        if (context.dailyTotal >= 240) { // 4 hours
            unlockAchievement('dedicated');
        }
        if (context.dailyTotal >= 480) { // 8 hours
            unlockAchievement('marathon');
        }
    }
}

function getDailyTotal(dateStr) {
    let total = 0;
    for (const entry of state.log) {
        if (entry.date && entry.date.split('T')[0] === dateStr) {
            total += entry.minutes;
        }
    }
    return total;
}

function renderAchievements() {
    const container = document.getElementById('achievementsGrid');
    if (!container) return;

    const unlockedCount = (state.achievements || []).length;
    const totalCount = Object.keys(ACHIEVEMENTS).length;

    // Update counter
    const counter = document.getElementById('achievementsCount');
    if (counter) {
        counter.textContent = `${unlockedCount}/${totalCount}`;
    }

    // Render grid
    container.innerHTML = Object.values(ACHIEVEMENTS).map(ach => {
        const unlocked = (state.achievements || []).includes(ach.id);
        return `
            <div class="achievement-badge ${unlocked ? 'unlocked' : 'locked'}"
                 title="${ach.name}: ${ach.desc}">
                <span class="achievement-icon">${ach.icon}</span>
            </div>
        `;
    }).join('');
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

    // Critical claim check (15% chance on claims >= 20 minutes)
    const isCritical = minutes >= 20 && Math.random() < CRITICAL_CHANCE;
    const critMultiplier = isCritical ? (1.5 + Math.random()) : 1; // 1.5x to 2.5x on crit
    const bonusDamage = Math.round(minutes * critMultiplier);

    // Update state
    // weekMinutes gets bonus damage (for boss HP), totalMinutes stays accurate
    state.weekMinutes += bonusDamage;
    state.totalMinutes += minutes;
    state.log.push({
        time: `${formatDate(now)} ${formatTime(now)}`,
        date: now.toISOString(),
        minutes: minutes,
        bonusDamage: bonusDamage,
        isCritical: isCritical
    });

    // Update corruption system
    const oldCorruption = state.corruptionLevel;
    state.todayMinutes += minutes;
    updateCorruption();
    const purified = state.corruptionLevel < oldCorruption;

    // Keep entries for 12 weeks of heatmap/forecast history
    if (state.log.length > 500) {
        state.log = state.log.slice(-500);
    }

    saveState();
    updateUI();

    // Auto-sync to cloud if configured
    autoSync();

    // Track crit count for achievements
    if (isCritical) {
        state.critCount = (state.critCount || 0) + 1;
        saveState();
    }

    // Check if boss was just defeated (weekly goal reached)
    const weekGoalMinutes = state.settings.weeklyGoalHours * 60;
    const wasDefeated = (state.weekMinutes - bonusDamage) < weekGoalMinutes && state.weekMinutes >= weekGoalMinutes;
    if (wasDefeated && !state.bossDefeatedThisWeek) {
        state.bossesDefeated = (state.bossesDefeated || 0) + 1;
        state.bossDefeatedThisWeek = true;
        saveState();
    }

    // Check achievements
    const dailyTotal = getDailyTotal(today);
    checkAchievements({
        claimTime: now,
        dailyTotal: dailyTotal
    });

    // Feedback
    if (isCritical) {
        playCriticalFeedback(bonusDamage);
    } else {
        playClaimSound();
        triggerHaptic();
        flashClaimButton();
    }

    // Purification effect if corruption decreased
    if (purified) {
        triggerPurification(elements.claimBtn);
    }

    return true;
}

// Critical claim feedback
function playCriticalFeedback(damage) {
    // Screen flash
    const flash = document.createElement('div');
    flash.className = 'critical-flash';
    document.body.appendChild(flash);
    setTimeout(() => flash.remove(), 500);

    // Damage number popup
    const popup = document.createElement('div');
    popup.className = 'critical-damage';
    popup.innerHTML = `⚡ CRITICAL! -${damage} HP`;
    document.body.appendChild(popup);
    setTimeout(() => popup.remove(), 1500);

    // Enhanced haptic
    if ('vibrate' in navigator) {
        navigator.vibrate([100, 50, 100, 50, 150]);
    }

    // Sound (using existing sound but could be different)
    playClaimSound();

    // Button glow effect
    elements.claimBtn.classList.add('critical');
    setTimeout(() => elements.claimBtn.classList.remove('critical'), 800);
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
    if (!value || value <= 0) {
        // Visual feedback: shake the input to indicate it needs a value
        elements.minutesInput.classList.add('shake');
        setTimeout(() => elements.minutesInput.classList.remove('shake'), 400);
        elements.minutesInput.focus();
        return;
    }
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

    // Load Anki deck and field
    if (elements.ankiDeck) elements.ankiDeck.value = state.settings.ankiDeck || '';
    if (elements.ankiField) elements.ankiField.value = state.settings.ankiField || 'Expression';

    // Lock body scroll
    document.body.classList.add('modal-open');
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

    // Save Anki deck and field
    if (elements.ankiDeck) {
        state.settings.ankiDeck = elements.ankiDeck.value || '';
    }
    if (elements.ankiField) {
        state.settings.ankiField = elements.ankiField.value || 'Expression';
    }

    saveState();
    updateUI();

    // Unlock body scroll
    document.body.classList.remove('modal-open');
    elements.settingsModal.classList.remove('active');
}

// Update preset button values based on settings
function updatePresetButtons() {
    const presets = state.settings.presets || [24, 24, 45, 60];
    const labels = ['anime', 'manga', 'podcast', '1h'];
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
// Load frequency map on startup
async function loadFreqMap() {
    try {
        const response = await fetch('./freq_map.json');
        freqMap = await response.json();
        console.log(`Loaded frequency map with ${Object.keys(freqMap).length} words`);
    } catch (e) {
        console.warn('Could not load freq_map.json:', e);
        freqMap = {};
    }
}

// Calculate median of an array
function calculateMedian(arr) {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : Math.floor((sorted[mid - 1] + sorted[mid]) / 2);
}

async function syncAnkiConnect() {
    // Save current input values before syncing
    if (elements.ankiDeck) {
        state.settings.ankiDeck = elements.ankiDeck.value || '';
    }
    if (elements.ankiField) {
        state.settings.ankiField = elements.ankiField.value || 'Expression';
    }
    saveState();

    const deckName = state.settings.ankiDeck || '';
    const fieldName = state.settings.ankiField || 'Expression';

    if (!deckName) {
        alert('Please enter a deck name first');
        return;
    }

    const btn = elements.syncAnkiBtn;
    btn.classList.add('loading');
    btn.textContent = '🔄';

    try {
        // Step 1: Find mature card IDs
        const findResponse = await fetch('http://127.0.0.1:8765', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'findCards',
                version: 6,
                params: { query: `deck:"${deckName}" prop:ivl>=21` }
            })
        });
        const findResult = await findResponse.json();
        if (findResult.error) throw new Error(findResult.error);

        const cardIds = findResult.result || [];
        const matureCount = cardIds.length;

        // Update card count display
        state.settings.ankiWords = matureCount;
        elements.ankiWords.textContent = matureCount;

        // Step 2: Get card info (fields) - batch in chunks to avoid timeout
        let allRanks = [];
        const chunkSize = 500;

        for (let i = 0; i < cardIds.length; i += chunkSize) {
            const chunk = cardIds.slice(i, i + chunkSize);

            const infoResponse = await fetch('http://127.0.0.1:8765', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'cardsInfo',
                    version: 6,
                    params: { cards: chunk }
                })
            });
            const infoResult = await infoResponse.json();
            if (infoResult.error) throw new Error(infoResult.error);

            // Extract words and look up ranks
            const commonFields = ['Word', 'Expression', 'Vocabulary', 'Front', '単語', 'VocabKanji'];

            for (const card of (infoResult.result || [])) {
                const fields = card.fields || {};

                // Try specified field first, then common ones
                let fieldData = fields[fieldName];
                if (!fieldData) {
                    for (const cf of commonFields) {
                        if (fields[cf]) {
                            fieldData = fields[cf];
                            break;
                        }
                    }
                }

                if (!fieldData) continue;

                // Get the word (strip HTML if present)
                let word = fieldData.value || '';
                word = word.replace(/<[^>]*>/g, '').trim();

                // Look up in frequency map
                if (freqMap && freqMap[word]) {
                    allRanks.push(freqMap[word]);
                }
            }
        }

        // Debug output
        console.log(`Sync complete: ${matureCount} cards, ${allRanks.length} matched`);

        // Step 3: Calculate Mining Frontier (median rank)
        const frontier = calculateMedian(allRanks);
        state.settings.frontier = frontier;

        saveState();
        updateUI();

        // Success feedback
        btn.textContent = `✓ Lv ${frontier.toLocaleString()}`;
        setTimeout(() => {
            btn.textContent = '🔄';
            btn.classList.remove('loading');
        }, 2000);

    } catch (error) {
        console.error('AnkiConnect error:', error);
        btn.textContent = '❌';
        setTimeout(() => {
            btn.textContent = '🔄';
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

// ===== SETTINGS AUTO-SAVE ON BLUR =====
// Save settings immediately when inputs lose focus for better UX

function saveSettingsOnBlur() {
    // Save Anki settings
    if (elements.ankiDeck) {
        state.settings.ankiDeck = elements.ankiDeck.value || '';
    }
    if (elements.ankiField) {
        state.settings.ankiField = elements.ankiField.value || 'Expression';
    }

    // Save goals
    if (elements.weeklyGoal) {
        state.settings.weeklyGoalHours = parseInt(elements.weeklyGoal.value, 10) || 21;
    }
    if (elements.totalGoal) {
        state.settings.totalGoalHours = parseInt(elements.totalGoal.value, 10) || 3000;
    }

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

    saveState();
}

// Attach blur listeners to all settings inputs
[elements.ankiDeck, elements.ankiField,
elements.weeklyGoal, elements.totalGoal,
elements.preset1, elements.preset2, elements.preset3, elements.preset4
].forEach(input => {
    if (input) {
        input.addEventListener('blur', saveSettingsOnBlur);
    }
});

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
            // Merge logs instead of overwriting
            const mergedLog = mergeLogs(state.log, data.log);
            state = {
                ...state,
                ...data,
                log: mergedLog,
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
            // Merge logs instead of overwriting
            const mergedLog = mergeLogs(state.log, data.log);
            state = {
                ...state,
                ...data,
                log: mergedLog,
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

// Note: cloudUserId is loaded in the main settingsBtn handler above

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
        // Set persistence to LOCAL so login persists across browser restarts
        await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
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
        // Set persistence to LOCAL so login persists across browser restarts
        await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
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
loadFreqMap(); // Load frequency map for mining frontier
updatePresetButtons();
updateUI();
updateCorruption(); // Initialize corruption visuals
initAutoSync(); // Start real-time sync if user ID exists

// Focus input on load (desktop)
if (window.innerWidth > 600) {
    elements.minutesInput.focus();
}
