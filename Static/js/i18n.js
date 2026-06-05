/**
 * MasterSplitter Isolated i18n Engine
 * This module is safely scoped to prevent namespace collisions.
 */

(function (global) {
    // Dictionary structure for supported languages
    const dictionary = {
        he: {
            dir: 'rtl',
            loginTitle: 'ברוך הבא',
            welcomeText: 'ברוך הבא',
            welcomeSubtitle: 'התחבר כדי לנהל את ההוצאות שלך',
            email: 'אימייל',
            username: 'שם משתמש',
            phone: 'טלפון',
            password: 'סיסמה',
            rememberMe: 'הישאר מחובר',
            forgotPassword: 'שכחת סיסמה?',
            signup: 'צור חשבון חדש / הירשם',
            loginBtn: 'התחבר',
            signupBtn: 'הרשמה',
            loginInstead: 'התחבר לחשבון קיים',
            termsAgree: 'אני מסכים לתנאי השימוש והפרטיות',
            securityNotice: 'הנתונים שלך מאובטחים',
            googleLogin: 'המשך עם Google',
            emptyUsername: 'אנא הזן שם משתמש',
            emptyEmail: 'אנא הזן אימייל',
            emptyPassword: 'אנא הזן סיסמה',
            emptyPhone: 'אנא הזן טלפון',
            agreeTermsMsg: 'אנא אשר את תנאי השימוש'
        },
        en: {
            dir: 'ltr',
            loginTitle: 'Welcome',
            welcomeText: 'Welcome',
            welcomeSubtitle: 'Log in to manage your expenses',
            email: 'Email',
            username: 'Username',
            phone: 'Phone',
            password: 'Password',
            rememberMe: 'Stay logged in',
            forgotPassword: 'Forgot Password?',
            signup: 'Create new account / Sign up',
            loginBtn: 'Sign In',
            signupBtn: 'Sign Up',
            loginInstead: 'Login to existing account',
            termsAgree: 'I agree to the Terms of Service & Privacy Policy',
            securityNotice: 'Your data is secure',
            googleLogin: 'Continue with Google',
            emptyUsername: 'Please enter a username',
            emptyEmail: 'Please enter an email',
            emptyPassword: 'Please enter a password',
            emptyPhone: 'Please enter a phone number',
            agreeTermsMsg: 'Please agree to the Terms & Privacy policy first.'
        },
        es: {
            dir: 'ltr',
            loginTitle: 'Bienvenido',
            welcomeText: 'Bienvenido',
            welcomeSubtitle: 'Inicie sesión para administrar sus gastos',
            email: 'Correo electrónico',
            username: 'Nombre de usuario',
            phone: 'Teléfono',
            password: 'Contraseña',
            rememberMe: 'Mantener sesión iniciada',
            forgotPassword: '¿Olvidaste tu contraseña?',
            signup: 'Crear nueva cuenta / Registrarse',
            loginBtn: 'Ingresar',
            signupBtn: 'Registrarse',
            loginInstead: 'Iniciar sesión con una cuenta existente',
            termsAgree: 'Acepto los Términos y la Política de Privacidad',
            securityNotice: 'Tus datos están seguros',
            googleLogin: 'Continuar con Google',
            emptyUsername: 'Por favor ingrese su nombre de usuario',
            emptyEmail: 'Por favor ingrese su correo',
            emptyPassword: 'Por favor ingrese su contraseña',
            emptyPhone: 'Por favor ingrese su teléfono',
            agreeTermsMsg: 'Por favor acepte los términos y condiciones'
        },
        ru: {
            dir: 'ltr',
            loginTitle: 'Добро пожаловать',
            welcomeText: 'Добро пожаловать',
            welcomeSubtitle: 'Войдите, чтобы управлять расходами',
            email: 'Электронная почта',
            username: 'Имя пользователя',
            phone: 'Телефон',
            password: 'Пароль',
            rememberMe: 'Оставаться в системе',
            forgotPassword: 'Забыли пароль?',
            signup: 'Создать новый аккаунт / Зарегистрироваться',
            loginBtn: 'Войти',
            signupBtn: 'Зарегистрироваться',
            loginInstead: 'Войти в существующий аккаунт',
            termsAgree: 'Я принимаю Условия использования и Политику конфиденциальности',
            securityNotice: 'Ваши данные в безопасности',
            googleLogin: 'Продолжить с Google',
            emptyUsername: 'Пожалуйста, введите имя пользователя',
            emptyEmail: 'Пожалуйста, введите email',
            emptyPassword: 'Пожалуйста, введите пароль',
            emptyPhone: 'Пожалуйста, введите номер телефона',
            agreeTermsMsg: 'Пожалуйста, примите условия использования'
        },
        ar: {
            dir: 'rtl',
            loginTitle: 'مرحبًا',
            welcomeText: 'مرحبًا',
            welcomeSubtitle: 'سجل الدخول لإدارة نفقاتك',
            email: 'البريد الإلكتروني',
            username: 'اسم المستخدم',
            phone: 'هاتف',
            password: 'كلمة المرور',
            rememberMe: 'البقاء مسجلاً',
            forgotPassword: 'هل نسيت كلمة المرور؟',
            signup: 'إنشاء حساب جديد / تسجيل',
            loginBtn: 'دخول',
            signupBtn: 'تسجيل',
            loginInstead: 'تسجيل الدخول إلى حساب موجود',
            termsAgree: 'أوافق على الشروط وسياسة الخصوصية',
            securityNotice: 'بياناتك آمنة',
            googleLogin: 'المتابعة باستخدام Google',
            emptyUsername: 'الرجاء إدخال اسم المستخدم',
            emptyEmail: 'الرجاء إدخال البريد الإلكتروني',
            emptyPassword: 'الرجاء إدخال كلمة المرور',
            emptyPhone: 'الرجاء إدخال رقم الهاتف',
            agreeTermsMsg: 'الرجاء الموافقة على الشروط أولاً'
        },
        fr: {
            dir: 'ltr',
            loginTitle: 'Bienvenue',
            welcomeText: 'Bienvenue',
            welcomeSubtitle: 'Connectez-vous pour gérer vos dépenses',
            email: 'E-mail',
            username: 'Nom d\'utilisateur',
            phone: 'Téléphone',
            password: 'Mot de passe',
            rememberMe: 'Rester connecté',
            forgotPassword: 'Mot de passe oublié ?',
            signup: 'Créer un nouveau compte / S\'inscrire',
            loginBtn: 'Se connecter',
            signupBtn: 'S\'inscrire',
            loginInstead: 'Se connecter à un compte existant',
            termsAgree: 'J\'accepte les Conditions et la Politique de Confidentialité',
            securityNotice: 'Vos données sont sécurisées',
            googleLogin: 'Continuer avec Google',
            emptyUsername: 'Veuillez entrer un nom d\'utilisateur',
            emptyEmail: 'Veuillez entrer un email',
            emptyPassword: 'Veuillez entrer un mot de passe',
            emptyPhone: 'Veuillez entrer un numéro de téléphone',
            agreeTermsMsg: 'Veuillez accepter les conditions d\'utilisation'
        },
        zh: {
            dir: 'ltr',
            loginTitle: '欢迎',
            welcomeText: '欢迎',
            welcomeSubtitle: '请登录以管理您的支出',
            email: '电子邮件',
            username: '用户名',
            phone: '电话',
            password: '密码',
            rememberMe: '保持登录状态',
            forgotPassword: '忘记密码？',
            signup: '创建新账户 / 注册',
            loginBtn: '登录',
            signupBtn: '注册',
            loginInstead: '登录现有账户',
            termsAgree: '我同意服务条款和隐私政策',
            securityNotice: '您的数据安全',
            googleLogin: '使用 Google 继续',
            emptyUsername: '请输入用户名',
            emptyEmail: '请输入电子邮件',
            emptyPassword: '请输入密码',
            emptyPhone: '请输入电话号码',
            agreeTermsMsg: '请先同意服务条款和隐私政策'
        }
    };

    let currentLanguage = 'he'; // Default

    // Core logic for updating translation
    function setLanguage(langCode) {
        if (!dictionary[langCode]) {
            console.warn(`[i18n] Language ${langCode} not supported. Falling back to default.`);
            return false;
        }

        currentLanguage = langCode;
        const langData = dictionary[langCode];

        // Safely update DOM HTML element for RTL/LTR and language code
        document.documentElement.lang = langCode;
        document.documentElement.dir = langData.dir;

        console.log(`[i18n] Engine switched to language: ${langCode} (${langData.dir.toUpperCase()})`);
        
        // At this stage, no UI updates are executed, just backend state and HTML dir tracking.
        return true;
    }

    // Expose only a limited, safe API to the global window
    global.MasterSplitterI18n = {
        changeLanguage: setLanguage,
        getCurrentLanguage: () => currentLanguage,
        getTranslation: (key) => dictionary[currentLanguage][key] || key
    };

    // Alias a safe global function specifically requested for testing
    global.changeLanguage = setLanguage;

    console.log('[i18n] Engine initialized successfully. Use window.changeLanguage("en") to test.');

})(window);
