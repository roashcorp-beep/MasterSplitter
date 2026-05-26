"""
MasterSplitter — API Test Suite
Tests all endpoints: auth, trips, expenses, balances, health, authorization,
forgot password, profile, flexible login, currency.
Run with: python -m pytest tests/test_api.py -v
"""
import json
import os
import sys
import tempfile
import pytest

# Ensure the project root is importable
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


@pytest.fixture
def app():
    """Create a fresh app with a temporary database for each test."""
    # Use a temp file for the test database
    db_fd, db_path = tempfile.mkstemp(suffix='.db')

    # Patch the DB path before importing the app
    import Server
    original_get_db = Server.get_db_connection

    def test_get_db():
        import sqlite3
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON")
        return conn

    Server.get_db_connection = test_get_db
    Server.app.config['TESTING'] = True
    Server.app.config['SECRET_KEY'] = 'test-secret'

    # Initialize the test database with all columns including new ones
    conn = test_get_db()
    cursor = conn.cursor()
    cursor.execute("""CREATE TABLE IF NOT EXISTS Users (
        id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE NOT NULL,
        password_hash TEXT, email TEXT UNIQUE, phone TEXT UNIQUE,
        is_verified INTEGER DEFAULT 0, verification_token TEXT,
        reset_token TEXT, reset_token_expiry TEXT)""")
    cursor.execute("""CREATE TABLE IF NOT EXISTS Trips (
        id INTEGER PRIMARY KEY AUTOINCREMENT, destination TEXT NOT NULL,
        budget REAL DEFAULT 0, owner_id INTEGER, local_participants TEXT DEFAULT '[]')""")
    cursor.execute("""CREATE TABLE IF NOT EXISTS Expenses (
        id INTEGER PRIMARY KEY AUTOINCREMENT, trip_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL, amount REAL NOT NULL, currency TEXT DEFAULT 'ILS',
        description TEXT, category TEXT DEFAULT 'General',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(trip_id) REFERENCES Trips(id),
        FOREIGN KEY(user_id) REFERENCES Users(id))""")
    cursor.execute("""CREATE TABLE IF NOT EXISTS TripMembers (
        trip_id INTEGER NOT NULL, user_id INTEGER NOT NULL,
        PRIMARY KEY (trip_id, user_id),
        FOREIGN KEY(trip_id) REFERENCES Trips(id),
        FOREIGN KEY(user_id) REFERENCES Users(id))""")
    cursor.execute("""CREATE TABLE IF NOT EXISTS trip_invitations (
        id INTEGER PRIMARY KEY AUTOINCREMENT, trip_id INTEGER NOT NULL,
        inviter_id INTEGER NOT NULL, invitee_phone_or_email TEXT NOT NULL,
        status TEXT DEFAULT 'PENDING', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(trip_id) REFERENCES Trips(id), FOREIGN KEY(inviter_id) REFERENCES Users(id))""")
    conn.commit()
    conn.close()

    yield Server.app

    # Cleanup
    Server.get_db_connection = original_get_db
    os.close(db_fd)
    os.unlink(db_path)


@pytest.fixture
def client(app):
    """Test client."""
    return app.test_client()


# ---------------------
#  Helper functions
# ---------------------

def signup(client, username='testuser', password='test1234', phone=None, email=None):
    res = client.post('/api/signup',
                       json={'username': username, 'password': password, 'phone': phone or f'050-{username}', 'email': email or f'{username}@test.com'},
                       content_type='application/json')
                       
    if res.status_code == 200:
        # Auto-verify the user in testing to keep other tests working
        import Server
        conn = Server.get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT verification_token FROM Users WHERE name = ?", (username,))
        row = cursor.fetchone()
        conn.close()
        
        if row and row['verification_token']:
            client.get(f"/api/verify/{row['verification_token']}")
            
        # Log the user in since /api/signup no longer does it automatically
        login(client, username, password)
        
    return res


