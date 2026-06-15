// =====================
//  UTILITIES
// =====================

/**
 * Escape HTML special characters to prevent XSS.
 * Used for ALL user-generated content before rendering.
 */
function escapeHTML(str) {
    if (str === null || str === undefined) return '';
    const div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
}

/** Currency symbol map */
const CURRENCY_SYMBOLS = {
    'USD': '$', 'EUR': '€', 'ILS': '₪', 'GBP': '£', 'JPY': '¥',
    'CHF': '₣', 'AUD': 'A$', 'CAD': 'C$', 'THB': '฿', 'HUF': 'Ft',
    'PLN': 'zł', 'CZK': 'Kč', 'TRY': '₺', 'SEK': 'kr', 'NOK': 'kr', 'DKK': 'kr'
};
function getCurrencySymbol(code) {
    return CURRENCY_SYMBOLS[code] || code;
}
function getTripCurrencySymbol(tripId = null) {
    const tid = tripId || window.currentTripId;
    let code = 'ILS';
    if (tid && window.allTrips) {
        const trip = window.allTrips.find(t => t.id === tid);
        if (trip && trip.budgets_json && trip.budgets_json.currency) {
            code = trip.budgets_json.currency;
        }
    } else if (currentUser && currentUser.default_currency) {
        code = currentUser.default_currency;
    }
    return CURRENCY_SYMBOLS[code] || code;
}

window.getTripCurrencySymbol = getTripCurrencySymbol;

function formatNumber(num) {
    if (num == null) return "0";
    const val = Number(num);
    if (isNaN(val)) return "0";
    if (val >= 1000000) return (val / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (val >= 1000) return (val / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    return Number.isInteger(val) ? val.toString() : val.toFixed(2);
}
window.formatNumber = formatNumber;

// =====================
//  AUTH (Login Page)
// =====================
let authMode = 'login';
let currentUser = null;
let friendsList = [];
let _groupSettings = { is_admin: false, allow_member_delete: true };
let _cachedExpenses = [];

function toggleAuthMode() {
    authMode = authMode === 'login' ? 'signup' : 'login';
    const title = document.getElementById('welcome-title');
    const sub = document.getElementById('welcome-sub');
    const submit = document.getElementById('submit-btn');
    const toggle = document.getElementById('toggle-auth-btn');
    const err = document.getElementById('error-msg');
    const success = document.getElementById('success-msg');
    const phoneGrp = document.getElementById('phone-group');
    const emailGrp = document.getElementById('email-group');
    const forgotLink = document.getElementById('forgot-link-wrapper');
    if (authMode === 'signup') {
        if (title) title.textContent = i18n('signup_title');
        if (sub) sub.textContent = i18n('signup_sub');
        if (submit) submit.textContent = i18n('signup_btn_signup');
        if (toggle) toggle.textContent = i18n('signup_btn_login');
        if (phoneGrp) phoneGrp.style.display = 'block';
        if (emailGrp) emailGrp.style.display = 'block';
        if (forgotLink) forgotLink.style.display = 'none';
    } else {
        if (title) title.textContent = i18n('login_welcome');
        if (sub) sub.textContent = i18n('login_sub');
        if (submit) submit.textContent = i18n('login_btn_login');
        if (toggle) toggle.textContent = i18n('login_btn_signup');
        if (phoneGrp) phoneGrp.style.display = 'none';
        if (emailGrp) emailGrp.style.display = 'none';
        if (forgotLink) forgotLink.style.display = 'block';
    }
    if (err) err.classList.remove('visible');
    if (success) success.classList.remove('visible');
}

async function submitAuth() {
    const username = (document.getElementById('username')?.value || '').trim();
    const password = document.getElementById('password')?.value || '';
    const phone = document.getElementById('phone')?.value || '';
    const email = document.getElementById('email')?.value || '';
    const err = document.getElementById('error-msg');
    const success = document.getElementById('success-msg');
    if (err) err.classList.remove('visible');
    if (success) success.classList.remove('visible');
    if (!username || !password) {
        if (err) { err.textContent = 'יש למלא שם משתמש/אימייל וסיסמה.'; err.classList.add('visible'); }
        return;
    }
    if (authMode === 'signup') {
        if (!phone) {
            if (err) { err.textContent = 'יש למלא מספר טלפון.'; err.classList.add('visible'); }
            return;
        }
        if (!email) {
            if (err) { err.textContent = 'יש למלא כתובת אימייל.'; err.classList.add('visible'); }
            return;
        }
    }

    const endpoint = authMode === 'login' ? '/api/login' : '/api/signup';
    const payload = { username, password };
    if (authMode === 'signup') {
        payload.phone = phone;
        payload.email = email;
    }

    try {
        const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (res.ok && data.success) {
            if (authMode === 'signup') {
                alert(data.message || 'Registration successful! Please check your email to verify.');
                authMode = 'login';
                toggleAuthMode();
            } else {
                window.location.href = '/app';
            }
        } else {
            if (err) { err.textContent = data.error || 'שגיאה בחיבור.'; err.classList.add('visible'); }
        }
    } catch (e) {
        if (err) { err.textContent = 'שגיאת רשת. נסה שוב.'; err.classList.add('visible'); }
    }
}

// =====================
//  FORGOT PASSWORD (Login Page)
// =====================
function showForgotForm() {
    document.getElementById('auth-form').style.display = 'none';
    document.getElementById('forgot-form').style.display = 'block';
    const err = document.getElementById('error-msg');
    const success = document.getElementById('success-msg');
    if (err) err.classList.remove('visible');
    if (success) success.classList.remove('visible');
    const title = document.getElementById('welcome-title');
    const sub = document.getElementById('welcome-sub');
    if (title) title.textContent = i18n('forgot_title');
    if (sub) sub.textContent = i18n('forgot_sub');
}

function hideForgotForm() {
    document.getElementById('auth-form').style.display = 'block';
    document.getElementById('forgot-form').style.display = 'none';
    const err = document.getElementById('error-msg');
    const success = document.getElementById('success-msg');
    if (err) err.classList.remove('visible');
    if (success) success.classList.remove('visible');
    const title = document.getElementById('welcome-title');
    const sub = document.getElementById('welcome-sub');
    if (title) title.textContent = i18n('login_welcome');
    if (sub) sub.textContent = i18n('login_sub');
}

async function submitForgotPassword() {
    const email = (document.getElementById('forgot-email')?.value || '').trim();
    const err = document.getElementById('error-msg');
    const success = document.getElementById('success-msg');
    if (err) err.classList.remove('visible');
    if (success) success.classList.remove('visible');

    if (!email) {
        if (err) { err.textContent = 'יש למלא כתובת אימייל.'; err.classList.add('visible'); }
        return;
    }

    try {
        const res = await fetch('/api/forgot-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        const data = await res.json();
        if (res.ok && data.success) {
            if (success) { success.textContent = data.message || 'קישור לאיפוס נשלח!'; success.classList.add('visible'); }
        } else {
            if (err) { err.textContent = data.error || 'שגיאה.'; err.classList.add('visible'); }
        }
    } catch (e) {
        if (err) { err.textContent = 'שגיאת רשת. נסה שוב.'; err.classList.add('visible'); }
    }
}

// =====================
//  APP INIT
// =====================
let currentTripId = null;
let currentTripData = null;
let allTrips = [];
let tripMembers = [];

document.addEventListener('DOMContentLoaded', () => {
    // Login page: Enter key
    const pwd = document.getElementById('password');
    if (pwd) pwd.addEventListener('keypress', e => { if (e.key === 'Enter') submitAuth(); });

    // Check for verification success
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('verified') === 'true') {
        setTimeout(() => showToast('החשבון אומת בהצלחה! התחבר כדי להמשיך.', 'success'), 500);
        window.history.replaceState({}, document.title, "/");
    }

    // Global toast utility
    window.showToast = function(message, type = 'info') {
        const toastEl = document.getElementById('toast');
        if (!toastEl) return;
        // Clear any existing timeout
        if (window._toastTimer) clearTimeout(window._toastTimer);
        // Reset classes & set content
        toastEl.className = 'toast';
        toastEl.textContent = message;
        // Force reflow to restart animation
        void toastEl.offsetWidth;
        toastEl.classList.add(type, 'show');
        window._toastTimer = setTimeout(() => {
            toastEl.classList.remove('show');
        }, 3200);
    };

    if (document.getElementById('screen-lobby') || document.querySelector('.profile-container')) {
        initApp();
    }

    // Friend input: Enter key
    const fi = document.getElementById('friend-input');
    if (fi) fi.addEventListener('keypress', e => { if (e.key === 'Enter') { e.preventDefault(); addFriend(); } });

    // Edit friend input: Enter key
    const efi = document.getElementById('edit-friend-input');
    if (efi) efi.addEventListener('keypress', e => { if (e.key === 'Enter') { e.preventDefault(); addEditFriend(); } });
});

async function initApp() {
    setTimeout(() => { const s = document.getElementById('screen-loading'); if(s) s.style.display='none'; }, 1500);
    if (typeof window.applyGlobalTranslations === 'function') window.applyGlobalTranslations();
    try {
        const res = await fetch('/api/me');
        if (!res.ok) { window.location.href = '/'; return; }
        currentUser = await res.json();
        const el = document.getElementById('user-name-display');
        if (el) el.textContent = currentUser.name;
        
        // Fetch AI Greeting
        const aiGreetingEl = document.getElementById('ai-greeting-display');
        if (aiGreetingEl) {
            aiGreetingEl.textContent = "✨ ...";
            aiGreetingEl.style.display = 'block';
            const savedLang = localStorage.getItem('lang') || document.documentElement.lang || 'he';
            fetch('/api/ai_greeting?lang=' + savedLang)
                .then(r => r.json())
                .then(data => {
                    if (data.greeting) {
                        aiGreetingEl.textContent = "✨ " + data.greeting;
                        aiGreetingEl.title = data.greeting;
                    } else {
                        aiGreetingEl.style.display = 'none';
                    }
                })
                .catch(() => { aiGreetingEl.style.display = 'none'; });
        }
        
        const emailEl = document.getElementById('profile-email-display');
        if (emailEl) emailEl.textContent = currentUser.email || '';
        
        // Unconditionally load lobby and fetch invitations since React DOM might not exist yet
        await loadLobby();
        
        // Handle Post-Login Deep Linking Join
        const pendingJoinId = localStorage.getItem('pending_join_trip_id');
        const hashMatch = window.location.hash.match(/#join=([^&]+)/);
        const joinToken = pendingJoinId || (hashMatch ? hashMatch[1] : null);
        
        if (joinToken) {
            if (window.showToast) {
                window.showToast(typeof i18n === 'function' && i18n("joining_group") ? i18n("joining_group") : "Joining group...", "info");
            } else {
                console.log("Joining...");
            }
            try {
                const joinRes = await fetch(`/api/join/${joinToken}`, { method: 'POST' });
                const joinData = await joinRes.json();
                if (joinData.success) {
                    localStorage.removeItem('pending_join_trip_id');
                    window.location.hash = '';
                    if (window.showToast) {
                        window.showToast(typeof i18n === 'function' && i18n("toast_trip_created") ? 'Joined group successfully!' : 'Joined group successfully!', 'success');
                    } else {
                        alert('Joined group successfully!');
                    }
                    await loadLobby();
                } else {
                    if (window.showToast) {
                        window.showToast(joinData.error || 'Failed to join group.', 'error');
                    } else {
                        alert(joinData.error || 'Failed to join group.');
                    }
                }
            } catch (err) {
                console.error('Join error', err);
            }
        }
        fetchInvitations();

    } catch (e) {
        console.error('Init error:', e);
        window.location.href = '/';
    } finally {
        const spinner = document.getElementById('screen-loading');
        if (spinner) {
            spinner.style.display = 'none';
            spinner.classList.remove('active');
        }
    }
}

// =====================
//  INVITATIONS
// =====================
async function fetchInvitations() {
    const banner = document.getElementById('invitations-banner');
    if (!banner) return;
    try {
        const res = await fetch('/api/invitations');
        if (!res.ok) return;
        const invs = await res.json();
        if (invs.length === 0) {
            banner.innerHTML = '';
            return;
        }

        banner.innerHTML = invs.map(inv => `
            <div class="invitation-card" id="invitation-${inv.id}">
                <div class="invitation-text">
                    <strong>${escapeHTML(inv.inviter_name)}</strong> הזמין אותך להצטרף לטיול <strong>${escapeHTML(inv.trip_name)}</strong>
                </div>
                <div class="invitation-actions">
                    <button class="btn-accept" onclick="respondInvitation(${inv.id}, 'approve')">אישור</button>
                    <button class="btn-decline" onclick="respondInvitation(${inv.id}, 'reject')">דחייה</button>
                </div>
            </div>
        `).join('');
    } catch (e) { console.error('Fetch invitations error:', e); }
}

async function respondInvitation(id, action) {
    try {
        const res = await fetch(`/api/invitations/${id}/respond`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action })
        });
        const data = await res.json();
        if (res.ok && data.success) {
            showToast(action === 'approve' ? 'הצטרפת לטיול בהצלחה!' : 'ההזמנה נדחתה.');
            fetchInvitations();
            loadLobby();
        } else {
            alert(data.error || 'שגיאה בתגובה להזמנה.');
        }
    } catch (e) {
        console.error('Respond invitation error:', e);
    }
}

// =====================
//  LOBBY
// =====================
let hasAutoOpenedTrip = false;

async function loadLobby() {
    showView('lobby');
    try {
        const res = await fetch('/api/trips');
        if (res.status === 401) { window.location.href = '/'; return; }
        allTrips = await res.json();
        window.allTrips = allTrips;

        // Auto-open the most recent trip on first load
        if (!hasAutoOpenedTrip && allTrips.length > 0) {
            hasAutoOpenedTrip = true;
            openTrip(allTrips[0].id);
            return;
        }

        showView('lobby');
        renderTripsList(allTrips);
    } catch (e) { 
        console.error('Load lobby error:', e); 
        showView('lobby');
    } finally {
        const spinner = document.getElementById('screen-loading');
        if (spinner) {
            spinner.style.display = 'none';
            spinner.classList.remove('active');
        }
    }
}

