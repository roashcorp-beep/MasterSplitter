import os
import logging
import sqlite3
import json
from datetime import datetime, timezone
from functools import wraps

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

from flask import Flask, jsonify, request, render_template, session, redirect, url_for, abort
from werkzeug.security import generate_password_hash, check_password_hash

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
app.secret_key = os.environ.get('SECRET_KEY', os.urandom(32))

# Warn if no explicit secret key is set
if not os.environ.get('SECRET_KEY'):
    logger.warning("No SECRET_KEY environment variable set — using random key. Sessions will reset on restart.")


# ---------------------
#   DATABASE
# ---------------------
def get_db_connection():
    """Get a new database connection with row_factory and foreign keys enabled."""
    conn = sqlite3.connect('master_splitter.db')
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db_updates():
    """Create tables if missing and run safe migrations for new columns."""
    conn = get_db_connection()
    cursor = conn.cursor()

    # --- Create core tables if they don't exist ---
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS Users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            password_hash TEXT,
            email TEXT UNIQUE,
            phone TEXT UNIQUE,
            is_verified INTEGER DEFAULT 0,
            verification_token TEXT
        )
    """)

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
    except sqlite3.Error as e:
        logger.error(f"Expenses migration error: {e}")

    try:
        cursor.execute("PRAGMA table_info(Users)")
        cols = [c['name'] for c in cursor.fetchall()]
        
        expected_cols = ['password_hash', 'email', 'phone', 'is_verified', 'verification_token']
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
                    verification_token TEXT
                )
            """)
            
            select_cols = []
            for col in ['id', 'name', 'password_hash', 'email', 'phone', 'is_verified', 'verification_token']:
                if col in cols:
                    select_cols.append(col)
                else:
                    if col == 'email': select_cols.append("'temp_' || id || '@migrate.com'")
                    elif col == 'phone': select_cols.append("'temp_' || id")
                    elif col == 'is_verified': select_cols.append("0")
                    else: select_cols.append("NULL")
            
            cursor.execute(f"INSERT INTO Users_new (id, name, password_hash, email, phone, is_verified, verification_token) SELECT {', '.join(select_cols)} FROM Users")
            cursor.execute("DROP TABLE Users")
            cursor.execute("ALTER TABLE Users_new RENAME TO Users")
            logger.info("Migration: Performed table swap for Users schema update.")
    except sqlite3.Error as e:
        logger.error(f"Users migration error: {e}")

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

    conn.commit()
    conn.close()
    logger.info("Database initialization complete.")


init_db_updates()


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
          <body>
            <h2>Welcome to MasterSplitter!</h2>
            <p>Please click the link below to verify your email address:</p>
            <p><a href="{verify_link}">{verify_link}</a></p>
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


# =====================
#   PAGE ROUTES
# =====================

@app.route('/')
def serve_login():
    return render_template('login.html')

@app.route('/app')
def serve_app():
    if 'user_id' not in session:
        return redirect('/')
    return render_template('app.html')


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
    return jsonify({"id": session['user_id'], "name": session['username']})


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
        return jsonify({"error": "יש למלא שם משתמש וסיסמה."}), 400

    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT id, name, password_hash, is_verified FROM Users WHERE name = ?", (username,))
        user = cursor.fetchone()
        if user and user['password_hash'] and check_password_hash(user['password_hash'], password):
            if user['is_verified'] == 0:
                return jsonify({"error": "Please verify your email address first."}), 403
                
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
#   TRIP APIS
# =====================