def login(client, username='testuser', password='test1234'):
    return client.post('/api/login',
                       json={'username': username, 'password': password},
                       content_type='application/json')


def create_trip(client, name='Test Trip', budget=1000, participants=None):
    return client.post('/api/trips',
                       json={'name': name, 'budget': budget,
                             'participants': participants or []},
                       content_type='application/json')


def add_expense(client, trip_id, amount=100, description='Test expense', category='כללי', currency='ILS'):
    return client.post('/api/expenses',
                       json={'trip_id': trip_id, 'amount': amount,
                             'description': description, 'category': category,
                             'currency': currency},
                       content_type='application/json')


# =====================
#   HEALTH CHECK
# =====================

class TestHealthCheck:
    def test_health_ok(self, client):
        res = client.get('/api/health')
        assert res.status_code == 200
        data = res.get_json()
        assert data['status'] == 'ok'
        assert data['database'] == 'connected'


# =====================
#   AUTH TESTS
# =====================

class TestAuth:
    def test_signup_success(self, client):
        res = signup(client)
        assert res.status_code == 200
        assert res.get_json()['success'] is True

    def test_signup_duplicate_username(self, client):
        signup(client, 'dup_user')
        res = signup(client, 'dup_user')
        assert res.status_code == 400

    def test_signup_missing_fields(self, client):
        res = client.post('/api/signup', json={'username': ''}, content_type='application/json')
        assert res.status_code == 400

    def test_signup_short_password(self, client):
        res = signup(client, 'newuser', 'ab', '050-new')
        assert res.status_code == 400

    def test_login_success(self, client):
        signup(client)
        client.post('/api/logout', content_type='application/json')
        res = login(client)
        assert res.status_code == 200
        assert res.get_json()['success'] is True

    def test_login_wrong_password(self, client):
        signup(client)
        client.post('/api/logout', content_type='application/json')
        res = login(client, password='wrongpass')
        assert res.status_code == 401

    def test_signup_smtp_failure(self, client):
        # Temporarily disable TESTING to force SMTP attempt which will fail because credentials are missing
        import Server
        import os
        original_testing = Server.app.config.get('TESTING')
        original_smtp = os.environ.get('SMTP_SERVER')
        Server.app.config['TESTING'] = False
        if 'SMTP_SERVER' in os.environ:
            del os.environ['SMTP_SERVER']
        try:
            res = client.post('/api/signup',
                   json={'username': 'smtp_fail', 'password': 'test1234', 'phone': '050-smtp', 'email': 'smtp@fail.com'},
                   content_type='application/json')
            assert res.status_code == 500
            data = res.get_json()
            assert "Email server configuration error" in data['error']
        finally:
            Server.app.config['TESTING'] = original_testing
            if original_smtp is not None:
                os.environ['SMTP_SERVER'] = original_smtp

    def test_login_unverified(self, client):
        # Directly signup without using helper which auto-verifies
        client.post('/api/signup',
                   json={'username': 'unv', 'password': 'test1234', 'phone': '050-unv', 'email': 'unv@test.com'},
                   content_type='application/json')
        res = login(client, 'unv', 'test1234')
        assert res.status_code == 403

    def test_login_missing_fields(self, client):
        res = client.post('/api/login', json={}, content_type='application/json')
        assert res.status_code == 400

    def test_me_authenticated(self, client):
        signup(client, 'meuser')
        res = client.get('/api/me')
        assert res.status_code == 200
        data = res.get_json()
        assert data['name'] == 'meuser'

    def test_me_unauthenticated(self, client):
        res = client.get('/api/me')
        assert res.status_code == 401

    def test_logout(self, client):
        signup(client)
        res = client.post('/api/logout', content_type='application/json')
        assert res.status_code == 200
        res2 = client.get('/api/me')
        assert res2.status_code == 401


# =====================
#   FLEXIBLE LOGIN TESTS
# =====================

