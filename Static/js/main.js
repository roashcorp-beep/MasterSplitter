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
        if (title)  title.textContent  = 'צור חשבון 🚀';
        if (sub)    sub.textContent    = 'הצטרף ותתחיל לחלק הוצאות';
        if (submit) submit.textContent = 'הרשם';
        if (toggle) toggle.textContent = 'יש לך כבר חשבון? התחבר';
        if (phoneGrp) phoneGrp.style.display = 'block';
        if (emailGrp) emailGrp.style.display = 'block';
        if (forgotLink) forgotLink.style.display = 'none';
    } else {
        if (title)  title.textContent  = 'ברוך הבא! 👋';
        if (sub)    sub.textContent    = 'התחבר כדי לנהל את ההוצאות שלך';
        if (submit) submit.textContent = 'התחבר';
        if (toggle) toggle.textContent = 'צור חשבון חדש';
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
    if (title) title.textContent = 'שכחת סיסמה? 🔑';
    if (sub) sub.textContent = 'הכנס את האימייל שלך ונשלח קישור לאיפוס';
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
    if (title) title.textContent = 'ברוך הבא! 👋';
    if (sub) sub.textContent = 'התחבר כדי לנהל את ההוצאות שלך';
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
    if (document.getElementById('lobby-view')) {
        initApp();
    }

    // Friend input: Enter key
    const fi = document.getElementById('friend-name-input');
    if (fi) fi.addEventListener('keypress', e => { if (e.key === 'Enter') { e.preventDefault(); addFriendToList(); } });

    // Edit friend input: Enter key
    const efi = document.getElementById('edit-friend-input');
    if (efi) efi.addEventListener('keypress', e => { if (e.key === 'Enter') { e.preventDefault(); addEditFriend(); } });
});

async function initApp() {
    try {
        const res = await fetch('/api/me');
        if (!res.ok) { window.location.href = '/'; return; }
        currentUser = await res.json();
        const el = document.getElementById('lobby-username');
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
    const lobby = document.getElementById('lobby-view');
    const dash  = document.getElementById('dashboard-view');
    if (view === 'lobby') {
        lobby.style.display = 'flex';
        dash.style.display  = 'none';
    } else {
        lobby.style.display = 'none';
        dash.style.display  = 'flex';
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

// =====================
//  CREATE TRIP (TOGGLE)
// =====================
let createTripOpen = false;

function toggleCreateTrip() {
    createTripOpen = !createTripOpen;
    const collapsible = document.getElementById('create-trip-collapsible');
    const btn = document.getElementById('create-trip-toggle-btn');
    if (createTripOpen) {
        collapsible.classList.add('open');
        btn.textContent = '✕ סגור';
    } else {
        collapsible.classList.remove('open');
        btn.textContent = '+ צור טיול חדש';
    }
}

function addFriendToList() {
    const input = document.getElementById('friend-name-input');
    const name  = input?.value.trim();
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
    const name   = document.getElementById('new-trip-name')?.value.trim();
    const budget = parseFloat(document.getElementById('new-trip-budget')?.value) || 0;
    if (!name) { alert('יש לתת שם לטיול.'); return; }
    try {
        const res = await fetch('/api/trips', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, budget, participants: [...friendsList] })
        });
        const data = await res.json();
        if (res.ok && data.success) {
            document.getElementById('new-trip-name').value   = '';
            document.getElementById('new-trip-budget').value = '';
            friendsList = [];
            renderFriendsChips();
            // Close the form
            createTripOpen = false;
            document.getElementById('create-trip-collapsible')?.classList.remove('open');
            document.getElementById('create-trip-toggle-btn').textContent = '+ צור טיול חדש';
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
            html = '<div class="loading-state">אין הוצאות בינתיים</div>';
        } else {
            expenses.forEach(exp => {
                const safeDesc  = escapeHTML(exp.description);
                const safePayer = escapeHTML(exp.payer);
                const safeCat   = escapeHTML(exp.category || 'כללי');
                const currSym   = getCurrencySymbol(exp.currency || 'ILS');
                html += `
                <div class="list-item" id="expense-${exp.id}">
                    <div class="item-left">
                        <div class="item-icon-wrapper">${getCategoryIcon(exp.category)}</div>
                        <div class="item-details">
                            <h4>${safeDesc}</h4>
                            <p>שילם: ${safePayer} • ${safeCat}</p>
                        </div>
                    </div>
                    <div class="item-right">
                        <div class="item-amount">${currSym}${parseFloat(exp.amount).toFixed(2)}</div>
                        <button class="delete-expense-btn" onclick="deleteExpense(${exp.id})" title="מחק הוצאה">🗑️</button>
                    </div>
                </div>`;
            });
        }
        const full = document.getElementById('expenses-list');
        const home = document.getElementById('home-expenses-list');
        if (full) full.innerHTML = html;
        if (home) home.innerHTML = html;
    } catch(e) { console.error('Fetch expenses error:', e); }
}

