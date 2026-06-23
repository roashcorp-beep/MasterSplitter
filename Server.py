import os
import logging
import sqlite3
import json
import secrets
import hashlib
import urllib.parse
from datetime import datetime, timezone, timedelta
from functools import wraps
from os.path import join, dirname

import requests as http_requests  # renamed to avoid conflict with flask.request

try:
    from dotenv import load_dotenv
    dotenv_path = join(dirname(__file__), '.env')
    load_dotenv(dotenv_path)
except ImportError:
    pass

from flask import Flask, jsonify, request, render_template, session, redirect, url_for, abort, send_from_directory
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.middleware.proxy_fix import ProxyFix

try:
    from update_currencies import update_db as update_currencies_db
except ImportError:
    update_currencies_db = None

# ---------------------
#   LOGGING SETUP
# ---------------------
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('master_splitter.log', encoding='utf-8'),
    ]
)
logger = logging.getLogger('MasterSplitter')

# ---------------------
#   APP CONFIG
# ---------------------
app = Flask(__name__, static_folder='Static', static_url_path='/static', template_folder='Templates')
app.wsgi_app = ProxyFix(app.wsgi_app, x_proto=1, x_host=1)  # Trust reverse-proxy headers (PythonAnywhere)
app.secret_key = os.environ.get('SECRET_KEY', os.urandom(32))

# Warn if no explicit secret key is set
if not os.environ.get('SECRET_KEY'):
    logger.warning("No SECRET_KEY environment variable set — using random key. Sessions will reset on restart.")

# Allowed currency codes
ALLOWED_CURRENCIES = [
    'USD', 'EUR', 'ILS', 'GBP', 'JPY', 'CHF', 'AUD', 'CAD',
    'THB', 'HUF', 'PLN', 'CZK', 'TRY', 'SEK', 'NOK', 'DKK',
    'NZD', 'SGD', 'HKD', 'KRW', 'MXN', 'BRL', 'INR', 'ZAR',
]

# ---------------------
#   GOOGLE OAUTH CONFIG
# ---------------------
GOOGLE_CLIENT_ID = os.environ.get('GOOGLE_CLIENT_ID', '')
GOOGLE_CLIENT_SECRET = os.environ.get('GOOGLE_CLIENT_SECRET', '')
GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo'
GOOGLE_SCOPES = 'openid email profile'

if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
    logger.warning('GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET not set — Google OAuth will be disabled.')


# ---------------------
#   DATABASE
# ---------------------
def get_db_connection():
    """Get a new database connection with row_factory and foreign keys enabled."""
    conn = sqlite3.connect('master_splitter.db')
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn

def check_db_schema():
    """Ensure database has the latest schema modifications."""
    conn = get_db_connection()
    try:
        conn.execute("ALTER TABLE Trips ADD COLUMN image_url TEXT")
        conn.commit()
    except sqlite3.OperationalError:
        pass # Column already exists
    conn.close()

check_db_schema()

# ---- Authentication Helpers ----


def init_db_updates():
    """Create tables if missing and run safe migrations for new columns."""
    conn = get_db_connection()
    cursor = conn.cursor()

    if update_currencies_db:
        try:
            # Must use DB_PATH to ensure it targets the correct DB on PythonAnywhere
            update_currencies_db(DB_PATH)
        except Exception as e:
            logging.error(f"Failed to update currencies: {e}")

    # --- Create core tables if they don't exist ---
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS Users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            password_hash TEXT,
            email TEXT UNIQUE,
            phone TEXT UNIQUE,
            is_verified INTEGER DEFAULT 0,
            verification_token TEXT,
            reset_token TEXT,
            reset_token_expiry TEXT,
            language TEXT DEFAULT 'he',
            avatar_url TEXT
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS Currencies (
            code TEXT PRIMARY KEY,
            symbol TEXT NOT NULL,
            name_en TEXT NOT NULL,
            name_he TEXT NOT NULL
        )
    """)
    
    # Seed currencies if empty
    cursor.execute("SELECT COUNT(*) FROM Currencies")
    if cursor.fetchone()[0] == 0:
        default_currencies = [
            ('ILS', '₪', 'Israeli New Shekel', 'שקל חדש'),
            ('USD', '$', 'US Dollar', 'דולר ארה"ב'),
            ('EUR', '€', 'Euro', 'אירו'),
            ('GBP', '£', 'British Pound', 'לירה שטרלינג'),
            ('THB', '฿', 'Thai Baht', 'באט תאילנדי'),
            ('JPY', '¥', 'Japanese Yen', 'ין יפני'),
            ('CAD', 'C$', 'Canadian Dollar', 'דולר קנדי'),
            ('AUD', 'A$', 'Australian Dollar', 'דולר אוסטרלי'),
            ('CHF', 'Fr', 'Swiss Franc', 'פרנק שוויצרי'),
            ('CNY', '¥', 'Chinese Yuan', 'יואן סיני'),
            ('RUB', '₽', 'Russian Ruble', 'רובל רוסי'),
            ('INR', '₹', 'Indian Rupee', 'רופי הודי'),
            ('BRL', 'R$', 'Brazilian Real', 'ריאל ברזילאי'),
            ('ZAR', 'R', 'South African Rand', 'ראנד דרום אפריקאי'),
            ('MXN', '$', 'Mexican Peso', 'פזו מקסיקני'),
            ('SGD', 'S$', 'Singapore Dollar', 'דולר סינגפורי'),
            ('HKD', 'HK$', 'Hong Kong Dollar', 'דולר הונג קונגי'),
            ('NZD', 'NZ$', 'New Zealand Dollar', 'דולר ניו זילנדי'),
            ('SEK', 'kr', 'Swedish Krona', 'קרונה שוודית'),
            ('KRW', '₩', 'South Korean Won', 'וון דרום קוריאני'),
            ('TRY', '₺', 'Turkish Lira', 'לירה טורקית'),
            ('AED', 'د.إ', 'UAE Dirham', 'דירהם'),
            ('SAR', 'ر.س', 'Saudi Riyal', 'ריאל סעודי'),
            ('ARS', '$', 'Argentine Peso', 'פזו ארגנטינאי'),
            ('COP', '$', 'Colombian Peso', 'פזו קולומביאני'),
            ('PHP', '₱', 'Philippine Peso', 'פזו פיליפיני')
        ]
        cursor.executemany("INSERT INTO Currencies (code, symbol, name_en, name_he) VALUES (?, ?, ?, ?)", default_currencies)
        conn.commit()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS Trips (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            destination TEXT NOT NULL,
            budget REAL DEFAULT 0,
            owner_id INTEGER,
            local_participants TEXT DEFAULT '[]'
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS Expenses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            trip_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            amount REAL NOT NULL,
            currency TEXT DEFAULT 'ILS',
            description TEXT,
            category TEXT DEFAULT 'General',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(trip_id) REFERENCES Trips(id),
            FOREIGN KEY(user_id) REFERENCES Users(id)
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS TripMembers (
            trip_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            PRIMARY KEY (trip_id, user_id),
            FOREIGN KEY(trip_id) REFERENCES Trips(id),
            FOREIGN KEY(user_id) REFERENCES Users(id)
        )
    """)

    # --- Safe migrations for existing tables ---
    try:
        cursor.execute("PRAGMA table_info(Trips)")
        cols = [c['name'] for c in cursor.fetchall()]
        if 'budget' not in cols:
            cursor.execute("ALTER TABLE Trips ADD COLUMN budget REAL DEFAULT 0")
            logger.info("Migration: added 'budget' column to Trips")
        if 'owner_id' not in cols:
            cursor.execute("ALTER TABLE Trips ADD COLUMN owner_id INTEGER")
            logger.info("Migration: added 'owner_id' column to Trips")
        if 'local_participants' not in cols:
            cursor.execute("ALTER TABLE Trips ADD COLUMN local_participants TEXT DEFAULT '[]'")
            logger.info("Migration: added 'local_participants' column to Trips")
    except sqlite3.Error as e:
        logger.error(f"Trips migration error: {e}")

    try:
        cursor.execute("PRAGMA table_info(Expenses)")
        cols = [c['name'] for c in cursor.fetchall()]
        if 'category' not in cols:
            cursor.execute("ALTER TABLE Expenses ADD COLUMN category TEXT DEFAULT 'General'")
            logger.info("Migration: added 'category' column to Expenses")
        if 'created_at' not in cols:
            cursor.execute("ALTER TABLE Expenses ADD COLUMN created_at TEXT DEFAULT CURRENT_TIMESTAMP")
            logger.info("Migration: added 'created_at' column to Expenses")
        if 'is_personal' not in cols:
            cursor.execute("ALTER TABLE Expenses ADD COLUMN is_personal INTEGER DEFAULT 0")
            logger.info("Migration: added 'is_personal' column to Expenses")
    except sqlite3.Error as e:
        logger.error(f"Expenses migration error: {e}")

    # --- Safe table-swap migration for Users (adds reset_token, reset_token_expiry, language) ---
    try:
        cursor.execute("PRAGMA table_info(Users)")
        cols = [c['name'] for c in cursor.fetchall()]

        expected_cols = ['password_hash', 'email', 'phone', 'is_verified', 'verification_token', 'reset_token', 'reset_token_expiry', 'language', 'avatar_url']
        needs_migration = any(c not in cols for c in expected_cols)

        if needs_migration:
            cursor.execute("""
                CREATE TABLE Users_new (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT UNIQUE NOT NULL,
                    password_hash TEXT,
                    email TEXT UNIQUE,
                    phone TEXT UNIQUE,
                    is_verified INTEGER DEFAULT 0,
                    verification_token TEXT,
                    reset_token TEXT,
                    reset_token_expiry TEXT,
                    language TEXT DEFAULT 'he',
                    avatar_url TEXT
                )
            """)

            select_cols = []
            for col in ['id', 'name', 'password_hash', 'email', 'phone', 'is_verified', 'verification_token', 'reset_token', 'reset_token_expiry', 'language', 'avatar_url']:
                if col in cols:
                    select_cols.append(col)
                else:
                    if col == 'email': select_cols.append("'temp_' || id || '@migrate.com'")
                    elif col == 'phone': select_cols.append("'temp_' || id")
                    elif col == 'is_verified': select_cols.append("0")
                    elif col == 'language': select_cols.append("'he'")
                    else: select_cols.append("NULL")

            cursor.execute(f"INSERT INTO Users_new (id, name, password_hash, email, phone, is_verified, verification_token, reset_token, reset_token_expiry, language) SELECT {', '.join(select_cols)} FROM Users")
            cursor.execute("DROP TABLE Users")
            cursor.execute("ALTER TABLE Users_new RENAME TO Users")
            logger.info("Migration: Performed table swap for Users schema update (added reset_token columns and language).")
    except sqlite3.Error as e:
        logger.error(f"Users migration error: {e}")

    # --- Add google_id column for OAuth and other fields (safe to re-run) ---
    try:
        cursor.execute("PRAGMA table_info(Users)")
        cols = [c['name'] for c in cursor.fetchall()]
        if 'google_id' not in cols:
            cursor.execute("ALTER TABLE Users ADD COLUMN google_id TEXT")
            logger.info("Migration: added 'google_id' column to Users")
        if 'two_fa_method' not in cols:
            cursor.execute("ALTER TABLE Users ADD COLUMN two_fa_method TEXT DEFAULT 'none'")
            logger.info("Migration: added 'two_fa_method' column to Users")
        if 'notify_expense_added' not in cols:
            cursor.execute("ALTER TABLE Users ADD COLUMN notify_expense_added INTEGER DEFAULT 1")
            logger.info("Migration: added 'notify_expense_added' column to Users")
        if 'notify_group_expense' not in cols:
            cursor.execute("ALTER TABLE Users ADD COLUMN notify_group_expense INTEGER DEFAULT 1")
            logger.info("Migration: added 'notify_group_expense' column to Users")
    except sqlite3.Error as e:
        logger.error(f"Users google_id, two_fa, or notification migration error: {e}")

    # --- Create trip_invitations table ---
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS trip_invitations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            trip_id INTEGER NOT NULL,
            inviter_id INTEGER NOT NULL,
            invitee_phone_or_email TEXT NOT NULL,
            status TEXT DEFAULT 'PENDING',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(trip_id) REFERENCES Trips(id),
            FOREIGN KEY(inviter_id) REFERENCES Users(id)
        )
    """)

    # --- Phase 4: ExpenseSplits table (unequal splits) ---
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS ExpenseSplits (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            expense_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            amount REAL NOT NULL,
            FOREIGN KEY(expense_id) REFERENCES Expenses(id) ON DELETE CASCADE,
            FOREIGN KEY(user_id) REFERENCES Users(id)
        )
    """)

    # --- Phase 4: Settlements table (debt clearing) ---
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS Settlements (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            trip_id INTEGER NOT NULL,
            payer_id INTEGER NOT NULL,
            payee_id INTEGER NOT NULL,
            amount REAL NOT NULL,
            original_amount REAL,
            currency TEXT DEFAULT 'ILS',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(trip_id) REFERENCES Trips(id),
            FOREIGN KEY(payer_id) REFERENCES Users(id),
            FOREIGN KEY(payee_id) REFERENCES Users(id)
        )
    """)

    # --- TripMembers migration: add guest_name, make user_id nullable ---
    try:
        cursor.execute("PRAGMA table_info(TripMembers)")
        tm_cols = [c['name'] for c in cursor.fetchall()]
        if 'guest_name' not in tm_cols:
            # Need to recreate table — SQLite can't ALTER to change NOT NULL
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS TripMembers_new (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    trip_id INTEGER NOT NULL,
                    user_id INTEGER,
                    guest_name TEXT,
                    FOREIGN KEY(trip_id) REFERENCES Trips(id),
                    FOREIGN KEY(user_id) REFERENCES Users(id)
                )
            """)
            # Migrate existing data
            cursor.execute("INSERT INTO TripMembers_new (trip_id, user_id) SELECT trip_id, user_id FROM TripMembers")
            cursor.execute("DROP TABLE TripMembers")
            cursor.execute("ALTER TABLE TripMembers_new RENAME TO TripMembers")
            # Create unique index to prevent duplicates
            cursor.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_tm_user ON TripMembers(trip_id, user_id) WHERE user_id IS NOT NULL")
            cursor.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_tm_guest ON TripMembers(trip_id, guest_name) WHERE guest_name IS NOT NULL")
            logger.info("Migration: TripMembers table upgraded with guest_name column and nullable user_id.")
    except sqlite3.Error as e:
        logger.error(f"TripMembers migration error: {e}")

    # --- Add is_admin to TripMembers ---
    try:
        cursor.execute("PRAGMA table_info(TripMembers)")
        tm_cols2 = [c['name'] for c in cursor.fetchall()]
        if 'is_admin' not in tm_cols2:
            cursor.execute("ALTER TABLE TripMembers ADD COLUMN is_admin INTEGER DEFAULT 0")
            # Mark existing trip owners as admins
            cursor.execute("""
                UPDATE TripMembers SET is_admin = 1
                WHERE (trip_id, user_id) IN (
                    SELECT id, owner_id FROM Trips WHERE owner_id IS NOT NULL
                )
            """)
            logger.info("Migration: added 'is_admin' column to TripMembers")
            
        if 'budgets_json' not in tm_cols2:
            cursor.execute("ALTER TABLE TripMembers ADD COLUMN budgets_json TEXT DEFAULT '{}'")
            logger.info("Migration: added 'budgets_json' column to TripMembers")
    except sqlite3.Error as e:
        logger.error(f"TripMembers is_admin migration error: {e}")

    # --- Add is_hidden and is_left to TripMembers ---
    try:
        cursor.execute("PRAGMA table_info(TripMembers)")
        tm_cols_hide = [c['name'] for c in cursor.fetchall()]
        if 'is_hidden' not in tm_cols_hide:
            cursor.execute("ALTER TABLE TripMembers ADD COLUMN is_hidden INTEGER DEFAULT 0")
            logger.info("Migration: added 'is_hidden' column to TripMembers")
        if 'is_left' not in tm_cols_hide:
            cursor.execute("ALTER TABLE TripMembers ADD COLUMN is_left INTEGER DEFAULT 0")
            logger.info("Migration: added 'is_left' column to TripMembers")
    except sqlite3.Error as e:
        logger.error(f"TripMembers hide/leave migration error: {e}")

    # --- Add is_public_expenses to Trips ---
    try:
        cursor.execute("PRAGMA table_info(Trips)")
        trips_cols = [c['name'] for c in cursor.fetchall()]
        if 'is_public_expenses' not in trips_cols:
            cursor.execute("ALTER TABLE Trips ADD COLUMN is_public_expenses INTEGER DEFAULT 0")
            logger.info("Migration: added 'is_public_expenses' column to Trips")
        if 'budget_type' not in trips_cols:
            cursor.execute("ALTER TABLE Trips ADD COLUMN budget_type TEXT DEFAULT 'none'")
            logger.info("Migration: added 'budget_type' column to Trips")
        if 'is_budget_per_user' not in trips_cols:
            cursor.execute("ALTER TABLE Trips ADD COLUMN is_budget_per_user INTEGER DEFAULT 0")
            logger.info("Migration: added 'is_budget_per_user' column to Trips")
        if 'budgets_json' not in trips_cols:
            cursor.execute("ALTER TABLE Trips ADD COLUMN budgets_json TEXT DEFAULT '{}'")
            logger.info("Migration: added 'budgets_json' column to Trips")
        if 'user_budgets' not in trips_cols:
            cursor.execute("ALTER TABLE Trips ADD COLUMN user_budgets TEXT DEFAULT '{}'")
            logger.info("Migration: added 'user_budgets' column to Trips")
    except sqlite3.Error as e:
        logger.error(f"Trips columns migration error: {e}")

    # --- Add original_amount to Expenses ---
    try:
        cursor.execute("PRAGMA table_info(Expenses)")
        exp_cols2 = [c['name'] for c in cursor.fetchall()]
        if 'original_amount' not in exp_cols2:
            cursor.execute("ALTER TABLE Expenses ADD COLUMN original_amount REAL")
            logger.info("Migration: added 'original_amount' column to Expenses")
    except sqlite3.Error as e:
        logger.error(f"Expenses original_amount migration error: {e}")

    # --- Add original_amount to Settlements ---
    try:
        cursor.execute("PRAGMA table_info(Settlements)")
        set_cols = [row['name'] for row in cursor.fetchall()]
        if 'original_amount' not in set_cols:
            cursor.execute("ALTER TABLE Settlements ADD COLUMN original_amount REAL")
            logger.info("Migration: added 'original_amount' column to Settlements")
    except sqlite3.Error as e:
        logger.error(f"Settlements original_amount migration error: {e}")

    # --- Add default_currency to Users ---
    try:
        cursor.execute("PRAGMA table_info(Users)")
        user_cols_dc = [c['name'] for c in cursor.fetchall()]
        if 'default_currency' not in user_cols_dc:
            cursor.execute("ALTER TABLE Users ADD COLUMN default_currency TEXT DEFAULT 'ILS'")
            logger.info("Migration: added 'default_currency' column to Users")
    except sqlite3.Error as e:
        logger.error(f"Users default_currency migration error: {e}")

    # --- Add allow_member_delete to Trips ---
    try:
        cursor.execute("PRAGMA table_info(Trips)")
        trips_cols_amd = [c['name'] for c in cursor.fetchall()]
        if 'allow_member_delete' not in trips_cols_amd:
            cursor.execute("ALTER TABLE Trips ADD COLUMN allow_member_delete INTEGER DEFAULT 1")
            logger.info("Migration: added 'allow_member_delete' column to Trips")
    except sqlite3.Error as e:
        logger.error(f"Trips allow_member_delete migration error: {e}")

    # --- Phase 4: ActivityLog table (audit trail) ---
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS ActivityLog (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            trip_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            action TEXT NOT NULL,
            detail TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(trip_id) REFERENCES Trips(id),
            FOREIGN KEY(user_id) REFERENCES Users(id)
        )
    """)

    # --- Phase 3: Notifications table ---
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS Notifications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            trip_id INTEGER NOT NULL,
            type TEXT NOT NULL,
            message TEXT,
            is_read INTEGER DEFAULT 0,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES Users(id),
            FOREIGN KEY(trip_id) REFERENCES Trips(id)
        )
    """)

    conn.commit()

    # --- Add currency to Settlements ---
    try:
        cursor.execute("PRAGMA table_info(Settlements)")
        settle_cols = [c['name'] for c in cursor.fetchall()]
        if 'currency' not in settle_cols:
            cursor.execute("ALTER TABLE Settlements ADD COLUMN currency TEXT DEFAULT 'ILS'")
            logger.info("Migration: added 'currency' column to Settlements")
            conn.commit()
    except sqlite3.Error as e:
        logger.error(f"Settlements currency migration error: {e}")

    # --- Add invite_token to Trips ---
    try:
        cursor.execute("PRAGMA table_info(Trips)")
        trips_cols_inv = [c['name'] for c in cursor.fetchall()]
        if 'invite_token' not in trips_cols_inv:
            cursor.execute("ALTER TABLE Trips ADD COLUMN invite_token TEXT")
            logger.info("Migration: added 'invite_token' column to Trips")
            conn.commit()
    except sqlite3.Error as e:
        logger.error(f"Trips invite_token migration error: {e}")

    conn.commit()
    conn.close()
    logger.info("Database initialization complete.")