class TestFlexibleLogin:
    def test_login_with_email(self, client):
        """Should be able to login using email address instead of username."""
        signup(client, 'emailuser', email='emailuser@test.com')
        client.post('/api/logout', content_type='application/json')
        # Login using email
        res = client.post('/api/login',
                          json={'username': 'emailuser@test.com', 'password': 'test1234'},
                          content_type='application/json')
        assert res.status_code == 200
        assert res.get_json()['success'] is True

    def test_login_with_username_still_works(self, client):
        """Original username login should still work."""
        signup(client, 'usernameuser')
        client.post('/api/logout', content_type='application/json')
        res = login(client, 'usernameuser')
        assert res.status_code == 200
        assert res.get_json()['success'] is True

    def test_login_with_email_wrong_password(self, client):
        signup(client, 'emailwrong', email='emailwrong@test.com')
        client.post('/api/logout', content_type='application/json')
        res = client.post('/api/login',
                          json={'username': 'emailwrong@test.com', 'password': 'badpass'},
                          content_type='application/json')
        assert res.status_code == 401


# =====================
#   FORGOT PASSWORD TESTS
# =====================

class TestForgotPassword:
    def test_forgot_password_request(self, client):
        """Should return success even for non-existent email (security)."""
        res = client.post('/api/forgot-password',
                          json={'email': 'nonexist@test.com'},
                          content_type='application/json')
        assert res.status_code == 200
        assert res.get_json()['success'] is True

    def test_forgot_password_generates_token(self, client):
        signup(client, 'resetme', email='resetme@test.com')
        client.post('/api/logout', content_type='application/json')
        res = client.post('/api/forgot-password',
                          json={'email': 'resetme@test.com'},
                          content_type='application/json')
        assert res.status_code == 200
        # Verify token was stored in DB
        import Server
        conn = Server.get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT reset_token, reset_token_expiry FROM Users WHERE email = ?", ('resetme@test.com',))
        user = cursor.fetchone()
        conn.close()
        assert user['reset_token'] is not None
        assert user['reset_token_expiry'] is not None

    def test_reset_password_with_valid_token(self, client):
        signup(client, 'resetvalid', email='resetvalid@test.com')
        client.post('/api/logout', content_type='application/json')
        client.post('/api/forgot-password',
                    json={'email': 'resetvalid@test.com'},
                    content_type='application/json')
        # Get token from DB
        import Server
        conn = Server.get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT reset_token FROM Users WHERE email = ?", ('resetvalid@test.com',))
        token = cursor.fetchone()['reset_token']
        conn.close()
        # Reset password
        res = client.post(f'/api/reset-password/{token}',
                          json={'password': 'newpass1234'},
                          content_type='application/json')
        assert res.status_code == 200
        assert res.get_json()['success'] is True
        # Login with new password
        res = login(client, 'resetvalid', 'newpass1234')
        assert res.status_code == 200

    def test_reset_password_with_invalid_token(self, client):
        res = client.post('/api/reset-password/invalidtoken123',
                          json={'password': 'newpass1234'},
                          content_type='application/json')
        assert res.status_code == 400

    def test_reset_password_short_password(self, client):
        signup(client, 'resetshort', email='resetshort@test.com')
        client.post('/api/logout', content_type='application/json')
        client.post('/api/forgot-password',
                    json={'email': 'resetshort@test.com'},
                    content_type='application/json')
        import Server
        conn = Server.get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT reset_token FROM Users WHERE email = ?", ('resetshort@test.com',))
        token = cursor.fetchone()['reset_token']
        conn.close()
        res = client.post(f'/api/reset-password/{token}',
                          json={'password': 'ab'},
                          content_type='application/json')
        assert res.status_code == 400

    def test_forgot_password_missing_email(self, client):
        res = client.post('/api/forgot-password',
                          json={},
                          content_type='application/json')
        assert res.status_code == 400


# =====================
#   PROFILE TESTS
# =====================