function showView(view) {
    const screens = document.querySelectorAll('.screen');
    screens.forEach(s => s.classList.remove('active'));

    const bottomNav = document.querySelector('.bottom-nav');
    const aiFab = document.getElementById('ai-fab');

    if (view === 'lobby') {
        const lobbyScreen = document.getElementById('screen-lobby');
        if (lobbyScreen) lobbyScreen.classList.add('active');
        if (bottomNav) bottomNav.style.display = 'none';
        if (aiFab) aiFab.style.display = 'none';
    } else if (view === 'loading') {
        const loadingScreen = document.getElementById('screen-loading');
        if (loadingScreen) loadingScreen.classList.add('active');
        if (bottomNav) bottomNav.style.display = 'none';
        if (aiFab) aiFab.style.display = 'none';
    } else {
        // 'dashboard'
        const homeScreen = document.getElementById('screen-home');
        if (homeScreen) homeScreen.classList.add('active');
        if (bottomNav) bottomNav.style.display = 'flex';
        if (aiFab) aiFab.style.display = '';
    }
    if (typeof window.applyGlobalTranslations === 'function') {
        window.applyGlobalTranslations();
    }
}

function renderTripsList(tripsArray) {
    const tripsToRender = tripsArray || (typeof allTrips !== 'undefined' ? allTrips : []) || currentUser?.trips || [];
    if (window.reactUpdateTrips) {
        window.reactUpdateTrips(tripsToRender);
    } else {
        console.warn("React GroupsScreen not yet mounted.");
    }
}

async function openTrip(tripId) {
    currentTripId = tripId;
    currentTripData = allTrips.find(t => t.id === tripId) || null;
    if (currentTripData) {
        const nameLabel = document.getElementById('trip-name-label');
        const titleEl = document.getElementById('dashboard-trip-title');
        if (nameLabel) nameLabel.textContent = currentTripData.name;
        if (titleEl) {
            const firstWord = escapeHTML(currentTripData.name.split(' ')[0]);
            titleEl.innerHTML = `<span class="purple-text">${firstWord}</span>`;
        }
    }
    showView('dashboard');
    switchTab('home');
    await fetchTripMembers();
    await fetchGroupSettings();
    fetchExpenses();
    fetchBalances();

    // Show Activity & Stats hamburger items when inside a group
    const actBtn = document.getElementById('menu-activity-btn');
    const stBtn = document.getElementById('menu-stats-btn');
    if (actBtn) actBtn.style.display = '';
    if (stBtn) stBtn.style.display = '';
}

function goToLobby() {
    closeHamburgerMenu();
    loadLobby();
}

function showLobby() {
    // Hide group-specific hamburger items
    const actBtn = document.getElementById('menu-activity-btn');
    const stBtn = document.getElementById('menu-stats-btn');
    if (actBtn) actBtn.style.display = 'none';
    if (stBtn) stBtn.style.display = 'none';
    loadLobby();
}

// =====================
//  CREATE TRIP MODAL
// =====================
function openCreateTripModal() {
    friendsList = [];
    renderFriendsChips();
    const nameInput = document.getElementById('trip-name');
    const budgetInput = document.getElementById('trip-budget');
    const budgetType = document.getElementById('trip-budget-type');
    const budgetPerUser = document.getElementById('trip-budget-per-user');
    if (nameInput) nameInput.value = '';
    if (budgetInput) budgetInput.value = '';
    if (budgetType) budgetType.value = 'none';
    if (budgetPerUser) budgetPerUser.checked = false;
    // Reset invite tab inputs
    ['create-wa-phone', 'create-email-name', 'create-email-addr', 'create-guest-name'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    toggleBudgetFields('create');
    switchInviteTab('whatsapp', 'create');
    if (typeof window.reactOpenCreateModal === 'function') {
        window.reactOpenCreateModal();
    }
    
    if (typeof window.applyGlobalTranslations === 'function') {
        window.applyGlobalTranslations();
    }
}

function closeCreateTripModal() {
    if (typeof window.reactCloseCreateModal === 'function') {
        window.reactCloseCreateModal();
    }
}

async function addFriend() {
    const input = document.getElementById('friend-input');
    const contact = input?.value.trim();
    if (!contact) return;
    // Prevent duplicates
    if (friendsList.some(f => (f.contact || f.name || f) === contact)) { input.value = ''; return; }
    // Add as checking first
    friendsList.push({ contact: contact, name: contact, type: 'registered', status: 'checking' });
    input.value = '';
    renderFriendsChips();
    // Check user existence
    try {
        const res = await fetch('/api/users/check', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contact: contact })
        });
        const data = await res.json();
        const entry = friendsList.find(f => f.contact === contact);
        if (entry) {
            if (data.exists) {
                entry.status = 'valid';
                entry.resolvedName = data.name;
            } else {
                entry.status = 'unregistered';
                entry.type = 'unregistered';
            }
        }
    } catch (e) {
        const entry = friendsList.find(f => f.contact === contact);
        if (entry) { entry.status = 'unregistered'; entry.type = 'unregistered'; }
    }
    renderFriendsChips();
}

function addGuestFriend() {
    const guestName = prompt('\u05e9\u05dd \u05d4\u05de\u05e9\u05ea\u05de\u05e9 \u05d4\u05d0\u05d5\u05e8\u05d7:');
    if (!guestName || !guestName.trim()) return;
    const name = guestName.trim();
    if (friendsList.some(f => (f.name || f) === name)) return;
    friendsList.push({ name: name, type: 'guest', status: 'guest' });
    renderFriendsChips();
}

function removeFriend(idx) {
    if (!window.confirm(typeof i18n === 'function' && i18n("confirm_delete_member") ? i18n("confirm_delete_member") : "Are you sure you want to remove this member?")) return;
    friendsList.splice(idx, 1);
    renderFriendsChips();
}

function _buildWhatsAppUrl(phone) {
    const cleanPhone = phone.replace(/[\s\-\(\)]/g, '').replace(/^0/, '972');
    const appUrl = window.location.origin;
    const msg = encodeURIComponent(`\u05d1\u05d5\u05d0 \u05e0\u05ea\u05d7\u05e9\u05d1\u05df \u05d1-MasterSplitter! \u05dc\u05d4\u05e6\u05d8\u05e8\u05e4\u05d5\u05ea: ${appUrl}`);
    return `https://wa.me/${cleanPhone}?text=${msg}`;
}

const _whatsappSvg = `<svg viewBox="0 0 24 24" width="14" height="14" fill="#25D366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>`;

function getBudgetInputsHtml(mode, idx, memberBudgets = {}) {
    const isPerUser = document.getElementById(mode === 'create' ? 'trip-budget-per-user' : 'edit-trip-budget-per-user')?.checked;
    if (!isPerUser) return '';

    let html = '<div class="chip-budgets" style="display:flex; gap:5px; margin-top:5px; width: 100%;" onclick="event.stopPropagation()">';
    
    html += `<input type="number" placeholder="${typeof i18n === 'function' ? i18n('budget_type_daily') : 'Daily'}" style="flex:1; padding:4px; border-radius:4px; border:1px solid var(--border); font-size:12px; background:var(--surface-card); color:var(--text-main);" 
        onchange="updateMemberBudget('${mode}', ${idx}, 'daily', this.value)" value="${memberBudgets.daily || ''}">`;
        
    html += `<input type="number" placeholder="${typeof i18n === 'function' ? i18n('budget_type_monthly') : 'Monthly'}" style="flex:1; padding:4px; border-radius:4px; border:1px solid var(--border); font-size:12px; background:var(--surface-card); color:var(--text-main);" 
        onchange="updateMemberBudget('${mode}', ${idx}, 'monthly', this.value)" value="${memberBudgets.monthly || ''}">`;
        
    html += `<input type="number" placeholder="${typeof i18n === 'function' ? i18n('budget_type_yearly') : 'Yearly'}" style="flex:1; padding:4px; border-radius:4px; border:1px solid var(--border); font-size:12px; background:var(--surface-card); color:var(--text-main);" 
        onchange="updateMemberBudget('${mode}', ${idx}, 'yearly', this.value)" value="${memberBudgets.yearly || ''}">`;

    html += '</div>';
    return html;
}

function updateMemberBudget(mode, idx, type, val) {
    const list = mode === 'create' ? friendsList : editFriendsList;
    if (!list[idx].budgets_json) list[idx].budgets_json = {};
    list[idx].budgets_json[type] = parseFloat(val) || 0;
}

function createParticipantRowHTML(n, idx, mode) {
    const displayName = escapeHTML(n.name || n.resolvedName || n.contact || n);
    const initial = (displayName || '?').charAt(0).toUpperCase();
    
    let statusText = 'חבר';
    let statusColor = '#10b981'; // green
    
    if (n.type === 'guest') {
        statusText = 'אורח';
        statusColor = '#3b82f6'; // blue
    } else if (n.type === 'pending' || n.type === 'unregistered' || n.inviteMethod) {
        if (!n.id) {
            statusText = 'ממתין להצטרפות';
            statusColor = '#9ca3af'; // gray
        }
    }

    const budgetInputs = getBudgetInputsHtml(mode, idx, n.budgets_json);
    const removeFn = mode === 'create' ? `removeFriend(${idx})` : `removeEditFriend(${idx})`;
    
    return `
    <div class="flex items-center justify-between p-3 border-b border-gray-100 dark:border-gray-700 last:border-0 participant-row" style="flex-wrap: wrap;" data-name="${escapeHTML(n.name || n.contact || '')}" data-phone="${escapeHTML(n.contact || '')}">
        <div class="flex items-center justify-between w-full">
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-lg">
                    ${escapeHTML(initial)}
                </div>
                <span class="font-medium text-gray-900 dark:text-white">${escapeHTML(displayName)}</span>
            </div>
            <div class="flex items-center gap-3">
                <span class="px-2.5 py-1 text-xs rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-medium">${statusText}</span>
                <button type="button" onclick="if(confirm('Remove user?')) { ${removeFn}; }" class="text-red-500 hover:text-red-700 dark:text-red-400 p-1">✕</button>
            </div>
        </div>
        ${budgetInputs}
    </div>`;
}

function renderFriendsChips() {
    const container = document.getElementById('friends-chips');
    if (!container) return;
    container.innerHTML = friendsList.map((n, idx) => createParticipantRowHTML(n, idx, 'create')).join('');
}

async function createTrip() {
    const name = document.getElementById('create-trip-name')?.value.trim() || document.getElementById('trip-name')?.value.trim();
    const isBudgetPerUser = document.getElementById('trip-budget-per-user')?.checked || false;
    
    // Collect budgets_json
    const budgets_json = {};
    const dVal = parseFloat(document.getElementById('create-budget-daily-amt')?.value);
    if (dVal > 0) budgets_json.daily = dVal;

    const mVal = parseFloat(document.getElementById('create-budget-monthly-amt')?.value);
    if (mVal > 0) budgets_json.monthly = mVal;

    const yVal = parseFloat(document.getElementById('create-budget-yearly-amt')?.value);
    if (yVal > 0) budgets_json.yearly = yVal;

    const cVal = document.getElementById('create-trip-currency')?.value;
    if (cVal) budgets_json.currency = cVal;

    if (!name) { showToast(typeof i18n === 'function' ? i18n('err_fill_all') : 'אנא מלא את כל השדות', 'error'); return; }

    // Extract participants strictly from the new DOM structure (Method B)
    const participantNodes = document.querySelectorAll('#friends-chips .participant-row');
    const participants = Array.from(participantNodes).map(node => ({
        name: node.getAttribute('data-name'),
        contact: node.getAttribute('data-phone') || node.getAttribute('data-name'),
        type: 'registered',
        budgets_json: {}
    }));
    
    // Attempt to merge budget properties if per user budget is enabled
    if (isBudgetPerUser) {
        participantNodes.forEach((node, idx) => {
            let pBudgets = {};
            const dailyInput = document.getElementById(`create-friend-${idx}-daily`);
            const monthlyInput = document.getElementById(`create-friend-${idx}-monthly`);
            const yearlyInput = document.getElementById(`create-friend-${idx}-yearly`);
            
            if (dailyInput && parseFloat(dailyInput.value) > 0) pBudgets.daily = parseFloat(dailyInput.value);
            if (monthlyInput && parseFloat(monthlyInput.value) > 0) pBudgets.monthly = parseFloat(monthlyInput.value);
            if (yearlyInput && parseFloat(yearlyInput.value) > 0) pBudgets.yearly = parseFloat(yearlyInput.value);
            
            participants[idx].budgets_json = pBudgets;
        });
    }

    try {
        const res = await fetch('/api/trips', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, budgets_json, is_budget_per_user: isBudgetPerUser, participants })
        });
        const data = await res.json();
        if (res.ok && data.success) {
            closeCreateTripModal();
            showToast(typeof i18n === 'function' ? i18n('toast_trip_created') : 'Trip created', 'success');
            
            // Auto-open WhatsApp if a WhatsApp contact was added
            const waContact = friendsList.find(f => f.inviteMethod === 'whatsapp' && f.contact);
            if (waContact && data.invite_token) {
                const phone = waContact.contact;
                const cleanPhone = phone.replace(/\D/g, '');
                const inviteCode = data.invite_token;
                const link = `${window.location.origin}/#join=${inviteCode}`;
                const userName = currentUser ? currentUser.name : '';
                const text = encodeURIComponent(`Hey! ${userName} invited you to join the group '${name}' on MasterSplitter. Click here to join: ${link}`);
                window.open(`https://wa.me/${cleanPhone}?text=${text}`, '_blank');
            }

            await loadLobby();
        } else {
            showToast(data.error || 'Network error', 'error');
        }
    } catch (e) {
        console.error('Create trip error:', e);
        showToast('Network error', 'error');
    }
}

// =====================
//  EDIT TRIP MODAL
// =====================
let editTripId = null;
let editFriendsList = [];