init_db_updates()


# ---------------------
#   EXCHANGE RATE CACHE
# ---------------------
import time as _time

_exchange_cache = {}  # { 'USD': ({'ILS': 3.65, ...}, timestamp), ... }
EXCHANGE_CACHE_TTL = 3600  # 1 hour


def get_exchange_rate(from_currency, to_currency='ILS'):
    """Get exchange rate from from_currency to to_currency using open.er-api.com with caching."""
    if from_currency == to_currency:
        return 1.0

    now = _time.time()
    cached = _exchange_cache.get(from_currency)
    if cached:
        rates, ts = cached
        if now - ts < EXCHANGE_CACHE_TTL and to_currency in rates:
            return rates[to_currency]

    try:
        resp = http_requests.get(
            f'https://open.er-api.com/v6/latest/{from_currency}',
            timeout=8
        )
        if resp.status_code == 200:
            data = resp.json()
            rates = data.get('rates', {})
            _exchange_cache[from_currency] = (rates, now)
            rate = rates.get(to_currency)
            if rate:
                logger.info(f"Exchange rate: 1 {from_currency} = {rate} {to_currency}")
                return float(rate)
    except Exception as e:
        logger.error(f"Exchange rate fetch error: {e}")

    return None


# ---------------------
#   ACTIVITY LOG HELPER
# ---------------------
def log_activity(trip_id, user_id, action, detail=None):
    """Insert an entry into the ActivityLog table. Non-blocking."""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO ActivityLog (trip_id, user_id, action, detail, created_at) VALUES (?, ?, ?, ?, ?)",
            (trip_id, user_id, action, detail, datetime.now(timezone.utc).isoformat())
        )
        conn.commit()
        conn.close()
    except Exception as e:
        logger.error(f"log_activity error: {e}")

# ---------------------
#   NOTIFICATION HELPER
# ---------------------
def create_notification(user_id, trip_id, notif_type, message):
    """Insert an entry into the Notifications table."""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO Notifications (user_id, trip_id, type, message, created_at) VALUES (?, ?, ?, ?, ?)",
            (user_id, trip_id, notif_type, message, datetime.now(timezone.utc).isoformat())
        )
        conn.commit()
        conn.close()
    except Exception as e:
        logger.error(f"create_notification error: {e}")

def notify_trip_members(trip_id, notif_type, message, exclude_user_id=None):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT user_id FROM TripMembers WHERE trip_id = ? AND user_id IS NOT NULL", (trip_id,))
        members = cursor.fetchall()
        
        for m in members:
            uid = m['user_id']
            if exclude_user_id is None or uid != exclude_user_id:
                cursor.execute(
                    "INSERT INTO Notifications (user_id, trip_id, type, message, created_at) VALUES (?, ?, ?, ?, ?)",
                    (uid, trip_id, notif_type, message, datetime.now(timezone.utc).isoformat())
                )
        conn.commit()
        conn.close()
    except Exception as e:
        logger.error(f"notify_trip_members error: {e}")