class TestProfile:
    def test_get_profile(self, client):
        signup(client, 'profileuser', email='profile@test.com')
        res = client.get('/api/profile')
        assert res.status_code == 200
        data = res.get_json()
        assert data['name'] == 'profileuser'
        assert data['email'] == 'profile@test.com'

    def test_get_profile_unauthenticated(self, client):
        res = client.get('/api/profile')
        assert res.status_code == 401

    def test_update_profile_name(self, client):
        signup(client, 'oldname')
        res = client.put('/api/profile',
                         json={'name': 'newname'},
                         content_type='application/json')
        assert res.status_code == 200
        assert res.get_json()['success'] is True
        # Verify update
        me = client.get('/api/me').get_json()
        assert me['name'] == 'newname'

    def test_update_profile_duplicate_name(self, client):
        signup(client, 'original')
        signup(client, 'taken_name')
        client.post('/api/logout', content_type='application/json')
        login(client, 'original')
        res = client.put('/api/profile',
                         json={'name': 'taken_name'},
                         content_type='application/json')
        assert res.status_code == 400

    def test_change_password(self, client):
        signup(client, 'pwdchange')
        res = client.post('/api/profile/change-password',
                          json={'current_password': 'test1234', 'new_password': 'newpass5678'},
                          content_type='application/json')
        assert res.status_code == 200
        assert res.get_json()['success'] is True
        # Verify: logout and login with new password
        client.post('/api/logout', content_type='application/json')
        res = login(client, 'pwdchange', 'newpass5678')
        assert res.status_code == 200

    def test_change_password_wrong_current(self, client):
        signup(client, 'pwdwrong')
        res = client.post('/api/profile/change-password',
                          json={'current_password': 'wrongpass', 'new_password': 'newpass5678'},
                          content_type='application/json')
        assert res.status_code == 400

    def test_change_password_short_new(self, client):
        signup(client, 'pwdshort')
        res = client.post('/api/profile/change-password',
                          json={'current_password': 'test1234', 'new_password': 'ab'},
                          content_type='application/json')
        assert res.status_code == 400


# =====================
#   TRIP TESTS
# =====================

class TestTrips:
    def test_create_trip(self, client):
        signup(client)
        signup(client, 'alice', phone='050-alice')
        client.post('/api/logout', content_type='application/json')
        login(client)
        
        res = create_trip(client, 'Budapest', 5000, ['050-alice'])
        assert res.status_code == 200
        data = res.get_json()
        assert data['success'] is True
        assert 'trip_id' in data

    def test_create_trip_empty_name(self, client):
        signup(client)
        res = create_trip(client, '', 0)
        assert res.status_code == 400

    def test_list_trips(self, client):
        signup(client)
        create_trip(client, 'Trip A')
        create_trip(client, 'Trip B')
        res = client.get('/api/trips')
        assert res.status_code == 200
        trips = res.get_json()
        assert len(trips) == 2

    def test_list_trips_unauthenticated(self, client):
        res = client.get('/api/trips')
        assert res.status_code == 401

    def test_update_trip(self, client):
        signup(client)
        trip_res = create_trip(client, 'Original')
        trip_id = trip_res.get_json()['trip_id']
        res = client.put(f'/api/trips/{trip_id}',
                         json={'name': 'Updated', 'budget': 9999},
                         content_type='application/json')
        assert res.status_code == 200
        # Verify the update
        trips = client.get('/api/trips').get_json()
        assert trips[0]['name'] == 'Updated'
        assert trips[0]['budget'] == 9999

    def test_update_trip_non_owner(self, client):
        signup(client, 'owner1')
        trip_res = create_trip(client, 'Owner Trip')
        trip_id = trip_res.get_json()['trip_id']
        client.post('/api/logout', content_type='application/json')
        signup(client, 'other_user')
        res = client.put(f'/api/trips/{trip_id}',
                         json={'name': 'Hijacked'},
                         content_type='application/json')
        assert res.status_code == 403

    def test_trip_members(self, client):
        signup(client)
        signup(client, 'localfriend', phone='050-local')
        client.post('/api/logout', content_type='application/json')
        login(client)
        
        trip_res = create_trip(client, 'Group Trip', 0, ['050-local'])
        trip_id = trip_res.get_json()['trip_id']
        res = client.get(f'/api/trip_members/{trip_id}')
        assert res.status_code == 200
        members = res.get_json()
        names = [m['name'] for m in members]
        assert 'testuser' in names
        assert 'localfriend' not in names  # Because invitation is not approved yet


