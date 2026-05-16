let authMode = 'login'; // 'login' or 'signup'

function setAuthMode(mode) {
    authMode = mode;
    const btnLogin = document.getElementById('toggle-login');
    const btnSignup = document.getElementById('toggle-signup');
    const submitBtn = document.getElementById('submit-btn');
    const errorMsg = document.getElementById('error-msg');
    
    if (btnLogin && btnSignup) {
        btnLogin.classList.toggle('active', mode === 'login');
        btnSignup.classList.toggle('active', mode === 'signup');
    }
    
    if (submitBtn) {
        submitBtn.innerText = mode === 'login' ? 'היכנס' : 'צור משתמש';
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

// מאזין ללחיצה על Enter
document.addEventListener('DOMContentLoaded', () => {
    const pwdInput = document.getElementById('password');
    if(pwdInput) {
        pwdInput.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') submitAuth();
        });
    }

    // Initialize the app page if we are on it
    if (document.getElementById('trip-selector')) {
        fetchTrips();
    }
});

let currentTripId = 1;
let currentTripBudget = 0;
let allTrips = [];

function logout() {
    // Basic logout handling for now
    window.location.href = '/';
}

function showToast(message) {
    const toast = document.getElementById('toast');
    if (toast) {
        toast.innerText = message;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3000);
    }
}

// פונקציה להחלפת מסכים (Tab Navigation)
function switchTab(tabName) {
    // הסתרת כל המסכים
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    
    // הצגת המסך הנבחר
    const screen = document.getElementById(`screen-${tabName}`);
    if (screen) screen.classList.add('active');
    
    if(tabName !== 'add') {
        const tab = document.getElementById(`tab-${tabName}`);
        if (tab) tab.classList.add('active');
    }
    
    // רענון נתונים אם חזרנו למסך
    if(tabName === 'home' || tabName === 'balances') fetchBalances();
    if(tabName === 'expenses') fetchExpenses();
}

// טעינת טיולים מהשרת
async function fetchTrips() {
    try {
        const response = await fetch('/api/trips');
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
        }
    } catch (error) { console.error('Error fetching trips:', error); }
}

function loadTripData() {
    const selector = document.getElementById('trip-selector');
    if (selector) {
        currentTripId = parseInt(selector.value);
        const trip = allTrips.find(t => t.id === currentTripId);
        if (trip) currentTripBudget = trip.budget;
    }
    fetchExpenses();
    fetchBalances();
}

// טעינת הוצאות ועיצוב הרשימה
async function fetchExpenses() {
    try {
        const response = await fetch(`/api/expenses/${currentTripId}`);
        const expenses = await response.json();
        const list = document.getElementById('expenses-list');
        if (!list) return;
        
        list.innerHTML = ''; 
        
        if(expenses.length === 0) {
            list.innerHTML = '<div style="text-align:center; padding:30px; color:gray;">אין הוצאות בינתיים</div>';
            return;
        }

        expenses.forEach(exp => {
            list.innerHTML += `
            <div class="list-item">
                <div class="item-details">
                    <h4>${exp.description}</h4>
                    <p>שילם: ${exp.payer} • ${exp.category || 'כללי'}</p>
                </div>
                <div class="item-amount">₪${exp.amount.toFixed(2)}</div>
            </div>`;
        });
    } catch (error) { console.error('Error:', error); }
}

// טעינת איזונים ותקציב
async function fetchBalances() {
    try {
        const response = await fetch(`/api/balances/${currentTripId}`);
        const data = await response.json();
        
        // עדכון מסך הבית (תקציב)
        const budget = currentTripBudget || 0; 
        const elTotalSpent = document.getElementById('total-spent');
        const elTotalBudget = document.getElementById('total-budget');
        const elBudgetLeft = document.getElementById('budget-left');
        
        if (elTotalSpent) elTotalSpent.innerText = `₪${data.total.toFixed(0)}`;
        if (elTotalBudget) elTotalBudget.innerText = `₪${budget}`;
        if (elBudgetLeft) elBudgetLeft.innerText = `₪${(budget - data.total).toFixed(0)}`;

        // עדכון מסך האיזונים
        const balancesList = document.getElementById('balances-list');
        if (!balancesList) return;
        balancesList.innerHTML = '';
        
        data.balances.forEach(b => {
            let amountClass = b.balance >= 0 ? 'amount-pos' : 'amount-neg';
            let statusText = b.balance > 0 ? 'צריך לקבל' : (b.balance < 0 ? 'צריך לשלם' : 'מאוזן');
            
            balancesList.innerHTML += `
            <div class="list-item">
                <div class="item-details">
                    <h4>${b.name}</h4>
                    <p>${statusText}</p>
                </div>
                <div class="item-amount ${amountClass}">
                    ₪${Math.abs(b.balance).toFixed(0)}
                </div>
            </div>`;
        });
    } catch (error) { console.error('Error:', error); }
}

// שמירת הוצאה (המסך הירוק המרכזי)
async function addExpense() {
    const payer = document.getElementById('payer').value;
    const amount = document.getElementById('amount').value;
    const desc = document.getElementById('desc').value;
    const category = document.getElementById('category').value;
    const checkboxes = document.querySelectorAll('#participants-container input[type="checkbox"]:checked');
    const participantsList = Array.from(checkboxes).map(cb => cb.value);
    
    if(!amount || !desc) { alert('יש למלא סכום ותיאור להוצאה.'); return; }
    if(participantsList.length === 0) { alert('חובה לסמן משתתף אחד לפחות.'); return; }
    
    await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            trip_id: currentTripId, payer_name: payer, amount: amount, 
            description: desc, category: category, participants: participantsList
        })
    });
    
    // איפוס שדות
    document.getElementById('amount').value = '';
    document.getElementById('desc').value = '';
    
    showToast('ההוצאה נוספה בהצלחה!');
    
    // חזרה למסך הוצאות אחרי השמירה
    switchTab('expenses');
    loadTripData();
}