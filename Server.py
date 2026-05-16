from flask import Flask, jsonify, request, render_template, session, redirect, url_for
from werkzeug.security import generate_password_hash, check_password_hash
import sqlite3

app = Flask(__name__, static_folder='Static', static_url_path='/static', template_folder='Templates')
app.secret_key = 'master_splitter_super_secret_key' # Added secret key for session

def get_db_connection():
    conn = sqlite3.connect('master_splitter.db')
    conn.row_factory = sqlite3.Row
    return conn

def init_db_updates():
    conn = get_db_connection()
    cursor = conn.cursor()
    # Ensure budget and category columns exist
    try:
        cursor.execute("PRAGMA table_info(Trips)")
        columns = [col['name'] for col in cursor.fetchall()]
        if 'budget' not in columns:
            cursor.execute("ALTER TABLE Trips ADD COLUMN budget REAL DEFAULT 0")
    except Exception as e:
        print(e)
        
    try:
        cursor.execute("PRAGMA table_info(Expenses)")
        columns = [col['name'] for col in cursor.fetchall()]
        if 'category' not in columns:
            cursor.execute("ALTER TABLE Expenses ADD COLUMN category TEXT DEFAULT 'General'")
    except Exception as e:
        print(e)
        
    try:
        cursor.execute("PRAGMA table_info(Users)")
        columns = [col['name'] for col in cursor.fetchall()]
        if 'password_hash' not in columns:
            cursor.execute("ALTER TABLE Users ADD COLUMN password_hash TEXT")
            default_hash = generate_password_hash('1234')
            cursor.execute("UPDATE Users SET password_hash = ? WHERE password_hash IS NULL", (default_hash,))
        if 'email' not in columns:
            cursor.execute("ALTER TABLE Users ADD COLUMN email TEXT UNIQUE")
    except Exception as e:
        print(e)
        
    try:
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS TripMembers (
                trip_id INTEGER,
                user_id INTEGER,
                PRIMARY KEY (trip_id, user_id),
                FOREIGN KEY(trip_id) REFERENCES Trips(id),
                FOREIGN KEY(user_id) REFERENCES Users(id)
            )
        """)
        # Populate TripMembers with existing users and trips to avoid empty states
        cursor.execute("SELECT id FROM Trips")
        trips = cursor.fetchall()
        cursor.execute("SELECT id FROM Users")
        users = cursor.fetchall()
        for t in trips:
            for u in users:
                cursor.execute("INSERT OR IGNORE INTO TripMembers (trip_id, user_id) VALUES (?, ?)", (t['id'], u['id']))
    except Exception as e:
        print(e)
        
    conn.commit()
    conn.close()

init_db_updates()

@app.route('/')
def serve_login():
    return render_template('login.html')

@app.route('/app')
def serve_app():
    if 'user_id' not in session:
        return redirect('/')
    return render_template('app.html')

@app.route('/api/me', methods=['GET'])
def get_me():
    if 'user_id' not in session:
        return jsonify({"error": "Unauthorized"}), 401
    return jsonify({"id": session['user_id'], "name": session['username']})

@app.route('/api/trips', methods=['GET'])
def get_trips():
    if 'user_id' not in session:
        return jsonify({"error": "Unauthorized"}), 401
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT t.* FROM Trips t
        JOIN TripMembers tm ON t.id = tm.trip_id
        WHERE tm.user_id = ?
    """, (session['user_id'],))
    trips = cursor.fetchall()
    conn.close()
    return jsonify([{'id': t['id'], 'name': t['destination'], 'budget': t.get('budget', 0)} for t in trips])

@app.route('/api/trip_members/<int:trip_id>', methods=['GET'])
def get_trip_members(trip_id):
    if 'user_id' not in session:
        return jsonify({"error": "Unauthorized"}), 401
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT u.id, u.name 
        FROM Users u
        JOIN TripMembers tm ON u.id = tm.user_id
        WHERE tm.trip_id = ?
    """, (trip_id,))
    members = cursor.fetchall()
    conn.close()
    return jsonify([{'id': m['id'], 'name': m['name']} for m in members])

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

@app.route('/api/balances/<int:trip_id>', methods=['GET'])
def get_balances(trip_id):
    if 'user_id' not in session:
        return jsonify({"error": "Unauthorized"}), 401
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Get trip members
    cursor.execute("""
        SELECT u.id, u.name FROM Users u
        JOIN TripMembers tm ON u.id = tm.user_id
        WHERE tm.trip_id = ?
    """, (trip_id,))
    users = cursor.fetchall()
    
    # Get total expenses for the trip
    cursor.execute("SELECT user_id, SUM(amount) as total FROM Expenses WHERE trip_id = ? GROUP BY user_id", (trip_id,))
    expenses_data = {row['user_id']: row['total'] for row in cursor.fetchall()}
    
    total_expenses = sum(expenses_data.values())
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
        
    conn.close()
    return jsonify({
        'total': total_expenses,
        'average': average_per_person,
        'balances': balances
    })

@app.route('/api/expenses', methods=['POST'])
def add_expense():
    if 'user_id' not in session:
        return jsonify({"error": "Unauthorized"}), 401
    data = request.json
    trip_id = data.get('trip_id')
    user_id = session['user_id']
    amount = data.get('amount')
    description = data.get('description')
    category = data.get('category', 'General')
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        INSERT INTO Expenses (trip_id, user_id, amount, currency, description, category) 
        VALUES (?, ?, ?, 'ILS', ?, ?)
    """, (trip_id, user_id, amount, description, category))
    
    conn.commit()
    conn.close()
    return jsonify({"success": True})

@app.route('/api/signup', methods=['POST'])
def signup():
    data = request.json
    username = data.get('username')
    password = data.get('password')
    email = data.get('email', '') # Optional for now, prep for Google Sign-in
    
    if not username or not password:
        return jsonify({"error": "Missing credentials"}), 400
        
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM Users WHERE name = ?", (username,))
    if cursor.fetchone():
        conn.close()
        return jsonify({"error": "User already exists"}), 400
        
    pwd_hash = generate_password_hash(password)
    cursor.execute("INSERT INTO Users (name, password_hash, email) VALUES (?, ?, ?)", (username, pwd_hash, email))
    user_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    session['user_id'] = user_id
    session['username'] = username
    return jsonify({"success": True})

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    username = data.get('username')
    password = data.get('password')
    
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, name, password_hash FROM Users WHERE name = ?", (username,))
    user = cursor.fetchone()
    conn.close()
    
    if user and user['password_hash'] and check_password_hash(user['password_hash'], password):
        session['user_id'] = user['id']
        session['username'] = user['name']
        return jsonify({"success": True})
    else:
        return jsonify({"error": "Invalid credentials"}), 401

@app.route('/api/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({"success": True})

if __name__ == '__main__':
    app.run(debug=True, port=5000)