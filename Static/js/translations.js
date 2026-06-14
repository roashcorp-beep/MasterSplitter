const translations = {
    he: {
        // General
        "brand_master": "MASTER",
        "brand_splitter": "SPLITTER",
        "btn_save": "שמור",
        "btn_cancel": "ביטול",
        "btn_close": "סגור",
        "only_me": "אני בלבד",
        "add_guest_user": "הוסף משתמש אורח",
        "split_amounts": "סכומים",
        "split_items": "יחס/פריטים",
        "profile_feedback": "שלח משוב",
        "modal_join_title": "הצטרפות לקבוצה",
        "modal_join_prompt": "האם אתה בטוח שברצונך להצטרף לקבוצה זו?",
        "btn_join": "הצטרף",
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
        "forgot_back": "חזור להתחברות",
        "forgot_title": "שכחת סיסמה?",
        "forgot_sub": "הכנס את האימייל שלך ונשלח קישור לאיפוס",
        
        // Lobby
        "lobby_hello": "שלום, ",
        "lobby_my_trips": "הקבוצות שלי",
        "lobby_no_trips": "אין קבוצות עדיין. צור קבוצה חדשה!",
        "lobby_btn_create": "+ צור קבוצה חדשה",
        "create_trip_title": "צור קבוצה חדשה",
        "create_trip_name": "שם הקבוצה",
        "create_trip_name_ph": "למשל: דירה, חופשה, משרד...",
        "create_trip_budget": "תקציב",
        "create_trip_budget_type": "סוג תקציב",
        "budget_type_none": "ללא",
        "budget_type_monthly": "חודשי",
        "budget_type_yearly": "שנתי",
        "create_trip_invite": "הזמן חברים (אימייל או טלפון)",
        "create_trip_invite_ph": "הכנס טלפון או אימייל",
        "create_trip_btn": "צור קבוצה",
        "trip_budget_label": "תקציב: ",
        
        // Dashboard Home
        "menu_my_trips": "הקבוצות שלי",
        "menu_dashboard": "דשבורד",
        "menu_balances": "יתרות",
        "menu_profile": "פרופיל",
        "menu_logout": "התנתק",
        "tab_home": "בית",
        "tab_expenses": "הוצאות",
        "tab_add": "הוסף",
        "tab_balances": "סיכומים",
        "tab_profile": "פרופיל",
        
        "home_total_budget": 'סה"כ תקציב',
        "home_total_expenses": 'סה"כ הוצאות',
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
        "expense_currency": "מטבע",
        "expense_category": "קטגוריה",
        "expense_for_who": "עבור מי?",
        "expense_btn_save": "שמור הוצאה",
        
        // Categories
        "cat_food": "אוכל",
        "cat_lodging": "לינה",
        "cat_transport": "תחבורה",
        "cat_attractions": "אטרקציות",
        "cat_general": "כללי",
        
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
        "profile_btn_save_name": "שמור",
        "profile_language": "שפה / Language",
        "profile_change_pwd": "שינוי סיסמה",
        "profile_current_pwd": "סיסמה נוכחית",
        "profile_new_pwd": "סיסמה חדשה",
        "profile_confirm_pwd": "אימות סיסמה חדשה",
        "profile_btn_update_pwd": "עדכן סיסמה",
        
        // Reset Password
        "reset_title": "איפוס סיסמה",
        "reset_btn": "אפס סיסמה",
        
        // Modals
        "modal_edit_trip": "עריכת קבוצה",
        "modal_edit_expense": "עריכת הוצאה",
        "modal_invite_new": "הזמן חברים חדשים",
        
        // Group Info
        "group_info_title": "פרטי קבוצה",
        "group_info_members": "חברי קבוצה",
        "group_info_admin": "מנהל",
        "group_info_leave": "צא מהקבוצה",
        "group_info_leave_confirm": "בטוח שברצונך לצאת מהקבוצה?",
        "group_info_public_expenses": "הצג הוצאות לכולם",
        "group_info_public_hint": "כשכבוי, חברים רואים רק הוצאות ששילמו או שהם חלק מהן.",
        "group_info_allow_delete": "אפשר לחברים למחוק הוצאות",
        "group_info_allow_delete_hint": "כשכבוי, רק מנהלים יכולו למחוק הוצאות.",
        "promote_question": "להפוך למנהל?",
        "menu_activity": "יומן פעולות",
        "menu_stats": "סטטיסטיקה",
        "profile_change_currency": "מטבע ברירת מחדל",
        "profile_save_currency_btn": "שמור מטבע",
        
        // Alerts & Toasts
        "toast_trip_created": "הקבוצה נוצרה בהצלחה!",
        "toast_trip_updated": "הקבוצה עודכנה בהצלחה!",
        "toast_expense_added": "ההוצאה נוספה!",
        "toast_expense_deleted": "ההוצאה נמחקה",
        "toast_expense_updated": "ההוצאה עודכנה!",
        "toast_name_updated": "השם עודכן בהצלחה!",
        "toast_pwd_updated": "הסיסמה עודכנה בהצלחה!",
        "toast_left_group": "יצאת מהקבוצה.",
        "confirm_delete_expense": "למחוק את ההוצאה?",
        
        // Errors
        "err_fill_all": "יש למלא את כל השדות.",
        "err_invalid_amount": "יש למלא סכום תקין.",
        "err_no_participants": "בחר לפחות משתתף אחד.",

        // Receipt Scanning
        "scan_receipt": "📸 סרוק / העלה קבלה",
        "scan_scanning": "סורק...",
        "scan_items_found": "פריטים שנמצאו",
        "scan_add_items": "הוסף פריטים",
        "scan_no_image": "בחר תמונה לסריקה",

        // Unequal Splits
        "split_equal": "חלוקה שווה",
        "split_custom": "סכומים מותאמים",
        "split_sum_error": "הסכומים לא תואמים לסכום הכולל",

        // Settle Up
        "settle_up": "סלק חוב",
        "settle_confirm": "לסלק חוב?",
        "toast_settled": "החוב סולק!",

        // Activity Feed
        "activity_title": "פעילות",
        "tab_activity": "פעילות",
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
        "profile_logout_btn": "התנתק",

        // AI
        "ai_smart_add": "הוספה חכמה עם AI",
        "ai_placeholder": "תאר את ההוצאה בשפה חופשית",
        "ai_analyze": "נתח",
        "ai_success": "AI מילא את הטופס בהצלחה!",
        "ai_modal_hint": "תאר את ההוצאה בשפה חופשית וה-AI ימלא את הטופס אוטומטית",

        // Settings (legacy keys)
        "settings_title": "הגדרות קבוצה",
        "settings_public_expenses": "הצג הוצאות לכולם",
        "settings_public_hint": "כשכבוי, חברים רואים רק הוצאות ששילמו או שהם חלק מהן.",
        "settings_members": "חברי קבוצה",

        // Phase 2 additions
        "demote_question": "הסר הרשאות מנהל?",
        "demote_success": "הרשאות מנהל הוסרו",
        "invite_link_copied": "קישור הזמנה הועתק!",
        "invite_joined": "הצטרפת לקבוצה!",
        "invite_link_btn": "צור קישור הזמנה",
        "profile_change_phone": "עדכון מספר טלפון",
        "profile_phone_ph": "מספר טלפון חדש",
        "profile_save_phone_btn": "שמור טלפון",
        "profile_phone_required": "יש להזין מספר טלפון",
        "profile_phone_saved": "הטלפון עודכן בהצלחה",
        "profile_tutorial": "מדריך שימוש",
        "profile_tutorial_coming": "סרטון הדרכה בקרוב!",
        "profile_tutorial_desc": "כאן יופיע סרטון הדרכה שילמד אותך כיצד להשתמש באפליקציה.",
        "getFinancialTipBtn": "עוזר פיננסי חכם ✨",
        "loadingThinking": "חושב...",

        // Step 7 - Groups Overhaul
        "budget_type_daily": "יומי",
        "budget_per_user": "תקציב לכל משתתף",
        "budget_per_user_hint": "התקציב חל על כל משתתף בנפרד",
        "budget_amount_label": "סכום תקציב",
        "invite_tab_whatsapp": "וואטסאפ",
        "invite_tab_email": "אימייל",
        "invite_tab_guest": "אורח",
        "invite_name_ph": "שם",
        "invite_phone_ph": "מספר טלפון",
        "invite_email_ph": "כתובת אימייל",
        "invite_send_whatsapp": "שלח הזמנה בוואטסאפ",
        "invite_send_email": "שלח הזמנה באימייל",
        "invite_add_guest": "הוסף אורח",
        "invite_whatsapp_note": "המשתמש יצטרף לקבוצה ברגע שילחץ על הקישור.",
        "invite_email_sent": "הזמנה נשלחה באימייל!",
        "invite_email_note": "ההזמנה תישלח לכתובת האימייל שהוזנה.",
        "lobby_no_groups": "אין קבוצות עדיין. צור קבוצה חדשה!",
        "members_count": "חברים",
        "invite_members_title": "הזמן חברים",
        "budget_currency": "מטבע הקבוצה",
        "btn_add_participant": "הוסף חבר",
        "invite_name_placeholder": "שם",
        "invite_phone_placeholder": "מספר טלפון",
        "invite_email_placeholder": "כתובת אימייל",
        "btn_send_email": "שלח הזמנה באימייל",
        "btn_add_guest": "הוסף אורח",
        "total_budget": 'סה"כ תקציב',
        "members_count_label": "משתתפים",
        "edit_group": "ערוך קבוצה"
    },
    en: {
        // General
        "brand_master": "MASTER",
        "brand_splitter": "SPLITTER",
        "btn_save": "Save",
        "btn_cancel": "Cancel",
        "btn_close": "Close",
        "only_me": "Only me",
        "add_guest_user": "Add Guest User",
        "split_amounts": "Amounts",
        "split_items": "Items/Ratio",
        "profile_feedback": "Send Feedback",
        "modal_join_title": "Join Group",
        "modal_join_prompt": "Are you sure you want to join this group?",
        "btn_join": "Join",
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
        "forgot_back": "Back to Login",
        "forgot_title": "Forgot Password?",
        "forgot_sub": "Enter your email to receive a reset link",
        
        // Lobby
        "lobby_hello": "Hello, ",
        "lobby_my_trips": "My Groups",
        "lobby_no_trips": "No groups yet. Create a new group!",
        "lobby_btn_create": "+ Create New Group",
        "create_trip_title": "Create New Group",
        "create_trip_name": "Group Name",
        "create_trip_name_ph": "e.g. Apartment, Vacation, Office...",
        "create_trip_budget": "Budget",
        "create_trip_budget_type": "Budget Type",
        "budget_type_none": "None",
        "budget_type_monthly": "Monthly",
        "budget_type_yearly": "Yearly",
        "create_trip_invite": "Invite Friends (Email or Phone)",
        "create_trip_invite_ph": "Enter phone or email",
        "create_trip_btn": "Create Group",
        "trip_budget_label": "Budget: ",
        
        // Dashboard Home
        "menu_my_trips": "My Groups",
        "menu_dashboard": "Dashboard",
        "menu_balances": "Balances",
        "menu_profile": "Profile",
        "menu_logout": "Logout",
        "tab_home": "Home",
        "tab_expenses": "Expenses",
        "tab_add": "Add",
        "tab_balances": "Balances",
        "tab_profile": "Profile",
        
        "home_total_budget": "Total Budget",
        "home_total_expenses": "Total Expenses",
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
        "expense_currency": "Currency",
        "expense_category": "Category",
        "expense_for_who": "For whom?",
        "expense_btn_save": "Save Expense",
        
        // Categories
        "cat_food": "Food",
        "cat_lodging": "Lodging",
        "cat_transport": "Transport",
        "cat_attractions": "Attractions",
        "cat_general": "General",
        
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
        "profile_btn_save_name": "Save",
        "profile_language": "Language",
        "profile_change_pwd": "Change Password",
        "profile_current_pwd": "Current Password",
        "profile_new_pwd": "New Password",
        "profile_confirm_pwd": "Confirm New Password",
        "profile_btn_update_pwd": "Update Password",
        
        // Reset Password
        "reset_title": "Reset Password",
        "reset_btn": "Reset Password",
        
        // Modals
        "modal_edit_trip": "Edit Group",
        "modal_edit_expense": "Edit Expense",
        "modal_invite_new": "Invite New Friends",
        
        // Group Info
        "group_info_title": "Group Info",
        "group_info_members": "Members",
        "group_info_admin": "Admin",
        "group_info_leave": "Leave Group",
        "group_info_leave_confirm": "Are you sure you want to leave this group?",
        "group_info_public_expenses": "Show all expenses to everyone",
        "group_info_public_hint": "When off, members only see expenses they paid or are split with.",
        "group_info_allow_delete": "Allow members to delete expenses",
        "group_info_allow_delete_hint": "When off, only admins can delete expenses.",
        "promote_question": "Make Admin?",
        "menu_activity": "Activity Log",
        "menu_stats": "Statistics",
        "profile_change_currency": "Default Currency",
        "profile_save_currency_btn": "Save Currency",
        
        // Alerts & Toasts
        "toast_trip_created": "Group created successfully!",
        "toast_trip_updated": "Group updated successfully!",
        "toast_expense_added": "Expense added!",
        "toast_expense_deleted": "Expense deleted",
        "toast_expense_updated": "Expense updated!",
        "toast_name_updated": "Name updated successfully!",
        "toast_pwd_updated": "Password updated successfully!",
        "toast_left_group": "You left the group.",
        "confirm_delete_expense": "Delete this expense?",
        
        // Errors
        "err_fill_all": "Please fill in all fields.",
        "err_invalid_amount": "Please enter a valid amount.",
        "err_no_participants": "Select at least one participant.",

        // Receipt Scanning
        "scan_receipt": "📸 Scan / Upload Receipt",
        "scan_scanning": "Scanning...",
        "scan_items_found": "Items Found",
        "scan_add_items": "Add Items",
        "scan_no_image": "Select an image to scan",

        // Unequal Splits
        "split_equal": "Split Equally",
        "split_custom": "Custom Amounts",
        "split_sum_error": "Amounts don't match total",

        // Settle Up
        "settle_up": "Settle Up",
        "settle_confirm": "Settle this debt?",
        "toast_settled": "Debt settled!",

        // Activity Feed
        "activity_title": "Activity",
        "tab_activity": "Activity",
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
        "profile_change_language": "Language",
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
        "profile_logout_btn": "Log Out",

        // AI
        "ai_smart_add": "Smart Add with AI",
        "ai_placeholder": "Describe the expense in natural language",
        "ai_analyze": "Analyze",
        "ai_success": "AI filled the form successfully!",
        "ai_modal_hint": "Describe the expense in natural language and AI will auto-fill the form",

        // Settings (legacy keys)
        "settings_title": "Group Settings",
        "settings_public_expenses": "Show all expenses to everyone",
        "settings_public_hint": "When off, members only see expenses they paid or are split with.",
        "settings_members": "Members",

        // Phase 2 additions
        "demote_question": "Remove Admin?",
        "demote_success": "Admin removed",
        "invite_link_copied": "Invite link copied!",
        "invite_joined": "Joined group!",
        "invite_link_btn": "Create Invite Link",
        "profile_change_phone": "Update Phone Number",
        "profile_phone_ph": "New phone number",
        "profile_save_phone_btn": "Save Phone",
        "profile_phone_required": "Please enter a phone number",
        "profile_phone_saved": "Phone updated successfully",
        "profile_tutorial": "Tutorial",
        "profile_tutorial_coming": "Tutorial video coming soon!",
        "profile_tutorial_desc": "A tutorial video will appear here to help you learn how to use the app.",
        "getFinancialTipBtn": "Smart Financial Assistant ✨",
        "loadingThinking": "Thinking...",

        // Step 7 - Groups Overhaul
        "budget_type_daily": "Daily",
        "budget_per_user": "Budget per user",
        "budget_per_user_hint": "Budget applies to each member individually",
        "budget_amount_label": "Budget Amount",
        "invite_tab_whatsapp": "WhatsApp",
        "invite_tab_email": "Email",
        "invite_tab_guest": "Guest",
        "invite_name_ph": "Name",
        "invite_phone_ph": "Phone number",
        "invite_email_ph": "Email address",
        "invite_send_whatsapp": "Send WhatsApp Invite",
        "invite_send_email": "Send Email Invite",
        "invite_add_guest": "Add Guest",
        "invite_whatsapp_note": "User will join the group once they click the link.",
        "invite_email_sent": "Email invite sent!",
        "invite_email_note": "The invite will be sent to the email address provided.",
        "lobby_no_groups": "No groups yet. Create a new group!",
        "members_count": "members",
        "invite_members_title": "Invite Members",
        "budget_currency": "Group Currency",
        "btn_add_participant": "Add Participant",
        "invite_name_placeholder": "Name",
        "invite_phone_placeholder": "Phone Number",
        "invite_email_placeholder": "Email Address",
        "btn_send_email": "Send Email Invite",
        "btn_add_guest": "Add Guest",
        "total_budget": "Total Budget",
        "members_count_label": "Members",
        "edit_group": "Edit Group"
    }
};

let currentLang = 'he';

function initLanguage() {
    let saved = localStorage.getItem('lang');
    if(saved) setLanguage(saved);
    else applyTranslations(); // fallback to default 'he'

    // We fetch language from API to sync
    fetch('/api/me').then(res => {
        if(res.ok) {
            res.json().then(data => {
                if(data.language && data.language !== saved) {
                    setLanguage(data.language);
                }
            });
        }
    }).catch(e => {
        console.error('Failed to sync language from API', e);
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
    if (typeof window.updateUI === 'function') window.updateUI();
    window.dispatchEvent(new Event('languageChanged'));
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

    document.querySelectorAll('input, textarea').forEach(el => {
        if(el.type !== 'hidden' && el.type !== 'checkbox' && el.type !== 'radio' && el.type !== 'file') {
            el.setAttribute('dir', currentLang === 'he' ? 'rtl' : 'ltr');
        }
    });
}

// Call init on load
document.addEventListener('DOMContentLoaded', () => {
    initLanguage();
});