async function openEditTripModal(tripId) {
    editTripId = tripId;
    editFriendsList = [];
    if (typeof window.reactOpenEditModal === 'function') {
        window.reactOpenEditModal(tripId);
    }
    
    // Fetch full trip details including participants and budgets
    try {
        const res = await fetch(`/api/trips/${tripId}`);
        const data = await res.json();
        if (res.ok && data.success) {
            const trip = data.trip;
            if (typeof window.reactSetEditTripDetails === 'function') {
                window.reactSetEditTripDetails(trip);
            }
            const populateEditModal = () => {
                const nameEl = document.getElementById('edit-trip-name');
                if (!nameEl) {
                    setTimeout(populateEditModal, 50);
                    return;
                }
                nameEl.value = trip.name || '';
            // Set per-user toggle
            const bpuEl = document.getElementById('edit-trip-budget-per-user');
            if (bpuEl) bpuEl.checked = !!trip.is_budget_per_user;
            
            // Set checkboxes and global inputs based on budgets_json
            const budgets = trip.budgets_json || {};
            const dailyCb = document.getElementById('edit-budget-daily-cb');
            const monthlyCb = document.getElementById('edit-budget-monthly-cb');
            const yearlyCb = document.getElementById('edit-budget-yearly-cb');
            
            if (dailyCb) dailyCb.checked = budgets.hasOwnProperty('daily');
            if (monthlyCb) monthlyCb.checked = budgets.hasOwnProperty('monthly');
            if (yearlyCb) yearlyCb.checked = budgets.hasOwnProperty('yearly');
            
            const dbAmt = document.getElementById('edit-budget-daily-amt');
            if (dbAmt) dbAmt.value = budgets.daily || '';
            const mbAmt = document.getElementById('edit-budget-monthly-amt');
            if (mbAmt) mbAmt.value = budgets.monthly || '';
            const ybAmt = document.getElementById('edit-budget-yearly-amt');
            if (ybAmt) ybAmt.value = budgets.yearly || '';
            
            const currEl = document.getElementById('edit-trip-currency');
            if (currEl) currEl.value = budgets.currency || 'ILS';
            
            toggleBudgetFields('edit');
            
            // Populate members
            if (trip.participants) {
                editFriendsList = trip.participants.map(p => ({
                    id: p.id,
                    name: p.name,
                    contact: p.contact || p.name,
                    type: p.is_guest ? 'guest' : (p.type || 'registered'),
                    budgets_json: p.budgets_json || {}
                }));
            }
            window.currentEditParticipants = editFriendsList;
            renderEditFriendsChips();
            switchInviteTab('whatsapp', 'edit');
            };
            populateEditModal();
        }
    } catch (e) {
        console.error('Failed to load trip details', e);
        closeEditTripModal();
    }
}

function closeEditTripModal() {
    if (typeof window.reactCloseEditModal === 'function') {
        window.reactCloseEditModal();
    }
    editTripId = null;
    editFriendsList = [];
}

async function addEditFriend() {
    const input = document.getElementById('edit-friend-input');
    const contact = input?.value.trim();
    if (!contact) return;
    if (editFriendsList.some(f => (f.contact || f.name || f) === contact)) { input.value = ''; return; }
    editFriendsList.push({ contact: contact, name: contact, type: 'registered', status: 'checking' });
    input.value = '';
    renderEditFriendsChips();
    try {
        const res = await fetch('/api/users/check', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contact: contact })
        });
        const data = await res.json();
        const entry = editFriendsList.find(f => f.contact === contact);
        if (entry) {
            if (data.exists) {
                entry.status = 'valid';
                entry.resolvedName = data.name;
            } else {
                entry.status = 'unregistered';
                entry.type = 'unregistered';
            }
        }
    } catch (e) {
        const entry = editFriendsList.find(f => f.contact === contact);
        if (entry) { entry.status = 'unregistered'; entry.type = 'unregistered'; }
    }
    renderEditFriendsChips();
}

function addEditGuestFriend() {
    const guestName = prompt('\u05e9\u05dd \u05d4\u05de\u05e9\u05ea\u05de\u05e9 \u05d4\u05d0\u05d5\u05e8\u05d7:');
    if (!guestName || !guestName.trim()) return;
    const name = guestName.trim();
    if (editFriendsList.some(f => (f.name || f) === name)) return;
    editFriendsList.push({ name: name, type: 'guest', status: 'guest' });
    renderEditFriendsChips();
}

function removeEditFriend(idx) {
    if (!window.confirm(typeof i18n === 'function' && i18n("confirm_delete_member") ? i18n("confirm_delete_member") : "Are you sure you want to remove this member?")) return;
    editFriendsList.splice(idx, 1);
    renderEditFriendsChips();
}

function renderEditFriendsChips() {
    const container = document.getElementById('edit-friends-chips');
    if (!container) return;
    container.innerHTML = editFriendsList.map((n, idx) => createParticipantRowHTML(n, idx, 'edit')).join('');
}

async function saveEditTrip() {
    if (!editTripId) return;
    const name = document.getElementById('edit-trip-name')?.value.trim();
    const isBudgetPerUser = document.getElementById('edit-trip-budget-per-user')?.checked || false;

    // Collect budgets_json
    const budgets_json = {};
    const dVal = parseFloat(document.getElementById('edit-budget-daily-amt')?.value);
    if (dVal > 0) budgets_json.daily = dVal;

    const mVal = parseFloat(document.getElementById('edit-budget-monthly-amt')?.value);
    if (mVal > 0) budgets_json.monthly = mVal;

    const yVal = parseFloat(document.getElementById('edit-budget-yearly-amt')?.value);
    if (yVal > 0) budgets_json.yearly = yVal;

    const cVal = document.getElementById('edit-trip-currency')?.value;
    if (cVal) budgets_json.currency = cVal;

    if (!name) { alert(typeof i18n === 'function' ? i18n('err_fill_all') : 'Missing fields'); return; }

    const payload = { name, budgets_json, is_budget_per_user: isBudgetPerUser };
    
    // Extract participants strictly from the new DOM structure (Method B)
    const participantNodes = document.querySelectorAll('#edit-friends-chips .participant-row');
    const participants = Array.from(participantNodes).map(node => ({
        name: node.getAttribute('data-name'),
        contact: node.getAttribute('data-phone') || node.getAttribute('data-name'), // 'phone' is what the user asked for
        type: 'registered',
        budgets_json: {}
    }));
    
    // Attempt to merge budget properties if per user budget is enabled
    if (isBudgetPerUser) {
        participantNodes.forEach((node, idx) => {
            let pBudgets = {};
            const dailyInput = document.getElementById(`edit-friend-${idx}-daily`);
            const monthlyInput = document.getElementById(`edit-friend-${idx}-monthly`);
            const yearlyInput = document.getElementById(`edit-friend-${idx}-yearly`);
            
            if (dailyInput && parseFloat(dailyInput.value) > 0) pBudgets.daily = parseFloat(dailyInput.value);
            if (monthlyInput && parseFloat(monthlyInput.value) > 0) pBudgets.monthly = parseFloat(monthlyInput.value);
            if (yearlyInput && parseFloat(yearlyInput.value) > 0) pBudgets.yearly = parseFloat(yearlyInput.value);
            
            participants[idx].budgets_json = pBudgets;
        });
    }

    payload.participants = participants;

    try {
        const res = await fetch(`/api/trips/${editTripId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (res.ok && data.success) {
            closeEditTripModal();
            showToast(typeof i18n === 'function' ? i18n('toast_trip_updated') : 'Trip updated', 'success');
            await loadLobby();
        } else {
            alert(data.error || 'Network error');
        }
    } catch (e) {
        console.error('Save edit trip error:', e);
        alert('Network error');
    }
}

// ==========================================
// STEP 7 — BUDGET & INVITE HELPERS
// ==========================================

async function pickContact(mode, type) {
    if (!('contacts' in navigator && 'ContactsManager' in window)) {
        showToast(typeof i18n === 'function' ? i18n('contacts_not_supported') || 'Contact picker is not supported on this browser.' : 'Contact picker is not supported on this browser.', 'error');
        return;
    }
    try {
        const props = ['name', 'tel', 'email'];
        const contacts = await navigator.contacts.select(props, { multiple: false });
        if (contacts && contacts.length > 0) {
            const contact = contacts[0];
            const name = contact.name ? contact.name[0] : '';
            const phone = contact.tel ? contact.tel[0].replace(/[\s\-\(\)]/g, '') : '';
            const email = contact.email ? contact.email[0] : '';
            
            if (type === 'wa' && phone) {
                document.getElementById(`${mode}-wa-phone`).value = phone;
                sendWhatsAppInviteFromTab(mode, name);
            } else if (type === 'email') {
                if (name) document.getElementById(`${mode}-email-name`).value = name;
                if (email) document.getElementById(`${mode}-email-addr`).value = email;
                sendEmailInviteFromTab(mode);
            }
        }
    } catch (e) {
        console.error('Contact picker error:', e);
    }
}

function toggleAdvancedBudget(mode) {
    const el = document.getElementById(`${mode}-budget-conditional`);
    if (el) {
        if (window.getComputedStyle(el).display === 'none') {
            el.style.display = 'block';
        } else {
            el.style.display = 'none';
        }
    }
}

function toggleBudgetFields(mode) {
    const isPerUser = document.getElementById(mode === 'create' ? 'trip-budget-per-user' : 'edit-trip-budget-per-user')?.checked;
    
    const globalBlock = document.getElementById(`${mode}-global-budgets`);
    if (globalBlock) {
        if (isPerUser) {
            globalBlock.style.display = 'none';
        } else {
            globalBlock.style.display = 'block';
        }
    }

    if (mode === 'create') {
        renderFriendsChips();
    } else {
        renderEditFriendsChips();
    }
}

function switchInviteTab(tabName, mode) {
    // Update tab buttons
    const buttons = document.querySelectorAll(`#${mode}-trip-modal .invite-tab-btn`);
    buttons.forEach(btn => {
        if (btn.getAttribute('data-tab') === tabName) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    // Update panels
    const panels = document.querySelectorAll(`#${mode}-trip-modal .invite-tab-panel`);
    panels.forEach(panel => {
        if (panel.getAttribute('data-panel') === tabName) {
            panel.classList.add('active');
        } else {
            panel.classList.remove('active');
        }
    });
}

function sendWhatsAppInviteFromTab(mode, providedName = null) {
    const phoneInput = document.getElementById(mode === 'create' ? 'create-wa-phone' : 'edit-wa-phone');
    const phone = phoneInput?.value.trim();
    if (!phone) return;

    const list = mode === 'create' ? friendsList : editFriendsList;
    list.push({
        contact: phone,
        name: providedName || phone,
        type: 'registered',
        inviteMethod: 'whatsapp'
    });
    
    if (mode === 'create') {
        renderFriendsChips();
    } else {
        renderEditFriendsChips();
        if (editTripId) {
            const trip = allTrips.find(t => t.id === editTripId);
            if (trip && trip.invite_token) {
                const cleanPhone = phone.replace(/\D/g, '');
                const link = `${window.location.origin}/#join=${trip.invite_token}`;
                const userName = currentUser ? currentUser.name : '';
                const text = encodeURIComponent(`Hey! ${userName} invited you to join the group '${trip.name}' on MasterSplitter. Click here to join: ${link}`);
                window.open(`https://wa.me/${cleanPhone}?text=${text}`, '_blank');
            }
        }
    }
    
    phoneInput.value = '';
}

async function sendEmailInviteFromTab(mode) {
    const nameInput = document.getElementById(mode === 'create' ? 'create-email-name' : 'edit-email-name');
    const emailInput = document.getElementById(mode === 'create' ? 'create-email-addr' : 'edit-email-addr');
    const name = nameInput?.value.trim();
    const email = emailInput?.value.trim();
    
    if (!name || !email) {
        showToast(i18n('err_fill_all'), 'error');
        return;
    }

    const list = mode === 'create' ? friendsList : editFriendsList;
    list.push({
        contact: email,
        name: name,
        type: 'registered',
        inviteMethod: 'email'
    });
    
    if (mode === 'create') renderFriendsChips();
    else renderEditFriendsChips();
    
    nameInput.value = '';
    emailInput.value = '';
    
    // In edit mode, if trip already exists, we could also directly fire the email invite API here.
    // For now we just queue it to be saved when user hits "Save" (or Create). 
    // Wait, the instructions say "Send Email Invite".
    // If it's an existing trip, let's fire the API now.
    if (mode === 'edit' && editTripId) {
        try {
            const res = await fetch(`/api/trips/${editTripId}/invite-email`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email })
            });
            const data = await res.json();
            if (data.success) {
                showToast(i18n('invite_email_sent'), 'success');
            } else {
                showToast(data.error || 'Failed to send email', 'error');
            }
        } catch(e) {
            console.error('Email invite error', e);
        }
    }
}

function addGuestFromTab(mode) {
    const nameInput = document.getElementById(mode === 'create' ? 'create-guest-name' : 'edit-guest-name');
    const name = nameInput?.value.trim();
    if (!name) return;

    const list = mode === 'create' ? friendsList : editFriendsList;
    list.push({
        name: name,
        type: 'guest',
        inviteMethod: 'guest'
    });
    
    if (mode === 'create') renderFriendsChips();
    else renderEditFriendsChips();
    
    nameInput.value = '';
}

// =====================
//  HAMBURGER MENU
// =====================
window.openHamburgerMenu = function() {
    console.log("Hamburger button clicked");
    document.getElementById('hamburger-menu').classList.add('open');
    document.getElementById('menu-overlay').classList.add('open');
};

window.closeHamburgerMenu = function() {
    document.getElementById('hamburger-menu').classList.remove('open');
    document.getElementById('menu-overlay').classList.remove('open');
};

// =====================
//  DASHBOARD TABS
// =====================
function switchTab(tabName) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const screen = document.getElementById(`screen-${tabName}`);
    if (screen) screen.classList.add('active');
    if (tabName !== 'add') {
        const tab = document.getElementById(`tab-${tabName}`);
        if (tab) tab.classList.add('active');
    }
    if (tabName === 'home' || tabName === 'balances') fetchBalances();
    if (tabName === 'expenses') fetchExpenses();
    if (tabName === 'add') renderParticipants();
}

