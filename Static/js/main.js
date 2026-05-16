let authMode = 'login'; // 'login' or 'signup'
let currentUser = null;

function toggleAuthMode() {
    authMode = authMode === 'login' ? 'signup' : 'login';
    const title = document.getElementById('welcome-title');
    const sub = document.getElementById('welcome-sub');
    const submitBtn = document.getElementById('submit-btn');
    const toggleBtn = document.getElementById('toggle-auth-btn');
    const errorMsg = document.getElementById('error-msg');
    
    if (authMode === 'signup') {
        title.innerText = 'צור חשבון';
        sub.innerText = 'הצטרף אלינו ותתחיל לחלק הוצאות בקלות';
        submitBtn.innerText = 'הרשם';
        toggleBtn.innerText = 'יש לך כבר חשבון? התחבר';
    } else {
        title.innerText = 'ברוך הבא!';
        sub.innerText = 'התחבר כדי להמשיך ולנהל את ההוצאות שלך';
        submitBtn.innerText = 'התחבר';
        toggleBtn.innerText = 'צור חשבון חדש';
    }
    
    if (errorMsg) errorMsg.classList.remove('visible');
}

async function submitAuth() {
    const usernameInput = document.getElementById('username').value.trim();
    const passwordInput = document.getElementById('password').value;
    const errorMsg = document.getElementById('error-msg');

    if (errorMsg) errorMsg.classList.remove('visible');

    if (!usernameInput || !passwordInput) {
        if (errorMsg) {
            errorMsg.innerText = "יש למלא את כל השדות.";
            errorMsg.classList.add('visible');
        }
        return;
    }

    const endpoint = authMode === 'login' ? '/api/login' : '/api/signup';
    
    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: usernameInput, password: passwordInput })
        });
        
        const data = await response.json();
        if (response.ok && data.success) {
            window.location.href = '/app';
        } else {
            if (errorMsg) {
                errorMsg.innerText = data.error || "שגיאה בחיבור.";
                errorMsg.classList.add('visible');
            }
        }
    } catch (err) {
        if (errorMsg) {
            errorMsg.innerText = "שגיאת רשת. נסה שוב.";
            errorMsg.classList.add('visible');
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const pwdInput = document.getElementById('password');
    if(pwdInput) {
        pwdInput.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') submitAuth();
        });
    }

    if (document.getElementById('trip-selector')) {
        initApp();
    }
});

let currentTripId = null;
let currentTripBudget = 0;
let allTrips = [];
let tripMembers = [];

async function initApp() {
    try {
        const meRes = await fetch('/api/me');
        if(!meRes.ok) {
            window.location.href = '/';
            return;
        }
        currentUser = await meRes.json();
        await fetchTrips();
    } catch (e) {
        console.error(e);
        window.location.href = '/';
    }
}

async function logout() {
    try {
        await fetch('/api/logout', { method: 'POST' });
        window.location.href = '/';
    } catch(e) {
        window.location.href = '/';
    }
}

function showToast(message) {
    const toast = document.getElementById('toast');
    if (toast) {
        toast.innerText = message;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3000);
    }
}

function switchTab(tabName) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    
    const screen = document.getElementById(`screen-${tabName}`);
    if (screen) screen.classList.add('active');
    
    if(tabName !== 'add') {
        const tab = document.getElementById(`tab-${tabName}`);
        if (tab) tab.classList.add('active');
    }
    
    if(tabName === 'home' || tabName === 'balances') fetchBalances();
    if(tabName === 'expenses') fetchExpenses();
    if(tabName === 'add') renderParticipants();
}

async function fetchTrips() {
    try {
        const response = await fetch('/api/trips');
        if(response.status === 401) { window.location.href = '/'; return; }
        
        const trips = await response.json();
        const selector = document.getElementById('trip-selector');
        if (!selector) return;
        
        selector.innerHTML = '';
        allTrips = trips;
        trips.forEach(t => {
            selector.innerHTML += `<option value="${t.id}">${t.name}</option>`;
        });
        if(trips.length > 0) {
            currentTripId = trips[0].id;
            currentTripBudget = trips[0].budget;
            loadTripData();
        } else {
            selector.innerHTML = `<option value="">אין טיולים</option>`;
        }
    } catch (error) { console.error('Error fetching trips:', error); }
}

function loadTripData() {
    const selector = document.getElementById('trip-selector');
    if (selector && selector.value) {
        currentTripId = parseInt(selector.value);
        const trip = allTrips.find(t => t.id === currentTripId);
        if (trip) currentTripBudget = trip.budget;
        
        fetchTripMembers();
        fetchExpenses();
        fetchBalances();
    }
}

async function fetchTripMembers() {
    try {
        const res = await fetch(`/api/trip_members/${currentTripId}`);
        if(res.ok) {
            tripMembers = await res.json();
        }
    } catch(e) {
        console.error(e);
    }
}

function renderParticipants() {
    const container = document.getElementById('participants-container');
    if(!container) return;
    
    container.innerHTML = '';
    tripMembers.forEach(m => {
        container.innerHTML += `
            <label class="checkbox-label">
                <input type="checkbox" value="${m.id}" checked> ${m.name}
            </label>
        `;
    });
}

