/**
 * MasterSplitter Isolated i18n Engine
 * This module is safely scoped to prevent namespace collisions.
 */

(function (global) {
    // Dictionary structure for supported languages
    const dictionary = {
        he: {
            dir: 'rtl',
            loginTitle: 'כניסה למערכת',
            email: 'אימייל',
            password: 'סיסמה',
            rememberMe: 'זכור אותי',
            loginBtn: 'התחבר',
            termsAgree: 'אני מסכים לתנאי השימוש והפרטיות',
            securityNotice: 'הנתונים שלך מאובטחים',
            googleLogin: 'המשך עם Google'
        },
        en: {
            dir: 'ltr',
            loginTitle: 'Login',
            email: 'Email',
            password: 'Password',
            rememberMe: 'Remember Me',
            loginBtn: 'Sign In',
            termsAgree: 'I agree to the Terms of Service & Privacy Policy',
            securityNotice: 'Your data is secure',
            googleLogin: 'Continue with Google'
        },
        es: {
            dir: 'ltr',
            loginTitle: 'Iniciar Sesión',
            email: 'Correo electrónico',
            password: 'Contraseña',
            rememberMe: 'Recordarme',
            loginBtn: 'Ingresar',
            termsAgree: 'Acepto los Términos y la Política de Privacidad',
            securityNotice: 'Tus datos están seguros',
            googleLogin: 'Continuar con Google'
        },
        ru: {
            dir: 'ltr',
            loginTitle: 'Вход в систему',
            email: 'Электронная почта',
            password: 'Пароль',
            rememberMe: 'Запомнить меня',
            loginBtn: 'Войти',
            termsAgree: 'Я принимаю Условия использования и Политику конфиденциальности',
            securityNotice: 'Ваши данные в безопасности',
            googleLogin: 'Продолжить с Google'
        },
        ar: {
            dir: 'rtl',
            loginTitle: 'تسجيل الدخول',
            email: 'البريد الإلكتروني',
            password: 'كلمة المرور',
            rememberMe: 'تذكرني',
            loginBtn: 'دخول',
            termsAgree: 'أوافق على الشروط وسياسة الخصوصية',
            securityNotice: 'بياناتك آمنة',
            googleLogin: 'المتابعة باستخدام Google'
        },
        fr: {
            dir: 'ltr',
            loginTitle: 'Connexion',
            email: 'E-mail',
            password: 'Mot de passe',
            rememberMe: 'Se souvenir de moi',
            loginBtn: 'Se connecter',
            termsAgree: 'J\'accepte les Conditions et la Politique de Confidentialité',
            securityNotice: 'Vos données sont sécurisées',
            googleLogin: 'Continuer avec Google'
        },
        zh: {
            dir: 'ltr',
            loginTitle: '登录',
            email: '电子邮件',
            password: '密码',
            rememberMe: '记住我',
            loginBtn: '登录',
            termsAgree: '我同意服务条款和隐私政策',
            securityNotice: '您的数据安全',
            googleLogin: '使用 Google 继续'
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