# ---------------------
#   AUTH DECORATORS
# ---------------------
def login_required(f):
    """Decorator: returns 401 if user is not logged in."""
    @wraps(f)
    def decorated(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({"error": "Unauthorized"}), 401
        return f(*args, **kwargs)
    return decorated


def require_trip_access(f):
    """Decorator: verifies the logged-in user is a member or owner of the trip.
    Expects 'trip_id' as a URL parameter (kwargs)."""
    @wraps(f)
    def decorated(*args, **kwargs):
        trip_id = kwargs.get('trip_id')
        if trip_id is None:
            return jsonify({"error": "Missing trip_id"}), 400
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT 1 FROM TripMembers WHERE trip_id = ? AND user_id = ?
            UNION
            SELECT 1 FROM Trips WHERE id = ? AND owner_id = ?
        """, (trip_id, session['user_id'], trip_id, session['user_id']))
        has_access = cursor.fetchone() is not None
        conn.close()
        if not has_access:
            logger.warning(f"User {session['user_id']} denied access to trip {trip_id}")
            return jsonify({"error": "Forbidden"}), 403
        return f(*args, **kwargs)
    return decorated


# ---------------------
#   INPUT VALIDATION
# ---------------------
MAX_NAME_LENGTH = 100
MAX_DESCRIPTION_LENGTH = 500
MAX_EMAIL_LENGTH = 254
MIN_PASSWORD_LENGTH = 4


def validate_string(value, field_name, max_length=MAX_NAME_LENGTH, required=True):
    """Validate a string field. Returns (cleaned_value, error_message)."""
    if value is None:
        value = ''
    value = str(value).strip()
    if required and not value:
        return None, f"{field_name} is required."
    if len(value) > max_length:
        return None, f"{field_name} is too long (max {max_length} characters)."
    return value, None


def validate_amount(value):
    """Validate an amount field. Returns (float_value, error_message)."""
    try:
        amount = float(value)
    except (TypeError, ValueError):
        return None, "סכום חייב להיות מספר."
    if amount <= 0:
        return None, "סכום חייב להיות גדול מ-0."
    if amount > 10_000_000:
        return None, "סכום גדול מדי."
    return amount, None


import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import threading

def send_verification_email(email_addr, token):
    if app.config.get('TESTING'):
        # Do not send actual emails during testing
        domain = os.environ.get('PA_DOMAIN', 'localhost:5000')
        protocol = "https" if domain != "localhost:5000" else "http"
        verify_link = f"{protocol}://{domain}/api/verify/{token}"
        logger.info(f"[TESTING] Verification link for {email_addr}: {verify_link}")
        return True

    smtp_server = os.environ.get('SMTP_SERVER')
    smtp_port = os.environ.get('SMTP_PORT', 587)
    smtp_username = os.environ.get('SMTP_USERNAME')
    smtp_password = os.environ.get('SMTP_PASSWORD')
    domain = os.environ.get('PA_DOMAIN', 'localhost:5000')
    protocol = "https" if domain != "localhost:5000" else "http"
    
    verify_link = f"{protocol}://{domain}/api/verify/{token}"
    
    if not smtp_server or not smtp_username or not smtp_password:
        logger.warning(f"SMTP not configured. Verification link for {email_addr}: {verify_link}")
        return False

    try:
        msg = MIMEMultipart()
        msg['From'] = f"MasterSplitter <{smtp_username}>"
        msg['To'] = email_addr
        msg['Subject'] = "MasterSplitter - Please verify your email"

        body = f"""
        <html>
          <body style="font-family: 'Heebo', Arial, sans-serif; background: #0a0a1a; color: #e2e8f0; padding: 40px 20px;">
            <div style="max-width: 420px; margin: 0 auto; background: #12122a; border-radius: 20px; padding: 32px; border: 1px solid rgba(255,255,255,0.08);">
              <h2 style="color: #a855f7; text-align: center;">Welcome to MasterSplitter! 🎉</h2>
              <p style="text-align: center; color: #94a3b8;">Please click the link below to verify your email address:</p>
              <p style="text-align: center;"><a href="{verify_link}" style="color: #facc15; font-weight: bold;">{verify_link}</a></p>
            </div>
          </body>
        </html>
        """
        msg.attach(MIMEText(body, 'html'))

        server = smtplib.SMTP(smtp_server, int(smtp_port))
        server.starttls()
        server.login(smtp_username, smtp_password)
        server.send_message(msg)
        server.quit()
        logger.info(f"Verification email sent to {email_addr}")
        return True
    except Exception as e:
        logger.error(f"Failed to send verification email to {email_addr}: {e}")
        return False


def send_reset_email(email_addr, token):
    """Send a password reset email with a secure link."""
    if app.config.get('TESTING'):
        domain = os.environ.get('PA_DOMAIN', 'localhost:5000')
        protocol = "https" if domain != "localhost:5000" else "http"
        reset_link = f"{protocol}://{domain}/reset-password/{token}"
        logger.info(f"[TESTING] Reset link for {email_addr}: {reset_link}")
        return True

    smtp_server = os.environ.get('SMTP_SERVER')
    smtp_port = os.environ.get('SMTP_PORT', 587)
    smtp_username = os.environ.get('SMTP_USERNAME')
    smtp_password = os.environ.get('SMTP_PASSWORD')
    domain = os.environ.get('PA_DOMAIN', 'localhost:5000')
    protocol = "https" if domain != "localhost:5000" else "http"

    reset_link = f"{protocol}://{domain}/reset-password/{token}"

    if not smtp_server or not smtp_username or not smtp_password:
        logger.warning(f"SMTP not configured. Reset link for {email_addr}: {reset_link}")
        return False

    try:
        msg = MIMEMultipart()
        msg['From'] = f"MasterSplitter <{smtp_username}>"
        msg['To'] = email_addr
        msg['Subject'] = "MasterSplitter - Password Reset"

        body = f"""
        <html>
          <body style="font-family: 'Heebo', Arial, sans-serif; background: #0a0a1a; color: #e2e8f0; padding: 40px 20px;">
            <div style="max-width: 420px; margin: 0 auto; background: #12122a; border-radius: 20px; padding: 32px; border: 1px solid rgba(255,255,255,0.08);">
              <h2 style="color: #a855f7; text-align: center;">Password Reset 🔐</h2>
              <p style="text-align: center; color: #94a3b8;">Click the link below to reset your password. This link expires in 1 hour.</p>
              <p style="text-align: center;"><a href="{reset_link}" style="color: #facc15; font-weight: bold;">Reset My Password</a></p>
              <p style="text-align: center; color: #64748b; font-size: 0.85rem;">If you didn't request this, you can safely ignore this email.</p>
            </div>
          </body>
        </html>
        """
        msg.attach(MIMEText(body, 'html'))

        server = smtplib.SMTP(smtp_server, int(smtp_port))
        server.starttls()
        server.login(smtp_username, smtp_password)
        server.send_message(msg)
        server.quit()
        logger.info(f"Reset email sent to {email_addr}")
        return True
    except Exception as e:
        logger.error(f"Failed to send reset email to {email_addr}: {e}")
        return False


# =====================
#   PAGE ROUTES
# =====================

@app.route('/manifest.json')
def serve_manifest():
    return send_from_directory('Static', 'manifest.json', mimetype='application/manifest+json')

@app.route('/sw.js')
def serve_sw():
    return send_from_directory('Static', 'sw.js', mimetype='application/javascript')

@app.route('/')
def serve_login():
    if 'user_id' in session:
        return redirect('/app')
    return render_template('login.html')

@app.route('/app')
def serve_app():
    if 'user_id' not in session:
        return redirect('/')
    return render_template('app.html')

@app.route('/profile')
def serve_profile():
    if 'user_id' not in session:
        return redirect('/')
    return render_template('profile.html')

@app.route('/reset-password/<token>')
def serve_reset_password(token):
    """Serve the password reset page if token is valid."""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT id, reset_token_expiry FROM Users WHERE reset_token = ?", (token,))
        user = cursor.fetchone()
        if not user:
            return render_template('login.html'), 400
        if user['reset_token_expiry']:
            expiry = datetime.fromisoformat(user['reset_token_expiry'])
            if datetime.now(timezone.utc) > expiry:
                return render_template('login.html'), 400
        return render_template('reset_password.html', token=token)
    finally:
        conn.close()


# =====================
#   AUTH APIS
# =====================

@app.route('/api/verify/<token>', methods=['GET'])
def verify_email(token):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT id FROM Users WHERE verification_token = ?", (token,))
        user = cursor.fetchone()
        if user:
            cursor.execute("UPDATE Users SET is_verified = 1, verification_token = NULL WHERE id = ?", (user['id'],))
            conn.commit()
            logger.info(f"User {user['id']} verified their email.")
            return redirect('/?verified=true')
        else:
            return "Invalid or expired verification token.", 400
    except sqlite3.Error as e:
        logger.error(f"Verification DB error: {e}")
        return "Internal server error.", 500
    finally:
        conn.close()

@app.route('/api/me', methods=['GET'])
@login_required
def get_me():
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT language, email, phone, avatar_url, default_currency, notify_expense_added, notify_group_expense FROM Users WHERE id = ?", (session['user_id'],))
        user = cursor.fetchone()
        lang = user['language'] if user else 'he'
        email = user['email'] if user and 'email' in user.keys() else ''
        phone = user['phone'] if user and 'phone' in user.keys() else ''
        avatar_url = user['avatar_url'] if user and 'avatar_url' in user.keys() else None
        default_currency = user['default_currency'] if user and 'default_currency' in user.keys() else 'ILS'
        notify_expense_added = user['notify_expense_added'] if user and 'notify_expense_added' in user.keys() else 1
        notify_group_expense = user['notify_group_expense'] if user and 'notify_group_expense' in user.keys() else 1
        return jsonify({
            "id": session['user_id'], 
            "name": session['username'], 
            "language": lang, 
            "email": email, 
            "phone": phone, 
            "avatar_url": avatar_url, 
            "default_currency": default_currency,
            "notify_expense_added": notify_expense_added,
            "notify_group_expense": notify_group_expense
        })
    finally:
        conn.close()


@app.route('/api/signup', methods=['POST'])
def signup():
    data = request.json or {}
    username, err = validate_string(data.get('username'), 'שם משתמש')
    if err:
        return jsonify({"error": err}), 400

    password = data.get('password', '')
    if len(password) < MIN_PASSWORD_LENGTH:
        return jsonify({"error": f"סיסמה חייבת להיות לפחות {MIN_PASSWORD_LENGTH} תווים."}), 400

    email_raw = data.get('email', '').strip()
    if not email_raw:
        return jsonify({"error": "יש לספק כתובת אימייל."}), 400
    email_raw, err = validate_string(email_raw, 'אימייל', MAX_EMAIL_LENGTH, required=True)
    if err:
        return jsonify({"error": err}), 400

    phone_raw = data.get('phone', '').strip()
    if not phone_raw:
        return jsonify({"error": "יש לספק מספר טלפון."}), 400
    phone_raw, err = validate_string(phone_raw, 'טלפון', 20, required=True)
    if err:
        return jsonify({"error": err}), 400

    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT id FROM Users WHERE name = ?", (username,))
        if cursor.fetchone():
            return jsonify({"error": "שם המשתמש כבר קיים במערכת."}), 400
            
        cursor.execute("SELECT id FROM Users WHERE phone = ?", (phone_raw,))
        if cursor.fetchone():
            return jsonify({"error": "מספר הטלפון כבר קיים במערכת."}), 400
            
        cursor.execute("SELECT id FROM Users WHERE email = ?", (email_raw,))
        if cursor.fetchone():
            return jsonify({"error": "כתובת האימייל כבר קיימת במערכת."}), 400

        pwd_hash = generate_password_hash(password)
        token = os.urandom(16).hex()
        
        cursor.execute(
            "INSERT INTO Users (name, password_hash, email, phone, is_verified, verification_token) VALUES (?, ?, ?, ?, 0, ?)",
            (username, pwd_hash, email_raw, phone_raw, token)
        )
        user_id = cursor.lastrowid
        conn.commit()
        
        # Send Verification Email
        if not send_verification_email(email_raw, token):
            cursor.execute("DELETE FROM Users WHERE id = ?", (user_id,))
            conn.commit()
            return jsonify({"error": "Email server configuration error. Registration paused."}), 500
        
        logger.info(f"New user registered (pending verification): {username} (id={user_id})")
        return jsonify({"success": True, "message": "Registration successful! Please check your email to verify your account before logging in."})
    except sqlite3.IntegrityError:
        return jsonify({"error": "שם המשתמש, האימייל או הטלפון כבר קיימים."}), 400
    except sqlite3.Error as e:
        logger.error(f"Signup DB error: {e}")
        return jsonify({"error": "שגיאת שרת. נסה שוב."}), 500
    finally:
        conn.close()


@app.route('/api/login', methods=['POST'])
def login():
    data = request.json or {}
    username = (data.get('username') or '').strip()
    password = data.get('password', '')

    if not username or not password:
        return jsonify({"error": "יש למלא שם משתמש/אימייל וסיסמה."}), 400

    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        # Flexible login: accept either username OR email
        cursor.execute("SELECT id, name, password_hash, is_verified FROM Users WHERE name = ? OR email = ?", (username, username))
        user = cursor.fetchone()
        if user and user['password_hash'] and check_password_hash(user['password_hash'], password):
            # if user['is_verified'] == 0:
            #     return jsonify({"error": "Please verify your email address first."}), 403
                
            session['user_id'] = user['id']
            session['username'] = user['name']
            logger.info(f"User logged in: {user['name']} (id={user['id']})")
            return jsonify({"success": True})
        else:
            logger.info(f"Failed login attempt for username: {username}")
            return jsonify({"error": "שם משתמש או סיסמה שגויים."}), 401
    except sqlite3.Error as e:
        logger.error(f"Login DB error: {e}")
        return jsonify({"error": "שגיאת שרת."}), 500
    finally:
        conn.close()


@app.route('/api/logout', methods=['POST'])
def logout():
    username = session.get('username', 'unknown')
    session.clear()
    logger.info(f"User logged out: {username}")
    return jsonify({"success": True})


# =====================
#   GOOGLE OAUTH2 LOGIN
# =====================

def _build_oauth_redirect_uri():
    """Build the Google OAuth redirect_uri, forcing https:// on production hosts."""
    base = request.host_url.rstrip('/')
    # Belt-and-suspenders: force https if not running on localhost
    host = request.host.split(':')[0]
    if host not in ('localhost', '127.0.0.1') and base.startswith('http://'):
        base = 'https://' + base[len('http://'):]
    return base + '/api/auth/google/callback'

@app.route('/api/auth/google')
def google_auth_redirect():
    """Step 1: Redirect the user to Google's OAuth2 consent screen."""
    if not GOOGLE_CLIENT_ID:
        logger.error('Google OAuth attempted but GOOGLE_CLIENT_ID is not configured.')
        return redirect('/?error=google_not_configured')

    # Build redirect_uri dynamically (https enforced on production)
    redirect_uri = _build_oauth_redirect_uri()

    # Generate a CSRF-protection state token and store it in the session
    state = secrets.token_urlsafe(32)
    session['oauth_state'] = state

    params = {
        'client_id': GOOGLE_CLIENT_ID,
        'redirect_uri': redirect_uri,
        'response_type': 'code',
        'scope': GOOGLE_SCOPES,
        'access_type': 'offline',
        'state': state,
        'prompt': 'select_account',
    }
    auth_url = GOOGLE_AUTH_URL + '?' + urllib.parse.urlencode(params)
    logger.info(f'Google OAuth: redirecting user to consent screen (redirect_uri={redirect_uri})')
    return redirect(auth_url)


@app.route('/api/auth/google/callback')
def google_auth_callback():
    """Step 2: Handle Google's callback — exchange code for token, fetch profile, log in or register."""
    # --- Error from Google (e.g. user cancelled) ---
    error = request.args.get('error')
    if error:
        logger.warning(f'Google OAuth callback received error: {error}')
        return redirect(f'/?error=google_{error}')

    # --- CSRF state validation ---
    state_received = request.args.get('state', '')
    state_expected = session.pop('oauth_state', None)
    if not state_expected or state_received != state_expected:
        logger.warning('Google OAuth: state mismatch — possible CSRF.')
        return redirect('/?error=google_state_mismatch')

    # --- Exchange authorization code for access token ---
    code = request.args.get('code')
    if not code:
        logger.warning('Google OAuth callback: no authorization code received.')
        return redirect('/?error=google_no_code')

    redirect_uri = _build_oauth_redirect_uri()

    try:
        token_response = http_requests.post(GOOGLE_TOKEN_URL, data={
            'code': code,
            'client_id': GOOGLE_CLIENT_ID,
            'client_secret': GOOGLE_CLIENT_SECRET,
            'redirect_uri': redirect_uri,
            'grant_type': 'authorization_code',
        }, timeout=10)

        if token_response.status_code != 200:
            logger.error(f'Google token exchange failed ({token_response.status_code}): {token_response.text}')
            return redirect('/?error=google_token_failed')

        token_data = token_response.json()
        access_token = token_data.get('access_token')
        if not access_token:
            logger.error('Google token response missing access_token.')
            return redirect('/?error=google_token_failed')

    except http_requests.RequestException as e:
        logger.error(f'Google token exchange network error: {e}')
        return redirect('/?error=google_network_error')

    # --- Fetch user profile from Google ---
    try:
        userinfo_response = http_requests.get(
            GOOGLE_USERINFO_URL,
            headers={'Authorization': f'Bearer {access_token}'},
            timeout=10,
        )

        if userinfo_response.status_code != 200:
            logger.error(f'Google userinfo fetch failed ({userinfo_response.status_code}): {userinfo_response.text}')
            return redirect('/?error=google_profile_failed')

        profile = userinfo_response.json()

    except http_requests.RequestException as e:
        logger.error(f'Google userinfo network error: {e}')
        return redirect('/?error=google_network_error')

    # Extract profile fields
    google_id = profile.get('id', '')
    google_email = profile.get('email', '')
    google_name = profile.get('name', google_email.split('@')[0] if google_email else 'Google User')
    google_picture = profile.get('picture', '')

    if not google_email:
        logger.error('Google profile did not return an email.')
        return redirect('/?error=google_no_email')

    # --- Database: find or create user ---
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        # First, try to find by google_id (most reliable)
        cursor.execute('SELECT id, name FROM Users WHERE google_id = ?', (google_id,))
        user = cursor.fetchone()

        if not user:
            # Fallback: find by email
            cursor.execute('SELECT id, name, google_id FROM Users WHERE email = ?', (google_email,))
            user = cursor.fetchone()

            if user:
                # Existing user found by email — link their Google ID if not already set
                if not user['google_id']:
                    cursor.execute('UPDATE Users SET google_id = ?, avatar_url = COALESCE(avatar_url, ?), is_verified = 1 WHERE id = ?',
                                   (google_id, google_picture, user['id']))
                    conn.commit()
                    logger.info(f'Google OAuth: linked google_id to existing user {user["name"]} (id={user["id"]})')

        if user:
            # --- Existing user: log them in ---
            session['user_id'] = user['id']
            session['username'] = user['name']
            logger.info(f'Google OAuth login: {user["name"]} (id={user["id"]})')
            return redirect('/app')

        # --- New user: create account ---
        # Generate a unique username from the Google name
        base_name = google_name.strip()
        unique_name = base_name
        suffix = 1
        while True:
            cursor.execute('SELECT id FROM Users WHERE name = ?', (unique_name,))
            if not cursor.fetchone():
                break
            unique_name = f'{base_name}_{suffix}'
            suffix += 1

        # Random secure password hash (user will use Google login, not password)
        random_pwd_hash = generate_password_hash(secrets.token_urlsafe(32))

        cursor.execute(
            '''INSERT INTO Users (name, password_hash, email, google_id, avatar_url, is_verified, language)
               VALUES (?, ?, ?, ?, ?, 1, 'he')''',
            (unique_name, random_pwd_hash, google_email, google_id, google_picture)
        )
        new_user_id = cursor.lastrowid
        conn.commit()

        session['user_id'] = new_user_id
        session['username'] = unique_name
        logger.info(f'Google OAuth: new user registered: {unique_name} (id={new_user_id}, email={google_email})')
        return redirect('/app')

    except sqlite3.Error as e:
        logger.error(f'Google OAuth DB error: {e}')
        return redirect('/?error=google_db_error')
    finally:
        conn.close()


# =====================
#   FORGOT PASSWORD
# =====================

@app.route('/api/forgot-password', methods=['POST'])
def forgot_password():
    data = request.json or {}
    email_or_username = (data.get('email') or '').strip()
    if not email_or_username:
        # Returning a localized error key
        return jsonify({"error": "emptyUsernameOrEmail"}), 400

    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT id, email FROM Users WHERE email = ? OR name = ?", (email_or_username, email_or_username))
        user = cursor.fetchone()
        if not user:
            return jsonify({"error": "invalidEmail"}), 400

        token = secrets.token_urlsafe(32)
        expiry = (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat()
        cursor.execute("UPDATE Users SET reset_token = ?, reset_token_expiry = ? WHERE id = ?", (token, expiry, user['id']))
        conn.commit()

        send_reset_email(user['email'], token)
        logger.info(f"Password reset requested for user {user['id']}")
        return jsonify({"success": True, "message": "resetEmailSent"})
    except sqlite3.Error as e:
        logger.error(f"Forgot password DB error: {e}")
        return jsonify({"error": "שגיאת שרת."}), 500
    finally:
        conn.close()


@app.route('/api/reset-password/<token>', methods=['POST'])
def reset_password(token):
    data = request.json or {}
    password = data.get('password', '')

    if len(password) < MIN_PASSWORD_LENGTH:
        return jsonify({"error": f"סיסמה חייבת להיות לפחות {MIN_PASSWORD_LENGTH} תווים."}), 400

    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT id, reset_token_expiry FROM Users WHERE reset_token = ?", (token,))
        user = cursor.fetchone()
        if not user:
            return jsonify({"error": "קישור לא תקין או שפג תוקפו."}), 400

        if user['reset_token_expiry']:
            expiry = datetime.fromisoformat(user['reset_token_expiry'])
            if datetime.now(timezone.utc) > expiry:
                return jsonify({"error": "קישור פג תוקף. בקש קישור חדש."}), 400

        pwd_hash = generate_password_hash(password)
        cursor.execute("UPDATE Users SET password_hash = ?, reset_token = NULL, reset_token_expiry = NULL WHERE id = ?", (pwd_hash, user['id']))
        conn.commit()
        logger.info(f"Password reset successfully for user {user['id']}")
        return jsonify({"success": True, "message": "הסיסמה עודכנה בהצלחה! ניתן להתחבר."})
    except sqlite3.Error as e:
        logger.error(f"Reset password DB error: {e}")
        return jsonify({"error": "שגיאת שרת."}), 500
    finally:
        conn.close()


# =====================
#   PROFILE APIS
# =====================

@app.route('/api/profile', methods=['GET'])
@login_required
def get_profile():
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT id, name, email, phone, language, avatar_url, default_currency, google_id, two_fa_method FROM Users WHERE id = ?", (session['user_id'],))
        user = cursor.fetchone()
        if not user:
            return jsonify({"error": "User not found"}), 404
        phone = user['phone'] if 'phone' in user.keys() else ''
        default_currency = user['default_currency'] if 'default_currency' in user.keys() else 'ILS'
        two_fa_method = user['two_fa_method'] if 'two_fa_method' in user.keys() else 'none'
        return jsonify({
            "id": user['id'], 
            "name": user['name'], 
            "email": user['email'], 
            "phone": phone, 
            "language": user['language'], 
            "avatar_url": user['avatar_url'],
            "default_currency": default_currency,
            "is_google_auth": bool(user['google_id']),
            "two_fa_method": two_fa_method
        })
    finally:
        conn.close()

# New Profile Endpoints

UPLOAD_FOLDER = os.path.join(app.root_path, 'Static', 'avatars')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

@app.route('/api/upload-avatar', methods=['POST'])
@login_required
def upload_avatar():
    if 'avatar' not in request.files:
        return jsonify({"error": "No file part"}), 400
    file = request.files['avatar']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400
        
    if file:
        ext = file.filename.rsplit('.', 1)[-1].lower()
        if ext not in ['jpg', 'jpeg', 'png', 'gif', 'webp']:
            return jsonify({"error": "Invalid file type"}), 400
            
        filename = f"user_{session['user_id']}_{secrets.token_hex(4)}.{ext}"
        filepath = os.path.join(UPLOAD_FOLDER, filename)
        file.save(filepath)
        
        avatar_url = f"/static/avatars/{filename}"
        
        conn = get_db_connection()
        cursor = conn.cursor()
        try:
            cursor.execute("UPDATE Users SET avatar_url = ? WHERE id = ?", (avatar_url, session['user_id']))
            conn.commit()
            return jsonify({"success": True, "avatar_url": avatar_url})
        finally:
            conn.close()

@app.route('/api/verify-password', methods=['POST'])
@login_required
def verify_password():
    data = request.json or {}
    password = data.get('current_password', '')
    
    if not password:
        return jsonify({"error": "No password provided"}), 400
        
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT password_hash FROM Users WHERE id = ?", (session['user_id'],))
        user = cursor.fetchone()
        if user and check_password_hash(user['password_hash'], password):
            return jsonify({"success": True})
        else:
            return jsonify({"error": "Incorrect password"}), 401
    finally:
        conn.close()


@app.route('/api/profile', methods=['PUT'])
@login_required
def update_profile():
    data = request.json or {}
    new_name = data.get('name', '').strip()
    language = data.get('language')

    updates = []
    params = []

    if new_name:
        new_name, err = validate_string(new_name, 'שם תצוגה')
        if err:
            return jsonify({"error": err}), 400
        updates.append("name = ?")
        params.append(new_name)

    if language in ('he', 'en', 'es', 'ru', 'ar', 'fr', 'zh'):
        updates.append("language = ?")
        params.append(language)
        
    two_fa_method = data.get('two_fa_method')
    if two_fa_method in ('none', 'email', 'fingerprint'):
        updates.append("two_fa_method = ?")
        params.append(two_fa_method)
        
    if 'notify_expense_added' in data:
        updates.append("notify_expense_added = ?")
        params.append(1 if data['notify_expense_added'] else 0)
        
    if 'notify_group_expense' in data:
        updates.append("notify_group_expense = ?")
        params.append(1 if data['notify_group_expense'] else 0)
        
    email = data.get('email', '').strip()
    if email:
        email, err = validate_string(email, 'Email', MAX_EMAIL_LENGTH, required=True)
        if err:
            return jsonify({"error": err}), 400
        updates.append("email = ?")
        params.append(email)

    default_currency = data.get('default_currency', '').strip().upper()
    valid_currencies = ['ILS', 'USD', 'EUR', 'GBP', 'THB', 'JPY', 'CAD', 'AUD', 'CHF']
    if default_currency and default_currency in valid_currencies:
        updates.append("default_currency = ?")
        params.append(default_currency)

    phone = data.get('phone', '').strip()
    if phone:
        phone, err = validate_string(phone, 'Phone', 20, required=True)
        if err:
            return jsonify({"error": err}), 400
        updates.append("phone = ?")
        params.append(phone)

    if not updates:
        return jsonify({"success": True})

    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        if new_name:
            # Check uniqueness if name changed
            cursor.execute("SELECT id FROM Users WHERE name = ? AND id != ?", (new_name, session['user_id']))
            if cursor.fetchone():
                return jsonify({"error": "שם המשתמש כבר תפוס."}), 400
            session['username'] = new_name
            
        if email:
            cursor.execute("SELECT id FROM Users WHERE email = ? AND id != ?", (email, session['user_id']))
            if cursor.fetchone():
                return jsonify({"error": "כתובת האימייל כבר בשימוש במערכת."}), 400

        params.append(session['user_id'])
        cursor.execute(f"UPDATE Users SET {', '.join(updates)} WHERE id = ?", params)
        conn.commit()
        logger.info(f"User {session['user_id']} updated profile fields: {', '.join(updates)}")
        return jsonify({"success": True})
    except sqlite3.IntegrityError:
        return jsonify({"error": "שם המשתמש כבר תפוס."}), 400
    except sqlite3.Error as e:
        logger.error(f"Update profile error: {e}")
        return jsonify({"error": "שגיאת שרת."}), 500
    finally:
        conn.close()


@app.route('/api/profile/change-password', methods=['POST'])
@login_required
def change_password():
    data = request.json or {}
    current_password = data.get('current_password', '')
    new_password = data.get('new_password', '')

    if not current_password or not new_password:
        return jsonify({"error": "יש למלא את כל השדות."}), 400

    if len(new_password) < MIN_PASSWORD_LENGTH:
        return jsonify({"error": f"סיסמה חדשה חייבת להיות לפחות {MIN_PASSWORD_LENGTH} תווים."}), 400

    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT password_hash FROM Users WHERE id = ?", (session['user_id'],))
        user = cursor.fetchone()
        if not user or not check_password_hash(user['password_hash'], current_password):
            return jsonify({"error": "הסיסמה הנוכחית שגויה."}), 400

        pwd_hash = generate_password_hash(new_password)
        cursor.execute("UPDATE Users SET password_hash = ? WHERE id = ?", (pwd_hash, session['user_id']))
        conn.commit()
        logger.info(f"User {session['user_id']} changed their password")
        return jsonify({"success": True, "message": "הסיסמה עודכנה בהצלחה."})
    except sqlite3.Error as e:
        logger.error(f"Change password error: {e}")
        return jsonify({"error": "שגיאת שרת."}), 500
    finally:
        conn.close()


@app.route('/api/feedback', methods=['POST'])
@login_required
def send_feedback():
    data = request.json or {}
    feedback_text = data.get('feedback', '').strip()
    if not feedback_text:
        return jsonify({"error": "Feedback text is required."}), 400

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT name, email FROM Users WHERE id = ?", (session['user_id'],))
    user = cursor.fetchone()
    conn.close()

    if not user:
        return jsonify({"error": "User not found."}), 404

    smtp_server = os.environ.get('SMTP_SERVER')
    smtp_port = os.environ.get('SMTP_PORT', 587)
    smtp_username = os.environ.get('SMTP_USERNAME')
    smtp_password = os.environ.get('SMTP_PASSWORD')

    target_email = "RoashCorp@gmail.com"
    subject = f"משוב מאת {user['name']}"
    body = f"User Email: {user['email']}\nUser Name: {user['name']}\n\nFeedback:\n{feedback_text}"

    if smtp_server and smtp_username and smtp_password:
        try:
            msg = MIMEMultipart()
            msg['From'] = f"MasterSplitter <{smtp_username}>"
            msg['To'] = target_email
            msg['Subject'] = subject
            msg.attach(MIMEText(body, 'plain'))

            server = smtplib.SMTP(smtp_server, int(smtp_port))
            server.starttls()
            server.login(smtp_username, smtp_password)
            server.send_message(msg)
            server.quit()
        except Exception as e:
            logger.error(f"Failed to send feedback email: {e}")
            return jsonify({"error": "Failed to send email."}), 500
    else:
        logger.warning(f"SMTP not configured. Mocking feedback email to {target_email}:\nSubject: {subject}\nBody: {body}")

    return jsonify({"success": True})


@app.route('/api/contact', methods=['POST'])
@login_required
def contact_us():
    data = request.json or {}
    contact_subject = data.get('subject', '').strip()
    message_text = data.get('message', '').strip()

    if not contact_subject or not message_text:
        return jsonify({"error": "Subject and message are required."}), 400

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT name, email FROM Users WHERE id = ?", (session['user_id'],))
    user = cursor.fetchone()
    conn.close()

    if not user:
        return jsonify({"error": "User not found."}), 404

    smtp_server = os.environ.get('SMTP_SERVER')
    smtp_port = os.environ.get('SMTP_PORT', 587)
    smtp_username = os.environ.get('SMTP_USERNAME')
    smtp_password = os.environ.get('SMTP_PASSWORD')

    target_email = "RoashCorp@gmail.com"
    subject = f"יצירת קשר: {contact_subject}"
    body = f"User Email: {user['email']}\nUser Name: {user['name']}\n\nMessage:\n{message_text}"

    if smtp_server and smtp_username and smtp_password:
        try:
            msg = MIMEMultipart()
            msg['From'] = f"MasterSplitter <{smtp_username}>"
            msg['To'] = target_email
            msg['Subject'] = subject
            msg.attach(MIMEText(body, 'plain'))

            server = smtplib.SMTP(smtp_server, int(smtp_port))
            server.starttls()
            server.login(smtp_username, smtp_password)
            server.send_message(msg)
            server.quit()
        except Exception as e:
            logger.error(f"Failed to send contact email: {e}")
            return jsonify({"error": "Failed to send email."}), 500
    else:
        logger.warning(f"SMTP not configured. Mocking contact email to {target_email}:\nSubject: {subject}\nBody: {body}")

    return jsonify({"success": True})

# =====================
#   USER LOOKUP API
# =====================

@app.route('/api/users/check', methods=['POST'])
@login_required
def check_user_exists():
    """Check if a user exists by email or phone for real-time participant validation."""
    data = request.json or {}
    contact = str(data.get('contact', '')).strip()
    if not contact:
        return jsonify({"error": "Missing contact."}), 400

    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT id, name FROM Users WHERE email = ? OR phone = ?", (contact, contact))
        user = cursor.fetchone()
        if user:
            return jsonify({"exists": True, "name": user['name']})
        else:
            return jsonify({"exists": False})
    except sqlite3.Error as e:
        logger.error(f"Check user error: {e}")
        return jsonify({"error": "Server error."}), 500
    finally:
        conn.close()


# =====================
#   TRIP APIS
# =====================

@app.route('/api/trips', methods=['GET'])
@login_required
def get_trips():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT DISTINCT t.id, t.destination, t.budget, t.budget_type, t.budgets_json, t.image_url,
            COALESCE(t.is_budget_per_user, 0) as is_budget_per_user, t.owner_id, t.invite_token,
            (SELECT GROUP_CONCAT(COALESCE(u.name, tm2.guest_name))
             FROM TripMembers tm2 
             LEFT JOIN Users u ON tm2.user_id = u.id 
             WHERE tm2.trip_id = t.id AND COALESCE(tm2.is_hidden, 0) = 0) as members,
            (SELECT COALESCE(tm3.is_left, 0) FROM TripMembers tm3 WHERE tm3.trip_id = t.id AND tm3.user_id = ?) as is_readonly
        FROM Trips t
        LEFT JOIN TripMembers tm ON t.id = tm.trip_id
        WHERE (t.owner_id = ? OR tm.user_id = ?)
          AND NOT EXISTS (
              SELECT 1 FROM TripMembers tm4 
              WHERE tm4.trip_id = t.id AND tm4.user_id = ? AND tm4.is_hidden = 1
          )
        ORDER BY t.id DESC
    """, (session['user_id'], session['user_id'], session['user_id'], session['user_id']))
    trips = cursor.fetchall()
    conn.close()
    result = []
    for t in trips:
        participants = t['members'].split(',') if t['members'] else []
        result.append({
            'id': t['id'],
            'name': t['destination'],
            'budget': t['budget'] or 0,
            'budget_type': t['budget_type'] or 'none',
            'is_budget_per_user': bool(t['is_budget_per_user']),
            'is_owner': t['owner_id'] == session['user_id'],
            'invite_token': t['invite_token'],
            'image_url': t['image_url'] if 'image_url' in t.keys() else None,
            'budgets_json': json.loads(t['budgets_json']) if t['budgets_json'] else {},
            'participants': participants,
            'is_readonly': bool(t['is_readonly'])
        })
    return jsonify(result)


@app.route('/api/trips', methods=['POST'])
@login_required
def create_trip():
    data = request.json or {}
    name, err = validate_string(data.get('name'), 'שם הטיול')
    if err:
        return jsonify({"error": err}), 400

    budget_raw = data.get('budget', 0)
    try:
        budget = max(0, float(budget_raw))
    except (TypeError, ValueError):
        budget = 0

    raw_participants = data.get('participants', [])
    if not isinstance(raw_participants, list):
        raw_participants = []
    if len(raw_participants) > 50:
        return jsonify({"error": "Too many participants."}), 400

    # Normalize: accept both plain strings (backward compat) and objects
    participants = []
    for p in raw_participants:
        if isinstance(p, dict):
            participants.append(p)
        elif isinstance(p, str) and p.strip():
            participants.append({'contact': p.strip(), 'type': 'registered'})

    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        # Validate registered participants exist
        for p in participants:
            if p.get('type') == 'registered':
                contact = str(p.get('contact', '')).strip()
                if not contact:
                    continue
                cursor.execute("SELECT id FROM Users WHERE email = ? OR phone = ?", (contact, contact))
                if not cursor.fetchone():
                    # Don't block — mark as unregistered (they can still be invited)
                    p['type'] = 'unregistered'

        budget_type = (data.get('budget_type') or 'none').strip().lower()
        if budget_type not in ('none', 'daily', 'monthly', 'yearly'):
            budget_type = 'none'

        is_budget_per_user = 1 if data.get('is_budget_per_user') else 0
        global_budgets = data.get('budgets_json', {})
        global_budgets_json = json.dumps(global_budgets)

        invite_token = __import__('uuid').uuid4().hex[:12]

        participants_json = json.dumps([], ensure_ascii=False)
        cursor.execute(
            "INSERT INTO Trips (destination, budget, budget_type, is_budget_per_user, budgets_json, owner_id, local_participants, invite_token) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            (name, budget, budget_type, is_budget_per_user, global_budgets_json, session['user_id'], participants_json, invite_token)
        )
        trip_id = cursor.lastrowid

        # Auto-add the creator as a TripMember AND admin
        cursor.execute(
            "INSERT OR IGNORE INTO TripMembers (trip_id, user_id, is_admin) VALUES (?, ?, 1)",
            (trip_id, session['user_id'])
        )

        # Process each participant
        for p in participants:
            ptype = p.get('type', 'registered')
            p_budgets = json.dumps(p.get('budgets_json', {}))

            if ptype == 'guest':
                guest_name = str(p.get('name', '')).strip()
                if guest_name:
                    cursor.execute(
                        "INSERT OR IGNORE INTO TripMembers (trip_id, user_id, guest_name, budgets_json) VALUES (?, NULL, ?, ?)",
                        (trip_id, guest_name, p_budgets)
                    )
            elif ptype == 'registered':
                contact = str(p.get('contact', '')).strip()
                if not contact:
                    continue
                cursor.execute("SELECT id FROM Users WHERE email = ? OR phone = ?", (contact, contact))
                found_user = cursor.fetchone()
                if found_user:
                    cursor.execute(
                        "INSERT OR IGNORE INTO TripMembers (trip_id, user_id, budgets_json) VALUES (?, ?, ?)",
                        (trip_id, found_user['id'], p_budgets)
                    )
                    cursor.execute(
                        "INSERT INTO trip_invitations (trip_id, inviter_id, invitee_phone_or_email, status) VALUES (?, ?, ?, 'APPROVED')",
                        (trip_id, session['user_id'], contact)
                    )
            elif ptype == 'unregistered':
                contact = str(p.get('contact', '')).strip()
                if contact:
                    cursor.execute(
                        "INSERT INTO trip_invitations (trip_id, inviter_id, invitee_phone_or_email, status) VALUES (?, ?, ?, 'PENDING')",
                        (trip_id, session['user_id'], contact)
                    )
        conn.commit()
        logger.info(f"Trip created: '{name}' (id={trip_id}) by user {session['user_id']}")
        return jsonify({"success": True, "trip_id": trip_id, "invite_token": invite_token})
    except sqlite3.Error as e:
        logger.error(f"Create trip error: {e}")
        return jsonify({"error": "שגיאה ביצירת הטיול."}), 500
    finally:
        conn.close()


@app.route('/api/trips/<int:trip_id>', methods=['GET'])
@login_required
@require_trip_access
def get_trip(trip_id):
    """Get full details for a single trip, including members and budgets."""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT * FROM Trips WHERE id = ?", (trip_id,))
        trip = cursor.fetchone()
        if not trip:
            return jsonify({"error": "טיול לא נמצא."}), 404

        # Get members
        cursor.execute("""
            SELECT tm.*, u.name, u.phone, u.email, u.avatar_url 
            FROM TripMembers tm
            LEFT JOIN Users u ON tm.user_id = u.id
            WHERE tm.trip_id = ?
        """, (trip_id,))
        members = cursor.fetchall()
        
        participants = []
        for m in members:
            contact = m['email'] or m['phone'] or m['guest_name'] or ''
            participants.append({
                'id': m['user_id'],
                'name': m['name'] or m['guest_name'],
                'contact': contact,
                'avatar_url': m['avatar_url'] if 'avatar_url' in m.keys() else None,
                'type': 'guest' if not m['user_id'] else 'registered',
                'is_admin': bool(m['is_admin']),
                'is_owner': m['user_id'] == trip['owner_id'] if m['user_id'] else False,
                'budgets_json': json.loads(m['budgets_json']) if m['budgets_json'] else {}
            })

        # Get pending invitations
        cursor.execute("SELECT invitee_phone_or_email FROM trip_invitations WHERE trip_id = ? AND status = 'PENDING'", (trip_id,))
        pending_invites = cursor.fetchall()
        for p in pending_invites:
            participants.append({
                'id': None,
                'name': p['invitee_phone_or_email'],
                'contact': p['invitee_phone_or_email'],
                'type': 'pending',
                'budgets_json': {}
            })

        cursor.execute("SELECT COALESCE(is_left, 0) FROM TripMembers WHERE trip_id = ? AND user_id = ?", (trip_id, session['user_id']))
        row = cursor.fetchone()
        is_readonly = bool(row[0]) if row else False

        return jsonify({
            'id': trip['id'],
            'name': trip['destination'],
            'image_url': trip['image_url'] if 'image_url' in trip.keys() else None,
            'budget': trip['budget'],
            'budget_type': trip['budget_type'] or 'none',
            'is_budget_per_user': bool(trip['is_budget_per_user']),
            'budgets_json': json.loads(trip['budgets_json']) if trip['budgets_json'] else {},
            'user_budgets': json.loads(trip['user_budgets']) if trip.keys() and 'user_budgets' in trip.keys() and trip['user_budgets'] else {},
            'is_owner': trip['owner_id'] == session['user_id'],
            'invite_token': trip['invite_token'],
            'is_public_expenses': bool(trip['is_public_expenses']) if 'is_public_expenses' in trip.keys() else False,
            'allow_member_delete': bool(trip['allow_member_delete']) if 'allow_member_delete' in trip.keys() else True,
            'participants': participants,
            'is_readonly': is_readonly
        })
    except sqlite3.Error as e:
        logger.error(f"Get trip error: {e}")
        return jsonify({"error": "שגיאה בטעינת הטיול."}), 500
    finally:
        conn.close()


@app.route('/api/trips/<int:trip_id>', methods=['PUT'])
@login_required
@require_trip_access
def update_trip(trip_id):
    """Update trip details. Only the trip owner can edit."""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        # Verify ownership
        cursor.execute("SELECT owner_id FROM Trips WHERE id = ?", (trip_id,))
        trip = cursor.fetchone()
        if not trip:
            return jsonify({"error": "טיול לא נמצא."}), 404
        if trip['owner_id'] != session['user_id']:
            return jsonify({"error": "רק יוצר הטיול יכול לערוך אותו."}), 403

        data = request.json or {}
        updates = []
        params = []

        if 'name' in data:
            name, err = validate_string(data['name'], 'שם הטיול')
            if err:
                conn.close()
                return jsonify({"error": err}), 400
            updates.append("destination = ?")
            params.append(name)

        if 'budget' in data:
            try:
                budget = max(0, float(data['budget']))
            except (TypeError, ValueError):
                budget = 0
            updates.append("budget = ?")
            params.append(budget)

        if 'budget_type' in data:
            bt = (data['budget_type'] or 'none').strip().lower()
            if bt not in ('none', 'daily', 'monthly', 'yearly'):
                bt = 'none'
            updates.append("budget_type = ?")
            params.append(bt)

        if 'is_budget_per_user' in data:
            updates.append("is_budget_per_user = ?")
            params.append(1 if data['is_budget_per_user'] else 0)

        if 'budgets_json' in data:
            updates.append("budgets_json = ?")
            params.append(json.dumps(data['budgets_json']))

        if 'user_budgets' in data:
            updates.append("user_budgets = ?")
            params.append(json.dumps(data['user_budgets']))

        if 'participants' in data:
            raw_participants = data['participants']
            if not isinstance(raw_participants, list):
                raw_participants = []
            if len(raw_participants) > 50:
                conn.close()
                return jsonify({"error": "Too many participants."}), 400

            # Normalize
            participants = []
            for p in raw_participants:
                if isinstance(p, dict):
                    participants.append(p)
                elif isinstance(p, str) and p.strip():
                    participants.append({'contact': p.strip(), 'type': 'registered'})

            for p in participants:
                ptype = p.get('type', 'registered')
                p_budgets = json.dumps(p.get('budgets_json', {}))

                if ptype == 'guest':
                    guest_name = str(p.get('name', '')).strip()
                    if guest_name:
                        cursor.execute(
                            "INSERT OR IGNORE INTO TripMembers (trip_id, user_id, guest_name, budgets_json) VALUES (?, NULL, ?, ?)",
                            (trip_id, guest_name, p_budgets)
                        )
                        # Ensure budgets_json is updated if it already existed
                        cursor.execute("UPDATE TripMembers SET budgets_json = ? WHERE trip_id = ? AND guest_name = ?", (p_budgets, trip_id, guest_name))
                elif ptype == 'registered':
                    contact = str(p.get('contact', '')).strip()
                    if not contact:
                        continue
                    cursor.execute("SELECT id FROM Users WHERE email = ? OR phone = ?", (contact, contact))
                    user = cursor.fetchone()
                    if not user:
                        continue  # Skip unregistered — don't block
                    cursor.execute(
                        "INSERT OR IGNORE INTO TripMembers (trip_id, user_id, budgets_json) VALUES (?, ?, ?)",
                        (trip_id, user['id'], p_budgets)
                    )
                    cursor.execute("UPDATE TripMembers SET budgets_json = ? WHERE trip_id = ? AND user_id = ?", (p_budgets, trip_id, user['id']))
                    
                    cursor.execute("SELECT 1 FROM trip_invitations WHERE trip_id = ? AND invitee_phone_or_email = ?", (trip_id, contact))
                    if not cursor.fetchone():
                        cursor.execute(
                            "INSERT INTO trip_invitations (trip_id, inviter_id, invitee_phone_or_email, status) VALUES (?, ?, ?, 'APPROVED')",
                            (trip_id, session['user_id'], contact)
                        )

        if updates:
            params.append(trip_id)
            cursor.execute(f"UPDATE Trips SET {', '.join(updates)} WHERE id = ?", params)
            
        conn.commit()
        logger.info(f"Trip updated/invites sent: id={trip_id} by user {session['user_id']}")
        return jsonify({"success": True})
    except sqlite3.Error as e:
        logger.error(f"Update trip error: {e}")
        return jsonify({"error": "שגיאה בעדכון הטיול."}), 500
    finally:
        conn.close()


@app.route('/api/trip_members/<int:trip_id>', methods=['GET'])
@login_required
@require_trip_access
def get_trip_members(trip_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    # Registered users (include avatar_url, phone, email, budgets_json)
    cursor.execute("""
        SELECT u.id, u.name, u.phone, u.email, u.avatar_url, COALESCE(tm.is_admin, 0) as is_admin, tm.budgets_json
        FROM Users u
        JOIN TripMembers tm ON u.id = tm.user_id
        WHERE tm.trip_id = ? AND tm.user_id IS NOT NULL
    """, (trip_id,))
    registered = [{
        'id': m['id'], 'name': m['name'], 'type': 'user',
        'contact': m['email'] or m['phone'] or '',
        'is_admin': bool(m['is_admin']),
        'avatar_url': m['avatar_url'] or None,
        'budgets_json': json.loads(m['budgets_json']) if m['budgets_json'] else {}
    } for m in cursor.fetchall()]

    # Guest (virtual) members
    cursor.execute("""
        SELECT guest_name, budgets_json FROM TripMembers
        WHERE trip_id = ? AND user_id IS NULL AND guest_name IS NOT NULL
    """, (trip_id,))
    guests = [{
        'id': f'guest_{i}', 'name': g['guest_name'], 'type': 'guest', 'contact': g['guest_name'],
        'avatar_url': None,
        'budgets_json': json.loads(g['budgets_json']) if g['budgets_json'] else {}
    } for i, g in enumerate(cursor.fetchall())]

    # Pending invitations
    cursor.execute("SELECT invitee_phone_or_email FROM trip_invitations WHERE trip_id = ? AND status = 'PENDING'", (trip_id,))
    pending = [{
        'id': f'pending_{i}', 'name': p['invitee_phone_or_email'], 'contact': p['invitee_phone_or_email'],
        'type': 'pending', 'avatar_url': None, 'is_admin': False, 'budgets_json': {}
    } for i, p in enumerate(cursor.fetchall())]

    # Local participants (Legacy support)
    cursor.execute("SELECT local_participants FROM Trips WHERE id = ?", (trip_id,))
    row = cursor.fetchone()
    conn.close()
    local = []
    if row and row['local_participants']:
        try:
            names = json.loads(row['local_participants'])
            local = [{'id': f'local_{i}', 'name': n, 'type': 'local', 'avatar_url': None} for i, n in enumerate(names)]
        except (json.JSONDecodeError, TypeError):
            logger.warning(f"Invalid local_participants JSON for trip {trip_id}")
    return jsonify(registered + guests + pending + local)


# =====================
#   TRIP SETTINGS & ADMIN
# =====================

@app.route('/api/trips/<int:trip_id>/settings', methods=['GET'])
@login_required
@require_trip_access
def get_trip_settings(trip_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT COALESCE(is_public_expenses, 0) as is_public_expenses, COALESCE(allow_member_delete, 1) as allow_member_delete FROM Trips WHERE id = ?", (trip_id,))
    trip = cursor.fetchone()
    cursor.execute("SELECT COALESCE(is_admin, 0) as is_admin FROM TripMembers WHERE trip_id = ? AND user_id = ?",
                   (trip_id, session['user_id']))
    member = cursor.fetchone()
    conn.close()
    return jsonify({
        'is_public_expenses': bool(trip['is_public_expenses']) if trip else False,
        'allow_member_delete': bool(trip['allow_member_delete']) if trip else True,
        'is_admin': bool(member['is_admin']) if member else False
    })


@app.route('/api/trips/<int:trip_id>/settings', methods=['PUT'])
@login_required
@require_trip_access
def update_trip_settings(trip_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    # Check admin
    cursor.execute("SELECT COALESCE(is_admin, 0) as is_admin FROM TripMembers WHERE trip_id = ? AND user_id = ?",
                   (trip_id, session['user_id']))
    member = cursor.fetchone()
    if not member or not member['is_admin']:
        conn.close()
        return jsonify({"error": "Only admins can change trip settings."}), 403

    data = request.json or {}
    if 'is_public_expenses' in data:
        val = 1 if data['is_public_expenses'] else 0
        cursor.execute("UPDATE Trips SET is_public_expenses = ? WHERE id = ?", (val, trip_id))
    if 'allow_member_delete' in data:
        val = 1 if data['allow_member_delete'] else 0
        cursor.execute("UPDATE Trips SET allow_member_delete = ? WHERE id = ?", (val, trip_id))
    conn.commit()
    conn.close()
    return jsonify({"success": True})

@app.route('/api/trips/<int:trip_id>/leave', methods=['POST'])
@login_required
@require_trip_access
def leave_trip(trip_id):
    """Leave a trip (becomes read-only). If owner leaves, assign new owner."""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        user_id = session['user_id']
        cursor.execute("UPDATE TripMembers SET is_left = 1 WHERE trip_id = ? AND user_id = ?", (trip_id, user_id))
        
        # Check if user was the owner
        cursor.execute("SELECT owner_id FROM Trips WHERE id = ?", (trip_id,))
        trip = cursor.fetchone()
        if trip and trip['owner_id'] == user_id:
            # Reassign owner
            cursor.execute("""
                SELECT user_id FROM TripMembers 
                WHERE trip_id = ? AND user_id != ? AND user_id IS NOT NULL AND is_left = 0
                ORDER BY id ASC LIMIT 1
            """, (trip_id, user_id))
            next_owner = cursor.fetchone()
            if next_owner:
                new_owner_id = next_owner['user_id']
                cursor.execute("UPDATE Trips SET owner_id = ? WHERE id = ?", (new_owner_id, trip_id))
                cursor.execute("UPDATE TripMembers SET is_admin = 1 WHERE trip_id = ? AND user_id = ?", (trip_id, new_owner_id))
                logger.info(f"Trip {trip_id} owner reassigned to {new_owner_id} because {user_id} left.")
        conn.commit()
        return jsonify({"success": True})
    except sqlite3.Error as e:
        logger.error(f"Error leaving trip: {e}")
        return jsonify({"error": "שגיאה בעזיבת הקבוצה."}), 500
    finally:
        conn.close()

@app.route('/api/trips/<int:trip_id>/hide', methods=['POST'])
@login_required
@require_trip_access
def hide_trip(trip_id):
    """Hide a trip from the dashboard."""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("UPDATE TripMembers SET is_hidden = 1 WHERE trip_id = ? AND user_id = ?", (trip_id, session['user_id']))
        conn.commit()
        return jsonify({"success": True})
    except sqlite3.Error as e:
        logger.error(f"Error hiding trip: {e}")
        return jsonify({"error": "שגיאה במחיקת הקבוצה מהרשימה."}), 500
    finally:
        conn.close()


@app.route('/api/trips/<int:trip_id>/upload-avatar', methods=['POST'])
@login_required
@require_trip_access
def upload_trip_avatar(trip_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    # Only admins can change trip picture
    cursor.execute("SELECT COALESCE(is_admin, 0) as is_admin FROM TripMembers WHERE trip_id = ? AND user_id = ?",
                   (trip_id, session['user_id']))
    member = cursor.fetchone()
    if not member or not member['is_admin']:
        conn.close()
        return jsonify({"error": "Only admins can change trip picture."}), 403

    if 'avatar' not in request.files:
        conn.close()
        return jsonify({"error": "No file part"}), 400
    file = request.files['avatar']
    if file.filename == '':
        conn.close()
        return jsonify({"error": "No selected file"}), 400
        
    if file:
        ext = file.filename.rsplit('.', 1)[-1].lower()
        if ext not in ['jpg', 'jpeg', 'png', 'gif', 'webp']:
            conn.close()
            return jsonify({"error": "Invalid file type"}), 400
            
        import secrets
        filename = f"trip_{trip_id}_{secrets.token_hex(4)}.{ext}"
        filepath = os.path.join(UPLOAD_FOLDER, filename)
        file.save(filepath)
        
        avatar_url = f"/static/avatars/{filename}"
        
        try:
            cursor.execute("UPDATE Trips SET image_url = ? WHERE id = ?", (avatar_url, trip_id))
            conn.commit()
            return jsonify({"success": True, "avatar_url": avatar_url})
        except sqlite3.Error as e:
            logger.error(f"Trip Avatar upload error: {e}")
            return jsonify({"error": "Database error"}), 500
        finally:
            conn.close()
    conn.close()
    return jsonify({"error": "Unknown error"}), 400


@app.route('/api/trips/<int:trip_id>/members/<int:member_id>/promote', methods=['PUT'])
@login_required
@require_trip_access
def promote_member(trip_id, member_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    # Check caller is admin
    cursor.execute("SELECT COALESCE(is_admin, 0) as is_admin FROM TripMembers WHERE trip_id = ? AND user_id = ?",
                   (trip_id, session['user_id']))
    caller = cursor.fetchone()
    if not caller or not caller['is_admin']:
        conn.close()
        return jsonify({"error": "Only admins can promote members."}), 403

    cursor.execute("UPDATE TripMembers SET is_admin = 1 WHERE trip_id = ? AND user_id = ?",
                   (trip_id, member_id))
    if cursor.rowcount == 0:
        conn.close()
        return jsonify({"error": "Member not found."}), 404
    conn.commit()
    conn.close()
    logger.info(f"User {session['user_id']} promoted {member_id} to admin in trip {trip_id}")
    return jsonify({"success": True})


@app.route('/api/trips/<int:trip_id>/demote/<int:member_id>', methods=['POST'])
@login_required
@require_trip_access
def demote_member(trip_id, member_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    # Check caller is admin
    cursor.execute("SELECT COALESCE(is_admin, 0) as is_admin FROM TripMembers WHERE trip_id = ? AND user_id = ?",
                   (trip_id, session['user_id']))
    caller = cursor.fetchone()
    if not caller or not caller['is_admin']:
        conn.close()
        return jsonify({"error": "Only admins can demote members."}), 403

    # Cannot demote yourself if you are the last admin
    if member_id == session['user_id']:
        cursor.execute("SELECT COUNT(*) as cnt FROM TripMembers WHERE trip_id = ? AND COALESCE(is_admin, 0) = 1",
                       (trip_id,))
        admin_count = cursor.fetchone()['cnt']
        if admin_count <= 1:
            conn.close()
            return jsonify({"error": "Cannot demote — you are the last admin."}), 400

    cursor.execute("UPDATE TripMembers SET is_admin = 0 WHERE trip_id = ? AND user_id = ?",
                   (trip_id, member_id))
    if cursor.rowcount == 0:
        conn.close()
        return jsonify({"error": "Member not found."}), 404
    conn.commit()
    conn.close()
    logger.info(f"User {session['user_id']} demoted {member_id} from admin in trip {trip_id}")
    return jsonify({"success": True})


@app.route('/api/trips/<int:trip_id>/members/<contact>', methods=['DELETE'])
@login_required
@require_trip_access
def remove_member(trip_id, contact):
    conn = get_db_connection()
    cursor = conn.cursor()
    # Check caller is admin
    cursor.execute("SELECT COALESCE(is_admin, 0) as is_admin, user_id FROM TripMembers WHERE trip_id = ? AND user_id = ?",
                   (trip_id, session['user_id']))
    caller = cursor.fetchone()
    if not caller or not caller['is_admin']:
        conn.close()
        return jsonify({"error": "Only admins can remove members."}), 403

    # Check if removing the owner
    cursor.execute("SELECT owner_id FROM Trips WHERE id = ?", (trip_id,))
    trip = cursor.fetchone()
    
    # Resolve contact to user_id if it's a registered user
    cursor.execute("SELECT id FROM Users WHERE phone = ? OR email = ?", (contact, contact))
    user = cursor.fetchone()
    
    if user:
        member_id = user['id']
        if trip and trip['owner_id'] == member_id:
            conn.close()
            return jsonify({"error": "Cannot remove the creator of the group."}), 403
        
        cursor.execute("DELETE FROM TripMembers WHERE trip_id = ? AND user_id = ?", (trip_id, member_id))
        deleted_count = cursor.rowcount
        cursor.execute("DELETE FROM trip_invitations WHERE trip_id = ? AND invitee_phone_or_email = ?", (trip_id, contact))
        deleted_count += cursor.rowcount
    else:
        # Might be a guest name or a pending invite for unregistered contact
        cursor.execute("DELETE FROM TripMembers WHERE trip_id = ? AND user_id IS NULL AND guest_name = ?", (trip_id, contact))
        deleted_count = cursor.rowcount
        cursor.execute("DELETE FROM trip_invitations WHERE trip_id = ? AND invitee_phone_or_email = ?", (trip_id, contact))
        deleted_count += cursor.rowcount

    if deleted_count == 0:
        conn.close()
        return jsonify({"error": "Member not found."}), 404
        
    conn.commit()
    conn.close()
    logger.info(f"User {session['user_id']} removed {contact} from trip {trip_id}")
    return jsonify({"success": True})


@app.route('/api/trips/<int:trip_id>/invite-link', methods=['POST'])
@login_required
@require_trip_access
def generate_invite_link(trip_id):
    """Generate (or regenerate) a unique invite token for the trip."""
    import uuid
    conn = get_db_connection()
    cursor = conn.cursor()
    # Only admins can generate invite links
    cursor.execute("SELECT COALESCE(is_admin, 0) as is_admin FROM TripMembers WHERE trip_id = ? AND user_id = ?",
                   (trip_id, session['user_id']))
    caller = cursor.fetchone()
    if not caller or not caller['is_admin']:
        conn.close()
        return jsonify({"error": "Only admins can generate invite links."}), 403

    token = uuid.uuid4().hex[:12]
    cursor.execute("UPDATE Trips SET invite_token = ? WHERE id = ?", (token, trip_id))
    conn.commit()
    conn.close()
    logger.info(f"User {session['user_id']} generated invite link for trip {trip_id}")
    return jsonify({"success": True, "invite_token": token})


@app.route('/api/trips/<int:trip_id>/invite-link', methods=['GET'])
@login_required
@require_trip_access
def get_invite_link(trip_id):
    """Get the current invite token for the trip."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT invite_token FROM Trips WHERE id = ?", (trip_id,))
    trip = cursor.fetchone()
    conn.close()
    token = trip['invite_token'] if trip and trip['invite_token'] else None
    return jsonify({"invite_token": token})


@app.route('/api/join/<token>', methods=['POST'])
@login_required
def join_via_invite(token):
    """Join a trip via invite link token."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, destination FROM Trips WHERE invite_token = ?", (token,))
    trip = cursor.fetchone()
    if not trip:
        conn.close()
        return jsonify({"error": "Invalid or expired invite link."}), 404

    trip_id = trip['id']
    # Check if already a member
    cursor.execute("SELECT 1 FROM TripMembers WHERE trip_id = ? AND user_id = ?",
                   (trip_id, session['user_id']))
    if cursor.fetchone():
        conn.close()
        return jsonify({"success": True, "trip_id": trip_id, "message": "Already a member."})

    cursor.execute("INSERT INTO TripMembers (trip_id, user_id, is_admin) VALUES (?, ?, 0)",
                   (trip_id, session['user_id']))
    
    # Flip status from Pending to Member in trip_invitations
    cursor.execute("""
        UPDATE trip_invitations 
        SET status = 'APPROVED' 
        WHERE trip_id = ? AND invitee_phone_or_email IN (SELECT phone FROM Users WHERE id = ? UNION SELECT email FROM Users WHERE id = ?)
    """, (trip_id, session['user_id'], session['user_id']))

    conn.commit()
    conn.close()
    logger.info(f"User {session['user_id']} joined trip {trip_id} via invite link")
    return jsonify({"success": True, "trip_id": trip_id})


@app.route('/join/<token>')
def join_invite_page(token):
    """Redirect page for invite links."""
    if 'user_id' not in session:
        return redirect(f'/?invite={token}')
    return redirect(f'/app?invite={token}')


@app.route('/api/trips/<int:trip_id>/leave', methods=['POST'])
@login_required
@require_trip_access
def leave_group(trip_id):
    """Remove the current user from a group. Handle admin succession and group deletion."""
    uid = session['user_id']
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # Check if user is a member
        cursor.execute("SELECT id, COALESCE(is_admin, 0) as is_admin FROM TripMembers WHERE trip_id = ? AND user_id = ?",
                       (trip_id, uid))
        member = cursor.fetchone()
        if not member:
            conn.close()
            return jsonify({"error": "You are not a member of this group."}), 404

        was_admin = bool(member['is_admin'])

        # Remove the user
        cursor.execute("DELETE FROM TripMembers WHERE trip_id = ? AND user_id = ?", (trip_id, uid))

        # Check remaining members
        cursor.execute("SELECT id, user_id FROM TripMembers WHERE trip_id = ? AND user_id IS NOT NULL ORDER BY id ASC", (trip_id,))
        remaining = cursor.fetchall()

        if len(remaining) == 0:
            # Last member left — delete the entire group cascade
            cursor.execute("DELETE FROM ExpenseSplits WHERE expense_id IN (SELECT id FROM Expenses WHERE trip_id = ?)", (trip_id,))
            cursor.execute("DELETE FROM Expenses WHERE trip_id = ?", (trip_id,))
            cursor.execute("DELETE FROM Settlements WHERE trip_id = ?", (trip_id,))
            cursor.execute("DELETE FROM ActivityLog WHERE trip_id = ?", (trip_id,))
            cursor.execute("DELETE FROM trip_invitations WHERE trip_id = ?", (trip_id,))
            cursor.execute("DELETE FROM TripMembers WHERE trip_id = ?", (trip_id,))  # guests too
            cursor.execute("DELETE FROM Trips WHERE id = ?", (trip_id,))
            conn.commit()
            logger.info(f"User {uid} left trip {trip_id} — last member, group deleted.")
            return jsonify({"success": True, "deleted": True})

        # If leaver was admin, promote the oldest remaining member
        if was_admin:
            # Check if there's already another admin
            cursor.execute("SELECT 1 FROM TripMembers WHERE trip_id = ? AND user_id IS NOT NULL AND is_admin = 1", (trip_id,))
            if not cursor.fetchone():
                # No other admin — promote oldest
                new_admin_id = remaining[0]['user_id']
                cursor.execute("UPDATE TripMembers SET is_admin = 1 WHERE trip_id = ? AND user_id = ?",
                               (trip_id, new_admin_id))
                logger.info(f"Auto-promoted user {new_admin_id} to admin in trip {trip_id}")

        conn.commit()
        logger.info(f"User {uid} left trip {trip_id}.")
        return jsonify({"success": True, "deleted": False})

    except sqlite3.Error as e:
        logger.error(f"Leave group error: {e}")
        return jsonify({"error": "Failed to leave group."}), 500
    finally:
        conn.close()


# =====================
#   INVITATION APIS
# =====================

@app.route('/api/invitations', methods=['GET'])
@login_required
def get_invitations():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT email, phone FROM Users WHERE id = ?", (session['user_id'],))
    user = cursor.fetchone()
    if not user:
        conn.close()
        return jsonify({"error": "User not found"}), 404

    # Fetch pending invitations matching email or phone
    cursor.execute("""
        SELECT i.id, i.trip_id, t.destination as trip_name, u.name as inviter_name
        FROM trip_invitations i
        JOIN Trips t ON i.trip_id = t.id
        JOIN Users u ON i.inviter_id = u.id
        WHERE i.status = 'PENDING' AND (i.invitee_phone_or_email = ? OR i.invitee_phone_or_email = ?)
    """, (user['email'], user['phone']))
    invitations = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return jsonify(invitations)


@app.route('/api/invitations/<int:invitation_id>/respond', methods=['POST'])
@login_required
def respond_invitation(invitation_id):
    data = request.json or {}
    action = data.get('action')
    if action not in ('approve', 'reject'):
        return jsonify({"error": "Invalid action. Use 'approve' or 'reject'."}), 400

    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT email, phone FROM Users WHERE id = ?", (session['user_id'],))
        user = cursor.fetchone()

        cursor.execute("""
            SELECT id, trip_id, invitee_phone_or_email, status
            FROM trip_invitations
            WHERE id = ?
        """, (invitation_id,))
        invitation = cursor.fetchone()

        if not invitation:
            return jsonify({"error": "Invitation not found."}), 404

        # Validate ownership of invitation
        if invitation['invitee_phone_or_email'] not in (user['email'], user['phone']):
            return jsonify({"error": "Forbidden"}), 403

        if invitation['status'] != 'PENDING':
            return jsonify({"error": "Invitation already processed."}), 400

        new_status = 'APPROVED' if action == 'approve' else 'REJECTED'
        cursor.execute("UPDATE trip_invitations SET status = ? WHERE id = ?", (new_status, invitation_id))

        if action == 'approve':
            cursor.execute(
                "INSERT OR IGNORE INTO TripMembers (trip_id, user_id) VALUES (?, ?)",
                (invitation['trip_id'], session['user_id'])
            )
            
        conn.commit()
        logger.info(f"User {session['user_id']} responded to invitation {invitation_id} with {new_status}")
        return jsonify({"success": True})
    except sqlite3.Error as e:
        logger.error(f"Respond invitation error: {e}")
        return jsonify({"error": "שגיאה בתגובה להזמנה."}), 500
    finally:
        conn.close()


@app.route('/api/trips/<int:trip_id>/invite-email', methods=['POST'])
@login_required
@require_trip_access
def invite_by_email(trip_id):
    """Send an email invitation to join a group."""
    data = request.json or {}
    invite_name = (data.get('name') or '').strip()
    invite_email = (data.get('email') or '').strip()

    if not invite_name or not invite_email:
        return jsonify({"error": "Name and email are required."}), 400

    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        # Get trip info
        cursor.execute("SELECT destination, invite_token FROM Trips WHERE id = ?", (trip_id,))
        trip = cursor.fetchone()
        if not trip:
            return jsonify({"error": "Group not found."}), 404

        # Ensure invite token exists
        invite_token = trip['invite_token']
        if not invite_token:
            import uuid
            invite_token = uuid.uuid4().hex[:12]
            cursor.execute("UPDATE Trips SET invite_token = ? WHERE id = ?", (invite_token, trip_id))

        # Record the invitation
        cursor.execute(
            "INSERT INTO trip_invitations (trip_id, inviter_id, invitee_phone_or_email, status) VALUES (?, ?, ?, 'PENDING')",
            (trip_id, session['user_id'], invite_email)
        )
        conn.commit()

        # Build join link
        domain = os.environ.get('PA_DOMAIN', 'localhost:5000')
        protocol = "https" if domain != "localhost:5000" else "http"
        join_link = f"{protocol}://{domain}/join/{invite_token}"

        # Get inviter name
        cursor.execute("SELECT name FROM Users WHERE id = ?", (session['user_id'],))
        inviter = cursor.fetchone()
        inviter_name = inviter['name'] if inviter else 'Someone'

        # Send email
        smtp_server = os.environ.get('SMTP_SERVER')
        smtp_port = os.environ.get('SMTP_PORT', 587)
        smtp_username = os.environ.get('SMTP_USERNAME')
        smtp_password = os.environ.get('SMTP_PASSWORD')

        if smtp_server and smtp_username and smtp_password:
            try:
                msg = MIMEMultipart()
                msg['From'] = f"MasterSplitter <{smtp_username}>"
                msg['To'] = invite_email
                msg['Subject'] = f"MasterSplitter — {inviter_name} invited you to {trip['destination']}"

                body = f"""
                <html>
                  <body style="font-family: 'Heebo', Arial, sans-serif; background: #0a0a1a; color: #e2e8f0; padding: 40px 20px;">
                    <div style="max-width: 420px; margin: 0 auto; background: #12122a; border-radius: 20px; padding: 32px; border: 1px solid rgba(255,255,255,0.08);">
                      <h2 style="color: #a855f7; text-align: center;">You're Invited! 🎉</h2>
                      <p style="text-align: center; color: #94a3b8;">Hi {invite_name},</p>
                      <p style="text-align: center; color: #94a3b8;"><strong style="color: #facc15;">{inviter_name}</strong> has invited you to join the group <strong style="color: #facc15;">{trip['destination']}</strong> on MasterSplitter.</p>
                      <p style="text-align: center; margin-top: 24px;"><a href="{join_link}" style="background: #a855f7; color: white; text-decoration: none; padding: 12px 32px; border-radius: 12px; font-weight: bold; display: inline-block;">Join Group</a></p>
                      <p style="text-align: center; color: #64748b; font-size: 0.85rem; margin-top: 20px;">Or copy this link: {join_link}</p>
                    </div>
                  </body>
                </html>
                """
                msg.attach(MIMEText(body, 'html'))

                server = smtplib.SMTP(smtp_server, int(smtp_port))
                server.starttls()
                server.login(smtp_username, smtp_password)
                server.send_message(msg)
                server.quit()
                logger.info(f"Email invite sent to {invite_email} for trip {trip_id}")
            except Exception as e:
                logger.error(f"Failed to send invite email to {invite_email}: {e}")
                return jsonify({"success": True, "warning": "Invitation recorded but email could not be sent."})
        else:
            logger.warning(f"SMTP not configured. Invite link for {invite_email}: {join_link}")

        return jsonify({"success": True})
    except sqlite3.Error as e:
        logger.error(f"Invite by email error: {e}")
        return jsonify({"error": "Server error."}), 500
    finally:
        conn.close()


# =====================
#   EXPENSE APIS
# =====================

@app.route('/api/expenses/<int:trip_id>', methods=['GET'])
@login_required
@require_trip_access
def get_expenses(trip_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    uid = session.get('user_id')

    # Check if trip has public expenses
    cursor.execute("SELECT COALESCE(is_public_expenses, 0) as is_public FROM Trips WHERE id = ?", (trip_id,))
    trip_row = cursor.fetchone()
    is_public = trip_row['is_public'] if trip_row else 0

    cursor.execute("""
        SELECT e.id, u.name as payer, u.avatar_url as payer_avatar, e.user_id,
               e.amount, e.original_amount, e.currency, e.description,
               e.category, e.is_personal, e.created_at
        FROM Expenses e
        JOIN Users u ON e.user_id = u.id
        WHERE e.trip_id = ?
        ORDER BY e.id DESC
    """, (trip_id,))
    expenses = cursor.fetchall()

    # Build splits lookup for all expenses in one query
    expense_ids = [e['id'] for e in expenses]
    splits_map = {}
    if expense_ids:
        placeholders = ','.join('?' * len(expense_ids))
        cursor.execute(f"""
            SELECT es.expense_id, es.user_id, es.amount, u.name, u.avatar_url
            FROM ExpenseSplits es
            JOIN Users u ON es.user_id = u.id
            WHERE es.expense_id IN ({placeholders})
            ORDER BY es.amount DESC
        """, expense_ids)
        for s in cursor.fetchall():
            eid = s['expense_id']
            if eid not in splits_map:
                splits_map[eid] = []
            splits_map[eid].append({
                'user_id': s['user_id'],
                'name': s['name'],
                'avatar_url': s['avatar_url'],
                'amount': s['amount']
            })

    def enrich(row):
        d = dict(row)
        d['splits'] = splits_map.get(d['id'], [])
        return d

    if is_public:
        # Public trip — everyone sees everything
        conn.close()
        return jsonify([enrich(e) for e in expenses])

    # Private mode: only show expenses where user is payer OR is in splits
    result = []
    for e in expenses:
        row = dict(e)
        if row['user_id'] == uid:
            result.append(enrich(e))
            continue
        # Check if user is in ExpenseSplits for this expense
        if any(s['user_id'] == uid for s in splits_map.get(row['id'], [])):
            result.append(enrich(e))
    conn.close()
    return jsonify(result)


@app.route('/api/expenses', methods=['POST'])
@login_required
def add_expense():
    data = request.json or {}
    trip_id = data.get('trip_id')

    if not trip_id:
        return jsonify({"error": "נתונים חסרים."}), 400

    # Verify trip access
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT 1 FROM TripMembers WHERE trip_id = ? AND user_id = ?
        UNION
        SELECT 1 FROM Trips WHERE id = ? AND owner_id = ?
    """, (trip_id, session['user_id'], trip_id, session['user_id']))
    if not cursor.fetchone():
        conn.close()
        return jsonify({"error": "Forbidden"}), 403

    # Validate amount
    amount, err = validate_amount(data.get('amount'))
    if err:
        conn.close()
        return jsonify({"error": err}), 400

    # Validate description
    description, err = validate_string(data.get('description'), 'תיאור', MAX_DESCRIPTION_LENGTH)
    if err:
        conn.close()
        return jsonify({"error": err}), 400

    category = (data.get('category') or 'General').strip()
    if len(category) > 50:
        category = category[:50]

    # Validate currency
    currency = (data.get('currency') or 'ILS').strip().upper()
    if not (2 <= len(currency) <= 10):
        currency = 'ILS'

    # Look up Trip's base currency for conversion target
    cursor.execute("SELECT budget_type FROM Trips WHERE id = ?", (trip_id,))
    trip_row = cursor.fetchone()
    trip_base_currency = 'ILS'
    if trip_row and trip_row['budget_type'] and trip_row['budget_type'] != 'none':
        try:
            import json
            budgets = json.loads(trip_row['budget_type'])
            trip_base_currency = budgets.get('currency', 'ILS')
        except:
            pass

    # Currency conversion: convert to Trip's base currency if foreign
    original_amount = None
    if currency != trip_base_currency:
        rate = get_exchange_rate(currency, trip_base_currency)
        if rate:
            original_amount = amount
            amount = round(original_amount * rate, 2)
        else:
            # Could not get rate — store as-is with a warning
            logger.warning(f"Could not get exchange rate for {currency}->{trip_base_currency}, storing raw amount")
            original_amount = amount

    # Personal expense flag
    is_personal = 1 if data.get('is_personal') else 0

    # Parse optional splits
    splits = data.get('splits')  # [{user_id: int, amount: float}, ...]

    payer_id = data.get('payer_id')
    if not payer_id:
        payer_id = session['user_id']
    else:
        payer_id = int(payer_id)

    try:
        cursor.execute("""
            INSERT INTO Expenses (trip_id, user_id, amount, original_amount, currency, description, category, is_personal, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (trip_id, payer_id, amount, original_amount, currency, description, category, is_personal,
              datetime.now(timezone.utc).isoformat()))
        expense_id = cursor.lastrowid

        # Handle splits
        if splits and isinstance(splits, list) and len(splits) > 0:
            # Validate split amounts sum to raw amount
            raw_amount = float(data.get('amount'))
            split_total = sum(float(s.get('amount', 0)) for s in splits)
            print(f"DEBUG add_expense: raw_amount={raw_amount}, split_total={split_total}, diff={abs(split_total - raw_amount)}, splits={splits}")
            if abs(split_total - raw_amount) > 0.01:
                conn.rollback()
                conn.close()
                return jsonify({"error": "Split amounts must sum to the total expense amount."}), 400

            valid_splits = [s for s in splits if float(s.get('amount', 0)) > 0]
            if valid_splits:
                converted_splits = []
                if original_amount is not None and amount != original_amount:
                    running_sum = 0
                    for i, s in enumerate(valid_splits):
                        s_uid = int(s['user_id'])
                        s_amt = float(s['amount'])
                        if i == len(valid_splits) - 1:
                            c_amt = round(amount - running_sum, 2)
                        else:
                            c_amt = round(s_amt * (amount / original_amount), 2)
                            running_sum += c_amt
                        converted_splits.append((s_uid, c_amt))
                else:
                    for s in valid_splits:
                        converted_splits.append((int(s['user_id']), float(s['amount'])))

                for s_uid, s_amt in converted_splits:
                    cursor.execute(
                        "INSERT INTO ExpenseSplits (expense_id, user_id, amount) VALUES (?, ?, ?)",
                        (expense_id, s_uid, s_amt)
                    )
        else:
            if is_personal:
                cursor.execute(
                    "INSERT INTO ExpenseSplits (expense_id, user_id, amount) VALUES (?, ?, ?)",
                    (expense_id, session['user_id'], amount)
                )
            else:
                # Auto-generate equal splits for all trip members
                cursor.execute("SELECT user_id FROM TripMembers WHERE trip_id = ? AND user_id IS NOT NULL", (trip_id,))
                members = cursor.fetchall()
                if members:
                    per_person = amount / len(members)
                    for m in members:
                        cursor.execute(
                            "INSERT INTO ExpenseSplits (expense_id, user_id, amount) VALUES (?, ?, ?)",
                            (expense_id, m['user_id'], per_person)
                        )

        conn.commit()
        logger.info(f"Expense added: {currency} {amount} for trip {trip_id} by user {session['user_id']}")
        log_activity(trip_id, session['user_id'], 'expense_added', f"{description} — {currency} {amount}")
        notify_trip_members(trip_id, 'expense_added', f"New expense: {description} ({amount} {currency})", exclude_user_id=session['user_id'])
        return jsonify({"success": True})
    except sqlite3.Error as e:
        logger.error(f"Add expense error: {e}")
        return jsonify({"error": "שגיאה בהוספת הוצאה."}), 500
    finally:
        conn.close()


@app.route('/api/expenses/<int:expense_id>', methods=['PUT'])
@login_required
def edit_expense(expense_id):
    data = request.json or {}
    
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        # Verify ownership
        cursor.execute("SELECT user_id FROM Expenses WHERE id = ?", (expense_id,))
        expense = cursor.fetchone()
        if not expense:
            return jsonify({"error": "Expense not found"}), 404
        if expense['user_id'] != session['user_id']:
            return jsonify({"error": "Only the creator of the expense can edit it."}), 403

        updates = []
        params = []
        
        if 'amount' in data or 'currency' in data:
            cursor.execute("SELECT amount, original_amount, currency, trip_id FROM Expenses WHERE id = ?", (expense_id,))
            old_exp = cursor.fetchone()
            
            new_amount = data.get('amount')
            if new_amount is not None:
                new_amount, err = validate_amount(new_amount)
                if err: return jsonify({"error": err}), 400
            else:
                new_amount = old_exp['original_amount'] if old_exp['original_amount'] else old_exp['amount']
                
            new_currency = data.get('currency', old_exp['currency']).strip().upper()
            if new_currency not in ALLOWED_CURRENCIES:
                new_currency = old_exp['currency']

            # Get Trip's base currency
            cursor.execute("SELECT budget_type FROM Trips WHERE id = ?", (old_exp['trip_id'],))
            trip_row = cursor.fetchone()
            trip_base_currency = 'ILS'
            if trip_row and trip_row['budget_type'] and trip_row['budget_type'] != 'none':
                try:
                    import json
                    trip_base_currency = json.loads(trip_row['budget_type']).get('currency', 'ILS')
                except:
                    pass
            
            original_amount = None
            final_amount = new_amount
            if new_currency != trip_base_currency:
                rate = get_exchange_rate(new_currency, trip_base_currency)
                if rate:
                    original_amount = new_amount
                    final_amount = round(original_amount * rate, 2)
                else:
                    original_amount = new_amount

            updates.append("amount = ?")
            params.append(final_amount)
            updates.append("original_amount = ?")
            params.append(original_amount)
            updates.append("currency = ?")
            params.append(new_currency)

        if 'description' in data:
            desc, err = validate_string(data['description'], 'תיאור', MAX_DESCRIPTION_LENGTH)
            if err:
                return jsonify({"error": err}), 400
            updates.append("description = ?")
            params.append(desc)
            
        if 'category' in data:
            cat = str(data['category']).strip()
            if len(cat) > 50: cat = cat[:50]
            updates.append("category = ?")
            params.append(cat)

        if updates:
            params.append(expense_id)
            cursor.execute(f"UPDATE Expenses SET {', '.join(updates)} WHERE id = ?", params)
            
        if 'splits' in data:
            splits = data['splits']
            if isinstance(splits, list):
                # Retrieve the raw amount expected for splits
                raw_amount = float(data.get('amount')) if 'amount' in data else (old_exp['original_amount'] if old_exp['original_amount'] else old_exp['amount'])
                
                # Validate sum
                split_total = sum(float(s.get('amount', 0)) for s in splits)
                if abs(split_total - raw_amount) > 0.01 and len(splits) > 0:
                    conn.rollback()
                    conn.close()
                    return jsonify({"error": "Split amounts must sum to the total expense amount."}), 400
                
                # Drop existing splits
                cursor.execute("DELETE FROM ExpenseSplits WHERE expense_id = ?", (expense_id,))
                
                valid_splits = [s for s in splits if float(s.get('amount', 0)) > 0]
                if valid_splits:
                    converted_splits = []
                    
                    current_final = final_amount if ('amount' in data or 'currency' in data) else old_exp['amount']
                    current_orig = original_amount if ('amount' in data or 'currency' in data) else old_exp['original_amount']
                    
                    if current_orig is not None and current_final != current_orig:
                        running_sum = 0
                        for i, s in enumerate(valid_splits):
                            s_uid = int(s['user_id'])
                            s_amt = float(s['amount'])
                            if i == len(valid_splits) - 1:
                                c_amt = round(current_final - running_sum, 2)
                            else:
                                c_amt = round(s_amt * (current_final / current_orig), 2)
                                running_sum += c_amt
                            converted_splits.append((s_uid, c_amt))
                    else:
                        for s in valid_splits:
                            converted_splits.append((int(s['user_id']), float(s['amount'])))
                            
                    # Insert new splits
                    for s_uid, s_amt in converted_splits:
                        cursor.execute(
                            "INSERT INTO ExpenseSplits (expense_id, user_id, amount) VALUES (?, ?, ?)",
                            (expense_id, s_uid, s_amt)
                        )
                        
        if updates or 'splits' in data:
            conn.commit()
            logger.info(f"Expense {expense_id} updated by user {session['user_id']}")
            # Log activity
            cursor.execute("SELECT trip_id, description FROM Expenses WHERE id = ?", (expense_id,))
            exp_row = cursor.fetchone()
            if exp_row:
                log_activity(exp_row['trip_id'], session['user_id'], 'expense_edited', exp_row['description'])
                notify_trip_members(exp_row['trip_id'], 'expense_edited', f"Expense updated: {exp_row['description']}", exclude_user_id=session['user_id'])
            
        return jsonify({"success": True})
    except sqlite3.Error as e:
        logger.error(f"Edit expense error: {e}")
        return jsonify({"error": "Server error"}), 500
    finally:
        conn.close()


@app.route('/api/expenses/<int:expense_id>', methods=['DELETE'])
@login_required
def delete_expense(expense_id):
    """Delete an expense. Only the trip owner or the user who created it can delete."""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        # Get the expense and verify ownership
        cursor.execute("""
            SELECT e.id, e.trip_id, e.user_id, e.amount, e.description, t.owner_id
            FROM Expenses e
            JOIN Trips t ON e.trip_id = t.id
            WHERE e.id = ?
        """, (expense_id,))
        expense = cursor.fetchone()

        if not expense:
            return jsonify({"error": "הוצאה לא נמצאה."}), 404

        # Check allow_member_delete setting
        cursor.execute("SELECT COALESCE(allow_member_delete, 1) as allow_member_delete FROM Trips WHERE id = ?", (expense['trip_id'],))
        trip_settings = cursor.fetchone()

        # Check if user is admin
        cursor.execute("SELECT COALESCE(is_admin, 0) as is_admin FROM TripMembers WHERE trip_id = ? AND user_id = ?",
                       (expense['trip_id'], session['user_id']))
        member_row = cursor.fetchone()
        is_admin = bool(member_row['is_admin']) if member_row else False

        # If allow_member_delete is disabled and user is not admin, block deletion
        if trip_settings and not trip_settings['allow_member_delete'] and not is_admin:
            return jsonify({"error": "רק מנהל יכול למחוק הוצאות."}), 403

        # Allow deletion by expense creator, trip owner, or admin
        if expense['user_id'] != session['user_id'] and expense['owner_id'] != session['user_id'] and not is_admin:
            return jsonify({"error": "אין הרשאה למחוק הוצאה זו."}), 403

        # Delete related splits first
        cursor.execute("DELETE FROM ExpenseSplits WHERE expense_id = ?", (expense_id,))
        cursor.execute("DELETE FROM Expenses WHERE id = ?", (expense_id,))
        conn.commit()
        logger.info(f"Expense deleted: id={expense_id} (₪{expense['amount']}, '{expense['description']}') by user {session['user_id']}")
        log_activity(expense['trip_id'], session['user_id'], 'expense_deleted', expense['description'])
        notify_trip_members(expense['trip_id'], 'expense_deleted', f"Expense deleted: {expense['description']}", exclude_user_id=session['user_id'])
        return jsonify({"success": True})
    except sqlite3.Error as e:
        logger.error(f"Delete expense error: {e}")
        return jsonify({"error": "שגיאה במחיקת הוצאה."}), 500
    finally:
        conn.close()


# =====================
#   BALANCE API
# =====================

@app.route('/api/balances/<int:trip_id>', methods=['GET'])
@login_required
@require_trip_access
def get_balances(trip_id):
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT u.id, u.name FROM Users u
        JOIN TripMembers tm ON u.id = tm.user_id
        WHERE tm.trip_id = ?
    """, (trip_id,))
    users = cursor.fetchall()

    # How much each user PAID (as the payer)
    cursor.execute(
        "SELECT user_id, SUM(amount) as total FROM Expenses WHERE trip_id = ? GROUP BY user_id",
        (trip_id,)
    )
    paid_data = {row['user_id']: row['total'] for row in cursor.fetchall()}

    # How much each user OWES (from ExpenseSplits)
    cursor.execute("""
        SELECT es.user_id, SUM(es.amount) as total_owed
        FROM ExpenseSplits es
        JOIN Expenses e ON es.expense_id = e.id
        WHERE e.trip_id = ?
        GROUP BY es.user_id
    """, (trip_id,))
    owed_data = {row['user_id']: row['total_owed'] for row in cursor.fetchall()}

    # Settlements: amounts already settled
    cursor.execute("""
        SELECT payer_id, SUM(amount) as total FROM Settlements
        WHERE trip_id = ? GROUP BY payer_id
    """, (trip_id,))
    settled_out = {row['payer_id']: row['total'] for row in cursor.fetchall()}

    cursor.execute("""
        SELECT payee_id, SUM(amount) as total FROM Settlements
        WHERE trip_id = ? GROUP BY payee_id
    """, (trip_id,))
    settled_in = {row['payee_id']: row['total'] for row in cursor.fetchall()}

    conn.close()

    total_expenses = sum(paid_data.values()) if paid_data else 0
    num_users = len(users)

    # If no splits exist (legacy data), fall back to equal division
    has_splits = bool(owed_data)

    balances = []
    for user in users:
        uid = user['id']
        paid = paid_data.get(uid, 0.0)

        if has_splits:
            owed = owed_data.get(uid, 0.0)
        else:
            # Legacy fallback: equal split
            owed = total_expenses / num_users if num_users > 0 else 0

        # Factor in settlements
        s_out = settled_out.get(uid, 0.0)  # User paid off debts
        s_in = settled_in.get(uid, 0.0)    # User received payments

        balance = (paid + s_out) - (owed + s_in)

        balances.append({
            'user_id': uid,
            'name': user['name'],
            'paid': paid,
            'balance': balance
        })

    return jsonify({
        'total': total_expenses,
        'average': total_expenses / num_users if num_users > 0 else 0,
        'balances': balances
    })