async function logout() {
    try { await fetch('/api/logout', { method: 'POST' }); } catch (e) { }
    window.location.href = '/';
}

// Global showToast is defined in DOMContentLoaded

// =====================
//  TRIP MEMBERS
// =====================
async function fetchTripMembers() {
    if (!currentTripId) return;
    try {
        const res = await fetch(`/api/trip_members/${currentTripId}`);
        if (res.ok) {
            tripMembers = await res.json();
            renderParticipantAvatars();
        }
    } catch (e) { console.error('Fetch members error:', e); }
}

function renderParticipantAvatars() {
    const container = document.getElementById('trip-avatars');
    const sub = document.getElementById('trip-participants-label');
    if (!container) return;
    const colors = ['bg-yellow', 'bg-purple', 'bg-light'];
    const shown = tripMembers.slice(0, 3);
    const extra = tripMembers.length - 3;
    container.innerHTML = shown.map((m, i) => {
        if (m.avatar_url) {
            return `<img class="avatar avatar-img" src="${escapeHTML(m.avatar_url)}" alt="${escapeHTML(m.name)}" referrerpolicy="no-referrer">`;
        }
        return `<div class="avatar ${colors[i % colors.length]}">${escapeHTML(m.name.charAt(0))}</div>`;
    }).join('');
    if (extra > 0) container.innerHTML += `<div class="avatar bg-light">+${extra}</div>`;
    if (sub) sub.textContent = tripMembers.map(m => m.name).join(', ') || '';
}

// =====================
//  PARTICIPANT PILLS (replaces checkboxes)
// =====================
function renderParticipants() {
    const container = document.getElementById('participants-container');
    if (!container) return;
    container.innerHTML = tripMembers.map(m => {
        const safeName = escapeHTML(m.name);
        const initial = escapeHTML(m.name.charAt(0));
        return `
        <div class="participant-pill selected" data-id="${escapeHTML(String(m.id))}" onclick="togglePill(this)">
            <span class="pill-avatar">${initial}</span>
            <span>${safeName}</span>
            <span class="pill-check">✓</span>
        </div>`;
    }).join('');
}

function togglePill(el) {
    el.classList.toggle('selected');
    if (document.getElementById('split-mode-toggle')?.checked) {
        renderCustomSplits();
    }
}

function getSelectedParticipants() {
    return Array.from(document.querySelectorAll('#participants-container .participant-pill.selected'))
        .map(pill => pill.dataset.id);
}

// =====================
//  EXPENSES
// =====================
// Category key mapping (Hebrew DB value -> i18n translation key)
const CATEGORY_I18N_MAP = {
    'אוכל': 'cat_food',
    'לינה': 'cat_lodging',
    'תחבורה': 'cat_transport',
    'אטרקציות': 'cat_attractions',
    'כללי': 'cat_general'
};

function getCategoryIcon(cat) {
    const icons = { 'אוכל': '\uD83C\uDF55', 'לינה': '\uD83D\uDECF\uFE0F', 'תחבורה': '\uD83D\uDE95', 'אטרקציות': '\uD83C\uDF9F\uFE0F', 'כללי': '\uD83D\uDCA1' };
    return icons[cat] || '\uD83D\uDCB3';
}

function translateCategory(cat) {
    const key = CATEGORY_I18N_MAP[cat];
    if (key && typeof i18n === 'function') {
        const translated = i18n(key);
        if (translated !== key) return translated;
    }
    return cat || 'כללי';
}

// =====================
//  AI SMART EXPENSE PARSER
// =====================
function openAiModal() {
    const modal = document.getElementById('ai-magic-modal');
    if (modal) {
        modal.style.display = 'flex';
        const ta = document.getElementById('ai-expense-text');
        if (ta) { ta.value = ''; ta.focus(); }
        const errMsg = document.getElementById('ai-error-msg');
        if (errMsg) errMsg.style.display = 'none';
    }
}

function closeAiModal() {
    const modal = document.getElementById('ai-magic-modal');
    if (modal) modal.style.display = 'none';
}

function startVoiceRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        alert(typeof i18n === 'function' ? i18n('voice_not_supported') : 'זיהוי קול לא נתמך בדפדפן זה.');
        return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = document.documentElement.lang === 'he' ? 'he-IL' : 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    const btn = document.getElementById('voiceAddBtn');
    const indicator = document.getElementById('voice-indicator');
    const textArea = document.getElementById('ai-expense-text');

    recognition.onstart = () => {
        if (btn) btn.style.background = 'rgba(168, 85, 247, 0.2)';
        if (indicator) indicator.style.display = 'block';
    };

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        if (textArea) {
            textArea.value = transcript;
            aiParseExpense();
        }
    };

    recognition.onerror = (event) => {
        console.error('Speech recognition error', event.error);
        if (indicator) indicator.style.display = 'none';
        if (btn) btn.style.background = 'var(--card-bg)';
    };

    recognition.onend = () => {
        if (indicator) indicator.style.display = 'none';
        if (btn) btn.style.background = 'var(--card-bg)';
    };

    recognition.start();
}

async function aiParseExpense() {
    const textArea = document.getElementById('ai-expense-text');
    const text = textArea?.value.trim();
    if (!text) return;

    const analyzeBtn = document.getElementById('ai-analyze-btn');
    const btnText = analyzeBtn?.querySelector('.ai-analyze-text');
    const spinner = analyzeBtn?.querySelector('.ai-spinner');
    const errMsg = document.getElementById('ai-error-msg');

    // Show loading state
    if (btnText) btnText.style.display = 'none';
    if (spinner) spinner.style.display = 'inline-block';
    if (analyzeBtn) analyzeBtn.disabled = true;
    if (errMsg) errMsg.style.display = 'none';

    // Gather member names
    const memberNames = tripMembers
        .filter(m => m.type !== 'local')
        .map(m => m.name);

    try {
        const res = await fetch('/api/ai/parse-expense', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, trip_members: memberNames })
        });

        const data = await res.json();

        if (!res.ok || !data.success) {
            throw new Error(data.error || 'AI parsing failed.');
        }

        const parsed = data.parsed;

        // Auto-fill Description
        if (parsed.description) {
            const descInput = document.getElementById('desc');
            if (descInput) descInput.value = parsed.description;
        }

        // Auto-fill Amount
        if (parsed.amount && parsed.amount > 0) {
            const amountInput = document.getElementById('amount');
            if (amountInput) amountInput.value = parsed.amount;
        }

        // Auto-fill Category
        if (parsed.category) {
            const catSelect = document.getElementById('category');
            if (catSelect) {
                const opts = Array.from(catSelect.options);
                const match = opts.find(o => o.value === parsed.category);
                if (match) catSelect.value = parsed.category;
            }
        }

        // Handle Splits
        if (parsed.splits && Array.isArray(parsed.splits) && parsed.splits.length > 0) {
            // Select all participants first
            document.querySelectorAll('#participants-container .participant-pill').forEach(pill => {
                pill.classList.add('selected');
            });

            // Enable custom split mode
            const splitToggle = document.getElementById('split-mode-toggle');
            if (splitToggle && !splitToggle.checked) {
                splitToggle.checked = true;
                toggleSplitMode();
            }

            // Wait a tick for DOM to render splits
            await new Promise(r => setTimeout(r, 50));

            // Fill in split amounts
            for (const split of parsed.splits) {
                const member = tripMembers.find(m =>
                    m.name === split.name || m.name.includes(split.name) || split.name.includes(m.name)
                );
                if (member) {
                    const splitInput = document.getElementById(`split-user-${member.id}`);
                    if (splitInput) {
                        splitInput.value = parseFloat(split.amount_owed || 0).toFixed(2);
                    }
                }
            }

            // Zero out members not in the splits
            const splitNames = parsed.splits.map(s => s.name);
            for (const m of tripMembers) {
                const isInSplit = splitNames.some(sn =>
                    m.name === sn || m.name.includes(sn) || sn.includes(m.name)
                );
                if (!isInSplit) {
                    const splitInput = document.getElementById(`split-user-${m.id}`);
                    if (splitInput && splitInput.value === '') {
                        splitInput.value = '0.00';
                    }
                }
            }

            updateSplitSum();
        }

        // Close AI modal, switch to Add tab, show success
        closeAiModal();
        switchTab('add');
        showToast(typeof i18n === 'function' ? i18n('ai_success') : 'AI filled the form successfully! ✨', 'success');

    } catch (e) {
        console.error('AI parse error:', e);
        if (errMsg) {
            errMsg.textContent = e.message || 'שגיאה בניתוח AI.';
            errMsg.style.display = 'block';
        }
    } finally {
        // Reset button state
        if (btnText) btnText.style.display = 'inline';
        if (spinner) spinner.style.display = 'none';
        if (analyzeBtn) analyzeBtn.disabled = false;
    }
}

async function fetchExpenses() {
    if (!currentTripId) return;
    try {
        const res = await fetch(`/api/expenses/${currentTripId}`);
        if (res.status === 401) { window.location.href = '/'; return; }
        const expenses = await res.json();
        _cachedExpenses = expenses; // Cache for stats modal

        let html = '';
        if (!expenses.length) {
            html = `<div class="loading-state">${typeof i18n === 'function' ? i18n('expenses_no_data') : 'אין הוצאות בינתיים'}</div>`;
        } else {
            expenses.forEach(exp => {
                const safeDesc = escapeHTML(exp.description);
                const safePayer = escapeHTML(exp.payer);
                const safeCat = escapeHTML(exp.category || 'כללי');
                const currSym = getCurrencySymbol(exp.currency || 'ILS');
                const isPersonal = exp.is_personal ? true : false;

                // Payer avatar: Google image or initial
                const payerAvatar = exp.payer_avatar
                    ? `<img class="expense-avatar avatar-img" src="${escapeHTML(exp.payer_avatar)}" alt="${safePayer}" referrerpolicy="no-referrer">`
                    : `<div class="expense-avatar avatar-initial">${escapeHTML(exp.payer.charAt(0))}</div>`;

                // Currency display: show original currency prominently, converted in parens
                let amountDisplay = '';
                const userSym = getTripCurrencySymbol();
                if (exp.original_amount && exp.currency && exp.currency !== (currentUser?.default_currency || 'ILS')) {
                    // Foreign currency: show original first, converted in parens
                    const origSym = getCurrencySymbol(exp.currency);
                    amountDisplay = `<span class="primary-amount">${origSym}${parseFloat(exp.original_amount).toFixed(0)}</span>
                        <span class="original-currency">(~${userSym}${formatNumber(exp.amount)})</span>`;
                } else {
                    amountDisplay = `${userSym}${formatNumber(exp.amount)}`;
                }

                const canEdit = currentUser && exp.user_id === currentUser.id;
                const editBtn = canEdit ? `<button class="edit-expense-btn" onclick="openEditExpenseModal(${exp.id}, ${exp.amount}, '${safeDesc}', '${safeCat}', '${exp.currency}')" title="Edit"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>` : '';

                // Delete button visibility: hide if allow_member_delete is off and user is not admin
                const canDelete = _groupSettings.is_admin || _groupSettings.allow_member_delete;
                const deleteBtn = canDelete ? `<button class="delete-expense-btn" onclick="deleteExpense(${exp.id})" title="Delete"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>` : '';

                const personalBadge = isPersonal ? `<span class="personal-badge"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></span>` : '';
                const personalClass = isPersonal ? ' personal-expense' : '';

                html += `
                <div class="list-item${personalClass}" id="expense-${exp.id}">
                    <div class="item-left">
                        ${payerAvatar}
                        <div class="item-details">
                            <h4>${safeDesc} ${personalBadge}</h4>
                            <p>${safePayer} \u2022 ${translateCategory(exp.category || 'כללי')}</p>
                        </div>
                    </div>
                    <div class="item-right">
                        <div class="item-amount">${amountDisplay}</div>
                        <div class="expense-actions">
                            ${editBtn}
                            ${deleteBtn}
                        </div>
                    </div>
                </div>`;
            });
        }
        const full = document.getElementById('expenses-list');
        const home = document.getElementById('home-expenses-list');
        if (full) full.innerHTML = html;
        if (home) home.innerHTML = html;

        renderCategoryChart(expenses);
    } catch (e) { console.error('Fetch expenses error:', e); }
}

function openEditExpenseModal(id, amount, desc, category, currency) {
    document.getElementById('edit-expense-id').value = id;
    document.getElementById('edit-expense-desc').value = desc;
    document.getElementById('edit-expense-amount').value = amount;
    document.getElementById('edit-expense-category').value = category;
    document.getElementById('edit-expense-currency').value = currency;
    document.getElementById('edit-expense-modal').classList.add('open');
}

function closeEditExpenseModal() {
    document.getElementById('edit-expense-modal').classList.remove('open');
}

