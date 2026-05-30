const translations = {
    he: {
        // General
        "brand_master": "MASTER",
        "brand_splitter": "SPLITTER",
        "btn_save": "שמור 💾",
        "btn_cancel": "ביטול ✕",
        "btn_close": "סגור ✕",
        "loading": "טוען...",
        "error_network": "שגיאת רשת.",
        
        // Login & Auth
        "login_welcome": "ברוך הבא!",
        "login_sub": "התחבר כדי לנהל את ההוצאות שלך",
        "login_username_email": "שם משתמש או אימייל",
        "login_password": "סיסמה",
        "login_email": "אימייל",
        "login_phone": "מספר טלפון",
        "login_btn_login": "התחבר",
        "login_forgot": "שכחת סיסמה?",
        "login_or": "או",
        "login_btn_signup": "צור חשבון חדש",
        "login_social_divider": "או התחבר באמצעות",
        "signup_title": "צור חשבון",
        "signup_sub": "הצטרף ותתחיל לחלק הוצאות",
        "signup_btn_signup": "הרשם",
        "signup_btn_login": "יש לך כבר חשבון? התחבר",
        "forgot_email": "כתובת אימייל",
        "forgot_btn": "שלח קישור לאיפוס",
        "forgot_back": "← חזור להתחברות",
        "forgot_title": "שכחת סיסמה?",
        "forgot_sub": "הכנס את האימייל שלך ונשלח קישור לאיפוס",
        
        // Lobby
        "lobby_hello": "שלום, ",
        "lobby_my_trips": "הטיולים שלי 🌍",
        "lobby_no_trips": "אין טיולים עדיין. צור טיול חדש!",
        "lobby_btn_create": "+ צור טיול חדש ✈️",
        "create_trip_title": "צור טיול חדש ✈️",
        "create_trip_name": "שם הטיול / יעד",
        "create_trip_name_ph": "למשל: תאילנד, פריז...",
        "create_trip_budget": "תקציב",
        "create_trip_invite": "הזמן חברים (אימייל או טלפון)",
        "create_trip_invite_ph": "הכנס טלפון או אימייל",
        "create_trip_btn": "צור טיול ✈️",
        "trip_budget_label": "תקציב: ",
        
        // Dashboard Home
        "menu_my_trips": "🌍 הטיולים שלי",
        "menu_dashboard": "🏠 דשבורד",
        "menu_balances": "📊 יתרות",
        "menu_profile": "👤 פרופיל",
        "menu_logout": "⎋ התנתק",
        "tab_home": "בית",
        "tab_expenses": "הוצאות",
        "tab_add": "הוסף",
        "tab_balances": "סיכומים",
        "tab_profile": "פרופיל",
        
        "home_total_budget": 'סה"כ תקציב',
        "home_spent": "הוצא",
        "home_left": "נותר",
        "home_recent_expenses": "הוצאות אחרונות",
        "home_view_all": "הצג הכל",
        
        // Expenses
        "expenses_title": "כל ההוצאות",
        "expenses_no_data": "אין הוצאות בינתיים",
        "expense_paid_by": "שילם: ",
        "expense_add_title": "הוספת הוצאה",
        "expense_what": "על מה היה?",
        "expense_what_ph": "למשל: ארוחת ערב, מונית...",
        "expense_amount": "סכום",
        "expense_category": "קטגוריה",
        "expense_for_who": "עבור מי?",
        "expense_btn_save": "שמור הוצאה 💸",
        
        // Categories
        "cat_food": "🍕 אוכל",
        "cat_lodging": "🛏️ לינה",
        "cat_transport": "🚕 תחבורה",
        "cat_attractions": "🎟️ אטרקציות",
        "cat_general": "💡 כללי",
        
        // Balances
        "balances_title": "סיכומים ויתרות",
        "balances_no_data": "אין נתונים",
        "balance_receive": "צריך לקבל",
        "balance_pay": "צריך לשלם",
        "balance_settled": "מאוזן",
        "balance_you": " (את/ה)",
        "balance_paid": "שילם: ",
        
        // Profile
        "profile_title": "פרופיל",
        "profile_display_name": "שם תצוגה",
        "profile_new_name": "שם חדש",
        "profile_new_name_ph": "הכנס שם תצוגה חדש",
        "profile_btn_save_name": "לשמור 👤",
        "profile_language": "שפה / Language",
        "profile_change_pwd": "שינוי סיסמה 🔐",
        "profile_current_pwd": "סיסמה נוכחית",
        "profile_new_pwd": "סיסמה חדשה",
        "profile_confirm_pwd": "אימות סיסמה חדשה",
        "profile_btn_update_pwd": "עדכן סיסמה 🔑",
        
        // Reset Password
        "reset_title": "איפוס סיסמה 🔐",
        "reset_btn": "אפס סיסמה 🔑",
        
        // Modals
        "modal_edit_trip": "✏️ עריכת טיול",
        "modal_edit_expense": "✏️ עריכת הוצאה",
        "modal_invite_new": "הזמן חברים חדשים",
        
        // Alerts & Toasts
        "toast_trip_created": "הטיול נוצר בהצלחה! 🌍",
        "toast_trip_updated": "הטיול עודכן בהצלחה! ✅",
        "toast_expense_added": "ההוצאה נוספה! 💸",
        "toast_expense_deleted": "ההוצאה נמחקה 🗑️",
        "toast_expense_updated": "ההוצאה עודכנה! ✏️",
        "toast_name_updated": "השם עודכן בהצלחה!",
        "toast_pwd_updated": "הסיסמה עודכנה בהצלחה!",
        "confirm_delete_expense": "למחוק את ההוצאה?",
        
        // Errors
        "err_fill_all": "יש למלא את כל השדות.",
        "err_invalid_amount": "יש למלא סכום תקין.",
        "err_no_participants": "בחר לפחות משתתף אחד.",

        // Phase 4: Receipt Scanning
        "scan_receipt": "📷 סרוק קבלה",
        "scan_scanning": "סורק...",
        "scan_items_found": "פריטים שנמצאו",
        "scan_add_items": "הוסף פריטים",
        "scan_no_image": "בחר תמונה לסריקה",

        // Phase 4: Unequal Splits
        "split_equal": "חלוקה שווה ⚖️",
        "split_custom": "סכומים מותאמים 📊",
        "split_sum_error": "הסכומים לא תואמים לסכום הכולל",

        // Phase 4: Settle Up
        "settle_up": "סלק חוב 💸",
        "settle_confirm": "לסלק חוב?",
        "toast_settled": "החוב סולק! 🎉",

        // Phase 4: Activity Feed
        "activity_title": "פעילות 📋",
        "tab_activity": "פעילות 📋",
        "activity_no_data": "אין פעילות עדיין",
        "activity_expense_added": "הוסיף הוצאה",
        "activity_expense_edited": "ערך הוצאה",
        "activity_expense_deleted": "מחק הוצאה",
        "activity_settlement": "סילוק חוב",

        // Profile Page (extended)
        "profile_phone": "טלפון",
        "profile_no_phone": "לא צוין",
        "profile_no_email": "לא צוין",
        "profile_back": "חזרה",
        "profile_change_username": "שינוי שם תצוגה",
        "profile_change_language": "שפה / Language",
        "profile_verify_pwd": "אימות סיסמה",
        "profile_verify_btn": "אמת סיסמה",
        "profile_new_pwd_section": "סיסמה חדשה",
        "profile_confirm_pwd_section": "אימות סיסמה חדשה",
        "profile_save_pwd": "עדכן סיסמה",
        "profile_save_name_btn": "שמור שם",
        "profile_save_lang_btn": "שמור שפה",
        "profile_current_pwd_ph": "הכנס סיסמה נוכחית",
        "profile_new_pwd_ph": "הכנס סיסמה חדשה",
        "profile_confirm_pwd_ph": "הכנס סיסמה חדשה שוב",
        "profile_new_name_ph": "הכנס שם תצוגה חדש",
        "profile_logout_btn": "התנתק"
    },
    en: {
        // General
        "brand_master": "MASTER",
        "brand_splitter": "SPLITTER",
        "btn_save": "Save 💾",
        "btn_cancel": "Cancel ✕",
        "btn_close": "Close ✕",
        "loading": "Loading...",
        "error_network": "Network error.",
        
        // Login & Auth
        "login_welcome": "Welcome back!",
        "login_sub": "Log in to manage your expenses",
        "login_username_email": "Username or Email",
        "login_password": "Password",
        "login_email": "Email",
        "login_phone": "Phone Number",
        "login_btn_login": "Log In",
        "login_forgot": "Forgot Password?",
        "login_or": "or",
        "login_btn_signup": "Create New Account",
        "login_social_divider": "Or continue with",
        "signup_title": "Create Account",
        "signup_sub": "Join and start splitting expenses",
        "signup_btn_signup": "Sign Up",
        "signup_btn_login": "Already have an account? Log In",
        "forgot_email": "Email Address",
        "forgot_btn": "Send Reset Link",
        "forgot_back": "← Back to Login",
        "forgot_title": "Forgot Password?",
        "forgot_sub": "Enter your email to receive a reset link",
        
        // Lobby
        "lobby_hello": "Hello, ",
        "lobby_my_trips": "My Trips 🌍",
        "lobby_no_trips": "No trips yet. Create a new trip!",
        "lobby_btn_create": "+ Create New Trip ✈️",
        "create_trip_title": "Create New Trip ✈️",
        "create_trip_name": "Trip Name / Destination",
        "create_trip_name_ph": "e.g. Thailand, Paris...",
        "create_trip_budget": "Budget",
        "create_trip_invite": "Invite Friends (Email or Phone)",
        "create_trip_invite_ph": "Enter phone or email",
        "create_trip_btn": "Create Trip ✈️",
        "trip_budget_label": "Budget: ",
        
        // Dashboard Home
        "menu_my_trips": "🌍 My Trips",
        "menu_dashboard": "🏠 Dashboard",
        "menu_balances": "📊 Balances",
        "menu_profile": "👤 Profile",
        "menu_logout": "⎋ Logout",
        "tab_home": "Home",
        "tab_expenses": "Expenses",
        "tab_add": "Add",
        "tab_balances": "Balances",
        "tab_profile": "Profile",
        
        "home_total_budget": "Total Budget",
        "home_spent": "Spent",
        "home_left": "Left",
        "home_recent_expenses": "Recent Expenses",
        "home_view_all": "View All",
        
        // Expenses
        "expenses_title": "All Expenses",
        "expenses_no_data": "No expenses yet",
        "expense_paid_by": "Paid by: ",
        "expense_add_title": "Add Expense",
        "expense_what": "What was it for?",
        "expense_what_ph": "e.g. Dinner, Taxi...",
        "expense_amount": "Amount",
        "expense_category": "Category",
        "expense_for_who": "For whom?",
        "expense_btn_save": "Save Expense 💸",
        
        // Categories
        "cat_food": "🍕 Food",
        "cat_lodging": "🛏️ Lodging",
        "cat_transport": "🚕 Transport",
        "cat_attractions": "🎟️ Attractions",
        "cat_general": "💡 General",
        
        // Balances
        "balances_title": "Summaries & Balances",
        "balances_no_data": "No data",
        "balance_receive": "Owed",
        "balance_pay": "Owes",
        "balance_settled": "Settled",
        "balance_you": " (You)",
        "balance_paid": "Paid: ",
        
        // Profile
        "profile_title": "Profile",
        "profile_display_name": "Display Name",
        "profile_new_name": "New Name",
        "profile_new_name_ph": "Enter new display name",
        "profile_btn_save_name": "Save 👤",
        "profile_language": "Language / שפה",
        "profile_change_pwd": "Change Password 🔐",
        "profile_current_pwd": "Current Password",
        "profile_new_pwd": "New Password",
        "profile_confirm_pwd": "Confirm New Password",
        "profile_btn_update_pwd": "Update Password 🔑",
        
        // Reset Password
        "reset_title": "Reset Password 🔐",
        "reset_btn": "Reset Password 🔑",
        
        // Modals
        "modal_edit_trip": "✏️ Edit Trip",
        "modal_edit_expense": "✏️ Edit Expense",
        "modal_invite_new": "Invite New Friends",
        
        // Alerts & Toasts
        "toast_trip_created": "Trip created successfully! 🌍",
        "toast_trip_updated": "Trip updated successfully! ✅",
        "toast_expense_added": "Expense added! 💸",
        "toast_expense_deleted": "Expense deleted 🗑️",
        "toast_expense_updated": "Expense updated! ✏️",
        "toast_name_updated": "Name updated successfully!",
        "toast_pwd_updated": "Password updated successfully!",
        "confirm_delete_expense": "Delete this expense?",
        
        // Errors
        "err_fill_all": "Please fill in all fields.",
        "err_invalid_amount": "Please enter a valid amount.",
        "err_no_participants": "Select at least one participant.",

        // Phase 4: Receipt Scanning
        "scan_receipt": "📷 Scan Receipt",
        "scan_scanning": "Scanning...",
        "scan_items_found": "Items Found",
        "scan_add_items": "Add Items",
        "scan_no_image": "Select an image to scan",

        // Phase 4: Unequal Splits
        "split_equal": "Split Equally",
        "split_custom": "Custom Amounts",
        "split_sum_error": "Amounts don't match total",

        // Phase 4: Settle Up
        "settle_up": "Settle Up 💸",
        "settle_confirm": "Settle this debt?",
        "toast_settled": "Debt settled! 🎉",

        // Phase 4: Activity Feed
        "activity_title": "Activity 📋",
        "tab_activity": "Activity 📋",
        "activity_no_data": "No activity yet",
        "activity_expense_added": "Added expense",
        "activity_expense_edited": "Edited expense",
        "activity_expense_deleted": "Deleted expense",
        "activity_settlement": "Debt settlement",

        // Profile Page (extended)
        "profile_phone": "Phone",
        "profile_no_phone": "Not specified",
        "profile_no_email": "Not specified",
        "profile_back": "Back",
        "profile_change_username": "Change Display Name",
        "profile_change_language": "Language / שפה",
        "profile_verify_pwd": "Verify Password",
        "profile_verify_btn": "Verify Password",
        "profile_new_pwd_section": "New Password",
        "profile_confirm_pwd_section": "Confirm New Password",
        "profile_save_pwd": "Update Password",
        "profile_save_name_btn": "Save Name",
        "profile_save_lang_btn": "Save Language",
        "profile_current_pwd_ph": "Enter current password",
        "profile_new_pwd_ph": "Enter new password",
        "profile_confirm_pwd_ph": "Enter new password again",
        "profile_new_name_ph": "Enter new display name",
        "profile_logout_btn": "Log Out"
    }
};