@app.route('/api/feedback', methods=['POST'])
@login_required
def submit_feedback():
    data = request.json or {}
    content = data.get('content', '')
    if not content:
        return jsonify({'error': 'Feedback content is required'}), 400
    
    user_id = session.get('user_id')
    user_email = "Unknown"
    user_name = "Unknown"
    
    try:
        conn = get_db_connection()
        user = conn.execute("SELECT email, name FROM Users WHERE id = ?", (user_id,)).fetchone()
        if user:
            user_email = user['email'] or 'No Email'
            user_name = user['name'] or 'Unknown'
        conn.close()
    except Exception as e:
        logger.error(f"DB Error getting user for feedback: {e}")

    smtp_server = os.environ.get('SMTP_SERVER')
    smtp_port = os.environ.get('SMTP_PORT', 587)
    smtp_username = os.environ.get('SMTP_USERNAME')
    smtp_password = os.environ.get('SMTP_PASSWORD')

    if smtp_server and smtp_username and smtp_password:
        try:
            import smtplib
            from email.mime.text import MIMEText
            msg = MIMEText(f"Feedback from {user_name} (ID: {user_id}, Email: {user_email}):\n\n{content}")
            msg['Subject'] = f"MasterSplitter Feedback from {user_name}"
            msg['From'] = f"MasterSplitter <{smtp_username}>"
            msg['To'] = "support@mastersplitter.com"

            server = smtplib.SMTP(smtp_server, int(smtp_port))
            server.starttls()
            server.login(smtp_username, smtp_password)
            server.send_message(msg)
            server.quit()
            logger.info(f"Feedback email sent for user {user_id}")
        except Exception as e:
            logger.error(f"Failed to send feedback email: {e}")
            return jsonify({'error': 'Failed to send feedback email'}), 500
    else:
        logger.warning(f"SMTP not configured. Feedback from user {user_id}: {content}")
    
    return jsonify({'success': True})

