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

// =====================
//  AUTH (Login Page)
// =====================
let authMode = 'login';
let currentUser = null;
let friendsList = [];

function toggleAuthMode() {
    authMode = authMode === 'login' ? 'signup' : 'login';
    const title = document.getElementById('welcome-title');
    const sub   = document.getElementById('welcome-sub');
    const submit = document.getElementById('submit-btn');
    const toggle = document.getElementById('toggle-auth-btn');
    const err   = document.getElementById('error-msg');
    const success = document.getElementById('success-msg');
    const phoneGrp = document.getElementById('phone-group');
    const emailGrp = document.getElementById('email-group');
    const forgotLink = document.getElementById('forgot-link-wrapper');
    if (authMode === 'signup') {
        if (title)  title.textContent  = i18n('signup_title');
        if (sub)    sub.textContent    = i18n('signup_sub');
        if (submit) submit.textContent = i18n('signup_btn_signup');
        if (toggle) toggle.textContent = i18n('signup_btn_login');
        if (phoneGrp) phoneGrp.style.display = 'block';
        if (emailGrp) emailGrp.style.display = 'block';
        if (forgotLink) forgotLink.style.display = 'none';
    } else {
        if (title)  title.textContent  = i18n('login_welcome');
        if (sub)    sub.textContent    = i18n('login_sub');
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
let currentTripId   = null;
let currentTripData = null;
let allTrips        = [];
let tripMembers     = [];

document.addEventListener('DOMContentLoaded', () => {
    // Login page: Enter key
    const pwd = document.getElementById('password');
    if (pwd) pwd.addEventListener('keypress', e => { if (e.key === 'Enter') submitAuth(); });
    
    // Check for verification success
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('verified') === 'true') {
        setTimeout(() => alert('החשבון אומת בהצלחה! התחבר כדי להמשיך.'), 500);
        window.history.replaceState({}, document.title, "/");
    }

    // App page: init
    if (document.getElementById('screen-lobby')) {
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
    try {
        const res = await fetch('/api/me');
        if (!res.ok) { window.location.href = '/'; return; }
        currentUser = await res.json();
        const el = document.getElementById('user-name-display');
        if (el) el.textContent = currentUser.name;
        await loadLobby();
        fetchInvitations();
    } catch (e) {
        console.error('Init error:', e);
        window.location.href = '/';
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
async function loadLobby() {
    showView('lobby');
    try {
        const res = await fetch('/api/trips');
        if (res.status === 401) { window.location.href = '/'; return; }
        allTrips = await res.json();
        renderTripsList();
    } catch (e) { console.error('Load lobby error:', e); }
}

function showView(view) {
    const screens = document.querySelectorAll('.screen');
    screens.forEach(s => s.classList.remove('active'));
    
    const bottomNav = document.querySelector('.bottom-nav');
    
    if (view === 'lobby') {
        const lobbyScreen = document.getElementById('screen-lobby');
        if (lobbyScreen) lobbyScreen.classList.add('active');
        if (bottomNav) bottomNav.style.display = 'none';
    } else {
        // 'dashboard'
        const homeScreen = document.getElementById('screen-home');
        if (homeScreen) homeScreen.classList.add('active');
        if (bottomNav) bottomNav.style.display = 'flex';
    }
}

function renderTripsList() {
    const container = document.getElementById('trips-list');
    if (!container) return;
    if (!allTrips || allTrips.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <span style="font-size:3rem">🌍</span>
                <p>אין טיולים עדיין. צור טיול חדש!</p>
            </div>`;
        return;
    }
    const icons = ['✈️','🏖️','🗺️','🏔️','🎡','🚂'];
    container.innerHTML = allTrips.map((t, i) => {
        const safeName = escapeHTML(t.name);
        const safeMeta = t.participants && t.participants.length
            ? escapeHTML(t.participants.join(', '))
            : 'אני בלבד';
        const editBtn = t.is_owner ? `<button class="trip-edit-btn" onclick="event.stopPropagation(); openEditTripModal(${t.id})" title="ערוך טיול">✏️</button>` : '';
        return `
        <div class="trip-card" onclick="openTrip(${t.id})">
            <div class="trip-card-left">
                <span class="trip-card-icon">${icons[i % icons.length]}</span>
                <div class="trip-card-info">
                    <div class="trip-card-name">${safeName}</div>
                    <div class="trip-card-meta">${safeMeta}</div>
                </div>
            </div>
            <div class="trip-card-right">
                <span class="trip-card-budget">₪${(t.budget || 0).toLocaleString()}</span>
                ${editBtn}
                <span class="trip-card-arrow">›</span>
            </div>
        </div>`;
    }).join('');
}

async function openTrip(tripId) {
    currentTripId   = tripId;
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
    fetchExpenses();
    fetchBalances();
}

function goToLobby() {
    closeHamburgerMenu();
    loadLobby();
}

function showLobby() {
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
    const friendInput = document.getElementById('friend-input');
    if (nameInput) nameInput.value = '';
    if (budgetInput) budgetInput.value = '';
    if (friendInput) friendInput.value = '';
    const modal = document.getElementById('create-trip-modal');
    if (modal) modal.classList.add('open');
}

function closeCreateTripModal() {
    const modal = document.getElementById('create-trip-modal');
    if (modal) modal.classList.remove('open');
}

function addFriend() {
    const input = document.getElementById('friend-input');
    const name = input?.value.trim();
    if (!name) return;
    if (!friendsList.includes(name)) friendsList.push(name);
    input.value = '';
    renderFriendsChips();
}

function removeFriend(name) {
    friendsList = friendsList.filter(f => f !== name);
    renderFriendsChips();
}

function renderFriendsChips() {
    const container = document.getElementById('friends-chips');
    if (!container) return;
    container.innerHTML = friendsList.map(n => {
        const safeName = escapeHTML(n);
        return `
        <div class="friend-chip">
            <span>${safeName}</span>
            <span class="remove-chip" onclick="removeFriend('${safeName}')">✕</span>
        </div>`;
    }).join('');
}

async function createTrip() {
    const name   = document.getElementById('trip-name')?.value.trim();
    const budget = parseFloat(document.getElementById('trip-budget')?.value) || 0;
    if (!name) { alert('יש לתת שם לטיול.'); return; }
    try {
        const res = await fetch('/api/trips', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, budget, participants: [...friendsList] })
        });
        const data = await res.json();
        if (res.ok && data.success) {
            closeCreateTripModal();
            showToast('הטיול נוצר בהצלחה! 🎉');
            await loadLobby();
        } else {
            alert(data.error || 'שגיאה ביצירת הטיול.');
        }
    } catch (e) {
        console.error('Create trip error:', e);
        alert('שגיאת רשת.');
    }
}

// =====================
//  EDIT TRIP MODAL
// =====================
let editTripId = null;
let editFriendsList = [];

function openEditTripModal(tripId) {
    editTripId = tripId;
    editFriendsList = [];
    const trip = allTrips.find(t => t.id === tripId);
    if (!trip) return;

    document.getElementById('edit-trip-name').value = trip.name;
    document.getElementById('edit-trip-budget').value = trip.budget || 0;
    renderEditFriendsChips();
    document.getElementById('edit-trip-modal').classList.add('open');
}

function closeEditTripModal() {
    document.getElementById('edit-trip-modal').classList.remove('open');
    editTripId = null;
    editFriendsList = [];
}

function addEditFriend() {
    const input = document.getElementById('edit-friend-input');
    const name = input?.value.trim();
    if (!name) return;
    if (!editFriendsList.includes(name)) editFriendsList.push(name);
    input.value = '';
    renderEditFriendsChips();
}

function removeEditFriend(name) {
    editFriendsList = editFriendsList.filter(f => f !== name);
    renderEditFriendsChips();
}

function renderEditFriendsChips() {
    const container = document.getElementById('edit-friends-chips');
    if (!container) return;
    container.innerHTML = editFriendsList.map(n => {
        const safeName = escapeHTML(n);
        return `
        <div class="friend-chip">
            <span>${safeName}</span>
            <span class="remove-chip" onclick="removeEditFriend('${safeName}')">✕</span>
        </div>`;
    }).join('');
}

async function saveEditTrip() {
    if (!editTripId) return;
    const name = document.getElementById('edit-trip-name')?.value.trim();
    const budget = parseFloat(document.getElementById('edit-trip-budget')?.value) || 0;

    if (!name) { alert('יש לתת שם לטיול.'); return; }

    const payload = { name, budget };
    if (editFriendsList.length > 0) {
        payload.participants = editFriendsList;
    }

    try {
        const res = await fetch(`/api/trips/${editTripId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (res.ok && data.success) {
            closeEditTripModal();
            showToast('הטיול עודכן בהצלחה! ✅');
            await loadLobby();
        } else {
            alert(data.error || 'שגיאה בעדכון הטיול.');
        }
    } catch (e) {
        console.error('Save edit trip error:', e);
        alert('שגיאת רשת.');
    }
}

// =====================
//  HAMBURGER MENU
// =====================
function openHamburgerMenu() {
    document.getElementById('hamburger-menu')?.classList.add('open');
    document.getElementById('menu-overlay')?.classList.add('open');
}
function closeHamburgerMenu() {
    document.getElementById('hamburger-menu')?.classList.remove('open');
    document.getElementById('menu-overlay')?.classList.remove('open');
}

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
    try { await fetch('/api/logout', { method: 'POST' }); } catch(e) {}
    window.location.href = '/';
}

function showToast(msg) {
    const toast = document.getElementById('toast');
    if (toast) {
        toast.textContent = msg;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3000);
    }
}

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
    } catch(e) { console.error('Fetch members error:', e); }
}

function renderParticipantAvatars() {
    const container = document.getElementById('trip-avatars');
    const sub       = document.getElementById('trip-participants-label');
    if (!container) return;
    const colors = ['bg-yellow','bg-purple','bg-light'];
    const shown  = tripMembers.slice(0, 3);
    const extra  = tripMembers.length - 3;
    container.innerHTML = shown.map((m, i) =>
        `<div class="avatar ${colors[i % colors.length]}">${escapeHTML(m.name.charAt(0))}</div>`
    ).join('');
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
function getCategoryIcon(cat) {
    const icons = { 'אוכל':'🍕','לינה':'🛏️','תחבורה':'🚕','אטרקציות':'🎟️','כללי':'💡' };
    return icons[cat] || '💳';
}

async function fetchExpenses() {
    if (!currentTripId) return;
    try {
        const res = await fetch(`/api/expenses/${currentTripId}`);
        if (res.status === 401) { window.location.href = '/'; return; }
        const expenses = await res.json();

        let html = '';
        if (!expenses.length) {
            html = `<div class="loading-state">${typeof i18n === 'function' ? i18n('expenses_no_data') : 'אין הוצאות בינתיים'}</div>`;
        } else {
            expenses.forEach(exp => {
                const safeDesc  = escapeHTML(exp.description);
                const safePayer = escapeHTML(exp.payer);
                const safeCat   = escapeHTML(exp.category || 'כללי');
                const currSym   = getCurrencySymbol(exp.currency || 'ILS');
                
                const canEdit = currentUser && exp.user_id === currentUser.id;
                const editBtn = canEdit ? `<button class="edit-expense-btn" onclick="openEditExpenseModal(${exp.id}, ${exp.amount}, '${safeDesc}', '${safeCat}', '${exp.currency}')" title="ערוך הוצאה">✏️</button>` : '';

                html += `
                <div class="list-item" id="expense-${exp.id}">
                    <div class="item-left">
                        <div class="item-icon-wrapper">${getCategoryIcon(exp.category)}</div>
                        <div class="item-details">
                            <h4>${safeDesc}</h4>
                            <p>${typeof i18n === 'function' ? i18n('expense_paid_by') : 'שילם: '} ${safePayer} • ${safeCat}</p>
                        </div>
                    </div>
                    <div class="item-right">
                        <div class="item-amount">${currSym}${parseFloat(exp.amount).toFixed(2)}</div>
                        <div class="expense-actions">
                            ${editBtn}
                            <button class="delete-expense-btn" onclick="deleteExpense(${exp.id})" title="מחק הוצאה">🗑️</button>
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
    } catch(e) { console.error('Fetch expenses error:', e); }
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
            showToast('ההוצאה נמחקה 🗑️');
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
    const descInput   = document.getElementById('desc');
    const amountVal   = amountInput?.value;
    const desc        = descInput?.value.trim();
    const category    = document.getElementById('category')?.value;
    const currency    = document.getElementById('currency')?.value || 'ILS';
    const parts       = getSelectedParticipants();

    const errAmount = typeof i18n === 'function' ? i18n('err_invalid_amount') : 'יש למלא סכום תקין.';
    const errDesc = typeof i18n === 'function' ? i18n('err_fill_all') : 'יש למלא תיאור.';
    const errParts = typeof i18n === 'function' ? i18n('err_no_participants') : 'בחר לפחות משתתף אחד.';

    if (!amountVal || parseFloat(amountVal) <= 0) { alert(errAmount); return; }
    if (!desc)                                    { alert(errDesc); return; }
    if (!parts.length)                            { alert(errParts); return; }
    if (!currentTripId)                           { alert('לא נבחר טיול.'); return; }

    const amount = parseFloat(amountVal);
    let splits = null;

    if (document.getElementById('split-mode-toggle')?.checked) {
        splits = [];
        let splitSum = 0;
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
                splits: splits
            })
        });
        if (res.status === 401) { window.location.href = '/'; return; }
        const data = await res.json();
        if (res.ok && data.success) {
            amountInput.value = '';
            descInput.value   = '';
            document.getElementById('split-mode-toggle').checked = false;
            toggleSplitMode();
            showToast('ההוצאה נוספה! 💸');
            switchTab('expenses');
        } else {
            alert(data.error || 'שגיאה בהוספת ההוצאה.');
        }
    } catch(e) {
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
        const res  = await fetch(`/api/balances/${currentTripId}`);
        if (res.status === 401) { window.location.href = '/'; return; }
        const data = await res.json();
        const budget = currentTripData?.budget || 0;
        const spent  = data.total || 0;
        const left   = budget - spent;
        const pct    = budget > 0 ? Math.min(100, Math.round(spent / budget * 100)) : 0;

        const elSpent  = document.getElementById('total-spent');
        const elBudget = document.getElementById('total-budget');
        const elLeft   = document.getElementById('budget-left');
        const elPct    = document.getElementById('circle-percent');
        if (elSpent)  elSpent.textContent  = `₪${spent.toFixed(0)}`;
        if (elBudget) elBudget.textContent = `₪${budget}`;
        if (elLeft)   elLeft.textContent   = `₪${Math.max(0, left).toFixed(0)}`;
        if (elPct)    elPct.textContent    = `${pct}%`;

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
            
            const amtCls   = isPos ? 'amount-pos' : isNeg ? 'amount-neg' : '';
            const me       = currentUser && b.user_id === currentUser.id ? (typeof i18n === 'function' ? i18n('balance_you') : ' (את/ה)') : '';
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
                            <span class="debt-amount">₪${s.amount.toFixed(0)}</span>
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
                            <p>${paidTxt}₪${b.paid.toFixed(0)}</p>
                        </div>
                    </div>
                    <div class="item-right">
                        <span class="balance-badge ${badgeCls}">${badgeTxt}</span>
                        <div class="item-amount ${amtCls}">₪${Math.abs(b.balance).toFixed(0)}</div>
                        <span class="accordion-arrow">▼</span>
                    </div>
                </div>
                <div class="accordion-body">
                    ${debtLines}
                </div>
            </div>`;
        }).join('');
    } catch(e) { console.error('Fetch balances error:', e); }
}

async function triggerSettleUp(payerId, payeeId, amount) {
    const msg = typeof i18n === 'function' ? i18n('settle_confirm') : 'לסלק חוב?';
    if (!confirm(`${msg} (₪${amount.toFixed(0)})`)) return;

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
}

function toggleTheme() {
    document.body.classList.toggle('light-theme');
    const isLight = document.body.classList.contains('light-theme');
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
    const btn = document.getElementById('theme-toggle-btn');
    if (btn) btn.textContent = isLight ? '🌙' : '☀️';
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
        { name: 'אוכל', icon: '🍕', color: 'var(--accent-yellow)' },
        { name: 'לינה', icon: '🛏️', color: 'var(--primary)' },
        { name: 'תחבורה', icon: '🚕', color: 'var(--accent-cyan)' },
        { name: 'אטרקציות', icon: '🎟️', color: 'var(--error)' },
        { name: 'כללי', icon: '💡', color: 'var(--success)' }
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
                <div class="chart-bar" style="height: ${heightPct}%; background: ${c.color};" data-tooltip="${c.name}: ₪${val.toFixed(0)}"></div>
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

function renderScannedItems(items) {
    const container = document.getElementById('scanned-items-container');
    if (!container) return;

    let total = 0;
    let desc = '';

    const html = `
        <div style="font-weight: 700; margin-bottom: 8px;" data-i18n="scan_items_found">פריטים שנמצאו:</div>
        ${items.map(item => {
            total += item.price;
            if (desc) desc += ', ';
            desc += item.item;
            return `
                <div class="scanned-item-row">
                    <span class="scanned-item-name">${escapeHTML(item.item)}</span>
                    <span class="scanned-item-price">₪${item.price.toFixed(2)}</span>
                </div>
            `;
        }).join('')}
        <button class="primary-btn full-width" style="margin-top: 10px;" onclick="acceptScannedItems(${total}, '${escapeHTML(desc)}')">
            שייך סכום כולל (₪${total.toFixed(2)})
        </button>
    `;

    container.innerHTML = html;
    container.style.display = 'block';
}

function acceptScannedItems(total, description) {
    const amountEl = document.getElementById('amount');
    const descEl = document.getElementById('desc');
    if (amountEl) amountEl.value = total.toFixed(2);
    if (descEl) descEl.value = description;

    // Hide scanned container after accepting
    document.getElementById('scanned-items-container').style.display = 'none';

    // If split mode is currently active, recalculate split values
    if (document.getElementById('split-mode-toggle')?.checked) {
        renderCustomSplits();
    }
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
        renderCustomSplits();
    } else {
        container.style.display = 'none';
        msg.style.display = 'none';
    }
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
        return `
            <div class="split-input-row">
                <span class="split-input-name">${escapeHTML(name)}</span>
                <input type="number" id="split-user-${pid}" class="split-input-field" 
                       value="${equalShare.toFixed(2)}" min="0" step="0.01" oninput="updateSplitSum()">
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
            const detailText = item.detail ? ` (${escapeHTML(item.detail)})` : '';
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
});