async function deleteExpense(expenseId) {
    if (!confirm('למחוק את ההוצאה?')) return;
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
    const amount   = amountInput?.value;
    const desc     = descInput?.value.trim();
    const category = document.getElementById('category')?.value;
    const currency = document.getElementById('currency')?.value || 'ILS';
    const parts    = getSelectedParticipants();

    if (!amount || parseFloat(amount) <= 0) { alert('יש למלא סכום תקין.'); return; }
    if (!desc)           { alert('יש למלא תיאור.'); return; }
    if (!parts.length)   { alert('בחר לפחות משתתף אחד.'); return; }
    if (!currentTripId)  { alert('לא נבחר טיול.'); return; }

    try {
        const res = await fetch('/api/expenses', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ trip_id: currentTripId, amount: parseFloat(amount), description: desc, category, currency, participants: parts })
        });
        if (res.status === 401) { window.location.href = '/'; return; }
        const data = await res.json();
        if (res.ok && data.success) {
            amountInput.value = '';
            descInput.value   = '';
            showToast('ההוצאה נוספה! 💸');
            switchTab('expenses');
        } else {
            alert(data.error || 'שגיאה.');
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
            debts.push({ name: b.name, amount: Math.abs(b.balance) });
        } else if (b.balance > 0.01) {
            credits.push({ name: b.name, amount: b.balance });
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
                to: credits[ci].name,
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
        if (!data.balances?.length) { list.innerHTML = '<div class="loading-state">אין נתונים</div>'; return; }

        // Calculate settlements for the accordion
        const settlements = calculateSettlements(data.balances);

        list.innerHTML = data.balances.map(b => {
            const isPos = b.balance > 0.01;
            const isNeg = b.balance < -0.01;
            const badgeCls = isPos ? 'positive' : isNeg ? 'negative' : 'neutral';
            const badgeTxt = isPos ? 'צריך לקבל' : isNeg ? 'צריך לשלם' : 'מאוזן';
            const amtCls   = isPos ? 'amount-pos' : isNeg ? 'amount-neg' : '';
            const me       = currentUser && b.user_id === currentUser.id ? ' (את/ה)' : '';
            const safeName = escapeHTML(b.name);

            // Find this person's settlements
            const personDebts = settlements.filter(s => s.from === b.name || s.to === b.name);
            let debtLines = '';
            if (personDebts.length > 0) {
                debtLines = personDebts.map(s => {
                    const safeFrom = escapeHTML(s.from);
                    const safeTo = escapeHTML(s.to);
                    return `<div class="debt-line">
                        <span>${safeFrom}</span>
                        <span class="debt-arrow">←</span>
                        <span>${safeTo}</span>
                        <span class="debt-amount">₪${s.amount.toFixed(0)}</span>
                    </div>`;
                }).join('');
            } else {
                debtLines = '<div class="debt-line" style="justify-content:center; color:var(--text-muted);">מאוזן ✓</div>';
            }

            return `
            <div class="balance-item" onclick="this.classList.toggle('open')">
                <div class="balance-header">
                    <div class="item-left">
                        <div class="avatar bg-purple" style="width:40px;height:40px;font-size:1.2rem;">${escapeHTML(b.name.charAt(0))}</div>
                        <div class="item-details">
                            <h4>${safeName}${me}</h4>
                            <p>שילם: ₪${b.paid.toFixed(0)}</p>
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