let currentLang = 'he';

function initLanguage() {
    // We fetch language from API or use default
    fetch('/api/me').then(res => {
        if(res.ok) {
            res.json().then(data => {
                if(data.language) {
                    setLanguage(data.language);
                }
            });
        }
    }).catch(e => {
        // Not logged in, use localStorage
        let saved = localStorage.getItem('lang');
        if(saved) setLanguage(saved);
        else applyTranslations(); // fallback to default 'he'
    });
}

function setLanguage(lang) {
    if (lang !== 'he' && lang !== 'en') lang = 'he';
    currentLang = lang;
    localStorage.setItem('lang', lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = (lang === 'he') ? 'rtl' : 'ltr';
    document.body.style.direction = (lang === 'he') ? 'rtl' : 'ltr';
    applyTranslations();
}

function i18n(key) {
    if (!translations[currentLang]) return key;
    return translations[currentLang][key] !== undefined ? translations[currentLang][key] : key;
}

function applyTranslations() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[currentLang][key]) {
            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                el.placeholder = translations[currentLang][key];
            } else {
                el.textContent = translations[currentLang][key];
            }
        }
    });
    
    document.querySelectorAll('[data-i18n-html]').forEach(el => {
        const key = el.getAttribute('data-i18n-html');
        if (translations[currentLang][key]) {
            el.innerHTML = translations[currentLang][key];
        }
    });
}

// Call init on load
document.addEventListener('DOMContentLoaded', () => {
    initLanguage();
});