function getCategoryIcon(cat) {
    const icons = {
        'אוכל': '🍕',
        'לינה': '🛏️',
        'תחבורה': '🚕',
        'אטרקציות': '🎟️',
        'כללי': '💡'
    };
    return icons[cat] || '💳';
}

async function fetchExpenses() {
    if(!currentTripId) return;
    try {
        const response = await fetch(`/api/expenses/${currentTripId}`);
        if(response.status === 401) { window.location.href = '/'; return; }
        const expenses = await response.json();
        
        const list = document.getElementById('expenses-list');
        const homeList = document.getElementById('home-expenses-list');
        
        let html = '';
        if(expenses.length === 0) {
            html = '<div style="text-align:center; padding:30px; color:gray;">אין הוצאות בינתיים</div>';
        } else {
            expenses.forEach(exp => {
                html += `
                <div class="list-item">
                    <div class="item-left">
                        <div class="item-icon-wrapper">${getCategoryIcon(exp.category)}</div>
                        <div class="item-details">
                            <h4>${exp.description}</h4>
                            <p>שילם: ${exp.payer} • ${exp.category || 'כללי'}</p>
                        </div>
                    </div>
                    <div class="item-right">
                        <div class="item-amount">₪${exp.amount.toFixed(2)}</div>
                    </div>
                </div>`;
            });
        }
        
        if (list) list.innerHTML = html;
        if (homeList) homeList.innerHTML = expenses.length > 0 ? html : '<div style="text-align:center; padding:30px; color:gray;">אין הוצאות</div>';
        
    } catch (error) { console.error('Error:', error); }
}

async function fetchBalances() {
    if(!currentTripId) return;
    try {
        const response = await fetch(`/api/balances/${currentTripId}`);
        if(response.status === 401) { window.location.href = '/'; return; }
        const data = await response.json();
        
        const budget = currentTripBudget || 0; 
        const elTotalSpent = document.getElementById('total-spent');
        const elTotalBudget = document.getElementById('total-budget');
        const elBudgetLeft = document.getElementById('budget-left');
        const elCirclePercent = document.querySelector('.circle-percent');
        
        const spent = data.total;
        const left = budget - spent;
        
        if (elTotalSpent) elTotalSpent.innerText = `₪${spent.toFixed(0)}`;
        if (elTotalBudget) elTotalBudget.innerText = `₪${budget}`;
        if (elBudgetLeft) elBudgetLeft.innerText = `₪${Math.max(0, left).toFixed(0)}`;
        
        if (elCirclePercent && budget > 0) {
            const percent = Math.min(100, Math.round((spent / budget) * 100));
            elCirclePercent.innerText = `${percent}%`;
        }

        const balancesList = document.getElementById('balances-list');
        if (!balancesList) return;
        balancesList.innerHTML = '';
        
        data.balances.forEach(b => {
            let amountClass = b.balance >= 0 ? 'amount-pos' : 'amount-neg';
            let statusText = b.balance > 0 ? 'צריך לקבל' : (b.balance < 0 ? 'צריך לשלם' : 'מאוזן');
            
            balancesList.innerHTML += `
            <div class="list-item">
                <div class="item-left">
                    <div class="avatar bg-purple" style="width:40px; height:40px; font-size:1.2rem;">${b.name.charAt(0)}</div>
                    <div class="item-details">
                        <h4>${b.name} ${currentUser && b.user_id === currentUser.id ? '(את/ה)' : ''}</h4>
                        <p>${statusText}</p>
                    </div>
                </div>
                <div class="item-right">
                    <div class="item-amount ${amountClass}">
                        ₪${Math.abs(b.balance).toFixed(0)}
                    </div>
                </div>
            </div>`;
        });
    } catch (error) { console.error('Error:', error); }
}

async function addExpense() {
    const amount = document.getElementById('amount').value;
    const desc = document.getElementById('desc').value;
    const category = document.getElementById('category').value;
    const checkboxes = document.querySelectorAll('#participants-container input[type="checkbox"]:checked');
    const participantsList = Array.from(checkboxes).map(cb => parseInt(cb.value));
    
    if(!amount || !desc) { alert('יש למלא סכום ותיאור להוצאה.'); return; }
    if(participantsList.length === 0) { alert('חובה לסמן משתתף אחד לפחות.'); return; }
    if(!currentTripId) { alert('לא נבחר טיול.'); return; }
    
    try {
        const res = await fetch('/api/expenses', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                trip_id: currentTripId, amount: amount, 
                description: desc, category: category, participants: participantsList
            })
        });
        
        if(res.status === 401) { window.location.href = '/'; return; }
        
        document.getElementById('amount').value = '';
        document.getElementById('desc').value = '';
        
        showToast('ההוצאה נוספה בהצלחה!');
        
        switchTab('expenses');
        loadTripData();
    } catch(e) {
        console.error(e);
        alert('שגיאה בשמירת ההוצאה');
    }
}