async function saveEditExpense() {
    const id = document.getElementById('edit-expense-id').value;
    const amount = document.getElementById('edit-expense-amount').value;
    const desc = document.getElementById('edit-expense-desc').value.trim();
    const category = document.getElementById('edit-expense-category').value;
    const currency = document.getElementById('edit-expense-currency').value;

    if (!amount || parseFloat(amount) <= 0 || !desc) {
        alert(typeof i18n === 'function' ? i18n('err_fill_all') : 'יש למלא את כל השדות.');
        return;
    }

    try {
        const res = await fetch(`/api/expenses/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount: parseFloat(amount), description: desc, category, currency })
        });
        const data = await res.json();
        if (res.ok && data.success) {
            closeEditExpenseModal();
            showToast(typeof i18n === 'function' ? i18n('toast_expense_updated') : 'ההוצאה עודכנה! ✏️');
            fetchExpenses();
            fetchBalances();
        } else {
            alert(data.error || 'שגיאה בעדכון ההוצאה.');
        }
    } catch (e) {
        alert('שגיאת רשת.');
    }
}

async function deleteExpense(expenseId) {
    const msg = typeof i18n === 'function' ? i18n('confirm_delete_expense') : 'למחוק את ההוצאה?';
    if (!confirm(msg)) return;
    try {
        const res = await fetch(`/api/expenses/${expenseId}`, { method: 'DELETE' });
        if (res.status === 401) { window.location.href = '/'; return; }
        const data = await res.json();
        if (res.ok && data.success) {
            showToast(typeof i18n === 'function' ? i18n('toast_expense_deleted') : 'ההוצאה נמחקה 🗑️');
            fetchExpenses();
            fetchBalances();
        } else {
            alert(data.error || 'שגיאה במחיקת הוצאה.');
        }
    } catch (e) {
        console.error('Delete expense error:', e);
        alert('שגיאת רשת.');
    }
}

async function addExpense() {
    const amountInput = document.getElementById('amount');
    const descInput = document.getElementById('desc');
    const amountVal = amountInput?.value;
    const desc = descInput?.value.trim();
    const category = document.getElementById('category')?.value;
    const currency = document.getElementById('currency')?.value || 'ILS';
    const parts = getSelectedParticipants();

    const errAmount = typeof i18n === 'function' ? i18n('err_invalid_amount') : 'יש למלא סכום תקין.';
    const errDesc = typeof i18n === 'function' ? i18n('err_fill_all') : 'יש למלא תיאור.';
    const errParts = typeof i18n === 'function' ? i18n('err_no_participants') : 'בחר לפחות משתתף אחד.';

    if (!amountVal || parseFloat(amountVal) <= 0) { alert(errAmount); return; }
    if (!desc) { alert(errDesc); return; }
    if (!parts.length) { alert(errParts); return; }
    if (!currentTripId) { alert('לא נבחר טיול.'); return; }

    const amount = parseFloat(amountVal);
    let splits = null;

    if (document.getElementById('split-mode-toggle')?.checked) {
        splits = [];
        let splitSum = 0;
        
        if (typeof currentSplitType !== 'undefined' && currentSplitType === 'item') {
            let totalItems = 0;
            const itemCounts = {};
            for (const pid of parts) {
                const count = parseFloat(document.getElementById(`split-user-${pid}`)?.value || 0);
                itemCounts[pid] = count;
                totalItems += count;
            }
            if (totalItems <= 0) {
                alert("סך הפריטים/היחס חייב להיות גדול מ-0");
                return;
            }
            for (const pid of parts) {
                const userAmount = (itemCounts[pid] / totalItems) * amount;
                splits.push({ user_id: parseInt(pid), amount: userAmount });
            }
        } else {
            for (const pid of parts) {
                const inputVal = parseFloat(document.getElementById(`split-user-${pid}`)?.value || 0);
                splits.push({ user_id: parseInt(pid), amount: inputVal });
                splitSum += inputVal;
            }

            if (Math.abs(splitSum - amount) > 0.01) {
                const sumErr = typeof i18n === 'function' ? i18n('split_sum_error') : 'הסכומים לא תואמים לסכום הכולל';
                alert(sumErr);
                return;
            }
        }
    }

    try {
        const res = await fetch('/api/expenses', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                trip_id: currentTripId,
                amount: amount,
                description: desc,
                category,
                currency,
                splits: splits,
                is_personal: document.getElementById('personal-expense-toggle')?.checked || false
            })
        });
        if (res.status === 401) { window.location.href = '/'; return; }
        const data = await res.json();
        if (res.ok && data.success) {
            amountInput.value = '';
            descInput.value = '';
            document.getElementById('split-mode-toggle').checked = false;
            const personalToggle = document.getElementById('personal-expense-toggle');
            if (personalToggle) personalToggle.checked = false;
            toggleSplitMode();
            showToast(typeof i18n === 'function' ? i18n('toast_expense_added') : 'ההוצאה נוספה! 💸');
            switchTab('expenses');
        } else {
            alert(data.error || 'שגיאה בהוספת ההוצאה.');
        }
    } catch (e) {
        console.error('Add expense error:', e);
        alert('שגיאת רשת.');
    }
}

// =====================
//  BALANCES (Color-coded + Accordion)
// =====================

/**
 * Greedy minimum-transactions settlement algorithm.
 * Takes an array of { name, balance } objects.
 * Returns an array of { from, to, amount } objects.
 */
function calculateSettlements(balances) {
    const debts = [];
    const credits = [];

    balances.forEach(b => {
        if (b.balance < -0.01) {
            debts.push({ name: b.name, user_id: b.user_id, amount: Math.abs(b.balance) });
        } else if (b.balance > 0.01) {
            credits.push({ name: b.name, user_id: b.user_id, amount: b.balance });
        }
    });

    // Sort descending by amount
    debts.sort((a, b) => b.amount - a.amount);
    credits.sort((a, b) => b.amount - a.amount);

    const settlements = [];
    let di = 0, ci = 0;

    while (di < debts.length && ci < credits.length) {
        const transfer = Math.min(debts[di].amount, credits[ci].amount);
        if (transfer > 0.01) {
            settlements.push({
                from: debts[di].name,
                from_id: debts[di].user_id,
                to: credits[ci].name,
                to_id: credits[ci].user_id,
                amount: transfer
            });
        }
        debts[di].amount -= transfer;
        credits[ci].amount -= transfer;
        if (debts[di].amount < 0.01) di++;
        if (credits[ci].amount < 0.01) ci++;
    }

    return settlements;
}

async function fetchBalances() {
    if (!currentTripId) return;
    try {
        const res = await fetch(`/api/balances/${currentTripId}`);
        if (res.status === 401) { window.location.href = '/'; return; }
        const data = await res.json();
        const budget = currentTripData?.budget || 0;
        const budgetType = currentTripData?.budget_type || 'none';
        const spent = data.total || 0;
        const left = budget - spent;
        const pct = budget > 0 ? Math.min(100, Math.round(spent / budget * 100)) : 0;

        // Hide budget card if no budget
        const flipContainer = document.querySelector('.flip-card-container');
        if (flipContainer) {
            if (budgetType === 'none' || budget <= 0) {
                flipContainer.style.display = 'none';
            } else {
                flipContainer.style.display = '';
            }
        }

        const elSpent = document.getElementById('total-spent');
        const elBudget = document.getElementById('total-budget');
        const elLeft = document.getElementById('budget-left');
        const elPct = document.getElementById('circle-percent');
        const userSym = getTripCurrencySymbol();
        if (elSpent) elSpent.textContent = `${userSym}${formatNumber(spent)}`;
        if (elBudget) elBudget.textContent = `${userSym}${budget}`;
        if (elLeft) elLeft.textContent = `${userSym}${formatNumber(Math.max(0, left))}`;
        if (elPct) elPct.textContent = `${pct}%`;

        const list = document.getElementById('balances-list');
        if (!list) return;
        if (!data.balances?.length) { list.innerHTML = `<div class="loading-state">${typeof i18n === 'function' ? i18n('balances_no_data') : 'אין נתונים'}</div>`; return; }

        // Calculate settlements for the accordion
        const settlements = calculateSettlements(data.balances);

        list.innerHTML = data.balances.map(b => {
            const isPos = b.balance > 0.01;
            const isNeg = b.balance < -0.01;
            const badgeCls = isPos ? 'positive' : isNeg ? 'negative' : 'neutral';

            const txtReceive = typeof i18n === 'function' ? i18n('balance_receive') : 'צריך לקבל';
            const txtPay = typeof i18n === 'function' ? i18n('balance_pay') : 'צריך לשלם';
            const txtSettled = typeof i18n === 'function' ? i18n('balance_settled') : 'מאוזן';
            const badgeTxt = isPos ? txtReceive : isNeg ? txtPay : txtSettled;

            const amtCls = isPos ? 'amount-pos' : isNeg ? 'amount-neg' : '';
            const me = currentUser && b.user_id === currentUser.id ? (typeof i18n === 'function' ? i18n('balance_you') : ' (את/ה)') : '';
            const safeName = escapeHTML(b.name);

            // Find this person's settlements
            const personDebts = settlements.filter(s => s.from === b.name || s.to === b.name);
            let debtLines = '';
            if (personDebts.length > 0) {
                debtLines = personDebts.map(s => {
                    const safeFrom = escapeHTML(s.from);
                    const safeTo = escapeHTML(s.to);

                    const isDebtor = currentUser && currentUser.id === s.from_id;
                    const isCreditor = currentUser && currentUser.id === s.to_id;

                    let settleBtn = '';
                    if (isDebtor || isCreditor) {
                        const txtSettleUp = typeof i18n === 'function' ? i18n('settle_up') : 'סלק חוב 💸';
                        settleBtn = `<button class="settle-btn" onclick="event.stopPropagation(); triggerSettleUp(${s.from_id}, ${s.to_id}, ${s.amount})">${txtSettleUp}</button>`;
                    }

                    return `<div class="debt-line">
                        <div class="debt-info">
                            <span>${safeFrom}</span>
                            <span class="debt-arrow">←</span>
                            <span>${safeTo}</span>
                            <span class="debt-amount">${userSym}${formatNumber(s.amount)}</span>
                        </div>
                        ${settleBtn}
                    </div>`;
                }).join('');
            } else {
                debtLines = `<div class="debt-line" style="justify-content:center; color:var(--text-muted);">${txtSettled} ✓</div>`;
            }

            const paidTxt = typeof i18n === 'function' ? i18n('balance_paid') : 'שילם: ';

            return `
            <div class="balance-item" onclick="this.classList.toggle('open')">
                <div class="balance-header">
                    <div class="item-left">
                        <div class="avatar bg-purple" style="width:40px;height:40px;font-size:1.2rem;">${escapeHTML(b.name.charAt(0))}</div>
                        <div class="item-details">
                            <h4>${safeName}${me}</h4>
                            <p>${paidTxt}${userSym}${formatNumber(b.paid)}</p>
                        </div>
                    </div>
                    <div class="item-right">
                        <span class="balance-badge ${badgeCls}">${badgeTxt}</span>
                        <div class="item-amount ${amtCls}">${userSym}${formatNumber(Math.abs(b.balance))}</div>
                        <span class="accordion-arrow">▼</span>
                    </div>
                </div>
                <div class="accordion-body">
                    ${debtLines}
                </div>
            </div>`;
        }).join('');
    } catch (e) { console.error('Fetch balances error:', e); }
}

async function loadOptimizedBalances() {
    if (!currentTripId) return;
    const container = document.getElementById('balances-list');
    if (!container) return;

    container.innerHTML = `<div class="loading-state">טוען חישוב חכם... ⚡</div>`;

    try {
        const res = await fetch(`/api/trips/${currentTripId}/optimized-balances`);
        if (!res.ok) throw new Error('שגיאה בחישוב');
        const data = await res.json();
        
        if (!data.optimized_settlements || data.optimized_settlements.length === 0) {
            showToast('כולם מאופסים! אין חובות. 🎉', 'success');
            container.innerHTML = `<div style="text-align:center; padding:20px; color:var(--text-muted);">כולם מאופסים! אין חובות. 🎉<br><br><button class="secondary-btn" onclick="fetchBalances()">🔙 חזור</button></div>`;
            return;
        }

        let html = '<div class="optimized-settlements-list">';
        data.optimized_settlements.forEach(s => {
            html += `
                <div class="settlement-card" style="background:var(--card-bg); padding:16px; border-radius:12px; margin-bottom:12px; border-left:4px solid var(--accent-yellow); box-shadow:0 2px 8px rgba(0,0,0,0.2);">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <div style="display:flex; flex-direction:column; gap:4px;">
                            <span style="color:var(--text-muted); font-size:0.85rem;">${escapeHTML(s.from)} מעביר ל-</span>
                            <strong style="font-size:1.1rem; color:var(--text-light);">${escapeHTML(s.to)}</strong>
                        </div>
                        <div style="font-size:1.4rem; font-weight:bold; color:var(--accent-yellow);">
                            ₪${s.amount.toFixed(2)}
                        </div>
                    </div>
                </div>
            `;
        });
        html += '</div>';
        html += `<button class="secondary-btn full-width" style="margin-top:16px;" onclick="fetchBalances()">🔙 חזור ליתרות רגילות</button>`;

        container.innerHTML = html;

    } catch (e) {
        console.error(e);
        container.innerHTML = `<div class="error-state">שגיאה בטעינת העברות חכמות.<br><br><button class="secondary-btn" onclick="fetchBalances()">🔙 חזור</button></div>`;
    }
}

async function triggerSettleUp(payerId, payeeId, amount) {
    const msg = typeof i18n === 'function' ? i18n('settle_confirm') : 'לסלק חוב?';
    if (!confirm(`${msg} (${getTripCurrencySymbol()}${formatNumber(amount)})`)) return;

    try {
        const res = await fetch('/api/settlements', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                trip_id: currentTripId,
                payer_id: payerId,
                payee_id: payeeId,
                amount: amount
            })
        });
        const data = await res.json();
        if (res.ok && data.success) {
            const toastMsg = typeof i18n === 'function' ? i18n('toast_settled') : 'החוב סולק! 🎉';
            showToast(toastMsg);
            launchConfetti();
            fetchBalances();
            fetchExpenses();
        } else {
            alert(data.error || 'Failed to settle debt.');
        }
    } catch (e) {
        console.error('Settle up error:', e);
        alert('Network error.');
    }
}

function launchConfetti() {
    const container = document.getElementById('confetti-container');
    if (!container) return;

    container.innerHTML = '';
    const colors = ['#facc15', '#a855f7', '#22d3ee', '#06d6a0', '#f43f5e', '#ff007f'];

    for (let i = 0; i < 60; i++) {
        const piece = document.createElement('div');
        piece.className = 'confetti-piece';

        const color = colors[Math.floor(Math.random() * colors.length)];
        const left = Math.random() * 100;
        const delay = Math.random() * 2;
        const size = Math.random() * 8 + 5;

        piece.style.backgroundColor = color;
        piece.style.left = `${left}%`;
        piece.style.animationDelay = `${delay}s`;
        piece.style.width = `${size}px`;
        piece.style.height = `${size}px`;
        piece.style.borderRadius = Math.random() > 0.5 ? '50%' : '0';

        container.appendChild(piece);
    }

    setTimeout(() => {
        container.innerHTML = '';
    }, 4000);
}

// =====================
//  THEMES & CHARTS
// =====================

function initTheme() {
    const saved = localStorage.getItem('theme');
    const btn = document.getElementById('theme-toggle-btn');
    if (saved === 'light') {
        document.body.classList.add('light-theme');
        if (btn) btn.textContent = '🌙';
    } else {
        document.body.classList.remove('light-theme');
        if (btn) btn.textContent = '☀️';
    }
    initDynamicBackground();
}

function toggleTheme() {
    document.body.classList.toggle('light-theme');
    const isLight = document.body.classList.contains('light-theme');
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
    
    // Also toggle the 'dark' class on html for Tailwind compat
    if (!isLight) {
        document.documentElement.classList.add('dark');
        document.documentElement.classList.remove('light');
    } else {
        document.documentElement.classList.add('light');
        document.documentElement.classList.remove('dark');
    }
    
    const btn = document.getElementById('theme-toggle-btn');
    if (btn) btn.textContent = isLight ? '🌙' : '☀️';
    initDynamicBackground();
}

let darkBgFrameId, lightBgFrameId;

function initDynamicBackground() {
    const isDark = !document.body.classList.contains('light-theme');
    const darkCanvas = document.getElementById('bg-canvas-dark');
    const lightCanvas = document.getElementById('bg-canvas-light');
    
    if (!darkCanvas || !lightCanvas) return;

    if (isDark) {
        darkCanvas.style.opacity = '1';
        lightCanvas.style.opacity = '0';
        startDarkBackground(darkCanvas);
        cancelAnimationFrame(lightBgFrameId);
    } else {
        lightCanvas.style.opacity = '1';
        darkCanvas.style.opacity = '0';
        startLightBackground(lightCanvas);
        cancelAnimationFrame(darkBgFrameId);
    }
}

function startDarkBackground(canvas) {
    const ctx = canvas.getContext('2d');
    cancelAnimationFrame(darkBgFrameId);
    
    const resize = () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);
    resize();

    const numStars = 150;
    const stars = Array.from({ length: numStars }).map(() => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        radius: Math.random() * 1.5,
        speed: Math.random() * 0.5 + 0.1
    }));

    const draw = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'white';
        stars.forEach(star => {
            ctx.globalAlpha = Math.random() * 0.5 + 0.5;
            ctx.beginPath();
            ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
            ctx.fill();
            star.y -= star.speed;
            if (star.y < 0) {
                star.y = canvas.height;
                star.x = Math.random() * canvas.width;
            }
        });
        darkBgFrameId = requestAnimationFrame(draw);
    };
    draw();
}

function startLightBackground(canvas) {
    const ctx = canvas.getContext('2d');
    cancelAnimationFrame(lightBgFrameId);

    const resize = () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);
    resize();

    const itemsList = ["E=mc²", "🍕", "∑", "x²+y²", "👓", "Δx", "{ }", "y=mx+b", "∫", "π", "±"];
    const numItems = 40;
    const items = Array.from({ length: numItems }).map(() => ({
        text: itemsList[Math.floor(Math.random() * itemsList.length)],
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        speed: Math.random() * 0.3 + 0.1,
        fontSize: Math.random() * 20 + 20,
        rotation: (Math.random() - 0.5) * Math.PI / 2
    }));

    const draw = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#64748b';
        ctx.globalAlpha = 0.08;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        
        items.forEach(item => {
            ctx.save();
            ctx.font = `bold ${item.fontSize}px monospace, sans-serif`;
            ctx.translate(item.x, item.y);
            ctx.rotate(item.rotation);
            ctx.fillText(item.text, 0, 0);
            ctx.restore();
            
            item.y -= item.speed;
            if (item.y < -50) {
                item.y = canvas.height + 50;
                item.x = Math.random() * canvas.width;
            }
        });
        lightBgFrameId = requestAnimationFrame(draw);
    };
    draw();
}

function toggleBudgetCard() {
    const card = document.getElementById('budget-flip-card');
    if (card) {
        card.classList.toggle('flipped');
    }
}

function renderCategoryChart(expenses) {
    const chartContainer = document.getElementById('category-chart');
    if (!chartContainer) return;

    if (!expenses || expenses.length === 0) {
        chartContainer.innerHTML = `<div style="color:var(--text-muted); width:100%; text-align:center;">${typeof i18n === 'function' ? i18n('balances_no_data') : 'אין נתונים'}</div>`;
        return;
    }

    const catTotals = {};
    let maxAmt = 0;

    expenses.forEach(exp => {
        const cat = exp.category || 'כללי';
        catTotals[cat] = (catTotals[cat] || 0) + parseFloat(exp.amount);
    });

    Object.values(catTotals).forEach(val => {
        if (val > maxAmt) maxAmt = val;
    });

    // Categories
    const categoriesList = [
        { name: 'אוכל', icon: 'F', color: 'var(--accent-yellow)' },
        { name: 'לינה', icon: 'L', color: 'var(--primary)' },
        { name: 'תחבורה', icon: 'T', color: 'var(--accent-cyan)' },
        { name: 'אטרקציות', icon: 'A', color: 'var(--error)' },
        { name: 'כללי', icon: 'G', color: 'var(--success)' }
    ];

    let html = '';
    categoriesList.forEach(c => {
        const val = catTotals[c.name] || 0;
        let heightPct = 5;
        if (maxAmt > 0 && val > 0) {
            heightPct = Math.max(10, (val / maxAmt) * 100);
        } else if (val === 0) {
            heightPct = 0; // hide empty bars or keep 5%
        }

        if (val > 0) {
            html += `
            <div class="chart-bar-wrapper">
                <div class="chart-bar" style="height: ${heightPct}%; background: ${c.color};" data-tooltip="${translateCategory(c.name)}: ${getTripCurrencySymbol()}${val.toFixed(0)}"></div>
                <div class="chart-icon">${c.icon}</div>
            </div>`;
        }
    });

    chartContainer.innerHTML = html;
}

// ============================================
//   PHASE 4: RECEIPT SCANNING LOGIC
// ============================================

function triggerReceiptScan() {
    document.getElementById('receipt-file-input').click();
}

async function uploadReceipt(file) {
    if (!file) return;

    // Show loading overlay
    document.getElementById('scan-overlay').style.display = 'flex';

    const formData = new FormData();
    formData.append('image', file);

    try {
        const res = await fetch('/api/expenses/scan-receipt', {
            method: 'POST',
            body: formData
        });
        const data = await res.ok ? await res.json() : null;

        if (data && data.success) {
            renderScannedItems(data.items);
        } else {
            alert((data && data.error) || 'Failed to scan receipt.');
        }
    } catch (e) {
        console.error(e);
        alert('Network error while scanning.');
    } finally {
        document.getElementById('scan-overlay').style.display = 'none';
    }
}

let currentScannedItems = [];
let scanTotalAmount = 0;

function closeAssignItemsModal() {
    const modal = document.getElementById('assign-items-modal');
    if (modal) modal.style.display = 'none';
}

function renderScannedItems(items) {
    const availableUsers = getSelectedParticipants();
    if (availableUsers.length === 0) {
        alert(typeof i18n === 'function' ? i18n('err_no_participants') : "אנא בחר משתתפים להוצאה (עבור מי?) לפני סריקת הקבלה.");
        return;
    }

    currentScannedItems = items.map(item => ({
        name: item.name || item.item || 'Item',
        price: item.price || 0,
        quantity: item.quantity || 1,
        taggedUsers: [] // Start empty, user must tap
    }));
    
    updateAssignItemsDOM();
    
    const modal = document.getElementById('assign-items-modal');
    if (modal) modal.style.display = 'flex';
}

function updateAssignItemsDOM() {
    const availableUsers = getSelectedParticipants();
    scanTotalAmount = currentScannedItems.reduce((sum, item) => sum + item.price, 0);
    document.getElementById('assign-items-total').textContent = `₪${scanTotalAmount.toFixed(2)}`;
    
    const list = document.getElementById('assign-items-list');
    let html = '';
    
    currentScannedItems.forEach((item, index) => {
        const itemTotal = item.price;
        const qtyText = item.quantity > 1 ? `<span style="font-size:0.8rem; color:var(--text-muted); padding-inline-start:4px;">(${item.quantity}x)</span>` : '';
        
        let chipsHtml = '';
        availableUsers.forEach(uid => {
            const member = tripMembers.find(m => String(m.id) === String(uid));
            const name = member ? member.name : `User ${uid}`;
            const isSelected = item.taggedUsers.includes(String(uid));
            const chipClass = isSelected ? 'assign-user-chip selected' : 'assign-user-chip';
            chipsHtml += `<div class="${chipClass}" onclick="toggleAssignUser(${index}, '${uid}')">${escapeHTML(name)}</div>`;
        });

        html += `
            <div class="assign-item-card">
                <div class="assign-item-header">
                    <div>${escapeHTML(item.name)} ${qtyText}</div>
                    <div class="assign-item-price">₪${itemTotal.toFixed(2)}</div>
                </div>
                <div class="assign-item-users">
                    ${chipsHtml}
                </div>
            </div>
        `;
    });
    
    list.innerHTML = html;
}

function toggleAssignUser(itemIndex, userId) {
    const item = currentScannedItems[itemIndex];
    if (!item) return;
    
    const userIndex = item.taggedUsers.indexOf(String(userId));
    if (userIndex === -1) {
        item.taggedUsers.push(String(userId));
    } else {
        item.taggedUsers.splice(userIndex, 1);
    }
    
    updateAssignItemsDOM();
}

function submitAssignItems() {
    const availableUsers = getSelectedParticipants();
    
    let userTotals = {};
    availableUsers.forEach(uid => userTotals[uid] = 0);
    
    let taggedTotal = 0;
    
    currentScannedItems.forEach(item => {
        const itemTotal = item.price;
        if (item.taggedUsers.length > 0) {
            const splitAmount = itemTotal / item.taggedUsers.length;
            item.taggedUsers.forEach(uid => {
                if (userTotals[uid] !== undefined) {
                    userTotals[uid] += splitAmount;
                }
            });
            taggedTotal += itemTotal;
        }
    });
    
    let grandTotal = scanTotalAmount;
    
    const formAmountStr = document.getElementById('amount')?.value;
    const formAmount = parseFloat(formAmountStr);
    if (!isNaN(formAmount) && formAmount > scanTotalAmount) {
        grandTotal = formAmount;
    }
    
    const leftover = grandTotal - taggedTotal;
    
    if (leftover > 0 && taggedTotal > 0) {
        // Proportional split
        availableUsers.forEach(uid => {
            const userShare = userTotals[uid] / taggedTotal;
            userTotals[uid] += (leftover * userShare);
        });
    } else if (leftover > 0) {
        // Even split if no one tagged anything
        const evenSplit = leftover / availableUsers.length;
        availableUsers.forEach(uid => userTotals[uid] += evenSplit);
    }
    
    const amountEl = document.getElementById('amount');
    const descEl = document.getElementById('desc');
    
    if (amountEl) amountEl.value = grandTotal.toFixed(2);
    if (descEl && !descEl.value) {
        const names = currentScannedItems.map(i => i.name).slice(0, 3).join(', ');
        descEl.value = names + (currentScannedItems.length > 3 ? ' ועוד...' : '');
    }
    
    const toggle = document.getElementById('split-mode-toggle');
    if (toggle && !toggle.checked) {
        toggle.checked = true;
        toggleSplitMode();
    }
    setSplitType('amount');
    
    availableUsers.forEach(uid => {
        const input = document.getElementById(`split-user-${uid}`);
        if (input) {
            input.value = userTotals[uid].toFixed(2);
        }
    });
    
    updateSplitSum();
    closeAssignItemsModal();
}

// ============================================
//   PHASE 4: UNEQUAL SPLITS LOGIC
// ============================================

function toggleSplitMode() {
    const container = document.getElementById('custom-splits-container');
    const msg = document.getElementById('split-validation-msg');
    const isChecked = document.getElementById('split-mode-toggle').checked;
    if (isChecked) {
        container.style.display = 'flex';
        msg.style.display = 'block';
        const typeContainer = document.getElementById('split-type-toggle-container');
        if (typeContainer) typeContainer.style.display = 'flex';
        renderCustomSplits();
    } else {
        container.style.display = 'none';
        msg.style.display = 'none';
        const typeContainer = document.getElementById('split-type-toggle-container');
        if (typeContainer) typeContainer.style.display = 'none';
    }
}

let currentSplitType = 'amount';

function setSplitType(type) {
    currentSplitType = type;
    const btnAmount = document.getElementById('split-type-amount');
    const btnItem = document.getElementById('split-type-item');
    if (type === 'amount') {
        if (btnAmount) { btnAmount.classList.add('active'); btnAmount.style.background = 'var(--primary)'; btnAmount.style.color = '#fff'; }
        if (btnItem) { btnItem.classList.remove('active'); btnItem.style.background = 'transparent'; btnItem.style.color = 'var(--text-muted)'; }
    } else {
        if (btnItem) { btnItem.classList.add('active'); btnItem.style.background = 'var(--primary)'; btnItem.style.color = '#fff'; }
        if (btnAmount) { btnAmount.classList.remove('active'); btnAmount.style.background = 'transparent'; btnAmount.style.color = 'var(--text-muted)'; }
    }
    renderCustomSplits();
}

function renderCustomSplits() {
    const container = document.getElementById('custom-splits-container');
    if (!container) return;

    const parts = getSelectedParticipants();
    if (!parts.length) {
        container.innerHTML = `<div style="color:var(--text-muted); text-align:center;">בחר קודם משתתפים</div>`;
        updateSplitSum();
        return;
    }

    const totalAmount = parseFloat(document.getElementById('amount')?.value || 0);
    const equalShare = totalAmount > 0 ? (totalAmount / parts.length) : 0;

    container.innerHTML = parts.map(pid => {
        const member = tripMembers.find(m => String(m.id) === String(pid));
        const name = member ? member.name : `משתתף ${pid}`;
        
        let step = "0.01";
        let val = equalShare.toFixed(2);
        if (currentSplitType === 'item') {
            step = "1";
            val = "1";
        }
        
        return `
            <div class="split-input-row">
                <span class="split-input-name">${escapeHTML(name)} <span id="split-calc-${pid}" style="font-size:0.8rem;color:var(--text-muted);display:${currentSplitType==='item'?'inline':'none'}"></span></span>
                <input type="number" id="split-user-${pid}" class="split-input-field" 
                       value="${val}" min="0" step="${step}" oninput="updateSplitSum()">
            </div>
        `;
    }).join('');

    updateSplitSum();
}

function updateSplitSum() {
    const parts = getSelectedParticipants();
    const totalAmount = parseFloat(document.getElementById('amount')?.value || 0);
    const msg = document.getElementById('split-validation-msg');
    if (!msg) return;

    if (currentSplitType === 'item') {
        let totalItems = 0;
        for (const pid of parts) {
            totalItems += parseFloat(document.getElementById(`split-user-${pid}`)?.value || 0);
        }
        
        for (const pid of parts) {
            const count = parseFloat(document.getElementById(`split-user-${pid}`)?.value || 0);
            const userAmount = totalItems > 0 ? (count / totalItems) * totalAmount : 0;
            const calcSpan = document.getElementById(`split-calc-${pid}`);
            if (calcSpan) calcSpan.textContent = `(₪${userAmount.toFixed(2)})`;
        }
        
        msg.className = 'split-validation-msg valid';
        msg.textContent = 'חלוקה לפי פריטים/יחס מופעלת ✓';
        return;
    }

    let currentSum = 0;
    for (const pid of parts) {
        currentSum += parseFloat(document.getElementById(`split-user-${pid}`)?.value || 0);
    }

    const diff = totalAmount - currentSum;
    if (Math.abs(diff) < 0.01) {
        msg.className = 'split-validation-msg valid';
        msg.textContent = typeof i18n === 'function' ? i18n('toast_expense_updated') : 'הסכומים תואמים! ✓';
    } else {
        msg.className = 'split-validation-msg invalid';
        const formattedDiff = Math.abs(diff).toFixed(2);
        if (diff > 0) {
            msg.textContent = `חסרים עוד ₪${formattedDiff} לסכום הכולל`;
        } else {
            msg.textContent = `חריגה של ₪${formattedDiff} מהסכום הכולל`;
        }
    }
}

// Add direct amount input listener to trigger split update
document.getElementById('amount')?.addEventListener('input', () => {
    if (document.getElementById('split-mode-toggle')?.checked) {
        renderCustomSplits();
    }
});

// ============================================
//   FETCH GROUP SETTINGS (admin, delete perms)
// ============================================
async function fetchGroupSettings() {
    if (!currentTripId) return;
    try {
        const res = await fetch(`/api/trips/${currentTripId}/settings`);
        if (res.ok) {
            const data = await res.json();
            _groupSettings.is_admin = data.is_admin || false;
            _groupSettings.allow_member_delete = data.allow_member_delete !== false;
        }
    } catch (e) {
        console.error('Fetch group settings error:', e);
    }
}

// ============================================
//   STATS VIEW (Category chart fullscreen)
// ============================================
function showStatsView() {
    // Open the stats modal overlay instead of flipping budget card
    const modal = document.getElementById('stats-modal');
    if (!modal) return;

    const chartArea = document.getElementById('stats-chart-area');
    const summaryArea = document.getElementById('stats-summary');
    if (!chartArea || !summaryArea) return;

    // Render category chart into modal
    const userSym = getTripCurrencySymbol();
    const expenseItems = document.querySelectorAll('.list-item');

    // Use cached expenses data if available
    if (typeof _cachedExpenses !== 'undefined' && _cachedExpenses && _cachedExpenses.length > 0) {
        const catTotals = {};
        let total = 0;
        let maxAmt = 0;

        _cachedExpenses.forEach(exp => {
            const cat = exp.category || (typeof i18n === 'function' ? i18n('cat_general') : 'General');
            const amt = parseFloat(exp.amount);
            catTotals[cat] = (catTotals[cat] || 0) + amt;
            total += amt;
        });

        Object.values(catTotals).forEach(val => { if (val > maxAmt) maxAmt = val; });

        const categoriesList = [
            { name: '\u05d0\u05d5\u05db\u05dc', nameEn: 'Food', icon: '\ud83c\udf54', color: 'var(--accent-yellow)' },
            { name: '\u05dc\u05d9\u05e0\u05d4', nameEn: 'Lodging', icon: '\ud83c\udfe8', color: 'var(--primary)' },
            { name: '\u05ea\u05d7\u05d1\u05d5\u05e8\u05d4', nameEn: 'Transport', icon: '\ud83d\ude95', color: 'var(--accent-cyan)' },
            { name: '\u05d0\u05d8\u05e8\u05e7\u05e6\u05d9\u05d5\u05ea', nameEn: 'Attractions', icon: '\ud83c\udfa2', color: 'var(--error)' },
            { name: '\u05db\u05dc\u05dc\u05d9', nameEn: 'General', icon: '\ud83d\udce6', color: 'var(--success)' }
        ];

        let barsHtml = '';
        categoriesList.forEach(c => {
            const val = catTotals[c.name] || catTotals[c.nameEn] || 0;
            if (val > 0) {
                const heightPct = maxAmt > 0 ? Math.max(10, (val / maxAmt) * 100) : 0;
                const displayName = typeof translateCategory === 'function' ? translateCategory(c.name) : c.name;
                barsHtml += `
                <div class="chart-bar-wrapper">
                    <div class="chart-bar" style="height: ${heightPct}%; background: ${c.color};" data-tooltip="${displayName}: ${userSym}${val.toFixed(0)}"></div>
                    <div class="chart-icon">${c.icon}</div>
                </div>`;
            }
        });

        chartArea.innerHTML = barsHtml || `<div style="color:var(--text-muted); width:100%; text-align:center;">${typeof i18n === 'function' ? i18n('balances_no_data') : 'No data'}</div>`;

        const numMembers = tripMembers ? tripMembers.length : 1;
        const avg = numMembers > 0 ? total / numMembers : 0;
        const totalLabel = typeof i18n === 'function' ? i18n('home_total_expenses') : 'Total Expenses';
        const avgLabel = typeof currentLang !== 'undefined' && currentLang === 'he' ? '\u05de\u05de\u05d5\u05e6\u05e2 \u05dc\u05d0\u05d3\u05dd' : 'Avg / Person';
        const catCount = Object.keys(catTotals).length;
        const catLabel = typeof currentLang !== 'undefined' && currentLang === 'he' ? '\u05e7\u05d8\u05d2\u05d5\u05e8\u05d9\u05d5\u05ea' : 'Categories';
        const expCount = _cachedExpenses.length;
        const expLabel = typeof currentLang !== 'undefined' && currentLang === 'he' ? '\u05d4\u05d5\u05e6\u05d0\u05d5\u05ea' : 'Expenses';

        summaryArea.innerHTML = `
            <div class="stats-summary-card"><div class="stats-value">${userSym}${formatNumber(total)}</div><div class="stats-label">${totalLabel}</div></div>
            <div class="stats-summary-card"><div class="stats-value">${userSym}${formatNumber(avg)}</div><div class="stats-label">${avgLabel}</div></div>
            <div class="stats-summary-card"><div class="stats-value">${catCount}</div><div class="stats-label">${catLabel}</div></div>
            <div class="stats-summary-card"><div class="stats-value">${expCount}</div><div class="stats-label">${expLabel}</div></div>
        `;
    } else {
        chartArea.innerHTML = `<div style="color:var(--text-muted); width:100%; text-align:center;">${typeof i18n === 'function' ? i18n('balances_no_data') : 'No data'}</div>`;
        summaryArea.innerHTML = '';
    }

    modal.classList.add('open');
}

function closeStatsModal() {
    const modal = document.getElementById('stats-modal');
    if (modal) modal.classList.remove('open');
}

// ============================================
//   PHASE 4: ACTIVITY DRAWER LOGIC
// ============================================

function openActivityDrawer() {
    document.getElementById('activity-drawer')?.classList.add('open');
    document.getElementById('menu-overlay')?.classList.add('open');
    fetchActivity();
}

function closeActivityDrawer() {
    document.getElementById('activity-drawer')?.classList.remove('open');
    document.getElementById('menu-overlay')?.classList.remove('open');
}

async function fetchActivity() {
    if (!currentTripId) return;
    const container = document.getElementById('activity-list');
    if (!container) return;

    try {
        const res = await fetch(`/api/activity/${currentTripId}`);
        if (!res.ok) return;
        const data = await res.json();

        if (!data || data.length === 0) {
            const noAct = typeof i18n === 'function' ? i18n('activity_no_data') : 'אין פעילות עדיין';
            container.innerHTML = `<div class="loading-state">${noAct}</div>`;
            return;
        }

        container.innerHTML = data.map(item => {
            const dateStr = new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const actionText = typeof i18n === 'function' ? (i18n(`activity_${item.action}`) || item.action) : item.action;
            let detailText = item.detail ? escapeHTML(item.detail) : '';
            if (detailText) {
                const sym = getTripCurrencySymbol();
                detailText = detailText.replace(/₪|\$/g, sym);
                detailText = ` (${detailText})`;
            }
            return `
                <div class="activity-item">
                    <div class="activity-icon-dot"></div>
                    <div class="activity-content">
                        <strong>${escapeHTML(item.user_name)}</strong> ${actionText}${detailText}
                        <span class="activity-time">${dateStr}</span>
                    </div>
                </div>
            `;
        }).join('');
    } catch (e) {
        console.error('Fetch activity error:', e);
        container.innerHTML = '<div class="loading-state">Error loading activity.</div>';
    }
}

// Call initTheme on load
document.addEventListener('DOMContentLoaded', () => {
    initTheme();

    // Register updateUI for i18n system to call when language changes
    window.updateUI = function() {
        if (typeof renderTripsList === 'function') renderTripsList();
        if (typeof renderFriendsChips === 'function') renderFriendsChips();
        if (typeof renderEditFriendsChips === 'function') renderEditFriendsChips();
        if (document.getElementById('screen-dashboard')?.classList.contains('active')) {
            if (typeof fetchBalances === 'function') fetchBalances();
            if (typeof fetchExpenses === 'function') fetchExpenses();
            if (typeof fetchActivity === 'function') fetchActivity();
        }
        if (typeof window.applyGlobalTranslations === 'function') {
            window.applyGlobalTranslations();
        }
        window.dispatchEvent(new Event('languageChanged'));
    };

    // Listen for storage events (language changed in another tab/Profile page)
    window.addEventListener('storage', (e) => {
        if (e.key === 'lang' && e.newValue) {
            if (typeof setLanguage === 'function') {
                setLanguage(e.newValue);
            }
            window.updateUI();
        }
        if (e.key === 'theme') {
            initTheme();
        }
    });
});

// =====================
//  GROUP INFO MODAL
// =====================
async function openGroupInfo() {
    if (!currentTripId) return;
    const modal = document.getElementById('group-info-modal');
    if (!modal) return;

    // Fetch settings
    try {
        const settingsRes = await fetch(`/api/trips/${currentTripId}/settings`);
        const settings = settingsRes.ok ? await settingsRes.json() : { is_public_expenses: false, is_admin: false };

        // Group name
        const nameEl = document.getElementById('group-info-name');
        if (nameEl) nameEl.textContent = currentTripData?.name || '';

        // Toggle section (admin only)
        const toggleSection = document.getElementById('group-info-toggle-section');
        if (toggleSection) {
            toggleSection.style.display = settings.is_admin ? '' : 'none';
        }
        const toggleBox = document.getElementById('group-public-toggle');
        if (toggleBox) toggleBox.checked = settings.is_public_expenses;

        // Delete toggle (admin only)
        const deleteSection = document.getElementById('group-info-delete-section');
        if (deleteSection) {
            deleteSection.style.display = settings.is_admin ? '' : 'none';
        }
        const deleteBox = document.getElementById('group-delete-toggle');
        if (deleteBox) deleteBox.checked = settings.allow_member_delete;

        // Members list
        const membersContainer = document.getElementById('group-info-members-list');
        if (membersContainer && tripMembers.length) {
            membersContainer.innerHTML = tripMembers.map(m => {
                const initial = escapeHTML(m.name.charAt(0));
                const safeName = escapeHTML(m.name);
                const avatarHtml = m.avatar_url
                    ? `<img class="member-avatar avatar-img" src="${escapeHTML(m.avatar_url)}" alt="${safeName}" referrerpolicy="no-referrer">`
                    : `<div class="member-avatar avatar-initial">${initial}</div>`;
                const adminBadge = m.is_admin ? `<span class="admin-badge">${i18n('group_info_admin')}</span>` : '';
                // Promote: long-press non-admin member
                const promoteAttr = settings.is_admin && !m.is_admin && m.type === 'user'
                    ? ` oncontextmenu="event.preventDefault(); promoteMemberFromInfo(${m.id})" ontouchstart="startPromoteTimer(${m.id})" ontouchend="clearPromoteTimer()"`
                    : '';
                // Demote: show button for admin members
                const demoteBtn = settings.is_admin && m.is_admin && m.type === 'user'
                    ? `<button class="admin-badge" style="cursor:pointer;opacity:0.7;font-size:0.6rem;background:var(--error);border:none;margin-inline-start:4px;" onclick="event.stopPropagation(); demoteMemberFromInfo(${m.id})" title="${typeof i18n === 'function' ? i18n('demote_question') : 'Remove Admin?'}">✕</button>`
                    : '';
                
                let waBtn = '';
                if (settings.is_admin && m.type === 'guest') {
                    waBtn = `<button class="whatsapp-invite-btn" style="margin-inline-start:auto; background:none; border:none; cursor:pointer;" onclick="event.stopPropagation(); generateInviteAndShareWA()" title="Invite via WhatsApp">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="#25D366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                    </button>`;
                }
                
                return `<div class="member-row"${promoteAttr}>
                    ${avatarHtml}
                    <span class="member-name">${safeName}</span>
                    ${adminBadge}${demoteBtn}${waBtn}
                </div>`;
            }).join('');
        }

        modal.style.display = 'flex';

        // Show invite link button for admins
        const inviteLinkBtn = document.getElementById('invite-link-btn');
        if (inviteLinkBtn) inviteLinkBtn.style.display = settings.is_admin ? 'block' : 'none';
    } catch (e) {
        console.error('Open group info error:', e);
    }
}