@app.route('/api/trips', methods=['GET'])
@login_required
def get_trips():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT DISTINCT t.id, t.destination, t.budget, t.owner_id, t.local_participants
        FROM Trips t
        LEFT JOIN TripMembers tm ON t.id = tm.trip_id
        WHERE t.owner_id = ? OR tm.user_id = ?
        ORDER BY t.id DESC
    """, (session['user_id'], session['user_id']))
    trips = cursor.fetchall()
    conn.close()
    result = []
    for t in trips:
        participants = []
        try:
            participants = json.loads(t['local_participants'] or '[]')
        except (json.JSONDecodeError, TypeError):
            logger.warning(f"Invalid local_participants JSON for trip {t['id']}")
        result.append({
            'id': t['id'],
            'name': t['destination'],
            'budget': t['budget'] or 0,
            'is_owner': t['owner_id'] == session['user_id'],
            'participants': participants
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

    invitees = data.get('participants', [])  # list of phones/emails
    if not isinstance(invitees, list):
        invitees = []
    invitees = [str(p).strip() for p in invitees if str(p).strip()]
    if len(invitees) > 50:
        return jsonify({"error": "Too many participants."}), 400

    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        # Check if all invited users exist
        valid_users = []
        for contact in invitees:
            cursor.execute("SELECT id FROM Users WHERE email = ? OR phone = ?", (contact, contact))
            user = cursor.fetchone()
            if not user:
                return jsonify({"error": f"User not found: {contact}. Invite them to register first."}), 400
            valid_users.append(contact)

        # Empty local_participants since we use real accounts now
        participants_json = json.dumps([], ensure_ascii=False)
        cursor.execute(
            "INSERT INTO Trips (destination, budget, owner_id, local_participants) VALUES (?, ?, ?, ?)",
            (name, budget, session['user_id'], participants_json)
        )
        trip_id = cursor.lastrowid
        # Auto-add the creator as a TripMember
        cursor.execute(
            "INSERT OR IGNORE INTO TripMembers (trip_id, user_id) VALUES (?, ?)",
            (trip_id, session['user_id'])
        )
        
        # Create invitations
        for contact in valid_users:
            cursor.execute(
                "INSERT INTO trip_invitations (trip_id, inviter_id, invitee_phone_or_email) VALUES (?, ?, ?)",
                (trip_id, session['user_id'], contact)
            )

        conn.commit()
        logger.info(f"Trip created: '{name}' (id={trip_id}) by user {session['user_id']}")
        return jsonify({"success": True, "trip_id": trip_id})
    except sqlite3.Error as e:
        logger.error(f"Create trip error: {e}")
        return jsonify({"error": "שגיאה ביצירת הטיול."}), 500
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

        if 'participants' in data:
            invitees = data['participants']
            if not isinstance(invitees, list):
                invitees = []
            invitees = [str(p).strip() for p in invitees if str(p).strip()]
            if len(invitees) > 50:
                conn.close()
                return jsonify({"error": "Too many participants."}), 400
                
            # Verify and invite users instead of updating local_participants
            for contact in invitees:
                cursor.execute("SELECT id FROM Users WHERE email = ? OR phone = ?", (contact, contact))
                user = cursor.fetchone()
                if not user:
                    conn.close()
                    return jsonify({"error": f"User not found: {contact}. Invite them to register first."}), 400
                
                # Check if already invited or member
                cursor.execute("SELECT 1 FROM trip_invitations WHERE trip_id = ? AND invitee_phone_or_email = ?", (trip_id, contact))
                if not cursor.fetchone():
                    cursor.execute(
                        "INSERT INTO trip_invitations (trip_id, inviter_id, invitee_phone_or_email) VALUES (?, ?, ?)",
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
    # Registered users
    cursor.execute("""
        SELECT u.id, u.name
        FROM Users u
        JOIN TripMembers tm ON u.id = tm.user_id
        WHERE tm.trip_id = ?
    """, (trip_id,))
    registered = [{'id': m['id'], 'name': m['name'], 'type': 'user'} for m in cursor.fetchall()]
    # Local participants (Legacy support)
    cursor.execute("SELECT local_participants FROM Trips WHERE id = ?", (trip_id,))
    row = cursor.fetchone()
    conn.close()
    local = []
    if row and row['local_participants']:
        try:
            names = json.loads(row['local_participants'])
            local = [{'id': f'local_{i}', 'name': n, 'type': 'local'} for i, n in enumerate(names)]
        except (json.JSONDecodeError, TypeError):
            logger.warning(f"Invalid local_participants JSON for trip {trip_id}")
    return jsonify(registered + local)


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


# =====================
#   EXPENSE APIS
# =====================

@app.route('/api/expenses/<int:trip_id>', methods=['GET'])
@login_required
@require_trip_access
def get_expenses(trip_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT e.id, u.name as payer, e.amount, e.description, e.category, e.created_at
        FROM Expenses e
        JOIN Users u ON e.user_id = u.id
        WHERE e.trip_id = ?
        ORDER BY e.id DESC
    """, (trip_id,))
    expenses = cursor.fetchall()
    conn.close()
    return jsonify([dict(e) for e in expenses])


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

    try:
        cursor.execute("""
            INSERT INTO Expenses (trip_id, user_id, amount, currency, description, category, created_at)
            VALUES (?, ?, ?, 'ILS', ?, ?, ?)
        """, (trip_id, session['user_id'], amount, description, category,
              datetime.now(timezone.utc).isoformat()))
        conn.commit()
        logger.info(f"Expense added: ₪{amount} for trip {trip_id} by user {session['user_id']}")
        return jsonify({"success": True})
    except sqlite3.Error as e:
        logger.error(f"Add expense error: {e}")
        return jsonify({"error": "שגיאה בהוספת הוצאה."}), 500
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

        # Allow deletion by expense creator or trip owner
        if expense['user_id'] != session['user_id'] and expense['owner_id'] != session['user_id']:
            return jsonify({"error": "אין הרשאה למחוק הוצאה זו."}), 403

        cursor.execute("DELETE FROM Expenses WHERE id = ?", (expense_id,))
        conn.commit()
        logger.info(f"Expense deleted: id={expense_id} (₪{expense['amount']}, '{expense['description']}') by user {session['user_id']}")
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

    cursor.execute(
        "SELECT user_id, SUM(amount) as total FROM Expenses WHERE trip_id = ? GROUP BY user_id",
        (trip_id,)
    )
    expenses_data = {row['user_id']: row['total'] for row in cursor.fetchall()}
    conn.close()

    total_expenses = sum(expenses_data.values()) if expenses_data else 0
    num_users = len(users)
    average_per_person = total_expenses / num_users if num_users > 0 else 0

    balances = []
    for user in users:
        paid = expenses_data.get(user['id'], 0.0)
        balance = paid - average_per_person
        balances.append({
            'user_id': user['id'],
            'name': user['name'],
            'paid': paid,
            'balance': balance
        })

    return jsonify({
        'total': total_expenses,
        'average': average_per_person,
        'balances': balances
    })


# =====================
#   HEALTH CHECK
# =====================

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