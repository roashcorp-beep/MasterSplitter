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
    const phoneGrp = document.getElementById('phone-group');
    const emailGrp = document.getElementById('email-group');
    if (authMode === 'signup') {
        if (title)  title.textContent  = 'צור חשבון 🚀';
        if (sub)    sub.textContent    = 'הצטרף ותתחיל לחלק הוצאות';
        if (submit) submit.textContent = 'הרשם';
        if (toggle) toggle.textContent = 'יש לך כבר חשבון? התחבר';
        if (phoneGrp) phoneGrp.style.display = 'block';
        if (emailGrp) emailGrp.style.display = 'block';
    } else {
        if (title)  title.textContent  = 'ברוך הבא! 👋';
        if (sub)    sub.textContent    = 'התחבר כדי לנהל את ההוצאות שלך';
        if (submit) submit.textContent = 'התחבר';
        if (toggle) toggle.textContent = 'צור חשבון חדש';
        if (phoneGrp) phoneGrp.style.display = 'none';
        if (emailGrp) emailGrp.style.display = 'none';
    }
    if (err) err.classList.remove('visible');
}

async function submitAuth() {
    const username = (document.getElementById('username')?.value || '').trim();
    const password = document.getElementById('password')?.value || '';
    const phone = document.getElementById('phone')?.value || '';
    const email = document.getElementById('email')?.value || '';
    const err = document.getElementById('error-msg');
    if (err) err.classList.remove('visible');
    if (!username || !password) {
        if (err) { err.textContent = 'יש למלא שם משתמש וסיסמה.'; err.classList.add('visible'); }
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
//  CREATE TRIP
// =====================
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

function renderParticipants() {
    const container = document.getElementById('participants-container');
    if (!container) return;
    container.innerHTML = tripMembers.map(m => {
        const safeName = escapeHTML(m.name);
        return `
        <label class="checkbox-label">
            <input type="checkbox" value="${escapeHTML(String(m.id))}" checked> ${safeName}
        </label>`;
    }).join('');
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
                        <div class="item-amount">₪${parseFloat(exp.amount).toFixed(2)}</div>
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
    const checked  = document.querySelectorAll('#participants-container input[type="checkbox"]:checked');
    const parts    = Array.from(checked).map(cb => cb.value);

    if (!amount || parseFloat(amount) <= 0) { alert('יש למלא סכום תקין.'); return; }
    if (!desc)           { alert('יש למלא תיאור.'); return; }
    if (!parts.length)   { alert('בחר לפחות משתתף אחד.'); return; }
    if (!currentTripId)  { alert('לא נבחר טיול.'); return; }

    try {
        const res = await fetch('/api/expenses', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ trip_id: currentTripId, amount: parseFloat(amount), description: desc, category, participants: parts })
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
//  BALANCES
// =====================
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
        list.innerHTML = data.balances.map(b => {
            const cls  = b.balance >= 0 ? 'amount-pos' : 'amount-neg';
            const txt  = b.balance > 0 ? 'צריך לקבל' : b.balance < 0 ? 'צריך לשלם' : 'מאוזן';
            const me   = currentUser && b.user_id === currentUser.id ? ' (את/ה)' : '';
            const safeName = escapeHTML(b.name);
            return `
            <div class="list-item">
                <div class="item-left">
                    <div class="avatar bg-purple" style="width:40px;height:40px;font-size:1.2rem;">${escapeHTML(b.name.charAt(0))}</div>
                    <div class="item-details">
                        <h4>${safeName}${me}</h4>
                        <p>${txt}</p>
                    </div>
                </div>
                <div class="item-right">
                    <div class="item-amount ${cls}">₪${Math.abs(b.balance).toFixed(0)}</div>
                </div>
            </div>`;
        }).join('');
    } catch(e) { console.error('Fetch balances error:', e); }
}