@app.route('/api/trips/<int:trip_id>/optimized-balances', methods=['GET'])
@login_required
@require_trip_access
def get_optimized_balances(trip_id):
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT u.id, u.name FROM Users u
        JOIN TripMembers tm ON u.id = tm.user_id
        WHERE tm.trip_id = ?
    """, (trip_id,))
    users = cursor.fetchall()

    # --- Converted Balances (Existing Logic) ---
    cursor.execute("SELECT user_id, SUM(amount) as total FROM Expenses WHERE trip_id = ? GROUP BY user_id", (trip_id,))
    paid_data = {row['user_id']: row['total'] for row in cursor.fetchall()}

    cursor.execute("""
        SELECT es.user_id, SUM(es.amount) as total_owed
        FROM ExpenseSplits es
        JOIN Expenses e ON es.expense_id = e.id
        WHERE e.trip_id = ?
        GROUP BY es.user_id
    """, (trip_id,))
    owed_data = {row['user_id']: row['total_owed'] for row in cursor.fetchall()}

    cursor.execute("SELECT payer_id, SUM(amount) as total FROM Settlements WHERE trip_id = ? GROUP BY payer_id", (trip_id,))
    settled_out = {row['payer_id']: row['total'] for row in cursor.fetchall()}

    cursor.execute("SELECT payee_id, SUM(amount) as total FROM Settlements WHERE trip_id = ? GROUP BY payee_id", (trip_id,))
    settled_in = {row['payee_id']: row['total'] for row in cursor.fetchall()}

    total_expenses = sum(paid_data.values()) if paid_data else 0
    num_users = len(users)
    has_splits = bool(owed_data)

    def calculate_greedy_settlements(debts, credits):
        debts.sort(key=lambda x: x['amount'], reverse=True)
        credits.sort(key=lambda x: x['amount'], reverse=True)
        settlements = []
        di, ci = 0, 0
        while di < len(debts) and ci < len(credits):
            transfer = min(debts[di]['amount'], credits[ci]['amount'])
            if transfer > 0.01:
                settlements.append({
                    "from_id": debts[di]['user_id'],
                    "from": debts[di]['name'],
                    "to_id": credits[ci]['user_id'],
                    "to": credits[ci]['name'],
                    "amount": transfer
                })
            debts[di]['amount'] -= transfer
            credits[ci]['amount'] -= transfer
            if debts[di]['amount'] < 0.01: di += 1
            if credits[ci]['amount'] < 0.01: ci += 1
        return settlements

    conv_debts = []
    conv_credits = []
    for user in users:
        uid = user['id']
        paid = paid_data.get(uid, 0.0)
        owed = owed_data.get(uid, 0.0) if has_splits else (total_expenses / num_users if num_users > 0 else 0)
        s_out = settled_out.get(uid, 0.0)
        s_in = settled_in.get(uid, 0.0)
        balance = (paid + s_out) - (owed + s_in)
        if balance < -0.01:
            conv_debts.append({"user_id": uid, "name": user['name'], "amount": -balance})
        elif balance > 0.01:
            conv_credits.append({"user_id": uid, "name": user['name'], "amount": balance})
    
    converted_settlements = calculate_greedy_settlements(conv_debts, conv_credits)

    # --- By-Currency Balances ---
    # How much each user PAID in each original currency
    cursor.execute("""
        SELECT user_id, COALESCE(currency, 'ILS') as currency,
               SUM(COALESCE(original_amount, amount)) as total
        FROM Expenses WHERE trip_id = ?
        GROUP BY user_id, COALESCE(currency, 'ILS')
    """, (trip_id,))
    cur_paid_data = {}
    for row in cursor.fetchall():
        cur_paid_data[(row['user_id'], row['currency'])] = row['total']

    # How much each user OWES in each original currency.
    # For each expense, distribute original_amount proportionally across splits based on split fraction.
    # fraction = es.amount / e.amount (ILS fraction), then owed_original = fraction * original_amount
    cursor.execute("""
        SELECT es.user_id,
               COALESCE(e.currency, 'ILS') as currency,
               SUM(
                   CASE
                     WHEN e.original_amount IS NOT NULL AND e.amount > 0
                       THEN CAST(es.amount AS REAL) / CAST(e.amount AS REAL) * e.original_amount
                     ELSE es.amount
                   END
               ) as total_owed
        FROM ExpenseSplits es
        JOIN Expenses e ON es.expense_id = e.id
        WHERE e.trip_id = ?
        GROUP BY es.user_id, COALESCE(e.currency, 'ILS')
    """, (trip_id,))
    cur_owed_data = {}
    for row in cursor.fetchall():
        cur_owed_data[(row['user_id'], row['currency'])] = row['total_owed'] or 0

    # How much each user PAID OUT in settlements (per original currency)
    cursor.execute("""
        SELECT payer_id, COALESCE(currency, 'ILS') as currency,
               SUM(COALESCE(original_amount, amount)) as total
        FROM Settlements WHERE trip_id = ?
        GROUP BY payer_id, COALESCE(currency, 'ILS')
    """, (trip_id,))
    cur_settled_out = {}
    for row in cursor.fetchall():
        cur_settled_out[(row['payer_id'], row['currency'])] = row['total']

    # How much each user RECEIVED in settlements (per original currency)
    cursor.execute("""
        SELECT payee_id, COALESCE(currency, 'ILS') as currency,
               SUM(COALESCE(original_amount, amount)) as total
        FROM Settlements WHERE trip_id = ?
        GROUP BY payee_id, COALESCE(currency, 'ILS')
    """, (trip_id,))
    cur_settled_in = {}
    for row in cursor.fetchall():
        cur_settled_in[(row['payee_id'], row['currency'])] = row['total']

    # Gather all unique currencies involved
    all_keys = set(cur_paid_data.keys()).union(cur_owed_data.keys()).union(cur_settled_out.keys()).union(cur_settled_in.keys())
    all_currencies = set(k[1] for k in all_keys)

    user_currency_balances = {}
    for user in users:
        uid = user['id']
        user_currency_balances[uid] = {}

    currency_settlements = {}
    for cur in all_currencies:
        c_debts = []
        c_credits = []
        for user in users:
            uid = user['id']
            paid = cur_paid_data.get((uid, cur), 0.0)
            owed = cur_owed_data.get((uid, cur), 0.0)
            s_out = cur_settled_out.get((uid, cur), 0.0)
            s_in = cur_settled_in.get((uid, cur), 0.0)

            # balance > 0: user is owed money; balance < 0: user owes money
            balance = (paid - owed) + (s_out - s_in)
            if abs(balance) > 0.01:
                user_currency_balances[uid][cur] = round(balance, 2)

            if balance < -0.01:
                c_debts.append({"user_id": uid, "name": user['name'], "amount": -balance})
            elif balance > 0.01:
                c_credits.append({"user_id": uid, "name": user['name'], "amount": balance})
        
        c_settlements = calculate_greedy_settlements(c_debts, c_credits)
        if c_settlements:
            currency_settlements[cur] = c_settlements

    conn.close()

    return jsonify({
        "optimized_settlements": converted_settlements,
        "currency_settlements": currency_settlements,
        "user_currency_balances": user_currency_balances
    })



# =====================
#   AI EXPENSE PARSING (Gemini)
# =====================

GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent"

@app.route('/api/ai/parse-expense', methods=['POST'])
@login_required
def ai_parse_expense():
    """Use Gemini to parse a natural language expense description into structured data."""
    api_key = os.environ.get('GEMINI_API_KEY')
    if not api_key or "YOUR_GEMINI_API_KEY_HERE" in api_key:
        logger.info("AI expense parse: API Key missing or default.")
        return jsonify({"success": False, "error": "מפתח ה-API של ג'ימיני חסר או אינו תקין. אנא עדכן את הקובץ .env עם מפתח חוקי מ-Google AI Studio."}), 400

    data = request.json or {}
    text = str(data.get('text', '')).strip()
    members = data.get('trip_members', [])

    if not text:
        return jsonify({"error": "Missing text input."}), 400
    if len(text) > 500:
        return jsonify({"error": "Input too long (max 500 chars)."}), 400

    members_str = ', '.join(str(m) for m in members) if members else 'unknown'

    system_instruction = (
        "You are a smart expense parser. The user will give you a sentence about an expense, "
        "and a list of valid trip members. You must extract the details and return ONLY a valid JSON object "
        "(no markdown, no backticks, no explanation).\n\n"
        "JSON format:\n"
        "{\n"
        '  "description": "Short title (e.g. Pizza)",\n'
        '  "amount": Total amount (number),\n'
        '  "category": "One of: אוכל, תחבורה, לינה, אטרקציות, קניות, כללי",\n'
        '  "splits": [ { "name": "exact name from members list", "amount_owed": number } ]\n'
        "}\n\n"
        "If the user implies splitting equally among everyone or doesn't specify amounts, "
        "leave the 'splits' array empty."
    )

    user_prompt = f"Trip members: [{members_str}]\n\nExpense description: {text}"

    payload = {
        "system_instruction": {
            "parts": [{"text": system_instruction}]
        },
        "contents": [
            {"role": "user", "parts": [{"text": user_prompt}]}
        ],
        "generationConfig": {
            "temperature": 0.1,
            "maxOutputTokens": 512
        }
    }

    try:
        import time
        for attempt in range(3):
            resp = http_requests.post(
                f"{GEMINI_API_URL}?key={api_key}",
                json=payload,
                headers={"Content-Type": "application/json"},
                timeout=15
            )
            if resp.status_code == 429 and attempt < 2:
                time.sleep(2 ** attempt)
                continue
            break

        if resp.status_code != 200:
            logger.error(f"Gemini API error {resp.status_code}: {resp.text[:300]}")
            return jsonify({"success": False, "error": f"שגיאה משרתי Google: {resp.status_code}. ייתכן שמפתח ה-API שגוי."}), 502

        result = resp.json()
        # Extract text from Gemini response
        candidates = result.get('candidates', [])
        if not candidates:
            return jsonify({"error": "AI returned no response."}), 502

        ai_text = candidates[0].get('content', {}).get('parts', [{}])[0].get('text', '')

        # Clean markdown wrappers if present
        ai_text = ai_text.strip()
        if ai_text.startswith('```'):
            ai_text = ai_text.split('\n', 1)[-1] if '\n' in ai_text else ai_text[3:]
        if ai_text.endswith('```'):
            ai_text = ai_text[:-3]
        ai_text = ai_text.strip()

        # Parse the JSON
        parsed = json.loads(ai_text)
        logger.info(f"AI parsed expense: {parsed.get('description')} — {parsed.get('amount')}")
        return jsonify({"success": True, "parsed": parsed})

    except json.JSONDecodeError:
        logger.warning(f"AI returned invalid JSON: {ai_text[:200]}")
        return jsonify({"error": "AI returned an unparseable response. Try rephrasing."}), 422
    except http_requests.exceptions.Timeout:
        return jsonify({"error": "AI service timed out. Try again."}), 504
    except http_requests.exceptions.ConnectionError as e:
        logger.error(f"AI connection error: {e}")
        return jsonify({"error": f"Cannot reach AI service: {str(e)}"}), 502
    except Exception as e:
        logger.error(f"AI parse expense error: {e}")
        return jsonify({"success": False, "error": f"שגיאה פנימית בעת פנייה ל-AI: {str(e)}"}), 500


@app.route('/api/ai_greeting', methods=['GET'])
def ai_greeting():
    """Return a localized welcome message using Gemini."""
    lang = request.args.get('lang', 'he')
    api_key = os.environ.get('GEMINI_API_KEY')
    if not api_key:
        return jsonify({"greeting": ""})
        
    system_instruction = (
        "You are the Smart Financial Assistant for MasterSplitter. "
        "Generate a short, friendly, personalized 1-sentence financial greeting or tip. "
        "Do not include the user's name unless they provide it. "
        f"The user selected language code: {lang}. Write the greeting in that language. "
        "No emojis, no markdown."
    )
    
    payload = {
        "system_instruction": {"parts": [{"text": system_instruction}]},
        "contents": [{"role": "user", "parts": [{"text": "Hello"}]}],
        "generationConfig": {"temperature": 0.7, "maxOutputTokens": 60}
    }
    
    try:
        import time
        for attempt in range(3):
            resp = http_requests.post(
                f"{GEMINI_API_URL}?key={api_key}",
                json=payload,
                headers={"Content-Type": "application/json"},
                timeout=10
            )
            if resp.status_code == 429 and attempt < 2:
                time.sleep(2 ** attempt)
                continue
            break
            
        if resp.status_code == 200:
            result = resp.json()
            candidates = result.get('candidates', [])
            if candidates:
                text = candidates[0].get('content', {}).get('parts', [{}])[0].get('text', '').strip()
                return jsonify({"greeting": text})
    except Exception as e:
        logger.error(f"AI greeting error: {e}")
        
    # Fallback based on language
    fallbacks = {
        'he': 'ברוך שובך ל-MasterSplitter!',
        'en': 'Welcome back to MasterSplitter!',
        'es': '¡Bienvenido de nuevo a MasterSplitter!',
        'ru': 'С возвращением в MasterSplitter!',
        'ar': 'مرحبًا بك مرة أخرى في MasterSplitter!',
        'fr': 'De retour à MasterSplitter!',
        'zh': '欢迎回到 MasterSplitter！'
    }
    return jsonify({"greeting": fallbacks.get(lang, fallbacks['en'])})

@app.route('/api/ai_tip', methods=['GET'])
def ai_tip():
    """Return a localized financial tip using Gemini."""
    lang = request.args.get('lang', 'he')
    api_key = os.environ.get('GEMINI_API_KEY')
    if not api_key:
        return jsonify({"tip": ""})
        
    system_instruction = (
        "You are the Smart Financial Assistant for MasterSplitter. "
        "Generate a short, practical, context-aware tip about sharing expenses, budgeting, or saving money. "
        f"The user selected language code: {lang}. Write the tip in that language. "
        "No emojis, no markdown."
    )
    
    payload = {
        "system_instruction": {"parts": [{"text": system_instruction}]},
        "contents": [{"role": "user", "parts": [{"text": "Give me a financial tip."}]}],
        "generationConfig": {"temperature": 0.8, "maxOutputTokens": 100}
    }
    
    try:
        import time
        for attempt in range(3):
            resp = http_requests.post(
                f"{GEMINI_API_URL}?key={api_key}",
                json=payload,
                headers={"Content-Type": "application/json"},
                timeout=10
            )
            if resp.status_code == 429 and attempt < 2:
                time.sleep(2 ** attempt)
                continue
            break
            
        if resp.status_code == 200:
            result = resp.json()
            candidates = result.get('candidates', [])
            if candidates:
                text = candidates[0].get('content', {}).get('parts', [{}])[0].get('text', '').strip()
                return jsonify({"tip": text})
    except Exception as e:
        logger.error(f"AI tip error: {e}")
        
    # Fallback based on language
    fallbacks = {
        'he': 'טיפ פיננסי: עקוב אחרי ההוצאות הקטנות, הן מצטברות להרבה כסף.',
        'en': 'Financial Tip: Track small expenses, they add up to a lot of money.',
        'es': 'Consejo Financiero: Haz un seguimiento de los gastos pequeños, suman mucho dinero.',
        'ru': 'Финансовый совет: Следите за мелкими расходами, они складываются в большие суммы.',
        'ar': 'نصيحة مالية: تتبع النفقات الصغيرة ، فهي تتراكم للكثير من المال.',
        'fr': 'Conseil financier : Suivez les petites dépenses, elles s\'accumulent rapidement.',
        'zh': '财务提示：记录小额支出，积少成多。'
    }
    return jsonify({"tip": fallbacks.get(lang, fallbacks['en'])})

# =====================
#   RECEIPT SCANNING
# =====================

@app.route('/api/expenses/scan-receipt', methods=['POST'])
@login_required
def scan_receipt():
    """Accept a receipt image, extract line items via Gemini Vision or return mock data."""
    if 'image' not in request.files:
        return jsonify({"error": "No image file provided."}), 400

    file = request.files['image']
    if not file.filename:
        return jsonify({"error": "Empty file."}), 400

    # Validate file size (5MB max)
    file.seek(0, 2)
    size = file.tell()
    file.seek(0)
    if size > 5 * 1024 * 1024:
        return jsonify({"error": "File too large. Max 5MB."}), 400

    # Validate file type
    allowed_ext = {'jpg', 'jpeg', 'png', 'webp'}
    ext = file.filename.rsplit('.', 1)[-1].lower() if '.' in file.filename else ''
    if ext not in allowed_ext:
        return jsonify({"error": "Invalid file type. Use JPG, PNG, or WebP."}), 400

    api_key = os.environ.get('GEMINI_API_KEY')

    if api_key:
        try:
            import google.generativeai as genai
            genai.configure(api_key=api_key)
            model = genai.GenerativeModel('gemini-2.5-flash-preview-09-2025')

            import base64
            import time
            from google.api_core.exceptions import ResourceExhausted

            image_data = file.read()
            b64 = base64.b64encode(image_data).decode('utf-8')
            mime = f"image/{ext}" if ext != 'jpg' else 'image/jpeg'

            response = None
            for attempt in range(3):
                try:
                    response = model.generate_content([
                        "Extract all line items from this receipt. Return ONLY a valid JSON array of objects, each with 'name' (string), 'price' (float number, total price for the row), and 'quantity' (integer). Example: [{\"name\": \"Hamburger\", \"price\": 50.0, \"quantity\": 1}]. No markdown, no explanation, just the JSON array.",
                        {"mime_type": mime, "data": b64}
                    ])
                    break
                except ResourceExhausted:
                    if attempt < 2:
                        time.sleep(2 ** attempt)
                        continue
                    raise
                except Exception as e:
                    if "429" in str(e) and attempt < 2:
                        time.sleep(2 ** attempt)
                        continue
                    raise

            import re
            text = response.text.strip()
            # Extract JSON array from response
            match = re.search(r'\[.*\]', text, re.DOTALL)
            if match:
                items = json.loads(match.group())
                logger.info(f"Receipt scanned via Gemini: {len(items)} items extracted")
                return jsonify({"success": True, "items": items, "source": "gemini"})
            else:
                logger.warning(f"Gemini returned non-JSON: {text[:200]}")
                return jsonify({"error": "Could not parse receipt. Try again."}), 422
        except Exception as e:
            logger.error(f"Gemini Vision error: {e}")
            # Fall through to mock
            pass

    # Mock fallback — realistic receipt items
    mock_items = [
        {"name": "Cappuccino", "price": 18.0, "quantity": 1},
        {"name": "Caesar Salad", "price": 52.0, "quantity": 1},
        {"name": "Grilled Salmon", "price": 89.0, "quantity": 1},
        {"name": "Sparkling Water", "price": 12.0, "quantity": 2},
        {"name": "Tiramisu", "price": 38.0, "quantity": 1}
    ]
    logger.info("Receipt scan: using mock fallback (no GEMINI_API_KEY)")
    return jsonify({"success": True, "items": mock_items, "source": "mock"})


# =====================
#   SETTLEMENT APIS
# =====================

@app.route('/api/settlements', methods=['POST'])
@login_required
def create_settlement():
    """Record a debt settlement between two users."""
    data = request.json or {}
    trip_id = data.get('trip_id')
    payer_id = data.get('payer_id')
    payee_id = data.get('payee_id')
    amount_raw = data.get('amount')
    currency = data.get('currency', 'ILS')

    if not trip_id or not payer_id or not payee_id or not amount_raw:
        return jsonify({"error": "Missing required fields."}), 400

    amount, err = validate_amount(amount_raw)
    if err:
        return jsonify({"error": err}), 400

    original_amount = amount
    converted_amount = amount
    if currency != 'ILS':
        rate = get_exchange_rate(currency)
        converted_amount = amount * rate

    try:
        payer_id = int(payer_id)
        payee_id = int(payee_id)
    except (ValueError, TypeError):
        return jsonify({"error": "Invalid user ID format."}), 400

    if session['user_id'] not in (payer_id, payee_id):
        return jsonify({"error": "Forbidden"}), 403

    if payer_id == payee_id:
        return jsonify({"error": "Cannot settle with yourself."}), 400

    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        # Verify caller has trip access
        cursor.execute("""
            SELECT 1 FROM TripMembers WHERE trip_id = ? AND user_id = ?
            UNION
            SELECT 1 FROM Trips WHERE id = ? AND owner_id = ?
        """, (trip_id, session['user_id'], trip_id, session['user_id']))
        if not cursor.fetchone():
            return jsonify({"error": "Forbidden"}), 403

        cursor.execute("""
            INSERT INTO Settlements (trip_id, payer_id, payee_id, amount, original_amount, currency, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (trip_id, payer_id, payee_id, converted_amount, original_amount, currency, datetime.now(timezone.utc).isoformat()))
        conn.commit()

        # Get payee name for activity log
        cursor.execute("SELECT name FROM Users WHERE id = ?", (payee_id,))
        payee = cursor.fetchone()
        payee_name = payee['name'] if payee else f"User {payee_id}"

        logger.info(f"Settlement: user {payer_id} settled {amount} with user {payee_id} in trip {trip_id}")
        log_activity(trip_id, payer_id, 'settlement', f"₪{amount:.0f} -> {payee_name}")
        notify_trip_members(trip_id, 'settlement', f"Settlement: ₪{amount:.0f} paid to {payee_name}", exclude_user_id=session['user_id'])
        return jsonify({"success": True})
    except sqlite3.Error as e:
        logger.error(f"Settlement error: {e}")
        return jsonify({"error": "Server error."}), 500
    finally:
        conn.close()