# =====================
#   EXPENSE TESTS
# =====================

class TestExpenses:
    def test_add_expense(self, client):
        signup(client)
        trip_id = create_trip(client).get_json()['trip_id']
        res = add_expense(client, trip_id, 150.5, 'Dinner')
        assert res.status_code == 200
        assert res.get_json()['success'] is True

    def test_add_expense_invalid_amount(self, client):
        signup(client)
        trip_id = create_trip(client).get_json()['trip_id']
        res = add_expense(client, trip_id, -10, 'Bad')
        assert res.status_code == 400

    def test_add_expense_zero_amount(self, client):
        signup(client)
        trip_id = create_trip(client).get_json()['trip_id']
        res = add_expense(client, trip_id, 0, 'Free')
        assert res.status_code == 400

    def test_add_expense_missing_description(self, client):
        signup(client)
        trip_id = create_trip(client).get_json()['trip_id']
        res = client.post('/api/expenses',
                          json={'trip_id': trip_id, 'amount': 100, 'description': ''},
                          content_type='application/json')
        assert res.status_code == 400

    def test_list_expenses(self, client):
        signup(client)
        trip_id = create_trip(client).get_json()['trip_id']
        add_expense(client, trip_id, 100, 'Lunch')
        add_expense(client, trip_id, 200, 'Hotel')
        res = client.get(f'/api/expenses/{trip_id}')
        assert res.status_code == 200
        expenses = res.get_json()
        assert len(expenses) == 2

    def test_delete_expense(self, client):
        signup(client)
        trip_id = create_trip(client).get_json()['trip_id']
        add_expense(client, trip_id, 100, 'To delete')
        expenses = client.get(f'/api/expenses/{trip_id}').get_json()
        exp_id = expenses[0]['id']
        res = client.delete(f'/api/expenses/{exp_id}')
        assert res.status_code == 200
        assert res.get_json()['success'] is True
        # Verify deletion
        remaining = client.get(f'/api/expenses/{trip_id}').get_json()
        assert len(remaining) == 0

    def test_delete_expense_not_found(self, client):
        signup(client)
        res = client.delete('/api/expenses/99999')
        assert res.status_code == 404

    def test_delete_expense_not_owner(self, client):
        signup(client, 'creator')
        trip_id = create_trip(client).get_json()['trip_id']
        add_expense(client, trip_id, 100, 'Protected')
        expenses = client.get(f'/api/expenses/{trip_id}').get_json()
        exp_id = expenses[0]['id']
        client.post('/api/logout', content_type='application/json')
        signup(client, 'attacker')
        res = client.delete(f'/api/expenses/{exp_id}')
        assert res.status_code == 403


# =====================
#   CURRENCY TESTS
# =====================