function closeGroupInfo() {
    const modal = document.getElementById('group-info-modal');
    if (modal) modal.style.display = 'none';
}

async function toggleGroupPublic() {
    if (!currentTripId) return;
    const val = document.getElementById('group-public-toggle')?.checked || false;
    try {
        await fetch(`/api/trips/${currentTripId}/settings`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ is_public_expenses: val })
        });
    } catch (e) {
        console.error('Toggle public error:', e);
    }
}

async function toggleAllowDelete() {
    if (!currentTripId) return;
    const val = document.getElementById('group-delete-toggle')?.checked || false;
    try {
        await fetch(`/api/trips/${currentTripId}/settings`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ allow_member_delete: val })
        });
        _groupSettings.allow_member_delete = val;
        // Re-render expenses to update delete buttons
        fetchExpenses();
    } catch (e) {
        console.error('Toggle delete error:', e);
    }
}

async function leaveGroup() {
    if (!currentTripId) return;
    const confirmMsg = typeof i18n === 'function' ? i18n('group_info_leave_confirm') : 'Are you sure you want to leave?';
    if (!confirm(confirmMsg)) return;

    try {
        const res = await fetch(`/api/trips/${currentTripId}/leave`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        const data = await res.json();
        if (res.ok && data.success) {
            closeGroupInfo();
            showToast(i18n('toast_left_group'), 'info');
            currentTripId = null;
            currentTripData = null;
            showLobby();
            await loadLobby();
        } else {
            showToast(data.error || i18n('error_network'), 'error');
        }
    } catch (e) {
        console.error('Leave group error:', e);
        showToast(i18n('error_network'), 'error');
    }
}

// Long-press promote from Group Info
let _promoteTimer = null;
function startPromoteTimer(memberId) {
    _promoteTimer = setTimeout(() => promoteMemberFromInfo(memberId), 600);
}
function clearPromoteTimer() {
    if (_promoteTimer) { clearTimeout(_promoteTimer); _promoteTimer = null; }
}

async function promoteMemberFromInfo(memberId) {
    clearPromoteTimer();
    const confirmMsg = typeof i18n === 'function' ? i18n('promote_question') : 'Make Admin?';
    if (!confirm(confirmMsg)) return;
    try {
        const res = await fetch(`/api/trips/${currentTripId}/members/${memberId}/promote`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' }
        });
        if (res.ok) {
            await fetchTripMembers();
            openGroupInfo(); // refresh
        } else {
            const data = await res.json();
            showToast(data.error || 'Error', 'error');
        }
    } catch (e) {
        console.error('Promote error:', e);
    }
}