@app.route('/api/settlements/<int:trip_id>', methods=['GET'])
@login_required
@require_trip_access
def get_settlements(trip_id):
    """Get all settlements for a trip."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT s.id, s.payer_id, p.name as payer_name, s.payee_id, r.name as payee_name,
               s.amount, s.currency, s.created_at
        FROM Settlements s
        JOIN Users p ON s.payer_id = p.id
        JOIN Users r ON s.payee_id = r.id
        WHERE s.trip_id = ?
        ORDER BY s.id DESC
    """, (trip_id,))
    settlements = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return jsonify(settlements)


# =====================
#   ACTIVITY FEED API
# =====================

@app.route('/api/activity/<int:trip_id>', methods=['GET'])
@login_required
@require_trip_access
def get_activity(trip_id):
    """Get the activity feed for a trip (last 50 entries)."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT a.id, a.action, a.detail, a.created_at, u.name as user_name
        FROM ActivityLog a
        JOIN Users u ON a.user_id = u.id
        WHERE a.trip_id = ?
        ORDER BY a.id DESC
        LIMIT 50
    """, (trip_id,))
    entries = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return jsonify(entries)


# =====================
#   HEALTH CHECK
# =====================

@app.route('/api/currencies', methods=['GET'])
def get_currencies():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT code, symbol, name_en, name_he FROM Currencies ORDER BY code ASC")
    rows = cursor.fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])

