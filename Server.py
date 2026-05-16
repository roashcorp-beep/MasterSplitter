from flask import Flask, jsonify, request, render_template, session, redirect, url_for
from werkzeug.security import generate_password_hash, check_password_hash
import sqlite3
import json

app = Flask(__name__, static_folder='Static', static_url_path='/static', template_folder='Templates')
app.secret_key = 'master_splitter_super_secret_key'

def get_db_connection():
    conn = sqlite3.connect('master_splitter.db')
    conn.row_factory = sqlite3.Row
    return conn

def init_db_updates():
    conn = get_db_connection()
    cursor = conn.cursor()

    # --- Create core tables if they don't exist ---
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS Users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            password_hash TEXT,
            email TEXT UNIQUE
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
            category TEXT DEFAULT 'General'
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
        if 'owner_id' not in cols:
            cursor.execute("ALTER TABLE Trips ADD COLUMN owner_id INTEGER")
        if 'local_participants' not in cols:
            cursor.execute("ALTER TABLE Trips ADD COLUMN local_participants TEXT DEFAULT '[]'")
    except Exception as e:
        print(f"Trips migration: {e}")

    try:
        cursor.execute("PRAGMA table_info(Expenses)")
        cols = [c['name'] for c in cursor.fetchall()]
        if 'category' not in cols:
            cursor.execute("ALTER TABLE Expenses ADD COLUMN category TEXT DEFAULT 'General'")
    except Exception as e:
        print(f"Expenses migration: {e}")

    try:
        cursor.execute("PRAGMA table_info(Users)")
        cols = [c['name'] for c in cursor.fetchall()]
        if 'password_hash' not in cols:
            cursor.execute("ALTER TABLE Users ADD COLUMN password_hash TEXT")
        if 'email' not in cols:
            cursor.execute("ALTER TABLE Users ADD COLUMN email TEXT")
    except Exception as e:
        print(f"Users migration: {e}")

    conn.commit()
    conn.close()

init_db_updates()

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

@app.route('/api/me', methods=['GET'])
def get_me():
    if 'user_id' not in session:
        return jsonify({"error": "Unauthorized"}), 401
    return jsonify({"id": session['user_id'], "name": session['username']})

@app.route('/api/signup', methods=['POST'])
def signup():
    data = request.json
    username = data.get('username', '').strip()
    password = data.get('password', '')
    email = data.get('email', '').strip() or None

    if not username or not password:
        return jsonify({"error": "יש למלא שם משתמש וסיסמה."}), 400

    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT id FROM Users WHERE name = ?", (username,))
        if cursor.fetchone():
            return jsonify({"error": "שם המשתמש כבר קיים במערכת."}), 400

        pwd_hash = generate_password_hash(password)
        cursor.execute(
            "INSERT INTO Users (name, password_hash, email) VALUES (?, ?, ?)",
            (username, pwd_hash, email)
        )
        user_id = cursor.lastrowid
        conn.commit()
        session['user_id'] = user_id
        session['username'] = username
        return jsonify({"success": True})
    except sqlite3.IntegrityError:
        return jsonify({"error": "שם המשתמש או האימייל כבר קיימים."}), 400
    except Exception as e:
        print(f"Signup error: {e}")
        return jsonify({"error": "שגיאת שרת. נסה שוב."}), 500
    finally:
        conn.close()

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    username = data.get('username', '').strip()
    password = data.get('password', '')

    if not username or not password:
        return jsonify({"error": "יש למלא שם משתמש וסיסמה."}), 400

    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT id, name, password_hash FROM Users WHERE name = ?", (username,))
        user = cursor.fetchone()
        if user and user['password_hash'] and check_password_hash(user['password_hash'], password):
            session['user_id'] = user['id']
            session['username'] = user['name']
            return jsonify({"success": True})
        else:
            return jsonify({"error": "שם משתמש או סיסמה שגויים."}), 401
    finally:
        conn.close()

@app.route('/api/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({"success": True})

# =====================
#   TRIP APIS
# =====================

@app.route('/api/trips', methods=['GET'])
def get_trips():
    if 'user_id' not in session:
        return jsonify({"error": "Unauthorized"}), 401
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
        except:
            pass
        result.append({
            'id': t['id'],
            'name': t['destination'],
            'budget': t['budget'] or 0,
            'is_owner': t['owner_id'] == session['user_id'],
            'participants': participants
        })
    return jsonify(result)

@app.route('/api/trips', methods=['POST'])
def create_trip():
    if 'user_id' not in session:
        return jsonify({"error": "Unauthorized"}), 401
    data = request.json
    name = data.get('name', '').strip()
    budget = data.get('budget', 0)
    participants = data.get('participants', [])  # list of local name strings

    if not name:
        return jsonify({"error": "יש לתת שם לטיול."}), 400

    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        participants_json = json.dumps(participants, ensure_ascii=False)
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
        conn.commit()
        return jsonify({"success": True, "trip_id": trip_id})
    except Exception as e:
        print(f"Create trip error: {e}")
        return jsonify({"error": "שגיאה ביצירת הטיול."}), 500
    finally:
        conn.close()

@app.route('/api/trip_members/<int:trip_id>', methods=['GET'])
def get_trip_members(trip_id):
    if 'user_id' not in session:
        return jsonify({"error": "Unauthorized"}), 401
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
    # Local participants
    cursor.execute("SELECT local_participants FROM Trips WHERE id = ?", (trip_id,))
    row = cursor.fetchone()
    conn.close()
    local = []
    if row and row['local_participants']:
        try:
            names = json.loads(row['local_participants'])
            local = [{'id': f'local_{i}', 'name': n, 'type': 'local'} for i, n in enumerate(names)]
        except:
            pass
    return jsonify(registered + local)

# =====================
#   EXPENSE APIS
# =====================

@app.route('/api/expenses/<int:trip_id>', methods=['GET'])
def get_expenses(trip_id):
    if 'user_id' not in session:
        return jsonify({"error": "Unauthorized"}), 401
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT e.id, u.name as payer, e.amount, e.description, e.category
        FROM Expenses e
        JOIN Users u ON e.user_id = u.id
        WHERE e.trip_id = ?
        ORDER BY e.id DESC
    """, (trip_id,))
    expenses = cursor.fetchall()
    conn.close()
    return jsonify([dict(e) for e in expenses])

@app.route('/api/expenses', methods=['POST'])
def add_expense():
    if 'user_id' not in session:
        return jsonify({"error": "Unauthorized"}), 401
    data = request.json
    trip_id = data.get('trip_id')
    amount = data.get('amount')
    description = data.get('description', '').strip()
    category = data.get('category', 'General')

    if not trip_id or not amount or not description:
        return jsonify({"error": "נתונים חסרים."}), 400

    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            INSERT INTO Expenses (trip_id, user_id, amount, currency, description, category)
            VALUES (?, ?, ?, 'ILS', ?, ?)
        """, (trip_id, session['user_id'], amount, description, category))
        conn.commit()
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

# =====================
#   BALANCE API
# =====================

@app.route('/api/balances/<int:trip_id>', methods=['GET'])
def get_balances(trip_id):
    if 'user_id' not in session:
        return jsonify({"error": "Unauthorized"}), 401
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

if __name__ == '__main__':
    app.run(debug=True, port=5000)