async function demoteMemberFromInfo(memberId) {
    const confirmMsg = typeof i18n === 'function' ? i18n('demote_question') : 'Remove Admin?';
    if (!confirm(confirmMsg)) return;
    try {
        const res = await fetch(`/api/trips/${currentTripId}/demote/${memberId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        if (res.ok) {
            await fetchTripMembers();
            openGroupInfo(); // refresh
            showToast(typeof i18n === 'function' ? i18n('demote_success') : 'Admin removed', 'success');
        } else {
            const data = await res.json();
            showToast(data.error || 'Error', 'error');
        }
    } catch (e) {
        console.error('Demote error:', e);
    }
}

// =====================
//  HAMBURGER MENU
// =====================
function openHamburgerMenu() {
    const menu = document.getElementById('hamburger-menu');
    const overlay = document.getElementById('menu-overlay');
    if (menu) menu.classList.add('open');
    if (overlay) overlay.classList.add('open');
}

function closeHamburgerMenu() {
    const menu = document.getElementById('hamburger-menu');
    const overlay = document.getElementById('menu-overlay');
    if (menu) menu.classList.remove('open');
    if (overlay) overlay.classList.remove('open');
}

// =====================
//  CUSTOM DROPDOWNS
// =====================
function setupCustomDropdowns() {
    const selects = document.querySelectorAll('select:not(.custom-dropdown-initialized)');
    selects.forEach(select => {
        select.classList.add('custom-dropdown-initialized');
        select.style.display = 'none';
        
        const container = document.createElement('div');
        container.className = 'custom-select-container';
        select.parentNode.insertBefore(container, select.nextSibling);
        
        const trigger = document.createElement('div');
        trigger.className = 'custom-select-trigger';
        
        const selectedText = document.createElement('span');
        const defaultOption = select.options[select.selectedIndex];
        selectedText.textContent = defaultOption ? defaultOption.textContent : '';
        selectedText.dataset.i18n = defaultOption ? defaultOption.getAttribute('data-i18n') : '';
        
        const arrow = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        arrow.setAttribute('viewBox', '0 0 24 24');
        arrow.setAttribute('class', 'custom-select-arrow');
        const polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
        polyline.setAttribute('points', '6 9 12 15 18 9');
        arrow.appendChild(polyline);
        
        trigger.appendChild(selectedText);
        trigger.appendChild(arrow);
        container.appendChild(trigger);
        
        const optionsList = document.createElement('div');
        optionsList.className = 'custom-select-options';
        container.appendChild(optionsList);
        
        Array.from(select.options).forEach((option, index) => {
            const optDiv = document.createElement('div');
            optDiv.className = 'custom-select-option' + (index === select.selectedIndex ? ' selected' : '');
            optDiv.textContent = option.textContent;
            if (option.getAttribute('data-i18n')) {
                optDiv.dataset.i18n = option.getAttribute('data-i18n');
            }
            optDiv.dataset.value = option.value;
            
            optDiv.addEventListener('click', (e) => {
                e.stopPropagation();
                select.value = option.value;
                selectedText.textContent = option.textContent;
                selectedText.dataset.i18n = option.getAttribute('data-i18n') || '';
                
                trigger.classList.remove('open');
                optionsList.classList.remove('open');
                
                Array.from(optionsList.children).forEach(c => c.classList.remove('selected'));
                optDiv.classList.add('selected');
                
                // Dispatch event so native listeners can catch it
                select.dispatchEvent(new Event('change', { bubbles: true }));
            });
            optionsList.appendChild(optDiv);
        });
        
        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = trigger.classList.contains('open');
            document.querySelectorAll('.custom-select-trigger').forEach(t => t.classList.remove('open'));
            document.querySelectorAll('.custom-select-options').forEach(o => o.classList.remove('open'));
            
            if (!isOpen) {
                trigger.classList.add('open');
                optionsList.classList.add('open');
            }
        });
        
        // Listen to native select changes to update UI (e.g. if updated programmatically)
        select.addEventListener('change', () => {
            const newIndex = select.selectedIndex;
            if (newIndex >= 0) {
                const opt = select.options[newIndex];
                selectedText.textContent = opt.textContent;
                selectedText.dataset.i18n = opt.getAttribute('data-i18n') || '';
                
                Array.from(optionsList.children).forEach((c, idx) => {
                    if (idx === newIndex) c.classList.add('selected');
                    else c.classList.remove('selected');
                });
            }
        });
    });
}

document.addEventListener('click', () => {
    document.querySelectorAll('.custom-select-trigger').forEach(t => t.classList.remove('open'));
    document.querySelectorAll('.custom-select-options').forEach(o => o.classList.remove('open'));
});

document.addEventListener('DOMContentLoaded', setupCustomDropdowns);

// =====================
//  CONTACT PICKER API
// =====================


// Show contact picker buttons if supported
document.addEventListener('DOMContentLoaded', () => {
    if ('contacts' in navigator && 'ContactsManager' in window) {
        document.querySelectorAll('.contact-picker-btn').forEach(btn => btn.style.display = 'flex');
    }
});

// =====================
//  PWA SERVICE WORKER REGISTRATION
// =====================
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js', { scope: '/' })
            .then((registration) => {
                console.log('[PWA] Service Worker registered successfully. Scope:', registration.scope);
            })
            .catch((error) => {
                console.error('[PWA] Service Worker registration failed:', error);
            });
    });
}

// =====================
//  PWA INSTALL PROMPT
// =====================
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    // Show all install buttons
    document.querySelectorAll('.pwa-install-btn').forEach(btn => btn.style.display = 'flex');
    console.log('[PWA] Install prompt captured — install button shown.');
});

async function triggerPWAInstall() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`[PWA] User response to install prompt: ${outcome}`);
    deferredPrompt = null;
    if (outcome === 'accepted') {
        document.querySelectorAll('.pwa-install-btn').forEach(btn => btn.style.display = 'none');
    }
}

window.addEventListener('appinstalled', () => {
    console.log('[PWA] App was installed successfully.');
    document.querySelectorAll('.pwa-install-btn').forEach(btn => btn.style.display = 'none');
    deferredPrompt = null;
});

// =====================
//  INVITE LINK
// =====================
async function generateInviteLink() {
    if (!currentTripId) return;
    try {
        const res = await fetch(`/api/trips/${currentTripId}/invite-link`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        const data = await res.json();
        if (data.success && data.invite_token) {
            const link = `${window.location.origin}/join/${data.invite_token}`;
            if (navigator.clipboard) {
                await navigator.clipboard.writeText(link);
                showToast(typeof i18n === 'function' ? i18n('invite_link_copied') : 'Invite link copied!', 'success');
            } else {
                prompt('Copy this link:', link);
            }
        } else {
            showToast(data.error || 'Error', 'error');
        }
    } catch (e) {
        console.error('Invite link error:', e);
    }
}

async function generateInviteAndShareWA() {
    if (!currentTripId) return;
    try {
        const res = await fetch(`/api/trips/${currentTripId}/invite-link`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        const data = await res.json();
        if (data.success && data.invite_token) {
            const link = `${window.location.origin}/join/${data.invite_token}`;
            const msg = encodeURIComponent(`Join my trip on MasterSplitter! ${link}`);
            const waUrl = `https://wa.me/?text=${msg}`;
            window.open(waUrl, '_blank');
        } else {
            showToast(data.error || 'Error', 'error');
        }
    } catch (e) { console.error('WA invite error:', e); }
}