@app.route('/api/force-update-currencies', methods=['GET'])
def force_update_currencies():
    try:
        from update_currencies import update_db
        update_db(DB_PATH)
        return jsonify({"status": "success", "message": "Currencies updated in " + DB_PATH})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint for monitoring."""
    try:
        conn = get_db_connection()
        conn.execute("SELECT 1")
        conn.close()
        return jsonify({"status": "ok", "database": "connected"})
    except sqlite3.Error as e:
        logger.error(f"Health check failed: {e}")
        return jsonify({"status": "error", "database": "disconnected"}), 503


# =====================
#   ERROR HANDLERS
# =====================

@app.errorhandler(404)
def not_found(e):
    return jsonify({"error": "Resource not found"}), 404

@app.errorhandler(500)
def server_error(e):
    logger.error(f"Internal server error: {e}")
    return jsonify({"error": "Internal server error"}), 500


# =====================
#   REQUEST LOGGING
# =====================

@app.before_request
def log_request():
    if request.path.startswith('/api/'):
        logger.debug(f"{request.method} {request.path} from user_id={session.get('user_id', 'anonymous')}")


# =====================
#   ADMIN DASHBOARD
# =====================

@app.route('/admin-panel', methods=['GET'])
def admin_panel():
    """Serve the Standalone Admin Dashboard."""
    admin_key = request.args.get('key')
    secret = os.environ.get('ADMIN_SECRET_KEY')
    if not secret or admin_key != secret:
        abort(403)
    return render_template('admin.html', admin_key=admin_key)

@app.route('/api/admin/logs', methods=['GET'])
def admin_logs():
    """Stream the latest log entries."""
    admin_key = request.headers.get('X-Admin-Key') or request.args.get('key')
    secret = os.environ.get('ADMIN_SECRET_KEY')
    if not secret or admin_key != secret:
        return jsonify({"error": "Unauthorized"}), 403
    
    log_file_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'master_splitter.log')
    try:
        if not os.path.exists(log_file_path):
            return jsonify({"logs": ["[SYSTEM] Log file not found. Awaiting first log entry..."]})
        with open(log_file_path, 'r', encoding='utf-8') as f:
            lines = [line.strip() for line in f.readlines() if line.strip()]
            # Return last 100 lines
            return jsonify({"logs": lines[-100:]})
    except Exception as e:
        logger.error(f"Admin log stream error: {e}")
        return jsonify({"error": "Failed to read logs"}), 500


if __name__ == '__main__':
    debug_mode = os.environ.get('FLASK_DEBUG', 'false').lower() == 'true'
    port = int(os.environ.get('PORT', 5000))
    logger.info(f"Starting MasterSplitter on port {port} (debug={debug_mode})")
    app.run(debug=debug_mode, port=port)