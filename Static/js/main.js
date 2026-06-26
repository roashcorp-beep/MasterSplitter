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
function getGroupCurrencySymbol(groupId = null) {
    const tid = groupId || window.currentGroupId;
    let code = 'ILS';
    if (tid && window.allGroups) {
        const group = window.allGroups.find(t => t.id === tid);
        if (group && group.budgets_json && group.budgets_json.currency) {
            code = group.budgets_json.currency;
        }
    } else if (currentUser && currentUser.default_currency) {
        code = currentUser.default_currency;
    }
    return CURRENCY_SYMBOLS[code] || code;
}

window.getGroupCurrencySymbol = getGroupCurrencySymbol;

function formatNumber(num) {
    if (num == null) return "0";
    const val = Number(num);
    if (isNaN(val)) return "0";
    if (val >= 1000000) return (val / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (val >= 1000) return (val / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    return Number.isInteger(val) ? val.toString() : val.toFixed(2);
}
window.formatNumber = formatNumber;

/**
 * Format a monetary amount WITHOUT abbreviation (no "1.2K").
 * Always shows the full value with thousands separators, and 2 decimals
 * only when needed. Used on the BALANCES screen where exact amounts matter.
 */
function formatMoney(num) {
    if (num == null) return "0";
    const val = Number(num);
    if (isNaN(val)) return "0";
    const hasFraction = Math.abs(val - Math.round(val)) > 0.005;
    return val.toLocaleString('en-US', {
        minimumFractionDigits: hasFraction ? 2 : 0,
        maximumFractionDigits: 2
    });
}
window.formatMoney = formatMoney;

// =====================
//  AUTH (Login Page)
// =====================
let authMode = 'login';
window.currentUser = null;
window.currentCreatingParticipants = [];
window.currentEditingParticipants = [];
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
let currentGroupId = null;
let currentGroupData = null;
let allGroups = [];
let groupMembers = [];

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
        const pendingJoinId = localStorage.getItem('pending_join_group_id');
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
                    localStorage.removeItem('pending_join_group_id');
                    window.location.hash = '';
                    if (window.showToast) {
                        window.showToast(typeof i18n === 'function' && i18n("toast_group_created") ? 'Joined group successfully!' : 'Joined group successfully!', 'success');
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
                    <strong>${escapeHTML(inv.inviter_name)}</strong> הזמין אותך להצטרף לטיול <strong>${escapeHTML(inv.group_name)}</strong>
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
let hasAutoOpenedGroup = false;

async function loadLobby() {
    showView('lobby');
    try {
        const res = await fetch('/api/groups');
        if (res.status === 401) { window.location.href = '/'; return; }
        allGroups = await res.json();
        window.allGroups = allGroups;

        // Auto-open the most recent group on first load
        if (!hasAutoOpenedGroup && allGroups.length > 0) {
            hasAutoOpenedGroup = true;
            openGroup(allGroups[0].id);
            return;
        }

        showView('lobby');
        renderGroupsList(allGroups);
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

function renderGroupsList(groupsArray, retryCount = 0) {
    const groupsToRender = groupsArray || (typeof allGroups !== 'undefined' ? allGroups : []) || window.currentUser?.groups || [];
    if (window.reactUpdateGroups) {
        window.reactUpdateGroups(groupsToRender);
    } else {
        console.warn("React GroupsScreen not yet mounted. Retrying...");
        if (retryCount < 50) {
            setTimeout(() => renderGroupsList(groupsArray, retryCount + 1), 100);
        } else {
            console.error("React GroupsScreen failed to mount after 5 seconds.");
        }
    }
}

async function openGroup(groupId) {
    currentGroupId = groupId;
    currentGroupData = allGroups.find(t => t.id === groupId) || null;
    if (currentGroupData) {
        const nameLabel = document.getElementById('group-name-label');
        const titleEl = document.getElementById('dashboard-group-title');
        if (nameLabel) nameLabel.textContent = currentGroupData.name;
        if (titleEl) {
            const firstWord = escapeHTML(currentGroupData.name.split(' ')[0]);
            titleEl.innerHTML = `<span class="purple-text">${firstWord}</span>`;
        }

        const navAddWrapper = document.querySelector('.nav-add-btn-wrapper');
        const aiFab = document.getElementById('ai-fab');
        if (currentGroupData.is_readonly) {
            if (navAddWrapper) navAddWrapper.style.display = 'none';
            if (aiFab) aiFab.style.display = 'none';
        } else {
            if (navAddWrapper) navAddWrapper.style.display = '';
            if (aiFab) aiFab.style.display = '';
        }
    }
    showView('dashboard');
    // Land on the expenses list, not the home dashboard. The dashboard is being
    // redesigned separately; auto-opening it caused a brief flash on every group entry.
    switchTab('expenses');
    await fetchGroupMembers();
    await fetchGroupSettings();
    fetchExpenses();
    fetchBalances();

    // Show Activity, Stats & Group-Details hamburger items when inside a group
    const actBtn = document.getElementById('menu-activity-btn');
    const stBtn = document.getElementById('menu-stats-btn');
    const gdBtn = document.getElementById('menu-group-details-btn');
    if (actBtn) actBtn.style.display = '';
    if (stBtn) stBtn.style.display = '';
    if (gdBtn) gdBtn.style.display = '';
}

function goToLobby() {
    closeHamburgerMenu();
    loadLobby();
}

function showLobby() {
    // Hide group-specific hamburger items
    const actBtn = document.getElementById('menu-activity-btn');
    const stBtn = document.getElementById('menu-stats-btn');
    const gdBtn = document.getElementById('menu-group-details-btn');
    if (actBtn) actBtn.style.display = 'none';
    if (stBtn) stBtn.style.display = 'none';
    if (gdBtn) gdBtn.style.display = 'none';
    loadLobby();
}

// =====================
//  CREATE GROUP MODAL
// =====================
function openCreateGroupModal() {
    window.currentCreatingParticipants = [];
    const currentUserPhone = window.currentUser?.phone || window.currentUser?.email;
    const hasAdmin = window.currentCreatingParticipants.find(p => p.contact === currentUserPhone || p.phone === currentUserPhone || p.email === currentUserPhone);
    if (!hasAdmin && window.currentUser) {
        window.currentCreatingParticipants.unshift({
            name: window.currentUser.name || 'Me',
            contact: currentUserPhone || '',
            phone: window.currentUser.phone || '',
            email: window.currentUser.email || '',
            type: 'registered',
            status: 'admin'
        });
    }

    renderFriendsChips();
    const nameInput = document.getElementById('group-name');
    if (nameInput) nameInput.value = '';
    
    // reset global budgets if present
    ['create-budget-daily-amt', 'create-budget-monthly-amt', 'create-budget-yearly-amt'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    
    // default per user toggle off
    const pbu = document.getElementById('group-budget-per-user');
    if (pbu) pbu.checked = false;
    toggleBudgetFields('create');
    
    if (typeof window.reactOpenCreateModal === 'function') {
        window.reactOpenCreateModal();
    }
    
    if (typeof window.applyGlobalTranslations === 'function') {
        window.applyGlobalTranslations();
    }
}

function closeCreateGroupModal() {
    if (typeof window.reactCloseCreateModal === 'function') {
        window.reactCloseCreateModal();
    }
}

async function addFriend() {
    const input = document.getElementById('friend-input');
    const contact = input?.value.trim();
    if (!contact) return;
    // Prevent duplicates
    if (window.currentCreatingParticipants.some(f => (f.contact || f.name || f) === contact)) { input.value = ''; return; }
    // Add as checking first
    window.currentCreatingParticipants.push({ contact: contact, name: contact, type: 'registered', status: 'checking' });
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
        const entry = window.currentCreatingParticipants.find(f => f.contact === contact);
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
        const entry = window.currentCreatingParticipants.find(f => f.contact === contact);
        if (entry) { entry.status = 'unregistered'; entry.type = 'unregistered'; }
    }
    renderFriendsChips();
}

function addGuestFriend() {
    const guestName = prompt('\u05e9\u05dd \u05d4\u05de\u05e9\u05ea\u05de\u05e9 \u05d4\u05d0\u05d5\u05e8\u05d7:');
    if (!guestName || !guestName.trim()) return;
    const name = guestName.trim();
    if (window.currentCreatingParticipants.some(f => (f.name || f) === name)) return;
    window.currentCreatingParticipants.push({ name: name, type: 'guest', status: 'guest' });
    renderFriendsChips();
}

function removeFriend(idx) {
    if (!window.confirm(typeof i18n === 'function' && i18n("confirm_delete_member") ? i18n("confirm_delete_member") : "Are you sure you want to remove this member?")) return;
    window.currentCreatingParticipants.splice(idx, 1);
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
    const isPerUser = document.getElementById(mode === 'create' ? 'group-budget-per-user' : 'edit-group-budget-per-user')?.checked;
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
    const list = mode === 'create' ? window.currentCreatingParticipants : window.currentEditingParticipants;
    if (!list[idx].budgets_json) list[idx].budgets_json = {};
    list[idx].budgets_json[type] = parseFloat(val) || 0;
}

function createParticipantRowHTML(n, idx, mode) {
    const displayName = escapeHTML(n.name || n.resolvedName || n.contact || n);
    const initial = (displayName || '?').charAt(0).toUpperCase();
    
    const _t = (k, fb) => (typeof i18n === 'function' ? (i18n(k) || fb) : fb);
    let statusText = _t('status_member', 'חבר');
    let statusColor = '#10b981'; // green

    if (n.type === 'guest') {
        statusText = _t('status_guest', 'אורח');
        statusColor = '#3b82f6'; // blue
    } else if (n.type === 'pending' || n.type === 'unregistered' || n.inviteMethod) {
        if (!n.id) {
            statusText = _t('status_pending_join', 'ממתין להצטרפות');
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
    container.innerHTML = window.currentCreatingParticipants.map((n, idx) => createParticipantRowHTML(n, idx, 'create')).join('');
}

async function createGroup() {
    const name = document.getElementById('create-group-name')?.value.trim() || document.getElementById('group-name')?.value.trim();
    const isBudgetPerUser = document.getElementById('group-budget-per-user')?.checked || false;
    
    // Collect budgets_json
    const budgets_json = {};
    const dVal = parseFloat(document.getElementById('create-budget-daily-amt')?.value);
    if (dVal > 0) budgets_json.daily = dVal;

    const mVal = parseFloat(document.getElementById('create-budget-monthly-amt')?.value);
    if (mVal > 0) budgets_json.monthly = mVal;

    const yVal = parseFloat(document.getElementById('create-budget-yearly-amt')?.value);
    if (yVal > 0) budgets_json.yearly = yVal;

    const cVal = document.getElementById('create-group-currency')?.value;
    if (cVal) budgets_json.currency = cVal;

    if (!name) { showToast(typeof i18n === 'function' ? i18n('err_fill_all') : 'אנא מלא את כל השדות', 'error'); return; }

    // Extract participants strictly from the memory state array (WhatsApp style)
    const participants = window.currentCreatingParticipants.map((p, idx) => {
        let pBudgets = {};
        if (isBudgetPerUser) {
            const dailyInput = document.getElementById(`create-friend-${idx}-daily`);
            const monthlyInput = document.getElementById(`create-friend-${idx}-monthly`);
            const yearlyInput = document.getElementById(`create-friend-${idx}-yearly`);
            
            if (dailyInput && parseFloat(dailyInput.value) > 0) pBudgets.daily = parseFloat(dailyInput.value);
            if (monthlyInput && parseFloat(monthlyInput.value) > 0) pBudgets.monthly = parseFloat(monthlyInput.value);
            if (yearlyInput && parseFloat(yearlyInput.value) > 0) pBudgets.yearly = parseFloat(yearlyInput.value);
        }

        return { 
            name: p.name, 
            contact: p.contact || p.phone || p.email || p.name, 
            type: p.type || 'registered',
            status: p.status || 'member',
            budgets_json: isBudgetPerUser ? pBudgets : {}
        };
    });

    try {
        const res = await fetch('/api/groups', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, budgets_json, is_budget_per_user: isBudgetPerUser, participants })
        });
        const data = await res.json();
        if (res.ok && data.success) {
            closeCreateGroupModal();
            showToast(typeof i18n === 'function' ? i18n('toast_group_created') : 'Group created', 'success');
            
            // Auto-open WhatsApp if a WhatsApp contact was added
            const waContact = window.currentCreatingParticipants.find(f => f.inviteMethod === 'whatsapp' && f.contact);
            if (waContact && data.invite_token) {
                const phone = waContact.contact;
                const cleanPhone = phone.replace(/\D/g, '');
                const inviteCode = data.invite_token;
                const link = `${window.location.origin}/#join=${inviteCode}`;
                const userName = window.currentUser ? window.currentUser.name : '';
                const text = encodeURIComponent(`Hey! ${userName} invited you to join the group '${name}' on MasterSplitter. Click here to join: ${link}`);
                window.open(`https://wa.me/${cleanPhone}?text=${text}`, '_blank');
            }

            await loadLobby();
        } else {
            showToast(data.error || 'Network error', 'error');
        }
    } catch (e) {
        console.error('Create group error:', e);
        showToast('Network error', 'error');
    }
}

// =====================
//  EDIT GROUP MODAL
// =====================
let editGroupId = null;

window.removeEditingParticipant = function(idx) {
    if (!window.confirm(typeof i18n === 'function' && i18n("confirm_delete_member") ? i18n("confirm_delete_member") : "Are you sure you want to remove this member?")) return;
    window.currentEditingParticipants.splice(idx, 1);
    renderEditFriendsChips();
};

window.removeCreatingParticipant = function(idx) {
    if (!window.confirm(typeof i18n === 'function' && i18n("confirm_delete_member") ? i18n("confirm_delete_member") : "Are you sure you want to remove this member?")) return;
    window.currentCreatingParticipants.splice(idx, 1);
    renderFriendsChips();
};

async function openEditGroupModalAsync(groupId) {
    editGroupId = groupId;
    window.currentEditingParticipants = [];
    if (typeof window.reactOpenEditModal === 'function') {
        window.reactOpenEditModal(groupId);
    }
    
    // Fetch full group details including participants and budgets
    try {
        const res = await fetch(`/api/groups/${groupId}`);
        const data = await res.json();
        if (res.ok && !data.error) {
            const group = data.group || data;
            if (typeof window.reactSetEditGroupDetails === 'function') {
                window.reactSetEditGroupDetails(group);
            }
            const populateEditModal = () => {
                const nameEl = document.getElementById('edit-group-name');
                if (!nameEl) {
                    setTimeout(populateEditModal, 50);
                    return;
                }
                nameEl.value = group.name || '';
            // Set per-user toggle
            const bpuEl = document.getElementById('edit-group-budget-per-user');
            if (bpuEl) bpuEl.checked = !!group.is_budget_per_user;
            
            // Set checkboxes and global inputs based on budgets_json
            const budgets = group.budgets_json || {};
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
            
            const currEl = document.getElementById('edit-group-currency');
            if (currEl) currEl.value = budgets.currency || 'ILS';
            
            toggleBudgetFields('edit');
            
            // Populate members
            if (group.participants) {
                window.currentEditingParticipants = group.participants.map(p => ({
                    id: p.id,
                    name: p.name,
                    contact: p.contact || p.name,
                    type: p.is_guest ? 'guest' : (p.type || 'registered'),
                    budgets_json: p.budgets_json || {},
                    status: 'member'
                }));
            } else {
                window.currentEditingParticipants = [];
            }
            
            // Ensure current user is in the array:
            const currentUserPhone = window.currentUser?.phone || window.currentUser?.email;
            const hasAdmin = window.currentEditingParticipants.find(p => p.contact === currentUserPhone || p.phone === currentUserPhone || p.email === currentUserPhone);
            if (!hasAdmin && window.currentUser) {
                window.currentEditingParticipants.unshift({
                    name: window.currentUser.name || 'Me',
                    contact: currentUserPhone || '',
                    phone: window.currentUser.phone || '',
                    email: window.currentUser.email || '',
                    type: 'registered',
                    status: 'admin'
                });
            }
            
            renderEditFriendsChips();
            switchInviteTab('whatsapp', 'edit');
            };
            populateEditModal();
        }
    } catch (e) {
        console.error('Failed to load group details', e);
        closeEditGroupModal();
    }
}

function closeEditGroupModal() {
    if (typeof window.reactCloseEditModal === 'function') {
        window.reactCloseEditModal();
    }
    editGroupId = null;
    window.currentEditingParticipants = [];
}

async function addEditFriend() {
    const input = document.getElementById('edit-friend-input');
    const contact = input?.value.trim();
    if (!contact) return;
    if (window.currentEditingParticipants.some(f => (f.contact || f.name || f) === contact)) { input.value = ''; return; }
    window.currentEditingParticipants.push({ contact: contact, name: contact, type: 'registered', status: 'checking' });
    input.value = '';
    renderEditFriendsChips();
    try {
        const res = await fetch('/api/users/check', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contact: contact })
        });
        const data = await res.json();
        const entry = window.currentEditingParticipants.find(f => f.contact === contact);
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
        const entry = window.currentEditingParticipants.find(f => f.contact === contact);
        if (entry) { entry.status = 'unregistered'; entry.type = 'unregistered'; }
    }
    renderEditFriendsChips();
}

function addEditGuestFriend() {
    const guestName = prompt('\u05e9\u05dd \u05d4\u05de\u05e9\u05ea\u05de\u05e9 \u05d4\u05d0\u05d5\u05e8\u05d7:');
    if (!guestName || !guestName.trim()) return;
    const name = guestName.trim();
    if (window.currentEditingParticipants.some(f => (f.name || f) === name)) return;
    window.currentEditingParticipants.push({ name: name, type: 'guest', status: 'guest' });
    renderEditFriendsChips();
}

function removeEditFriend(idx) {
    if (!window.confirm(typeof i18n === 'function' && i18n("confirm_delete_member") ? i18n("confirm_delete_member") : "Are you sure you want to remove this member?")) return;
    window.currentEditingParticipants.splice(idx, 1);
    renderEditFriendsChips();
}

function renderEditFriendsChips() {
    const container = document.getElementById('edit-friends-chips');
    if (!container) return;
    container.innerHTML = window.currentEditingParticipants.map((n, idx) => createParticipantRowHTML(n, idx, 'edit')).join('');
}

async function saveEditGroup() {
    if (!editGroupId) return;
    const name = document.getElementById('edit-group-name')?.value.trim();
    const isBudgetPerUser = document.getElementById('edit-group-budget-per-user')?.checked || false;

    // Collect budgets_json
    const budgets_json = {};
    const dVal = parseFloat(document.getElementById('edit-budget-daily-amt')?.value);
    if (dVal > 0) budgets_json.daily = dVal;

    const mVal = parseFloat(document.getElementById('edit-budget-monthly-amt')?.value);
    if (mVal > 0) budgets_json.monthly = mVal;

    const yVal = parseFloat(document.getElementById('edit-budget-yearly-amt')?.value);
    if (yVal > 0) budgets_json.yearly = yVal;

    const cVal = document.getElementById('edit-group-currency')?.value;
    if (cVal) budgets_json.currency = cVal;

    if (!name) { alert(typeof i18n === 'function' ? i18n('err_fill_all') : 'Missing fields'); return; }

    const payload = { name, budgets_json, is_budget_per_user: isBudgetPerUser };
    
    // Extract participants strictly from the memory state array (WhatsApp style)
    const participants = window.currentEditingParticipants.map((p, idx) => {
        let pBudgets = {};
        if (isBudgetPerUser) {
            const dailyInput = document.getElementById(`edit-friend-${idx}-daily`);
            const monthlyInput = document.getElementById(`edit-friend-${idx}-monthly`);
            const yearlyInput = document.getElementById(`edit-friend-${idx}-yearly`);
            
            if (dailyInput && parseFloat(dailyInput.value) > 0) pBudgets.daily = parseFloat(dailyInput.value);
            if (monthlyInput && parseFloat(monthlyInput.value) > 0) pBudgets.monthly = parseFloat(monthlyInput.value);
            if (yearlyInput && parseFloat(yearlyInput.value) > 0) pBudgets.yearly = parseFloat(yearlyInput.value);
        }

        return { 
            id: p.id || null,
            name: p.name, 
            contact: p.contact || p.phone || p.email || p.name, 
            type: p.type || 'registered',
            status: p.status || 'member',
            budgets_json: isBudgetPerUser ? pBudgets : {}
        };
    });

    payload.participants = participants;

    try {
        const res = await fetch(`/api/groups/${editGroupId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (res.ok && data.success) {
            closeEditGroupModal();
            showToast(typeof i18n === 'function' ? i18n('toast_group_updated') : 'Group updated', 'success');
            await loadLobby();
        } else {
            alert(data.error || 'Network error');
        }
    } catch (e) {
        console.error('Save edit group error:', e);
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
                const el = document.getElementById(`${mode}-wa-phone`);
                if (el) el.value = phone;
                sendWhatsAppInviteFromTab(mode, name, phone);
            } else if (type === 'email') {
                const nEl = document.getElementById(`${mode}-email-name`);
                if (nEl && name) nEl.value = name;
                const eEl = document.getElementById(`${mode}-email-addr`);
                if (eEl && email) eEl.value = email;
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
    const isPerUser = document.getElementById(mode === 'create' ? 'group-budget-per-user' : 'edit-group-budget-per-user')?.checked;
    
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
    const buttons = document.querySelectorAll(`#${mode}-group-modal .invite-tab-btn`);
    buttons.forEach(btn => {
        if (btn.getAttribute('data-tab') === tabName) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    // Update panels
    const panels = document.querySelectorAll(`#${mode}-group-modal .invite-tab-panel`);
    panels.forEach(panel => {
        if (panel.getAttribute('data-panel') === tabName) {
            panel.classList.add('active');
        } else {
            panel.classList.remove('active');
        }
    });
}

function sendWhatsAppInviteFromTab(mode, providedName = null, providedPhone = null) {
    let phone = providedPhone;
    if (!phone) {
        const phoneInput = document.getElementById(mode === 'create' ? 'create-wa-phone' : 'edit-wa-phone');
        phone = phoneInput?.value.trim();
    }
    if (!phone) return;

    const list = mode === 'create' ? window.currentCreatingParticipants : window.currentEditingParticipants;
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
        if (typeof window.reactAddParticipantToEditGroup === 'function') window.reactAddParticipantToEditGroup({ contact: phone, name: providedName || phone, type: 'registered' });
        if (editGroupId) {
            const group = allGroups.find(t => t.id === editGroupId);
            if (group && group.invite_token) {
                const cleanPhone = phone.replace(/\D/g, '');
                const link = `${window.location.origin}/#join=${group.invite_token}`;
                const userName = window.currentUser ? window.currentUser.name : '';
                const text = encodeURIComponent(`Hey! ${userName} invited you to join the group '${group.name}' on MasterSplitter. Click here to join: ${link}`);
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

    const list = mode === 'create' ? window.currentCreatingParticipants : window.currentEditingParticipants;
    list.push({
        contact: email,
        name: name,
        type: 'registered',
        inviteMethod: 'email'
    });
    
    if (mode === 'create') renderFriendsChips();
    else {
        renderEditFriendsChips();
        if (typeof window.reactAddParticipantToEditGroup === 'function') window.reactAddParticipantToEditGroup({ contact: email, name: name, type: 'registered' });
    }
    
    nameInput.value = '';
    emailInput.value = '';
    
    // In edit mode, if group already exists, we could also directly fire the email invite API here.
    // For now we just queue it to be saved when user hits "Save" (or Create). 
    // Wait, the instructions say "Send Email Invite".
    // If it's an existing group, let's fire the API now.
    if (mode === 'edit' && editGroupId) {
        try {
            const res = await fetch(`/api/groups/${editGroupId}/invite-email`, {
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

    const list = mode === 'create' ? window.currentCreatingParticipants : window.currentEditingParticipants;
    list.push({
        name: name,
        type: 'guest',
        inviteMethod: 'guest'
    });
    
    if (mode === 'create') renderFriendsChips();
    else {
        renderEditFriendsChips();
        if (typeof window.reactAddParticipantToEditGroup === 'function') window.reactAddParticipantToEditGroup({ contact: email, name: name, type: 'registered' });
    }
    
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
function closeModal(id) {
    const m = document.getElementById(id);
    if (m) m.style.display = 'none';
}

function switchTab(tabName, skipHistory = false) {
    if (!skipHistory) {
        history.pushState({ tabName: tabName }, "", "#" + tabName);
    }
    // We're inside the app — make sure the bottom nav / FAB are visible. They get
    // hidden by showView('lobby'); a stray back-navigation could otherwise leave them
    // hidden until a full page refresh ("the bottom part disappears").
    const _bn = document.querySelector('.bottom-nav');
    if (_bn) _bn.style.display = 'flex';
    const _fab = document.getElementById('ai-fab');
    if (_fab) _fab.style.display = '';
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const screen = document.getElementById(`screen-${tabName}`);
    if (screen) screen.classList.add('active');
    if (tabName !== 'add') {
        const tab = document.getElementById(`tab-${tabName}`);
        if (tab) tab.classList.add('active');
    }
    if (tabName === 'home' || tabName === 'balances') fetchBalances();
    if (tabName === 'home') fetchExpenses();   // home needs expenses for stats + latest card
    if (tabName === 'dashboard') { fetchBalances(); fetchExpenses(); }
    if (tabName === 'expenses') fetchExpenses();
    if (tabName === 'add') {
        renderParticipants();
        if (typeof window.populateCurrencyDropdowns === 'function') {
            window.populateCurrencyDropdowns();
        }
        let groupCur = (window._groupSettings && window._groupSettings.budgets_json) ? window._groupSettings.budgets_json.currency : '';
        let defaultCur = groupCur || localStorage.getItem('last_currency') || 'ILS';
        const curInput = document.getElementById('currency');
        const curBtn = document.getElementById('currency-btn');
        if (curInput) curInput.value = defaultCur;
        if (curBtn) curBtn.innerText = getCurrencySymbol(defaultCur);
    }
}

async function logout() {
    try { await fetch('/api/logout', { method: 'POST' }); } catch (e) { }
    window.location.href = '/';
}

// Global showToast is defined in DOMContentLoaded

// =====================
//  GROUP MEMBERS
// =====================
async function fetchGroupMembers() {
    if (!currentGroupId) return;
    try {
        const res = await fetch(`/api/group_members/${currentGroupId}`);
        if (res.ok) {
            groupMembers = await res.json();
            renderParticipantAvatars();
        }
    } catch (e) { console.error('Fetch members error:', e); }
}

function renderParticipantAvatars() {
    const container = document.getElementById('group-avatars');
    const sub = document.getElementById('group-participants-label');
    if (!container) return;
    const colors = ['bg-yellow', 'bg-purple', 'bg-light'];
    const shown = groupMembers.slice(0, 3);
    const extra = groupMembers.length - 3;
    container.innerHTML = shown.map((m, i) => {
        if (m.avatar_url) {
            return `<img class="avatar avatar-img" src="${escapeHTML(m.avatar_url)}" alt="${escapeHTML(m.name)}" referrerpolicy="no-referrer">`;
        }
        return `<div class="avatar ${colors[i % colors.length]}">${escapeHTML(m.name.charAt(0))}</div>`;
    }).join('');
    if (extra > 0) container.innerHTML += `<div class="avatar bg-light">+${extra}</div>`;
    if (sub) sub.textContent = groupMembers.map(m => m.name).join(', ') || '';
}

// =====================
//  PARTICIPANT PILLS (replaces checkboxes)
// =====================
let currentPayerId = null;

function renderParticipants() {
    const container = document.getElementById('participants-container');
    if (!container) return;
    
    if (!currentPayerId && typeof window.currentUser !== 'undefined' && window.currentUser) {
        currentPayerId = window.currentUser.id;
    }

    const payerContainer = document.getElementById('payer-container');
    if (payerContainer) {
        payerContainer.innerHTML = groupMembers.map(m => {
            const isSelected = String(m.id) === String(currentPayerId);
            const style = isSelected ? 'border: 2px solid #a855f7; background-color: rgba(168, 85, 247, 0.1);' : '';
            return `<div class="participant-pill ${isSelected ? 'selected' : ''}" style="${style}" onclick="currentPayerId = '${escapeHTML(String(m.id))}'; renderParticipants();">
                <span class="pill-avatar">${escapeHTML(m.name.charAt(0))}</span>
                <span>${escapeHTML(m.name)}</span>
            </div>`;
        }).join('');
    }

    container.innerHTML = groupMembers.map(m => {
        const safeName = escapeHTML(m.name);
        const initial = escapeHTML(m.name.charAt(0));
        const isPayer = String(m.id) === String(currentPayerId);
        const payerStyle = isPayer ? 'border: 2px solid #22c55e; background-color: rgba(34, 197, 94, 0.1);' : '';
        return `
        <div class="participant-pill selected" style="${payerStyle}" data-id="${escapeHTML(String(m.id))}" onclick="togglePill(this)" oncontextmenu="setPayer(this, event)">
            <span class="pill-avatar">${initial}</span>
            <span>${safeName}</span>
            <span class="pill-check">✓</span>
        </div>`;
    }).join('');
    
    setupLongPress(container);
}

function setPayer(el, event) {
    if(event) event.preventDefault();
    const id = el.dataset.id;
    if (String(currentPayerId) === String(id)) {
        currentPayerId = null; // unset
    } else {
        currentPayerId = id;
    }
    renderParticipants();
}

function setupLongPress(container) {
    let pressTimer;
    const pills = container.querySelectorAll('.participant-pill');
    pills.forEach(pill => {
        pill.addEventListener('touchstart', (e) => {
            pressTimer = window.setTimeout(() => {
                pressTimer = null;
                setPayer(pill, null);
            }, 600);
        });
        pill.addEventListener('touchend', (e) => {
            if (pressTimer) {
                clearTimeout(pressTimer);
                pressTimer = null;
            }
        });
        pill.addEventListener('touchmove', (e) => {
            if (pressTimer) {
                clearTimeout(pressTimer);
                pressTimer = null;
            }
        });
    });
}

function togglePill(el) {
    el.classList.toggle('selected');
    if (document.getElementById('split-mode-toggle')?.checked) {
        renderCustomSplits();
    }
    if (document.getElementById('contribs-mode-toggle')?.checked) {
        renderContribInputs();
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
    const memberNames = groupMembers
        .filter(m => m.type !== 'local')
        .map(m => m.name);

    try {
        const res = await fetch('/api/ai/parse-expense', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, group_members: memberNames })
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
                const member = groupMembers.find(m =>
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
            for (const m of groupMembers) {
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
    if (!currentGroupId) return;
    try {
        const res = await fetch(`/api/expenses/${currentGroupId}`);
        if (res.status === 401) { window.location.href = '/'; return; }
        const expenses = await res.json();
        _cachedExpenses = expenses; // Cache for stats modal

        const profileCurrency = window.currentUser?.default_currency || 'ILS';
        const profileSym = getCurrencySymbol(profileCurrency);

        let html = '';
        let htmlSettled = '';  // settled expenses are grouped below a divider
        let firstCard = '';    // the most-recent row, reused on the home screen
        if (!expenses.length) {
            html = `<div class="loading-state">${typeof i18n === 'function' ? i18n('expenses_no_data') : 'אין הוצאות בינתיים'}</div>`;
        } else {
            expenses.forEach(exp => {
                let safeDateStr = '';
                if (exp.created_at) {
                    const d = new Date(exp.created_at.replace(' ', 'T'));
                    if (!isNaN(d)) {
                        const datePart = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
                        const timePart = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
                        safeDateStr = (document.documentElement.dir === 'rtl') ? `${datePart} <span style="margin:0 4px;"></span> ${timePart}` : `${timePart} <span style="margin:0 4px;"></span> ${datePart}`;
                    }
                }

                if (exp.type === 'settlement') {
                    const safePayer = escapeHTML(exp.payer);
                    const safePayee = escapeHTML(exp.payee_name);
                    const amtStr = `${getCurrencySymbol(exp.currency)}${formatNumber(exp.amount)}`;
                    const settledTxt = typeof i18n === 'function' ? i18n('balance_settled') : 'מאוזן (קיזוז)';
                    const settlementCard = `
                        <div class="expense-card settlement-card" style="border: 2px solid var(--success-color); background: rgba(46, 204, 113, 0.05);">
                            <div class="expense-content" style="text-align:center; padding: 10px;">
                                <div style="color: var(--success-color); font-weight: bold; margin-bottom: 5px;">✅ ${settledTxt}</div>
                                <div style="font-size: 0.95rem;">
                                    <strong>${safePayer}</strong> העביר/ה ל-<strong>${safePayee}</strong> סך של <strong dir="ltr">${amtStr}</strong>
                                </div>
                                <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 5px;">${safeDateStr}</div>
                            </div>
                        </div>
                    `;
                    html += settlementCard;
                    if (!firstCard) firstCard = settlementCard;
                    return;
                }

                const safeDesc = escapeHTML(exp.description);
                const safePayer = escapeHTML(exp.payer);
                const safeCat = escapeHTML(exp.category || 'כללי');
                const isPersonal = exp.is_personal ? true : false;

                // Payer avatar: Google image or initial
                const payerAvatar = exp.payer_avatar
                    ? `<img class="expense-avatar avatar-img" src="${escapeHTML(exp.payer_avatar)}" alt="${safePayer}" referrerpolicy="no-referrer">`
                    : `<div class="expense-avatar avatar-initial">${escapeHTML(exp.payer.charAt(0))}</div>`;

                // Currency display: show the expense in its own currency, with the
                // conversion to the viewer's PROFILE currency in parens. The backend
                // supplies amount_in_profile (true amount converted via live rate);
                // exp.amount is the group-base value and must NOT be shown as profile.
                let amountDisplay = '';
                const expCurrency = exp.currency || 'ILS';
                const expSym = getCurrencySymbol(expCurrency);
                const profileAmt = (exp.amount_in_profile != null) ? exp.amount_in_profile : exp.amount;

                if (expCurrency !== profileCurrency) {
                    // Foreign relative to the profile: original first, profile conversion in parens
                    const origAmt = (exp.original_amount != null) ? exp.original_amount : exp.amount;
                    amountDisplay = `<span class="primary-amount">${expSym}${parseFloat(origAmt).toFixed(0)}</span>
                        <span class="original-currency">(~${profileSym}${formatNumber(profileAmt)})</span>`;
                } else {
                    amountDisplay = `${profileSym}${formatNumber(profileAmt)}`;
                }

                const canEdit = window.currentUser && exp.user_id === window.currentUser.id;
                const editBtn = canEdit ? `<button class="edit-expense-btn" onclick="openEditExpenseModal(${exp.id}, ${exp.original_amount || exp.amount}, '${safeDesc.replace(/'/g, "\\'")}', '${safeCat.replace(/'/g, "\\'")}', '${expCurrency}')" title="Edit"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>` : '';

                // Delete button
                const canDelete = _groupSettings.is_admin || _groupSettings.allow_member_delete;
                const deleteBtn = canDelete ? `<button class="delete-expense-btn" onclick="deleteExpense(${exp.id})" title="Delete"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>` : '';

                // Settle button: shown only to debtors on unsettled non-personal expenses
                const splits0 = exp.splits || [];
                const myShareSplit = window.currentUser ? splits0.find(s => String(s.user_id) === String(window.currentUser.id)) : null;
                const isDebtorHere = myShareSplit && String(exp.user_id) !== String(window.currentUser?.id);
                let settleExpBtn = '';
                if (isDebtorHere && !isPersonal && !exp.settled) {
                    // Convert debtor's base-currency share to expense's original currency
                    let shareOrig = parseFloat(myShareSplit.amount);
                    if (exp.original_amount && exp.amount && Math.abs(parseFloat(exp.original_amount) - parseFloat(exp.amount)) > 0.01) {
                        shareOrig = shareOrig * (parseFloat(exp.original_amount) / parseFloat(exp.amount));
                    }
                    settleExpBtn = settleButtonsHtml(window.currentUser.id, exp.user_id, parseFloat(shareOrig.toFixed(2)), expCurrency, exp.id, true);
                }

                const personalBadge = isPersonal ? `<span class="personal-badge"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></span>` : '';
                const personalClass = isPersonal ? ' personal-expense' : '';

                // Participants display
                const splits = exp.splits || [];
                let participantsHTML = '';
                if (splits.length > 0 && !isPersonal) {
                    if (splits.length <= 4) {
                        // Show names
                        const names = splits.map(s => escapeHTML(s.name)).join(', ');
                        participantsHTML = `<span class="expense-participants-names">${names}</span>`;
                    } else {
                        // Show avatar circles + count
                        const shown = splits.slice(0, 4);
                        const rest = splits.length - 4;
                        let avatarsHtml = shown.map(s => {
                            if (s.avatar_url) {
                                return `<img class="split-mini-avatar" src="${escapeHTML(s.avatar_url)}" alt="${escapeHTML(s.name)}" referrerpolicy="no-referrer">`;
                            }
                            return `<div class="split-mini-avatar split-mini-initial">${escapeHTML(s.name.charAt(0))}</div>`;
                        }).join('');
                        if (rest > 0) {
                            avatarsHtml += `<div class="split-mini-avatar split-mini-more">+${rest}</div>`;
                        }
                        participantsHTML = `<div class="expense-participants-avatars">${avatarsHtml}</div>`;
                    }
                }

                // Expandable splits detail
                let splitsDetailHTML = '';
                if (splits.length > 0) {
                    let payerRow = '';
                    if (!isPersonal) {
                        let payerAmt = parseFloat(exp.amount);
                        if (exp.original_amount && parseFloat(exp.original_amount) !== parseFloat(exp.amount)) {
                            payerAmt = parseFloat(exp.original_amount);
                        }
                        const pAvatar = exp.payer_avatar 
                            ? `<img class="split-detail-avatar" src="${escapeHTML(exp.payer_avatar)}" referrerpolicy="no-referrer">`
                            : `<div class="split-detail-avatar split-detail-initial" style="background: rgba(34,197,94,0.2); color: #166534;">${escapeHTML(exp.payer.charAt(0))}</div>`;
                        payerRow = `<div class="split-detail-row">
                            ${pAvatar}
                            <span class="split-detail-name" style="color: #166534; font-weight: bold;">${escapeHTML(exp.payer)}</span>
                            <span class="split-detail-amount" style="color: #16a34a; font-weight: bold;">${typeof i18n === 'function' ? i18n('expense_paid_by') || 'שילם/ה: ' : 'שילם/ה: '}${expSym}${payerAmt.toFixed(1)}</span>
                        </div>`;
                    }

                    const numSplits = splits.length;
                    const expectedEven = parseFloat(exp.amount) / numSplits;
                    let isCustomSplit = false;
                    for (let s of splits) {
                        if (Math.abs(parseFloat(s.amount) - expectedEven) > 0.02) {
                            isCustomSplit = true;
                            break;
                        }
                    }

                    const splitRows = splits.map(s => {
                        const isPayer = String(s.user_id) === String(exp.user_id);
                        const colorStyle = isPayer ? 'color: #6b7280;' : 'color: #dc2626;';
                        const nameStyle = isCustomSplit ? 'color: var(--text-main);' : colorStyle;

                        let displayAmt = parseFloat(s.amount);
                        if (exp.original_amount && parseFloat(exp.original_amount) !== parseFloat(exp.amount)) {
                            if (!isCustomSplit) {
                                displayAmt = parseFloat(exp.original_amount) / numSplits;
                            } else {
                                const ratio = parseFloat(exp.original_amount) / parseFloat(exp.amount);
                                displayAmt = displayAmt * ratio;
                            }
                        }

                        // Contribution: show "paid X → owes Y" when multi-payer is active
                        const contribOrig = parseFloat(s.contribution_orig) || 0;
                        const netOwed = Math.max(0, displayAmt - contribOrig);
                        const showContrib = !isPayer && contribOrig > 0;

                        const sAvatar = s.avatar_url
                            ? `<img class="split-detail-avatar" src="${escapeHTML(s.avatar_url)}" referrerpolicy="no-referrer">`
                            : `<div class="split-detail-avatar split-detail-initial">${escapeHTML(s.name.charAt(0))}</div>`;

                        const labelText = showContrib
                            ? `<span style="font-size:0.78em; color:var(--text-muted); margin-right:4px;">שילמ ${expSym}${contribOrig.toFixed(1)} · חייב/ת:</span>`
                            : `<span style="font-size:0.8em; color:var(--text-muted); margin-right:4px;">${isPayer ? (i18n && i18n('split_own_share') || 'החלק שלו/ה:') : (i18n && i18n('split_owes') || 'חייב/ת:')}</span>`;
                        const amtText = showContrib ? netOwed.toFixed(1) : displayAmt.toFixed(1);
                        const amtColor = showContrib ? (netOwed < 0.01 ? '#22c55e' : '#dc2626') : colorStyle;

                        return `<div class="split-detail-row">
                            ${sAvatar}
                            <span class="split-detail-name" style="${nameStyle}">${escapeHTML(s.name)}</span>
                            <span class="split-detail-amount" style="color:${amtColor}">${labelText}${expSym}${amtText}</span>
                        </div>`;
                    }).join('');
                    splitsDetailHTML = `<div class="expense-splits-detail" id="splits-${exp.id}" style="display:none">
                        <div class="splits-detail-header">${typeof i18n === 'function' ? i18n('expense_split_detail') || 'פירוט חלוקה' : 'פירוט חלוקה'}</div>
                        ${payerRow}
                        ${splitRows}
                    </div>`;
                }

                // "Settled" is computed per-expense on the backend: a multi-person
                // expense is settled once every debtor has repaid the payer for it.
                // Settled expenses get no badge — they are moved below a divider.
                const isSettled = (exp.type !== 'settlement') && exp.settled === true;
                const settledBorder = isSettled ? 'border: 1px solid var(--success);' : 'border: 1px solid var(--glass-border);';

                const card = `
                <div class="list-item${personalClass} expense-expandable" id="expense-${exp.id}" onclick="toggleExpenseSplits(${exp.id}, event)" style="display: flex; flex-direction: column; align-items: stretch; gap: 0; background: var(--surface-card); border-radius: 16px; padding: 16px 18px; margin-bottom: 12px; ${settledBorder} position: relative; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);">
                    <div class="list-item-main" style="display: flex; flex-wrap: nowrap; justify-content: space-between; align-items: stretch; width: 100%; gap: 10px;">
                        <div class="item-left" style="min-width: 0; flex: 1;">
                            ${payerAvatar}
                            <div class="item-details" style="min-width: 0;">
                                <h4 style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${safeDesc} ${personalBadge}</h4>
                                <p style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${safePayer} \u2022 ${translateCategory(exp.category || 'כללי')}</p>
                                ${participantsHTML}
                            </div>
                        </div>
                        <div class="item-right" style="flex-shrink: 0; align-self: stretch; display: flex; flex-direction: column; align-items: flex-end; justify-content: space-between; padding-top: 4px;">
                            <div style="font-size: 0.75rem; color: var(--text-sec); font-weight: 500; white-space: nowrap; margin-bottom: 6px;">${safeDateStr}</div>
                            <div class="item-amount" style="margin-bottom: auto;">${amountDisplay}</div>
                            <div class="expense-actions" style="margin-top: 8px;">
                                ${settleExpBtn}
                                ${isPersonal ? '' : `<button class="edit-expense-btn" onclick="openEditExpenseModal(${exp.id}, ${parseFloat(exp.original_amount || exp.amount)}, '${safeDesc.replace(/'/g, "\\'")}', '${safeCat.replace(/'/g, "\\'")}', '${expCurrency}')">✏️</button>`}
                                ${deleteBtn}
                            </div>
                        </div>
                    </div>
                    ${splitsDetailHTML}
                </div>`;
                if (isSettled) { htmlSettled += card; } else { html += card; }
                if (!firstCard) firstCard = card;
            });
        }

        // PERMANENT divider: always shown when there are expenses, so the layout is
        // "open expenses above the line, settled (offset) expenses below it". A new
        // expense lands above; the moment it's settled it drops below the same line.
        if (expenses.length) {
            const sectionLbl = (typeof i18n === 'function')
                ? (i18n('expenses_settled_section') || 'הוצאות מאוזנות')
                : 'הוצאות מאוזנות';
            const noneOpen = (typeof i18n === 'function')
                ? (i18n('expenses_none_open') || 'אין הוצאות פתוחות') : 'אין הוצאות פתוחות';
            const noneSettled = (typeof i18n === 'function')
                ? (i18n('expenses_none_settled') || 'אין הוצאות מאוזנות עדיין') : 'אין הוצאות מאוזנות עדיין';
            const emptyNote = (txt) => `<div style="text-align:center; color:var(--text-muted); font-size:0.82rem; padding:10px 0;">${txt}</div>`;

            const aboveContent = html.trim() ? html : emptyNote(noneOpen);
            const belowContent = htmlSettled.trim() ? htmlSettled : emptyNote(noneSettled);
            const divider = `
                <div class="settled-divider" style="display:flex; align-items:center; gap:12px; margin:22px 4px 14px; color:var(--text-muted); font-size:0.8rem; font-weight:600;">
                    <span style="flex:1; height:1px; background:var(--glass-border);"></span>
                    <span style="white-space:nowrap;">✓ ${sectionLbl}</span>
                    <span style="flex:1; height:1px; background:var(--glass-border);"></span>
                </div>`;
            html = aboveContent + divider + belowContent;
        }

        const full = document.getElementById('expenses-list');
        if (full) full.innerHTML = html;

        // Home screen: show only the single latest row (same card design)
        const homeLatest = document.getElementById('home-latest-expense');
        if (homeLatest) {
            homeLatest.innerHTML = firstCard || `<div class="loading-state">${typeof i18n === 'function' ? i18n('expenses_no_data') : 'אין הוצאות בינתיים'}</div>`;
        }

        window.currentExpenses = expenses; // Store globally for edit modal
        renderCategoryChart(expenses);
        renderHomeStats(expenses);
        if (typeof renderDashboard === 'function') renderDashboard();
    } catch (e) { console.error('Fetch expenses error:', e); }
}

/**
 * Home screen stats: "my expenses" (my share across all expenses) vs
 * "group expenses" (total of all shared, non-personal expenses).
 * All amounts are in the viewer's profile currency via amount_in_profile.
 */
function renderHomeStats(expenses) {
    const elMine = document.getElementById('home-stat-mine');
    const elAll = document.getElementById('home-stat-all');
    if (!elMine && !elAll) return;
    const me = window.currentUser?.id;
    const profileCurrency = window.currentUser?.default_currency || 'ILS';
    const sym = getCurrencySymbol(profileCurrency);

    let mineSum = 0, mineCount = 0, allSum = 0, allCount = 0;
    (expenses || []).forEach(e => {
        if (e.type === 'settlement') return;
        const totProfile = (e.amount_in_profile != null) ? parseFloat(e.amount_in_profile) : parseFloat(e.amount);
        if (!e.is_personal) { allSum += totProfile; allCount++; }
        const splits = e.splits || [];
        const myS = splits.find(s => String(s.user_id) === String(me));
        if (myS) {
            const base = parseFloat(e.amount) || 0;
            const myShareProfile = base > 0 ? (parseFloat(myS.amount) / base) * totProfile : parseFloat(myS.amount);
            mineSum += myShareProfile;
            mineCount++;
        }
    });

    const expWord = typeof i18n === 'function' ? (i18n('home_expenses_count') || 'הוצאות') : 'הוצאות';
    if (elMine) elMine.textContent = `${sym}${formatNumber(Math.round(mineSum))}`;
    if (elAll) elAll.textContent = `${sym}${formatNumber(Math.round(allSum))}`;
    const elMineCount = document.getElementById('home-stat-mine-count');
    const elAllCount = document.getElementById('home-stat-all-count');
    if (elMineCount) elMineCount.textContent = `${mineCount} ${expWord}`;
    if (elAllCount) elAllCount.textContent = `${allCount} ${expWord}`;
}

/**
 * Home screen personal summary: who owes me, and who I owe (converted view,
 * profile currency). Built from the optimized settlements already cached.
 */
function renderHomePersonal() {
    const box = document.getElementById('home-personal-summary');
    if (!box) return;
    const optData = window.cachedOptimizedData;
    const me = window.currentUser?.id;
    if (!optData || !optData.optimized_settlements || me == null) {
        box.innerHTML = `<div class="loading-state">${typeof i18n === 'function' ? i18n('loading') : 'טוען...'}</div>`;
        return;
    }
    const profileCur = (window.currentUser && window.currentUser.default_currency) || optData.currency || 'ILS';
    const sym = getCurrencySymbol(profileCur);

    const owedToMe = optData.optimized_settlements.filter(s => s.to_id === me);   // they pay me
    const iOwe = optData.optimized_settlements.filter(s => s.from_id === me);     // I pay them

    const totalIn = owedToMe.reduce((a, s) => a + s.amount, 0);
    const totalOut = iOwe.reduce((a, s) => a + s.amount, 0);

    if (owedToMe.length === 0 && iOwe.length === 0) {
        const allSettledTitle = (typeof i18n === 'function') ? (i18n('balances_all_settled_title') || 'הכל מאוזן!') : 'הכל מאוזן!';
        box.innerHTML = `<div style="text-align:center; padding: 18px 12px; color: var(--text-muted);">
            <div style="font-size: 2rem; margin-bottom: 6px;">🎉</div>
            <div style="font-weight: 600;">${allSettledTitle}</div>
        </div>`;
        return;
    }

    const lblReceive = typeof i18n === 'function' ? (i18n('home_owed_to_me') || 'מקבל') : 'מקבל';
    const lblPay = typeof i18n === 'function' ? (i18n('home_i_owe') || 'חייב') : 'חייב';

    const rowsHtml = (list, sign, color) => {
        if (!list.length) return `<div class="home-debt-empty" data-i18n="home_none">—</div>`;
        return list.map(s => {
            const other = escapeHTML(sign > 0 ? s.from : s.to);
            return `<div class="home-debt-row">
                <span class="home-debt-name">${other}</span>
                <span class="home-debt-amt" style="color:${color}">${sym}${formatNumber(s.amount)}</span>
            </div>`;
        }).join('');
    };

    box.innerHTML = `
        <div class="home-summary-grid">
            <div class="home-summary-col">
                <div class="home-summary-head">
                    <span class="home-summary-label">${lblReceive}</span>
                    <strong class="home-summary-total positive">${sym}${formatNumber(totalIn)}</strong>
                </div>
                ${rowsHtml(owedToMe, 1, '#22c55e')}
            </div>
            <div class="home-summary-vline"></div>
            <div class="home-summary-col">
                <div class="home-summary-head">
                    <span class="home-summary-label">${lblPay}</span>
                    <strong class="home-summary-total negative">${sym}${formatNumber(totalOut)}</strong>
                </div>
                ${rowsHtml(iOwe, -1, '#ef4444')}
            </div>
        </div>`;
}

function toggleExpenseSplits(expId, event) {
    // Don't toggle if clicking on edit/delete buttons
    if (event && (event.target.closest('.edit-expense-btn') || event.target.closest('.delete-expense-btn'))) return;
    
    // Find the specific container that was clicked instead of global ID
    const expandable = event.currentTarget || event.target.closest('.expense-expandable');
    if (!expandable) {
        // Fallback to ID if currentTarget not available
        const detail = document.getElementById(`splits-${expId}`);
        if (!detail) return;
        const isOpen = detail.style.display !== 'none';
        document.querySelectorAll('.expense-splits-detail').forEach(d => d.style.display = 'none');
        document.querySelectorAll('.expense-expandable').forEach(d => d.classList.remove('expanded'));
        if (!isOpen) {
            detail.style.display = 'block';
            detail.closest('.expense-expandable')?.classList.add('expanded');
        }
        return;
    }
    
    const detail = expandable.querySelector('.expense-splits-detail');
    if (!detail) return;
    
    const isOpen = detail.style.display !== 'none';
    
    // Close all others first
    document.querySelectorAll('.expense-splits-detail').forEach(d => d.style.display = 'none');
    document.querySelectorAll('.expense-expandable').forEach(d => d.classList.remove('expanded'));
    
    if (!isOpen) {
        detail.style.display = 'block';
        expandable.classList.add('expanded');
    }
}

function openEditExpenseModal(id, amount, desc, category, currency) {
    document.getElementById('edit-expense-id').value = id;
    document.getElementById('edit-expense-desc').value = desc;
    document.getElementById('edit-expense-amount').value = amount;
    document.getElementById('edit-expense-category').value = category;
    
    const currSelect = document.getElementById('edit-expense-currency');
    if (currSelect) {
        currSelect.value = currency || 'ILS';
        currSelect.dispatchEvent(new Event('change', { bubbles: true }));
        const currBtn = document.getElementById('edit-expense-currency-btn');
        if (currBtn) {
            currBtn.innerText = getCurrencySymbol(currency || 'ILS');
        }
    }
    
    const catSelect = document.getElementById('edit-expense-category');
    if (catSelect) {
        catSelect.dispatchEvent(new Event('change', { bubbles: true }));
    }
    
    // Setup participants and splits
    const expense = (typeof _cachedExpenses !== 'undefined' && _cachedExpenses) ? _cachedExpenses.find(e => e.id === id) : null;
    const isPersonal = expense ? expense.is_personal : 0;
    
    const participantsContainer = document.getElementById('edit-participants-container');
    const splitsContainer = document.getElementById('edit-custom-splits-container');
    const splitToggle = document.getElementById('edit-split-mode-toggle');
    
    if (isPersonal) {
        document.getElementById('edit-expense-participants-group').style.display = 'none';
    } else {
        document.getElementById('edit-expense-participants-group').style.display = 'block';
        
        const editPayerContainer = document.getElementById('edit-payer-container');
        if (editPayerContainer && typeof groupMembers !== 'undefined') {
            if (typeof window.currentEditPayerId === 'undefined') {
                window.currentEditPayerId = expense ? String(expense.user_id) : (window.currentUser ? String(window.currentUser.id) : '');
            }
            window.renderEditPayer = function() {
                editPayerContainer.innerHTML = groupMembers.map(m => {
                    const isSelected = String(m.id) === String(window.currentEditPayerId);
                    const style = isSelected ? 'border: 2px solid #a855f7; background-color: rgba(168, 85, 247, 0.1);' : '';
                    return `<div class="participant-pill ${isSelected ? 'selected' : ''}" style="${style}" onclick="window.currentEditPayerId = '${escapeHTML(String(m.id))}'; window.renderEditPayer();">
                        <span class="pill-avatar">${escapeHTML(m.name.charAt(0))}</span>
                        <span>${escapeHTML(m.name)}</span>
                    </div>`;
                }).join('');
            };
            window.renderEditPayer();
        }
        
        // Render participants pills
        if (participantsContainer && typeof groupMembers !== 'undefined') {
            const expSplits = expense ? (expense.splits || []) : [];
            const involvedIds = expSplits.map(s => String(s.user_id));
            
            participantsContainer.innerHTML = groupMembers.map(m => {
                const safeName = escapeHTML(m.name);
                const initial = escapeHTML(m.name.charAt(0));
                // Only select those who were in the original split, or all if empty
                const isSelected = (involvedIds.length === 0) || involvedIds.includes(String(m.id));
                const selectedClass = isSelected ? 'selected' : '';
                return `
                <div class="participant-pill ${selectedClass}" data-id="${escapeHTML(String(m.id))}" onclick="toggleEditPill(this)">
                    <span class="pill-avatar">${initial}</span>
                    <span>${safeName}</span>
                    <span class="pill-check">✓</span>
                </div>`;
            }).join('');
        }
        
        // Render custom splits amounts if they exist and are uneven, or just show toggle off
        if (expense && expense.splits && expense.splits.length > 0) {
            // Check if splits are evenly divided among participants
            const numSplits = expense.splits.length;
            const expectedEven = amount / numSplits;
            let isUneven = false;
            for (let s of expense.splits) {
                if (Math.abs(s.amount - expectedEven) > 0.01) {
                    isUneven = true;
                    break;
                }
            }
            
            splitToggle.checked = isUneven;
            renderEditCustomSplits(expense.splits);
        } else {
            splitToggle.checked = false;
            renderEditCustomSplits([]);
        }
        toggleEditSplitMode();
    }
    
    document.getElementById('edit-expense-modal').classList.add('open');
}

function toggleEditPill(el) {
    el.classList.toggle('selected');
    if (document.getElementById('edit-split-mode-toggle')?.checked) {
        renderEditCustomSplits();
    }
}

function toggleEditSplitMode() {
    const container = document.getElementById('edit-custom-splits-container');
    const msg = document.getElementById('edit-split-validation-msg');
    const isChecked = document.getElementById('edit-split-mode-toggle')?.checked;
    if (isChecked) {
        container.style.display = 'flex';
        msg.style.display = 'block';
        renderEditCustomSplits();
    } else {
        container.style.display = 'none';
        msg.style.display = 'none';
    }
}

function renderEditCustomSplits(existingSplits = []) {
    const container = document.getElementById('edit-custom-splits-container');
    if (!container) return;
    
    const selectedIds = Array.from(document.querySelectorAll('#edit-participants-container .participant-pill.selected')).map(pill => pill.dataset.id);
    const selectedMembers = (typeof groupMembers !== 'undefined' ? groupMembers : []).filter(m => selectedIds.includes(String(m.id)));
    
    if (selectedMembers.length === 0) {
        container.innerHTML = `<div style="padding:10px; color:var(--text-sec); font-size:0.9rem;" data-i18n="select_participants_first">בחר משתתפים קודם</div>`;
        return;
    }
    
    // Map existing splits by user_id for quick lookup
    const splitsMap = {};
    existingSplits.forEach(s => splitsMap[String(s.user_id)] = parseFloat(s.amount));
    
    // If no existing splits passed in, attempt to grab them from current DOM inputs to preserve changes during toggle
    if (!existingSplits.length) {
        selectedMembers.forEach(m => {
            const currentInput = document.getElementById(`edit-split-user-${m.id}`);
            if (currentInput) {
                splitsMap[String(m.id)] = parseFloat(currentInput.value) || 0;
            }
        });
    }

    const curCode = document.getElementById('edit-expense-currency') ? document.getElementById('edit-expense-currency').value : 'ILS';
    const curSym = getCurrencySymbol(curCode || 'ILS');

    let totalSaved = 0;
    container.innerHTML = selectedMembers.map(m => {
        const uid = String(m.id);
        const name = escapeHTML(m.name);
        const val = splitsMap[uid] !== undefined ? splitsMap[uid] : 0;
        totalSaved += val;
        return `
        <div class="split-user-row">
            <span class="split-user-name">${name}</span>
            <div class="split-input-wrapper">
                <span class="split-currency">${curSym}</span>
                <input type="number" id="edit-split-user-${escapeHTML(uid)}" class="split-amount-input" step="0.01" min="0" value="${val ? val.toFixed(2) : ''}" placeholder="0" oninput="updateEditSplitSum()">
            </div>
        </div>`;
    }).join('');
    
    updateEditSplitSum();
}

function updateEditSplitSum() {
    const msg = document.getElementById('edit-split-validation-msg');
    if (!msg) return;
    const inputs = document.querySelectorAll('.split-amount-input[id^="edit-split-user-"]');
    let sum = 0;
    inputs.forEach(i => sum += (parseFloat(i.value) || 0));
    const totalAmount = parseFloat(document.getElementById('edit-expense-amount')?.value || 0);
    
    const diff = Math.abs(sum - totalAmount);
    
    const curCode = document.getElementById('edit-expense-currency') ? document.getElementById('edit-expense-currency').value : 'ILS';
    const curSym = getCurrencySymbol(curCode || 'ILS');

    if (diff > 0.01) {
        msg.style.color = '#ff4d4f';
        const sumText = typeof i18n === 'function' ? i18n('split_sum_current') : 'סכום כרגע:';
        const neededText = typeof i18n === 'function' ? i18n('split_sum_needed') : 'חסר/עודף:';
        msg.textContent = `${sumText} ${curSym}${sum.toFixed(2)} | ${neededText} ${curSym}${Math.abs(totalAmount - sum).toFixed(2)}`;
    } else {
        msg.style.color = '#4caf50';
        msg.textContent = typeof i18n === 'function' ? i18n('split_sum_ok') : 'הסכום תקין! ✓';
    }
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
    
    const editPayerId = window.currentEditPayerId || null;

    // Process splits if not personal
    const expense = (typeof _cachedExpenses !== 'undefined' && _cachedExpenses) ? _cachedExpenses.find(e => e.id === parseInt(id, 10)) : null;
    const isPersonal = expense ? expense.is_personal : 0;
    
    let splits = null;
    if (!isPersonal) {
        const selectedIds = Array.from(document.querySelectorAll('#edit-participants-container .participant-pill.selected')).map(pill => pill.dataset.id);
        const validParts = selectedIds.filter(pid => !isNaN(parseInt(pid, 10)));
        
        if (validParts.length === 0) {
            alert(typeof i18n === 'function' ? i18n('err_no_participants') : 'בחר לפחות משתתף אחד.');
            return;
        }
        
        splits = [];
        if (document.getElementById('edit-split-mode-toggle')?.checked) {
            let splitSum = 0;
            for (const pid of validParts) {
                const inputVal = parseFloat(document.getElementById(`edit-split-user-${pid}`)?.value || 0);
                splits.push({ user_id: parseInt(pid, 10), amount: inputVal });
                splitSum += inputVal;
            }
            if (Math.abs(splitSum - parseFloat(amount)) > 0.01) {
                alert(typeof i18n === 'function' ? i18n('split_sum_error') : 'הסכומים לא תואמים לסכום הכולל');
                return;
            }
        } else {
            // Split equally
            const perPerson = parseFloat(amount) / validParts.length;
            for (const pid of validParts) {
                splits.push({ user_id: parseInt(pid, 10), amount: perPerson });
            }
        }
    }

    try {
        const res = await fetch(`/api/expenses/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                amount: parseFloat(amount), 
                description: desc, 
                category, 
                currency,
                splits: splits 
            })
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
    localStorage.setItem('last_currency', currency);
    const parts = getSelectedParticipants();

    const errAmount = typeof i18n === 'function' ? i18n('err_invalid_amount') : 'יש למלא סכום תקין.';
    const errDesc = typeof i18n === 'function' ? i18n('err_fill_all') : 'יש למלא תיאור.';
    const errParts = typeof i18n === 'function' ? i18n('err_no_participants') : 'בחר לפחות משתתף אחד.';

    if (!amountVal || parseFloat(amountVal) <= 0) { alert(errAmount); return; }
    if (!desc) { alert(errDesc); return; }
    if (!parts.length) { alert(errParts); return; }
    if (!currentGroupId) { alert('לא נבחר טיול.'); return; }

    const amount = parseFloat(amountVal);
    let splits = [];
    
    // Filter out non-numeric IDs (e.g. guests)
    const validParts = parts.filter(pid => !isNaN(parseInt(pid, 10)));
    const isPersonal = document.getElementById('personal-expense-toggle')?.checked || false;

    if (isPersonal) {
        // Personal expense: 100% to the payer (the logged-in user)
        // We'll let the backend handle this logic by sending splits=null or an empty array
        // However, it's safer to let the backend know it's personal and the backend can assign it.
        // Actually, if we send empty splits, the backend currently assigns to ALL.
        // Let's modify the backend to handle isPersonal properly. 
        // For now, we will send an empty array, and we MUST update Server.py to handle empty splits + isPersonal
        splits = []; 
    } else if (document.getElementById('split-mode-toggle')?.checked) {
        let splitSum = 0;
        
        if (typeof currentSplitType !== 'undefined' && currentSplitType === 'item') {
            let totalItems = 0;
            const itemCounts = {};
            for (const pid of validParts) {
                const count = parseFloat(document.getElementById(`split-user-${pid}`)?.value || 0);
                itemCounts[pid] = count;
                totalItems += count;
            }
            if (totalItems <= 0) {
                alert("סך הפריטים/היחס חייב להיות גדול מ-0");
                return;
            }
            for (const pid of validParts) {
                const userAmount = (itemCounts[pid] / totalItems) * amount;
                splits.push({ user_id: parseInt(pid, 10), amount: userAmount });
            }
        } else {
            for (const pid of validParts) {
                const inputVal = parseFloat(document.getElementById(`split-user-${pid}`)?.value || 0);
                splits.push({ user_id: parseInt(pid, 10), amount: inputVal });
                splitSum += inputVal;
            }

            if (Math.abs(splitSum - amount) > 0.01) {
                const sumErr = typeof i18n === 'function' ? i18n('split_sum_error') : 'הסכומים לא תואמים לסכום הכולל';
                alert(sumErr);
                return;
            }
        }
    } else {
        // Split equally among selected valid participants
        if (validParts.length > 0) {
            const perPerson = amount / validParts.length;
            for (const pid of validParts) {
                splits.push({ user_id: parseInt(pid, 10), amount: perPerson });
            }
        }
    }

    // Collect contributions if enabled
    let contributions = null;
    if (document.getElementById('contribs-mode-toggle')?.checked) {
        const cinputs = document.querySelectorAll('#contribs-container input[data-contrib-uid]');
        if (cinputs.length > 0) {
            contributions = Array.from(cinputs).map(inp => ({
                user_id: parseInt(inp.dataset.contribUid, 10),
                amount: parseFloat(inp.value) || 0
            })).filter(c => c.amount > 0);
            const contribSum = contributions.reduce((a, c) => a + c.amount, 0);
            if (Math.abs(contribSum - amount) > 0.01) {
                alert(typeof i18n === 'function' ? i18n('contribs_sum_error') : 'סכומי התשלום חייבים להסתכם לסכום הכולל');
                return;
            }
        }
    }

    try {
        const payload = {
            group_id: currentGroupId,
            amount: amount,
            description: desc,
            category,
            currency,
            splits: splits,
            is_personal: document.getElementById('personal-expense-toggle')?.checked || false
        };
        if (currentPayerId) {
            payload.payer_id = currentPayerId;
        }
        if (contributions && contributions.length > 0) {
            payload.contributions = contributions;
        }

        const res = await fetch('/api/expenses', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (res.status === 401) { window.location.href = '/'; return; }
        const data = await res.json();
        if (res.ok && data.success) {
            amountInput.value = '';
            descInput.value = '';
            document.getElementById('split-mode-toggle').checked = false;
            const contribToggle = document.getElementById('contribs-mode-toggle');
            if (contribToggle) { contribToggle.checked = false; toggleContribMode(); }
            const personalToggle = document.getElementById('personal-expense-toggle');
            if (personalToggle) personalToggle.checked = false;
            toggleSplitMode();
            showToast(typeof i18n === 'function' ? i18n('toast_expense_added') : 'ההוצאה נוספה! 💸');
            currentPayerId = null;
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

window.currentBalancesView = 'currency';
window.cachedBalancesData = null;
window.cachedOptimizedData = null;

function setBalancesView(view) {
    window.currentBalancesView = view;
    const btns = {
        currency: document.getElementById('btn-view-currency'),
        group: document.getElementById('btn-view-group'),
        converted: document.getElementById('btn-view-converted')
    };
    Object.keys(btns).forEach(k => {
        const b = btns[k];
        if (!b) return;
        const on = (k === view);
        b.style.background = on ? 'var(--primary)' : 'transparent';
        b.style.color = on ? '#fff' : 'var(--text-muted)';
    });
    renderBalancesList();
}

async function fetchBalances() {
    if (!currentGroupId) return;
    try {
        const [resBal, resOpt] = await Promise.all([
            fetch(`/api/balances/${currentGroupId}`),
            fetch(`/api/groups/${currentGroupId}/optimized-balances`)
        ]);

        if (resBal.status === 401 || resOpt.status === 401) { window.location.href = '/'; return; }
        
        window.cachedBalancesData = await resBal.json();
        window.cachedOptimizedData = await resOpt.json();

        const data = window.cachedBalancesData;
        const budget = currentGroupData?.budget || 0;
        const budgetType = currentGroupData?.budget_type || 'none';
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
        const userSym = getGroupCurrencySymbol();
        if (elSpent) elSpent.textContent = `${userSym}${formatNumber(spent)}`;
        if (elBudget) elBudget.textContent = `${userSym}${budget}`;
        if (elLeft) elLeft.textContent = `${userSym}${formatNumber(Math.max(0, left))}`;
        if (elPct) elPct.textContent = `${pct}%`;

        renderBalancesList();
        renderHomePersonal();
        if (typeof renderDashboard === 'function') renderDashboard();

        // Show the "reset settlements" recovery control to group admins only
        const resetBtn = document.getElementById('btn-reset-settlements');
        if (resetBtn) {
            const isAdmin = (typeof _groupSettings !== 'undefined' && _groupSettings.is_admin)
                || (currentGroupData && currentGroupData.is_owner);
            resetBtn.style.display = isAdmin ? 'block' : 'none';
        }
    } catch (e) { console.error('Fetch balances error:', e); }
}

function renderBalancesList() {
    const list = document.getElementById('balances-list');
    if (!list) return;
    
    const data = window.cachedBalancesData;
    const optData = window.cachedOptimizedData;
    if (!data || !optData) return;
    
    if (!data.balances?.length) { 
        list.innerHTML = `<div class="loading-state">${typeof i18n === 'function' ? i18n('balances_no_data') : 'אין נתונים'}</div>`; 
        return; 
    }

    const view = window.currentBalancesView || 'currency';
    const isMulti = view === 'currency';      // by entry currency (breakdown)
    const isGroup = view === 'group';         // netted in the group's base currency
    // Converted ("my currency") amounts are returned already converted to the viewer's
    // PROFILE currency; base amounts use the group's base currency.
    const profileCur = (window.currentUser && window.currentUser.default_currency) || optData.currency || 'ILS';
    const userSym = getCurrencySymbol(profileCur);
    const baseCur = optData.base_currency || 'ILS';
    const baseSym = getCurrencySymbol(baseCur);

    // Single-currency debt lines — used by the "group currency" and "my currency" views.
    const singleDebtLines = (settlements, sym, settleCur, userId, settledTxt) => {
        const debts = (settlements || []).filter(s => s.from_id === userId || s.to_id === userId);
        if (!debts.length) return `<div class="debt-line" style="justify-content:center; color:var(--text-muted);">${settledTxt} ✓</div>`;
        return debts.map(s => {
            const isDebtor = window.currentUser && window.currentUser.id === s.from_id;
            const isCreditor = window.currentUser && window.currentUser.id === s.to_id;
            const settleBtn = (isDebtor || isCreditor) ? settleButtonsHtml(s.from_id, s.to_id, s.amount, settleCur, null, false) : '';
            return `<div class="debt-line"><div class="debt-info"><span>${escapeHTML(s.from)}</span><span class="debt-arrow">←</span><span>${escapeHTML(s.to)}</span><span class="debt-amount">${sym}${formatMoney(s.amount)}</span></div>${settleBtn}</div>`;
        }).join('');
    };

    let activeBalances = data.balances.filter(b => {
        if (isMulti) {
            const cb = (optData.user_currency_balances || {})[b.user_id] || {};
            return Object.values(cb).some(v => Math.abs(v) > 0.01);
        } else if (isGroup) {
            const bb = (optData.user_base_balances || {})[b.user_id] || {};
            return Object.values(bb).some(v => Math.abs(v) > 0.01);
        }
        return Math.abs(b.balance) > 0.01;
    });

    if (activeBalances.length === 0) {
        const allSettledTitle = (typeof i18n === 'function') ? (i18n('balances_all_settled_title') || 'הכל מאוזן!') : 'הכל מאוזן!';
        const allSettledSub = (typeof i18n === 'function') ? (i18n('balances_all_settled_sub') || 'אין חובות פתוחים בקבוצה.') : 'אין חובות פתוחים בקבוצה.';
        list.innerHTML = `<div style="text-align:center; padding: 40px 20px; color: var(--text-muted);">
            <div style="font-size: 3rem; margin-bottom: 10px;">🎉</div>
            <div style="font-size: 1.1rem; font-weight: 500;">${allSettledTitle}</div>
            <div style="font-size: 0.9rem; margin-top: 5px;">${allSettledSub}</div>
        </div>`;
        return;
    }

    list.innerHTML = activeBalances.map(b => {
        const isPos = b.balance > 0.01;
        const isNeg = b.balance < -0.01;
        let badgeCls = isPos ? 'positive' : isNeg ? 'negative' : 'neutral';

        const txtReceive = typeof i18n === 'function' ? i18n('balance_receive') : 'צריך לקבל';
        const txtPay = typeof i18n === 'function' ? i18n('balance_pay') : 'צריך לשלם';
        const txtSettled = typeof i18n === 'function' ? i18n('balance_settled') : 'מאוזן';
        
        let badgeTxt = isPos ? txtReceive : isNeg ? txtPay : txtSettled;
        let amtCls = isPos ? 'amount-pos' : isNeg ? 'amount-neg' : '';
        let amountDisplay = `${userSym}${formatMoney(Math.abs(b.balance))}`;

        const me = window.currentUser && b.user_id === window.currentUser.id ? (typeof i18n === 'function' ? i18n('balance_you') : ' (את/ה)') : '';
        const safeName = escapeHTML(b.name);

        let debtLines = '';

        if (isMulti) {
            // "By currency": per-entry-currency breakdown.
            const curBalances = (optData.user_currency_balances || {})[b.user_id] || {};
            const curKeys = Object.keys(curBalances);
            if (curKeys.length > 0) {
                amountDisplay = curKeys.map(c => {
                    const cb = curBalances[c];
                    const cbSym = getCurrencySymbol(c);
                    const cbCls = cb > 0.01 ? 'amount-pos' : cb < -0.01 ? 'amount-neg' : '';
                    return `<span class="${cbCls}">${cbSym}${formatMoney(Math.abs(cb))}</span>`;
                }).join(' <span style="color:var(--text-muted);font-weight:normal;">|</span> ');
                badgeTxt = (typeof i18n === 'function') ? (i18n('balance_split') || 'מאזן מפוצל') : 'מאזן מפוצל';
                badgeCls = 'neutral';
            }
            let allDebts = [];
            for (const cur of Object.keys(optData.currency_settlements || {})) {
                optData.currency_settlements[cur]
                    .filter(s => s.from_id === b.user_id || s.to_id === b.user_id)
                    .forEach(s => allDebts.push({ ...s, currency: cur }));
            }
            if (allDebts.length > 0) {
                debtLines = allDebts.map(s => {
                    const sSym = getCurrencySymbol(s.currency);
                    const isDebtor = window.currentUser && window.currentUser.id === s.from_id;
                    const isCreditor = window.currentUser && window.currentUser.id === s.to_id;
                    const settleBtn = (isDebtor || isCreditor) ? settleButtonsHtml(s.from_id, s.to_id, s.amount, s.currency, null, false) : '';
                    return `<div class="debt-line"><div class="debt-info"><span>${escapeHTML(s.from)}</span><span class="debt-arrow">←</span><span>${escapeHTML(s.to)}</span><span class="debt-amount">${sSym}${formatMoney(s.amount)}</span></div>${settleBtn}</div>`;
                }).join('');
            } else {
                debtLines = `<div class="debt-line" style="justify-content:center; color:var(--text-muted);">${txtSettled} ✓</div>`;
            }
        } else if (isGroup) {
            // "Group currency": single net debt in the group's base currency.
            const baseBal = ((optData.user_base_balances || {})[b.user_id] || {})[baseCur] || 0;
            badgeCls = baseBal > 0.01 ? 'positive' : baseBal < -0.01 ? 'negative' : 'neutral';
            badgeTxt = baseBal > 0.01 ? txtReceive : baseBal < -0.01 ? txtPay : txtSettled;
            const balCls = baseBal > 0.01 ? 'amount-pos' : baseBal < -0.01 ? 'amount-neg' : '';
            amountDisplay = `<span class="${balCls}">${baseSym}${formatMoney(Math.abs(baseBal))}</span>`;
            debtLines = singleDebtLines(optData.base_settlements, baseSym, baseCur, b.user_id, txtSettled);
        } else {
            // "My currency": single net debt converted to the viewer's display currency.
            debtLines = singleDebtLines(optData.optimized_settlements, userSym, profileCur, b.user_id, txtSettled);
        }

        return `
        <div class="balance-item" onclick="this.classList.toggle('open')">
            <div class="balance-header">
                <div class="item-left">
                    <div class="avatar bg-purple" style="width:40px;height:40px;font-size:1.2rem;">${escapeHTML(b.name.charAt(0))}</div>
                    <div class="item-details">
                        <h4>${safeName}${me}</h4>
                    </div>
                </div>
                <div class="item-right">
                    <span class="balance-badge ${badgeCls}">${badgeTxt}</span>
                    <div class="item-amount" style="display:flex; gap:4px; font-weight:bold;">${amountDisplay}</div>
                    <span class="accordion-arrow">▼</span>
                </div>
            </div>
            <div class="accordion-body">
                ${debtLines}
            </div>
        </div>`;
    }).join('');
}

function suggestLimboOffset() {
    if (!window.cachedOptimizedData) return;
    
    // Execute Limbo based on the currently selected view.
    const view = window.currentBalancesView || 'currency';
    const optData = window.cachedOptimizedData;

    let allDebts = [];
    if (view === 'currency') {
        for (const cur of Object.keys(optData.currency_settlements || {})) {
            optData.currency_settlements[cur].forEach(s => allDebts.push({ ...s, currency: cur }));
        }
    } else if (view === 'group') {
        const baseCur = optData.base_currency || 'ILS';
        allDebts = (optData.base_settlements || []).map(s => ({ ...s, currency: baseCur }));
    } else {
        // "My currency" debts are already in the viewer's profile currency
        const profileCur = (window.currentUser && window.currentUser.default_currency) || optData.currency || 'ILS';
        allDebts = (optData.optimized_settlements || []).map(s => ({ ...s, currency: profileCur }));
    }
    
    if (allDebts.length === 0) {
        showToast('אין חובות לקיזוז! 🎉', 'success');
        return;
    }
    
    window.currentLimboDebts = allDebts;
    
    const container = document.getElementById('limbo-list-container');
    container.innerHTML = allDebts.map(s => {
        const sSym = getCurrencySymbol(s.currency);
        return `<div style="display:flex; justify-content:space-between; margin-bottom:8px; padding:10px; background:rgba(255,255,255,0.05); border-radius:8px;">
            <div><span>${escapeHTML(s.from)}</span> <span style="color:var(--text-muted); margin:0 5px;">→</span> <span>${escapeHTML(s.to)}</span></div>
            <div style="font-weight:bold; color:var(--accent-yellow);">${sSym}${formatNumber(s.amount)}</div>
        </div>`;
    }).join('');
    
    document.getElementById('limbo-modal').style.display = 'flex';
}

async function executeLimboOffset() {
    if (!window.currentLimboDebts || window.currentLimboDebts.length === 0) return;
    
    const btn = document.querySelector('#limbo-modal .primary-btn');
    if (btn) btn.innerHTML = 'מבצע...';
    
    try {
        await Promise.all(window.currentLimboDebts.map(s => {
            return fetch('/api/settlements', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    group_id: currentGroupId,
                    payer_id: s.from_id,
                    payee_id: s.to_id,
                    amount: s.amount,
                    currency: s.currency
                })
            });
        }));
        
        closeModal('limbo-modal');
        showToast('כל החובות קוזזו בהצלחה! 🎉', 'success');
        fetchBalances();
    } catch (e) {
        console.error(e);
        showToast('שגיאה בקיזוז החובות', 'error');
    } finally {
        if (btn) btn.innerHTML = typeof i18n === 'function' ? i18n('execute_limbo') : 'בצע קיזוז';
    }
}

// --- Settle Up Modal ---
let _pendingSettle = null;

/**
 * Open the settle modal for a pair-level settlement (from the balance/summaries screen).
 * desc: optional human-readable label (e.g. "אבי → נופר")
 */
// Description line shown inside the settle modal (only for per-expense settles).
function _settleDesc(amount, currency, expenseId) {
    if (expenseId == null) return '';
    const sym = getCurrencySymbol(currency);
    const lbl = typeof i18n === 'function' ? (i18n('settle_expense_desc') || 'סלק הוצאה זו') : 'סלק הוצאה זו';
    return `${lbl} (${sym}${formatNumber(amount)})`;
}

// "סלק חוב" — opens the modal in CONFIRM mode (full amount, read-only, just confirm).
function triggerSettleUp(payerId, payeeId, amount, currency = 'ILS', expenseId = null) {
    _openSettleModal({ payerId, payeeId, amount, currency, expenseId }, _settleDesc(amount, currency, expenseId), 'full');
}

// "החזר חלקי" — opens the modal in PARTIAL mode (editable amount up to the debt).
function triggerSettlePartial(payerId, payeeId, amount, currency = 'ILS', expenseId = null) {
    _openSettleModal({ payerId, payeeId, amount, currency, expenseId }, _settleDesc(amount, currency, expenseId), 'partial');
}

// Build the pair of settle buttons (full + partial). `mini` = compact variant for
// the expense card. Same visual design in both places.
function settleButtonsHtml(payerId, payeeId, amount, currency, expenseId, mini) {
    const full = typeof i18n === 'function' ? (i18n('settle_up') || 'סלק חוב') : 'סלק חוב';
    const partial = typeof i18n === 'function' ? (i18n('settle_partial') || 'החזר חלקי') : 'החזר חלקי';
    const eid = (expenseId == null) ? 'null' : expenseId;
    const m = mini ? ' settle-mini' : '';
    return `<span class="settle-actions">`
        + `<button class="settle-btn${m}" onclick="event.stopPropagation(); triggerSettleUp(${payerId}, ${payeeId}, ${amount}, '${currency}', ${eid})">${full}</button>`
        + `<button class="settle-btn settle-btn-partial${m}" onclick="event.stopPropagation(); triggerSettlePartial(${payerId}, ${payeeId}, ${amount}, '${currency}', ${eid})">${partial}</button>`
        + `</span>`;
}

function _openSettleModal(settle, desc, mode = 'partial') {
    _pendingSettle = settle;
    const { amount, currency } = settle;
    const sym = getCurrencySymbol(currency);
    const overlay = document.getElementById('settle-modal-overlay');
    if (!overlay) return;
    const isFull = (mode === 'full');

    const titleEl = document.getElementById('settle-modal-title');
    const descEl  = document.getElementById('settle-modal-desc');
    const symEl   = document.getElementById('settle-modal-sym');
    const inp     = document.getElementById('settle-amount-input');
    const hint    = document.getElementById('settle-amount-hint');

    const fullLbl = typeof i18n === 'function' ? (i18n('settle_up') || 'סלק חוב') : 'סלק חוב';
    const partialLbl = typeof i18n === 'function' ? (i18n('settle_partial') || 'החזר חלקי') : 'החזר חלקי';
    if (titleEl) titleEl.textContent = isFull ? `💸 ${fullLbl}` : `✏️ ${partialLbl}`;
    if (descEl)  descEl.textContent  = desc || '';
    if (symEl)   symEl.textContent   = sym;
    if (inp) {
        inp.value = parseFloat(amount).toFixed(2);
        inp.max   = parseFloat(amount).toFixed(2);
        inp.readOnly = isFull;                 // full mode: confirm only, no editing
        inp.style.opacity = isFull ? '0.75' : '1';
    }
    if (hint) {
        if (isFull) {
            hint.textContent = typeof i18n === 'function' ? (i18n('settle_full_hint') || 'אישור סילוק החוב המלא') : 'אישור סילוק החוב המלא';
        } else {
            const maxTxt = typeof i18n === 'function' ? i18n('settle_max_hint') : 'מקסימום';
            hint.textContent = `${maxTxt}: ${sym}${formatNumber(amount)}`;
        }
    }
    overlay.style.display = 'flex';
    if (inp && !isFull) setTimeout(() => { inp.focus(); inp.select(); }, 50);
}

function closeSettleModal() {
    const overlay = document.getElementById('settle-modal-overlay');
    if (overlay) overlay.style.display = 'none';
    _pendingSettle = null;
}

async function confirmSettleUp() {
    if (!_pendingSettle) return;
    const inp = document.getElementById('settle-amount-input');
    const amount = parseFloat(inp?.value);
    if (!amount || amount <= 0) {
        alert(typeof i18n === 'function' ? i18n('enter_valid_amount') : 'הזן סכום תקין');
        return;
    }
    const maxAmt = parseFloat(inp?.max || _pendingSettle.amount);
    if (amount > maxAmt + 0.01) {
        alert(typeof i18n === 'function' ? i18n('settle_max_exceeded') : 'הסכום גדול מהחוב הפתוח');
        return;
    }

    const { payerId, payeeId, currency, expenseId } = _pendingSettle;
    closeSettleModal();

    try {
        const body = {
            group_id: currentGroupId,
            payer_id: payerId,
            payee_id: payeeId,
            amount: amount,
            currency: currency
        };
        if (expenseId != null) body.expense_id = expenseId;

        const res = await fetch('/api/settlements', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        const data = await res.json();
        if (res.ok && data.success) {
            showToast(typeof i18n === 'function' ? i18n('toast_settled') : 'החוב סולק! 🎉');
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

/**
 * Admin-only: clear ALL settlements for the current group.
 * Use to recover from stuck/phantom balances caused by bad settle data.
 */
async function resetGroupSettlements() {
    if (!currentGroupId) return;
    const msg = typeof i18n === 'function' ? i18n('reset_settlements_confirm')
        : 'לאפס את כל הקיזוזים בקבוצה? פעולה זו מוחקת את כל רשומות הסליקה ולא ניתנת לביטול.';
    if (!confirm(msg)) return;
    try {
        const res = await fetch(`/api/groups/${currentGroupId}/settlements/reset`, { method: 'POST' });
        const data = await res.json();
        if (res.ok && data.success) {
            showToast(`נמחקו ${data.deleted} קיזוזים. המאזן חושב מחדש.`, 'success');
            fetchBalances();
            if (typeof fetchExpenses === 'function') fetchExpenses();
        } else {
            alert(data.error || 'Failed to reset settlements.');
        }
    } catch (e) {
        console.error('Reset settlements error:', e);
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
                <div class="chart-bar" style="height: ${heightPct}%; background: ${c.color};" data-tooltip="${translateCategory(c.name)}: ${getGroupCurrencySymbol()}${val.toFixed(0)}"></div>
                <div class="chart-icon">${c.icon}</div>
            </div>`;
        }
    });

    chartContainer.innerHTML = html;
}

// ============================================
//   DASHBOARD SCREEN
// ============================================
const DASH_CAT_COLORS = {
    'אוכל': 'var(--accent-yellow)', 'לינה': 'var(--primary)', 'תחבורה': 'var(--accent-cyan)',
    'אטרקציות': 'var(--error)', 'כללי': 'var(--success)'
};

function setDashView(v) {
    window.dashView = v;
    const mine = document.getElementById('dash-view-mine');
    const group = document.getElementById('dash-view-group');
    if (mine) mine.classList.toggle('active', v === 'mine');
    if (group) group.classList.toggle('active', v === 'group');
    renderDashboard();
}

function _dashT(key, fallback) {
    return (typeof i18n === 'function' ? (i18n(key) || fallback) : fallback);
}

function _dashBarRow(label, icon, value, maxValue, sym, color, signed) {
    const pct = maxValue > 0 ? Math.max(3, Math.round(Math.abs(value) / maxValue * 100)) : 0;
    const valTxt = (signed && value < 0 ? '-' : '') + sym + formatNumber(Math.round(Math.abs(value)));
    return `<div class="dash-bar-row">
        <div class="dash-bar-head">
            <span class="dash-bar-label">${icon ? icon + ' ' : ''}${escapeHTML(label)}</span>
            <span class="dash-bar-val" style="color:${color};">${valTxt}</span>
        </div>
        <div class="dash-bar-track"><div class="dash-bar-fill" style="width:${pct}%; background:${color};"></div></div>
    </div>`;
}

function _dashStatCard(label, value, sub, accent) {
    return `<div class="dash-stat">
        <span class="dash-stat-label">${label}</span>
        <strong class="dash-stat-value" style="${accent ? 'color:' + accent + ';' : ''}">${value}</strong>
        ${sub ? `<span class="dash-stat-sub">${sub}</span>` : ''}
    </div>`;
}

function renderDashboard() {
    const screen = document.getElementById('screen-dashboard');
    if (!screen) return;
    if (!window.dashView) window.dashView = 'mine';
    const isMine = window.dashView !== 'group';

    const expenses = (window.currentExpenses || []).filter(e => e.type !== 'settlement');
    const bal = window.cachedBalancesData;
    const opt = window.cachedOptimizedData;
    const me = window.currentUser ? window.currentUser.id : null;
    const profileCur = (window.currentUser && window.currentUser.default_currency) || (opt && opt.currency) || 'ILS';
    const sym = getCurrencySymbol(profileCur);

    const expTot = (e) => (e.amount_in_profile != null ? parseFloat(e.amount_in_profile) : parseFloat(e.amount)) || 0;
    const myShare = (e) => {
        const s = (e.splits || []).find(x => String(x.user_id) === String(me));
        if (!s) return 0;
        const base = parseFloat(e.amount) || 0;
        return base > 0 ? (parseFloat(s.amount) / base) * expTot(e) : parseFloat(s.amount);
    };

    // ---- STATS ----
    const statsEl = document.getElementById('dash-stats');
    if (statsEl) {
        if (isMine) {
            let myShareSum = 0, myPaidSum = 0;
            expenses.forEach(e => {
                myShareSum += myShare(e);
                if (String(e.user_id) === String(me)) myPaidSum += expTot(e);
            });
            let myBalance = 0;
            if (bal && bal.balances) {
                const b = bal.balances.find(x => String(x.user_id) === String(me));
                if (b) myBalance = parseFloat(b.balance) || 0;
            }
            const balAccent = myBalance > 0.5 ? '#22c55e' : (myBalance < -0.5 ? '#ef4444' : 'var(--text-main)');
            const balSub = myBalance > 0.5 ? _dashT('home_owed_to_me', 'מקבל') : (myBalance < -0.5 ? _dashT('home_i_owe', 'חייב') : '');
            statsEl.innerHTML =
                _dashStatCard(_dashT('home_my_expenses', 'ההוצאות שלי'), `${sym}${formatNumber(Math.round(myShareSum))}`, `${expenses.length} ${_dashT('home_expenses_count', 'הוצאות')}`) +
                _dashStatCard(_dashT('dash_i_paid', 'שילמתי'), `${sym}${formatNumber(Math.round(myPaidSum))}`, '') +
                _dashStatCard(_dashT('dash_my_balance', 'המאזן שלי'), `${myBalance < 0 ? '-' : ''}${sym}${formatNumber(Math.round(Math.abs(myBalance)))}`, balSub, balAccent);
        } else {
            const groupExp = expenses.filter(e => !e.is_personal);
            const total = groupExp.reduce((a, e) => a + expTot(e), 0);
            const memberCount = (bal && bal.balances) ? bal.balances.length : (groupMembers ? groupMembers.length : 0);
            statsEl.innerHTML =
                _dashStatCard(_dashT('dash_total_spent', 'סה"כ הוצאות'), `${sym}${formatNumber(Math.round(total))}`, '') +
                _dashStatCard(_dashT('dash_expense_count', 'מספר הוצאות'), String(groupExp.length), '') +
                _dashStatCard(_dashT('dash_members', 'חברים'), String(memberCount), '');
        }
    }

    // ---- CATEGORIES ----
    const catEl = document.getElementById('dash-categories');
    if (catEl) {
        const catTotals = {};
        expenses.forEach(e => {
            const val = isMine ? myShare(e) : (e.is_personal ? 0 : expTot(e));
            if (val > 0) {
                const cat = e.category || 'כללי';
                catTotals[cat] = (catTotals[cat] || 0) + val;
            }
        });
        const cats = Object.keys(catTotals).sort((a, b) => catTotals[b] - catTotals[a]);
        const maxCat = cats.length ? catTotals[cats[0]] : 0;
        if (!cats.length) {
            catEl.innerHTML = `<div class="dash-empty">${_dashT('balances_no_data', 'אין נתונים')}</div>`;
        } else {
            catEl.innerHTML = cats.map(cat =>
                _dashBarRow(translateCategory(cat), getCategoryIcon(cat), catTotals[cat], maxCat, sym, DASH_CAT_COLORS[cat] || 'var(--primary)', false)
            ).join('');
        }
    }

    // ---- MEMBER BALANCES (group only) ----
    const memSection = document.getElementById('dash-members-section');
    const memEl = document.getElementById('dash-members');
    if (memSection && memEl) {
        if (isMine) {
            memSection.style.display = 'none';
        } else {
            memSection.style.display = '';
            const rows = (bal && bal.balances) ? bal.balances.slice() : [];
            const maxBal = rows.reduce((m, b) => Math.max(m, Math.abs(parseFloat(b.balance) || 0)), 0);
            const active = rows.filter(b => Math.abs(parseFloat(b.balance) || 0) > 0.5)
                .sort((a, b) => Math.abs(parseFloat(b.balance)) - Math.abs(parseFloat(a.balance)));
            if (!active.length) {
                memEl.innerHTML = `<div class="dash-empty">${_dashT('balances_all_settled_title', 'הכל מאוזן!')} 🎉</div>`;
            } else {
                memEl.innerHTML = active.map(b => {
                    const v = parseFloat(b.balance) || 0;
                    const color = v > 0 ? '#22c55e' : '#ef4444';
                    return _dashBarRow(b.name, '', v, maxBal, sym, color, true);
                }).join('');
            }
        }
    }

    // ---- DEBTS (who owes whom) ----
    const debtEl = document.getElementById('dash-debts');
    if (debtEl) {
        let setts = (opt && opt.optimized_settlements) ? opt.optimized_settlements.slice() : [];
        if (isMine) setts = setts.filter(s => s.from_id === me || s.to_id === me);
        if (!setts.length) {
            debtEl.innerHTML = `<div class="dash-empty">${_dashT('balances_all_settled_title', 'הכל מאוזן!')} 🎉</div>`;
        } else {
            debtEl.innerHTML = setts.map(s => {
                const iAmDebtor = s.from_id === me;
                const iAmCreditor = s.to_id === me;
                const hl = (iAmDebtor || iAmCreditor) ? ' dash-debt-me' : '';
                return `<div class="dash-debt-row${hl}">
                    <span class="dash-debt-from">${escapeHTML(s.from)}</span>
                    <span class="dash-debt-arrow">←</span>
                    <span class="dash-debt-to">${escapeHTML(s.to)}</span>
                    <span class="dash-debt-amt">${sym}${formatNumber(s.amount)}</span>
                </div>`;
            }).join('');
        }
    }
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
            const member = groupMembers.find(m => String(m.id) === String(uid));
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

// =====================
//  CONTRIBUTIONS MODE (multi-payer: who paid how much)
// =====================

function toggleContribMode() {
    const isOn = document.getElementById('contribs-mode-toggle')?.checked;
    const container = document.getElementById('contribs-container');
    const msg = document.getElementById('contribs-validation-msg');
    if (!container) return;
    if (isOn) {
        container.style.display = 'flex';
        renderContribInputs();
    } else {
        container.style.display = 'none';
        if (msg) msg.style.display = 'none';
    }
}

function renderContribInputs() {
    const container = document.getElementById('contribs-container');
    if (!container) return;
    const parts = getSelectedParticipants();
    if (!parts.length) {
        container.innerHTML = `<div style="color:var(--text-muted);text-align:center;padding:8px;">בחר קודם משתתפים</div>`;
        return;
    }
    const totalAmount = parseFloat(document.getElementById('amount')?.value || 0);
    const currency = document.getElementById('currency')?.value || 'ILS';
    const sym = getCurrencySymbol(currency);
    const equalShare = parts.length > 0 ? (totalAmount / parts.length) : 0;
    // Preserve existing values
    const existing = {};
    container.querySelectorAll('input[data-contrib-uid]').forEach(inp => {
        existing[inp.dataset.contribUid] = inp.value;
    });
    container.innerHTML = parts.map(pid => {
        const member = groupMembers.find(m => String(m.id) === String(pid));
        const name = member ? escapeHTML(member.name) : `משתתף`;
        const val = existing[pid] !== undefined ? existing[pid] : equalShare.toFixed(2);
        return `<div class="split-input-row">
            <span class="split-input-name">${name}</span>
            <input type="number" data-contrib-uid="${pid}" class="split-input-field"
                value="${val}" min="0" step="0.01" oninput="updateContribSum()">
        </div>`;
    }).join('');
    updateContribSum();
}

function updateContribSum() {
    const container = document.getElementById('contribs-container');
    const msg = document.getElementById('contribs-validation-msg');
    if (!container || !msg) return;
    const totalAmount = parseFloat(document.getElementById('amount')?.value || 0);
    const inputs = container.querySelectorAll('input[data-contrib-uid]');
    const sum = Array.from(inputs).reduce((acc, inp) => acc + (parseFloat(inp.value) || 0), 0);
    const diff = Math.abs(sum - totalAmount);
    const currency = document.getElementById('currency')?.value || 'ILS';
    const sym = getCurrencySymbol(currency);
    if (diff < 0.01) {
        msg.className = 'split-validation-msg valid';
        msg.textContent = typeof i18n === 'function' ? i18n('toast_expense_updated') : 'הסכומים תואמים! ✓';
        msg.style.display = 'block';
    } else {
        msg.className = 'split-validation-msg invalid';
        msg.textContent = `${sym}${sum.toFixed(2)} / ${sym}${totalAmount.toFixed(2)} — ${sum > totalAmount ? 'עודף' : 'חסר'} ${sym}${Math.abs(diff).toFixed(2)}`;
        msg.style.display = 'block';
    }
}

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
        const member = groupMembers.find(m => String(m.id) === String(pid));
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
        
        const curCode = document.getElementById('currency') ? document.getElementById('currency').value : 'ILS';
        const curSym = getCurrencySymbol(curCode || 'ILS');

        for (const pid of parts) {
            const count = parseFloat(document.getElementById(`split-user-${pid}`)?.value || 0);
            const userAmount = totalItems > 0 ? (count / totalItems) * totalAmount : 0;
            const calcSpan = document.getElementById(`split-calc-${pid}`);
            if (calcSpan) calcSpan.textContent = `(${curSym}${userAmount.toFixed(2)})`;
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
    
    const curCode = document.getElementById('currency') ? document.getElementById('currency').value : 'ILS';
    const curSym = getCurrencySymbol(curCode || 'ILS');

    if (Math.abs(diff) < 0.01) {
        msg.className = 'split-validation-msg valid';
        msg.textContent = typeof i18n === 'function' ? i18n('toast_expense_updated') : 'הסכומים תואמים! ✓';
    } else {
        msg.className = 'split-validation-msg invalid';
        const formattedDiff = Math.abs(diff).toFixed(2);
        if (diff > 0) {
            msg.textContent = `חסרים עוד ${curSym}${formattedDiff} לסכום הכולל`;
        } else {
            msg.textContent = `חריגה של ${curSym}${formattedDiff} מהסכום הכולל`;
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
    if (!currentGroupId) return;
    try {
        const res = await fetch(`/api/groups/${currentGroupId}/settings`);
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
    const userSym = getGroupCurrencySymbol();
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

        const numMembers = groupMembers ? groupMembers.length : 1;
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
    if (!currentGroupId) return;
    const container = document.getElementById('activity-list');
    if (!container) return;

    try {
        const res = await fetch(`/api/activity/${currentGroupId}`);
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
                const sym = getGroupCurrencySymbol();
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
        if (typeof renderGroupsList === 'function') renderGroupsList();
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
        selectedText.textContent = defaultOption ? (defaultOption.dataset.short || defaultOption.textContent) : '';
        selectedText.dataset.i18n = defaultOption ? (defaultOption.getAttribute('data-i18n') || '') : '';
        
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
            optDiv.className = 'custom-select-option' + (option.selected ? ' selected' : '');
            optDiv.textContent = option.textContent;
            if (option.getAttribute('data-i18n')) {
                optDiv.dataset.i18n = option.getAttribute('data-i18n');
            }
            optDiv.dataset.value = option.value;
            
            optDiv.addEventListener('click', (e) => {
                e.stopPropagation();
                select.value = option.value;
                selectedText.textContent = option.dataset.short || option.textContent;
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
        navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' })
            .then((registration) => {
                console.log('[PWA] Service Worker registered successfully. Scope:', registration.scope);
                registration.update();  // force an update check so a new SW (push handler) activates
                // If the user already granted notifications, keep the server subscription fresh.
                if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
                    subscribeToPush(false);
                }
            })
            .catch((error) => {
                console.error('[PWA] Service Worker registration failed:', error);
            });
    });
}

// =====================
//  WEB PUSH (phone notifications)
// =====================
function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const raw = atob(base64);
    const arr = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
    return arr;
}

/**
 * Subscribe this device to Web Push and store the subscription on the server.
 * interactive=true: prompt for permission and alert on problems (use from a click).
 * interactive=false: silent best-effort refresh (use on load).
 * Returns true on success.
 */
async function subscribeToPush(interactive = false) {
    try {
        if (!('serviceWorker' in navigator) || !('PushManager' in window) || typeof Notification === 'undefined') {
            if (interactive) alert('הדפדפן הזה לא תומך בהתראות פוש. נסה/י דרך האפליקציה המותקנת (PWA).');
            return false;
        }
        const cfgRes = await fetch('/api/push/vapid-public-key');
        const cfg = await cfgRes.json();
        if (!cfg.enabled || !cfg.key) {
            if (interactive) alert('התראות אינן מוגדרות בשרת כרגע.');
            return false;
        }
        let perm = Notification.permission;
        if (perm === 'default' && interactive) {
            perm = await Notification.requestPermission();
        }
        if (perm !== 'granted') {
            if (interactive) alert('כדי לקבל התראות יש לאשר את הרשאת ההתראות בדפדפן.');
            return false;
        }
        const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' });
        try { await reg.update(); } catch (e) {}
        await navigator.serviceWorker.ready;
        let sub = await reg.pushManager.getSubscription();
        if (!sub) {
            sub = await reg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(cfg.key),
            });
        }
        const res = await fetch('/api/push/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ subscription: sub }),
        });
        if (!res.ok) { if (interactive) alert('שמירת ההתראות בשרת נכשלה.'); return false; }
        if (interactive && typeof showToast === 'function') showToast('התראות הופעלו במכשיר זה ✅');
        return true;
    } catch (e) {
        console.error('subscribeToPush error:', e);
        if (interactive) alert('שגיאה בהפעלת התראות: ' + (e && e.message ? e.message : e));
        return false;
    }
}
window.subscribeToPush = subscribeToPush;

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
async function copyInviteLink(groupId) {
    const tid = groupId || currentGroupId;
    if (!tid) return;
    try {
        const res = await fetch(`/api/groups/${tid}/invite-link`, {
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
    if (!currentGroupId) return;
    try {
        const res = await fetch(`/api/groups/${currentGroupId}/invite-link`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        const data = await res.json();
        if (data.success && data.invite_token) {
            const link = `${window.location.origin}/join/${data.invite_token}`;
            const msg = encodeURIComponent(`Join my group on MasterSplitter! ${link}`);
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

    window.populateCurrencyDropdowns = function() {
        if (!window.globalCurrencies || !window.globalCurrencies.length) return;
        const selects = document.querySelectorAll('select.currency-select-dynamic, select[name="currency"]');
        const lastUsed = localStorage.getItem('last_currency') || 'ILS';
        const isHe = window.currentLanguage === 'he' || document.documentElement.lang === 'he';
        
        let groupCurrency = null;
        if (window.currentGroup && window.currentGroup.budgets_json && window.currentGroup.budgets_json.currency) {
            groupCurrency = window.currentGroup.budgets_json.currency;
        }

        const buildOption = (code) => {
            const c = window.globalCurrencies.find(x => x.code === code);
            if (!c) return '';
            const name = isHe ? c.name_he : c.name_en;
            const longText = `${c.code} - ${name} (${c.symbol})`;
            const shortText = `${c.symbol} ${c.code}`;
            return `<option value="${c.code}" data-short="${shortText}" data-long="${longText}">${longText}</option>`;
        };

        selects.forEach(select => {
            if (select.classList.contains('custom-dropdown-initialized')) {
                select.classList.remove('custom-dropdown-initialized');
                const container = select.nextElementSibling;
                if (container && container.classList.contains('custom-select-container')) {
                    container.remove();
                }
                select.style.display = '';
            }

            const currentVal = select.value || lastUsed;
            
            let favHTML = '';
            const favSet = new Set();
            
            const addFav = (code) => {
                if (code && !favSet.has(code)) {
                    favSet.add(code);
                    favHTML += buildOption(code);
                }
            };

            addFav(groupCurrency);
            addFav('ILS');
            addFav('USD');
            addFav('EUR');
            addFav(lastUsed);

            const allHTML = window.globalCurrencies.map(c => {
                const name = isHe ? c.name_he : c.name_en;
                const longText = `${c.code} - ${name} (${c.symbol})`;
                const shortText = `${c.symbol} ${c.code}`;
                return `<option value="${c.code}" data-short="${shortText}" data-long="${longText}">${longText}</option>`;
            }).join('');

            const html = `
                <optgroup label="מועדפים">
                    ${favHTML}
                </optgroup>
                <optgroup label="כל המטבעות">
                    ${allHTML}
                </optgroup>
            `;
            
            select.innerHTML = html;
            select.value = currentVal;

            if (select.id === 'currency') {
                const editSelect = document.getElementById('edit-expense-currency');
                if (editSelect) {
                    if (editSelect.classList.contains('custom-dropdown-initialized')) {
                        editSelect.classList.remove('custom-dropdown-initialized');
                        const container = editSelect.nextElementSibling;
                        if (container && container.classList.contains('custom-select-container')) {
                            container.remove();
                        }
                        editSelect.style.display = '';
                    }

                    const currentEditVal = editSelect.value || lastUsed;
                    editSelect.innerHTML = html;
                    editSelect.value = currentEditVal;
                }
            }
        });
        
        // Re-initialize custom dropdowns
        if (typeof setupCustomDropdowns === 'function') {
            setupCustomDropdowns();
        }
    };

    // Fetch currencies
    window.globalCurrencies = [];
    fetch('/api/currencies?v=' + new Date().getTime())
        .then(res => res.json())
        .then(data => {
            window.globalCurrencies = data;
            window.populateCurrencyDropdowns();
            window.dispatchEvent(new Event('currenciesLoaded'));
        }).catch(err => console.error("Error loading currencies:", err));

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
                        if (data.group_id) {
                            currentGroupId = data.group_id;
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


// =====================
//  REACT MODAL ACTIONS
// =====================
window.makeMemberAdmin = async function(group, contact) {
    if (!group) return;
    const groupId = group.id;
    const member = group.participants.find(p => p.contact === contact || p.email === contact || p.phone === contact);
    if (!member || member.type === 'guest') {
        showToast("Guests cannot be admins.", "error");
        return;
    }
    
    try {
        const res = await fetch(`/api/groups/${groupId}/members/${member.id}/promote`, { method: 'PUT' });
        const data = await res.json();
        if (res.ok && data.success) {
            showToast("Member promoted to admin", "success");
            await loadLobby(); // reload groups to update state
            // If the modal is open, we should also update its state by re-triggering openEditGroupModal or it will auto-update if we re-fetch.
            openEditGroupModalAsync(groupId);
        } else {
            showToast(data.error || "Error", "error");
        }
    } catch(e) {
        showToast("Network error", "error");
    }
};

window.removeMemberAdmin = async function(group, contact) {
    if (!group) return;
    const groupId = group.id;
    const member = group.participants.find(p => p.contact === contact || p.email === contact || p.phone === contact);
    if (!member || member.type === 'guest') {
        return;
    }
    
    if (!window.confirm("האם אתה בטוח שברצונך להסיר הרשאת ניהול ממשתמש זה?")) return;
    
    try {
        // Demote endpoint uses POST according to Server.py line 2048
        const res = await fetch(`/api/groups/${groupId}/demote/${member.id}`, { method: 'POST' });
        const data = await res.json();
        if (res.ok && data.success) {
            showToast("הרשאת הניהול הוסרה בהצלחה", "success");
            await loadLobby(); // reload groups to update state
            openEditGroupModalAsync(groupId);
        } else {
            showToast(data.error || "Error", "error");
        }
    } catch(e) {
        showToast("Network error", "error");
    }
};

window.removeGroupMember = async function(groupId, contact) {
    try {
        const res = await fetch(`/api/groups/${groupId}/members/${encodeURIComponent(contact)}`, { method: 'DELETE' });
        const data = await res.json();
        if (res.ok && data.success) {
            showToast("Member removed", "success");
            await loadLobby();
            openEditGroupModalAsync(groupId);
        } else {
            showToast(data.error || "Error", "error");
        }
    } catch(e) {
        showToast("Network error", "error");
    }
};

window.saveEditGroupFromReact = async function(group) {
    if (!group.id) return;

    // Remove duplicates or match participants
    const participants = (group.participants || []).map(p => {
        const key = p.contact || p.email || p.phone || p.name;
        let bJson = p.budgets_json || {};
        if (group.is_budget_per_user && group.user_budgets && group.user_budgets[key]) {
            const uBudget = group.user_budgets[key];
            bJson = {
                daily: uBudget.daily || '',
                monthly: uBudget.monthly || '',
                yearly: uBudget.yearly || ''
            };
        }
        return {
            id: p.id || null,
            name: p.name,
            contact: p.contact || p.name,
            type: p.type || 'registered',
            budgets_json: bJson
        };
    });

    const payload = { 
        name: group.name, 
        budgets_json: group.budgets_json || {},
        is_budget_per_user: group.is_budget_per_user,
        is_public_expenses: group.is_public_expenses,
        is_public_settlements: group.is_public_settlements,
        allow_member_delete: group.allow_member_delete,
        user_budgets: group.user_budgets || {},
        participants: participants
    };

    try {
        const res = await fetch(`/api/groups/${group.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (res.ok && data.success) {
            closeEditGroupModal();
            showToast(typeof i18n === 'function' ? i18n('toast_group_updated') : 'Group updated', 'success');
            await loadLobby();
        } else {
            alert(data.error || 'Network error');
        }
    } catch (e) {
        console.error('Save edit group error:', e);
        alert('Network error');
    }
};


window.openGroupInfo = function() {
    // Aggressively find the current group ID
    let groupId = currentGroupId || window.currentGroupId || window.activeGroupId || window.currentGroupId;
    if (!groupId && typeof currentGroupData !== 'undefined' && currentGroupData) groupId = currentGroupData.id;
    if (!groupId && window.currentGroup && window.currentGroup.id) groupId = window.currentGroup.id;
    if (!groupId && window.currentGroup && window.currentGroup.id) groupId = window.currentGroup.id;
    if (!groupId) {
        // Fallback: try to read from DOM if active group is stored in an attribute
        const activeTab = document.querySelector('.group-tab.active');
        if (activeTab) groupId = activeTab.dataset.id || activeTab.dataset.groupId;
    }
    
    if (!groupId) {
        alert(typeof i18n === 'function' ? i18n('error_no_active_group') || 'No active group found.' : 'No active group found.');
        return;
    }

    if (typeof showView === 'function') showView('lobby');

    setTimeout(() => {
        if (typeof window.reactOpenEditModal === 'function') {
            openEditGroupModalAsync(parseInt(groupId, 10));
        } else {
            console.error("reactOpenEditModal is not available.");
        }
    }, 100);

    const navMenu = document.getElementById('nav-menu');
    if (navMenu) navMenu.classList.remove('active');
};

window.openEditGroupModal = function(id, event) {
    if(event) event.stopPropagation();
    openEditGroupModalAsync(id);
};

// =====================
// GLOBAL CURRENCY PICKER
// =====================

window.currencyPickerCallback = null;
const ALL_CURRENCIES = [
    { code: 'ILS', symbol: '₪', name: 'Shekel', search: 'israeli shekel ₪ ils שקל' },
    { code: 'USD', symbol: '$', name: 'US Dollar', search: 'us dollar $ usd דולר ארהב' },
    { code: 'EUR', symbol: '€', name: 'Euro', search: 'euro € eur יורו אירו' },
    { code: 'GBP', symbol: '£', name: 'British Pound', search: 'british pound £ gbp פאונד לירה שטרלינג' },
    { code: 'JPY', symbol: '¥', name: 'Japanese Yen', search: 'japanese yen ¥ jpy ין יפני' },
    { code: 'THB', symbol: '฿', name: 'Thai Baht', search: 'thai baht ฿ thb באט תאילנדי' },
    { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar', search: 'canadian dollar c$ cad דולר קנדי' },
    { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', search: 'australian dollar a$ aud דולר אוסטרלי' },
    { code: 'CHF', symbol: 'Fr', name: 'Swiss Franc', search: 'swiss franc fr chf פרנק שוויצרי' }
];

window.openCurrencyPicker = function(callback) {
    window.currencyPickerCallback = callback;
    const modal = document.getElementById('currency-picker-modal');
    if (modal) {
        modal.style.display = 'flex';
        document.getElementById('currency-search-input').value = '';
        renderCurrenciesList('');
        setTimeout(() => document.getElementById('currency-search-input')?.focus(), 100);
    }
};

window.closeCurrencyPicker = function() {
    const modal = document.getElementById('currency-picker-modal');
    if (modal) {
        modal.style.display = 'none';
        window.currencyPickerCallback = null;
    }
};

window.filterCurrencies = function() {
    const q = (document.getElementById('currency-search-input')?.value || '').toLowerCase();
    renderCurrenciesList(q);
};

window.renderCurrenciesList = function(query) {
    const container = document.getElementById('currency-list-container');
    if (!container) return;
    
    let baseList = (window.globalCurrencies && window.globalCurrencies.length > 0) ? window.globalCurrencies : ALL_CURRENCIES;
    
    // Normalize properties for mapping and search
    let list = baseList.map(c => ({
        code: c.code,
        symbol: c.symbol,
        name: c.name_he || c.name || c.name_en || c.code,
        search: (c.search || `${c.name_he || ''} ${c.name || ''} ${c.name_en || ''} ${c.symbol || ''} ${c.code || ''}`).toLowerCase()
    }));

    if (query) {
        list = list.filter(c => c.search.includes(query));
    } else {
        const lastCur = localStorage.getItem('last_currency');
        const groupCur = (window._groupSettings && window._groupSettings.budgets_json) ? window._groupSettings.budgets_json.currency : '';
        const topCodes = ['ILS', 'USD', 'EUR'];
        list.sort((a, b) => {
            if (groupCur) {
                if (a.code === groupCur && b.code !== groupCur) return -1;
                if (b.code === groupCur && a.code !== groupCur) return 1;
            }
            if (lastCur && lastCur !== groupCur) {
                if (a.code === lastCur && b.code !== lastCur) return -1;
                if (b.code === lastCur && a.code !== lastCur) return 1;
            }
            const aTop = topCodes.indexOf(a.code);
            const bTop = topCodes.indexOf(b.code);
            if (aTop !== -1 && bTop !== -1) return aTop - bTop;
            if (aTop !== -1) return -1;
            if (bTop !== -1) return 1;
            return a.code.localeCompare(b.code);
        });
    }

    container.innerHTML = list.map(c => `
        <div class="currency-list-item" style="display:flex; justify-content:space-between; align-items:center; padding:12px; margin-bottom:8px; background:var(--surface-card); border-radius:8px; cursor:pointer; border:1px solid var(--border-color); color:var(--text-main);" 
             onclick="selectCurrency('${c.code}')">
            <div style="display:flex; align-items:center; gap:12px;">
                <span style="font-size:1.5rem; font-weight:bold; color:var(--primary); width:30px; text-align:center;">${c.symbol}</span>
                <span style="font-size:1rem;">${c.name} <small style="color:var(--text-sec); opacity:0.7;">(${c.code})</small></span>
            </div>
        </div>
    `).join('');
};

window.selectCurrency = function(code) {
    if (window.currencyPickerCallback) {
        window.currencyPickerCallback(code);
    }
    localStorage.setItem('last_currency', code);
    closeCurrencyPicker();
};

// =====================
// Android Back Button Handling
let backPressCount = 0;
let backPressTimer = null;

window.addEventListener('popstate', function(e) {
    const isLobby = document.getElementById('lobby-overlay') && document.getElementById('lobby-overlay').style.display === 'flex';
    
    if (e.state && e.state.trap) {
        // Reached the bottom of the app's history. Trap the user with deep traps to prevent fast-taps from escaping
        history.pushState({ trap: true }, "", window.location.pathname);
        history.pushState({ trap: true }, "", window.location.pathname);
        history.pushState({ tabName: 'home' }, "", "#home");
        
        backPressCount++;
        if (backPressCount >= 2) {
            showToast(typeof i18n === 'function' ? i18n('refreshing_data') || 'מרענן נתונים...' : 'מרענן נתונים...', 'info');
            if (typeof loadLobby === 'function') loadLobby();
            if (typeof fetchBalances === 'function') fetchBalances();
            if (typeof loadExpenses === 'function') loadExpenses();
            backPressCount = 0;
        } else {
            showToast(typeof i18n === 'function' ? i18n('press_back_again_refresh') || 'לחץ שוב חזור כדי לרענן נתונים' : 'לחץ שוב חזור כדי לרענן נתונים', 'info');
            clearTimeout(backPressTimer);
            backPressTimer = setTimeout(() => { backPressCount = 0; }, 2000);
        }
        return;
    }

    if (isLobby) {
        // If in Lobby, prevent popping states by re-pushing whatever state we are on
        history.pushState(e.state, "", window.location.hash || window.location.href);
        backPressCount++;
        if (backPressCount >= 2) {
            showToast(typeof i18n === 'function' ? i18n('refreshing_data') || 'מרענן נתונים...' : 'מרענן נתונים...', 'info');
            if (typeof loadLobby === 'function') loadLobby();
            backPressCount = 0;
        } else {
            showToast(typeof i18n === 'function' ? i18n('press_back_again_refresh') || 'לחץ שוב חזור כדי לרענן נתונים' : 'לחץ שוב חזור כדי לרענן נתונים', 'info');
            clearTimeout(backPressTimer);
            backPressTimer = setTimeout(() => { backPressCount = 0; }, 2000);
        }
    } else {
        if (e.state && e.state.tabName) {
            switchTab(e.state.tabName, true);
        } else {
            switchTab('expenses', true);
        }
    }
});

document.addEventListener('DOMContentLoaded', () => {
    // 1. Replace the initial document state with a "trap" state
    history.replaceState({ trap: true }, "", window.location.pathname);
    // 1.5 Push deep traps to catch fast double-taps
    history.pushState({ trap: true }, "", window.location.pathname);
    history.pushState({ trap: true }, "", window.location.pathname);
    history.pushState({ trap: true }, "", window.location.pathname);
    history.pushState({ trap: true }, "", window.location.pathname);
    // 2. Push the actual active state on top
    history.pushState({ tabName: 'home' }, "", "#home");
});