// Auto-join from invite link on page load
document.addEventListener('DOMContentLoaded', () => {
    // Sync i18n
    if (typeof i18n !== 'undefined' && i18n.changeLanguage) {
        const lang = localStorage.getItem('lang') || 'he';
        i18n.changeLanguage(lang);
    }
    
    // Init theme which includes dynamic background
    initTheme();

    const params = new URLSearchParams(window.location.search);
    const inviteToken = params.get('invite');
    if (inviteToken) {
        // Clean URL
        window.history.replaceState({}, document.title, window.location.pathname);
        
        // Show join modal
        const joinModal = document.getElementById('join-confirm-modal');
        if (joinModal) {
            joinModal.style.display = 'flex';
            const confirmBtn = document.getElementById('confirm-join-btn');
            confirmBtn.onclick = () => {
                confirmBtn.disabled = true;
                fetch(`/api/join/${inviteToken}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                })
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        showToast(typeof i18n === 'function' ? i18n('invite_joined') : 'Joined group!', 'success');
                        if (data.trip_id) {
                            currentTripId = data.trip_id;
                            loadLobby();
                        }
                    } else {
                        showToast(data.error || 'Invalid invite link', 'error');
                    }
                })
                .catch(e => console.error('Auto-join error:', e))
                .finally(() => {
                    joinModal.style.display = 'none';
                    confirmBtn.disabled = false;
                });
            };
        }
    }
});

function closeJoinConfirmModal() {
    const modal = document.getElementById('join-confirm-modal');
    if (modal) modal.style.display = 'none';
}

// =====================
//  AI FINANCIAL TIP
// =====================
async function getAITip() {
    const btn = document.getElementById('get-ai-tip-btn');
    const display = document.getElementById('ai-tip-display');
    if (!btn || !display) return;
    
    const savedLang = localStorage.getItem('lang') || document.documentElement.lang || 'he';
    const loadingText = typeof i18n === 'function' ? i18n('loadingThinking') : (savedLang === 'he' ? 'חושב...' : 'Thinking...');
    const originalText = btn.innerHTML;
    
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner" style="display:inline-block; margin:0 5px; animation:spin 1s linear infinite;">↻</span> ${loadingText}`;
    display.style.display = 'none';
    
    try {
        const res = await fetch('/api/ai_tip?lang=' + savedLang);
        const data = await res.json();
        if (data.tip) {
            display.textContent = data.tip;
            display.style.display = 'block';
        }
    } catch (e) {
        console.error("AI Tip Error", e);
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

window.toggleAdvancedBudget = function() {
    const budgetSettings = document.getElementById('advanced-budget-settings');
    if (!budgetSettings) return;
    if (budgetSettings.style.display === 'none' || budgetSettings.style.display === '') {
        budgetSettings.style.display = 'block';
    } else {
        budgetSettings.style.display = 'none';
    }
};

window.applyGlobalTranslations = function() {
    const lang = localStorage.getItem('lang') || 'he';
    if(typeof i18n === 'function' && window.translations) {
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (window.translations[lang] && window.translations[lang][key]) {
                if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                    el.placeholder = window.translations[lang][key];
                } else {
                    el.textContent = window.translations[lang][key];
                }
            }
        });
    }
};