class TestCurrency:
    def test_add_expense_with_currency(self, client):
        """Should store and return the specified currency."""
        signup(client)
        trip_id = create_trip(client).get_json()['trip_id']
        res = add_expense(client, trip_id, 50, 'Coffee', 'כללי', 'USD')
        assert res.status_code == 200
        # Verify currency in response
        expenses = client.get(f'/api/expenses/{trip_id}').get_json()
        assert expenses[0]['currency'] == 'USD'

    def test_add_expense_with_eur(self, client):
        signup(client)
        trip_id = create_trip(client).get_json()['trip_id']
        add_expense(client, trip_id, 30, 'Museum', 'אטרקציות', 'EUR')
        expenses = client.get(f'/api/expenses/{trip_id}').get_json()
        assert expenses[0]['currency'] == 'EUR'

    def test_add_expense_default_currency(self, client):
        """Omitting currency should default to ILS."""
        signup(client)
        trip_id = create_trip(client).get_json()['trip_id']
        res = client.post('/api/expenses',
                          json={'trip_id': trip_id, 'amount': 100, 'description': 'Default'},
                          content_type='application/json')
        assert res.status_code == 200
        expenses = client.get(f'/api/expenses/{trip_id}').get_json()
        assert expenses[0]['currency'] == 'ILS'

    def test_add_expense_invalid_currency_defaults(self, client):
        """Invalid currency code should default to ILS."""
        signup(client)
        trip_id = create_trip(client).get_json()['trip_id']
        res = add_expense(client, trip_id, 100, 'Bad Currency', 'כללי', 'FAKE')
        assert res.status_code == 200
        expenses = client.get(f'/api/expenses/{trip_id}').get_json()
        assert expenses[0]['currency'] == 'ILS'


# =====================
#   BALANCE TESTS
# =====================

class TestBalances:
    def test_balances_single_user(self, client):
        signup(client)
        trip_id = create_trip(client).get_json()['trip_id']
        add_expense(client, trip_id, 300, 'Solo expense')
        res = client.get(f'/api/balances/{trip_id}')
        assert res.status_code == 200
        data = res.get_json()
        assert data['total'] == 300
        assert data['average'] == 300
        # Single user should be balanced
        assert data['balances'][0]['balance'] == 0

    def test_balances_empty_trip(self, client):
        signup(client)
        trip_id = create_trip(client).get_json()['trip_id']
        res = client.get(f'/api/balances/{trip_id}')
        assert res.status_code == 200
        data = res.get_json()
        assert data['total'] == 0


# =====================
#   AUTHORIZATION TESTS
# =====================

class TestAuthorization:
    def test_access_other_trip_expenses(self, client):
        signup(client, 'user_a')
        trip_id = create_trip(client, 'Private Trip').get_json()['trip_id']
        client.post('/api/logout', content_type='application/json')
        signup(client, 'user_b')
        res = client.get(f'/api/expenses/{trip_id}')
        assert res.status_code == 403

    def test_access_other_trip_balances(self, client):
        signup(client, 'user_a2')
        trip_id = create_trip(client, 'Private 2').get_json()['trip_id']
        client.post('/api/logout', content_type='application/json')
        signup(client, 'user_b2')
        res = client.get(f'/api/balances/{trip_id}')
        assert res.status_code == 403

    def test_add_expense_to_other_trip(self, client):
        signup(client, 'user_x')
        trip_id = create_trip(client, 'X Trip').get_json()['trip_id']
        client.post('/api/logout', content_type='application/json')
        signup(client, 'user_y')
        res = add_expense(client, trip_id, 100, 'Sneak')
        assert res.status_code == 403


# =====================
#   INPUT VALIDATION TESTS
# =====================

class TestInputValidation:
    def test_very_long_trip_name(self, client):
        signup(client)
        res = create_trip(client, 'A' * 200)
        assert res.status_code == 400

    def test_very_long_description(self, client):
        signup(client)
        trip_id = create_trip(client).get_json()['trip_id']
        res = add_expense(client, trip_id, 10, 'X' * 600)
        assert res.status_code == 400

    def test_huge_amount(self, client):
        signup(client)
        trip_id = create_trip(client).get_json()['trip_id']
        res = add_expense(client, trip_id, 99_999_999, 'Too much')
        assert res.status_code == 400

    def test_string_amount(self, client):
        signup(client)
        trip_id = create_trip(client).get_json()['trip_id']
        res = client.post('/api/expenses',
                          json={'trip_id': trip_id, 'amount': 'abc', 'description': 'Bad'},
                          content_type='application/json')
        assert res.status_code == 400
