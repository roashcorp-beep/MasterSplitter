"""
Master Splitter — Demo data seeder  (Phase 3 & 4)
==================================================
Builds a RICH, realistic demo database that looks like the app has been used for
months: friends, multi-currency trips, a shared apartment, restaurants, mixed
(multi-payer) payments, partial settlements and open balances — so every screen,
chart and balance view is populated. No empty tables, no placeholders.

SAFETY: this NEVER touches your production database. It writes a fresh DB inside
        marketing/demo_env/master_splitter.db (its own working dir), using the app's
        real schema (imported from Server.py) plus deterministic demo exchange rates.

USAGE:
    python marketing/seed_demo_data.py
Then record against the demo DB without risking real data:
    cd marketing/demo_env && python ../../Server.py     # serves the demo DB
(see marketing/README.md for the full recording flow)
"""
import os, sys, json, datetime

HERE = os.path.dirname(os.path.abspath(__file__))
CODE_DIR = os.path.dirname(HERE)
DEMO_DIR = os.path.join(HERE, "demo_env")
os.makedirs(DEMO_DIR, exist_ok=True)

# Fresh DB: remove an old demo DB so re-running is idempotent.
DB_PATH = os.path.join(DEMO_DIR, "master_splitter.db")
if os.path.exists(DB_PATH):
    os.remove(DB_PATH)

os.chdir(DEMO_DIR)                 # app opens 'master_splitter.db' relative to CWD
sys.path.insert(0, CODE_DIR)
import Server                      # importing builds the full schema in the demo DB

# ---- Deterministic demo FX (value of 1 unit in ILS) so amounts are stable/realistic.
VAL_ILS = {'ILS': 1.0, 'USD': 3.70, 'EUR': 4.00, 'GBP': 4.65, 'ALL': 0.039, 'THB': 0.105, 'JPY': 0.025}
def fake_rate(a, b='ILS'):
    if a == b: return 1.0
    if a in VAL_ILS and b in VAL_ILS: return VAL_ILS[a] / VAL_ILS[b]
    return None
Server.get_exchange_rate = fake_rate

conn = Server.get_db_connection()
c = conn.cursor()

def days_ago(n):
    return (datetime.datetime(2026, 6, 26) - datetime.timedelta(days=n)).isoformat()

# ------------------------------------------------------------------ Users
USERS = [
    (1, "נופר",   "nufar@demo.app"),
    (2, "אבי",    "avi@demo.app"),
    (3, "מורן",   "moran@demo.app"),
    (4, "דניאל",  "daniel@demo.app"),
    (5, "ליאת",   "liat@demo.app"),
    (6, "Yael",   "yael@demo.app"),
]
for uid, name, email in USERS:
    c.execute("INSERT INTO Users (id, name, email, default_currency, is_verified, notify_group_expense, notify_expense_added) VALUES (?,?,?,?,1,1,1)",
              (uid, name, email, 'ILS'))
# Demo login credentials for the recording automation (record_demo.ts):
#   username/email: nufar@demo.app   password: demo1234
c.execute("UPDATE Users SET password_hash=? WHERE id=1", (Server.generate_password_hash("demo1234"),))
conn.commit()

gid_seq = [0]
def make_group(name, base_cur, members, owner=1, budget=0, budget_type='none'):
    gid_seq[0] += 1
    gid = gid_seq[0]
    c.execute("""INSERT INTO Groups (id, destination, owner_id, budget, budget_type, budgets_json,
                 is_public_expenses, is_public_settlements, allow_member_delete)
                 VALUES (?,?,?,?,?,?,?,?,?)""",
              (gid, name, owner, budget, budget_type, json.dumps({'currency': base_cur, 'daily': '', 'monthly': '', 'yearly': ''}),
               1, 0, 1))
    for u in members:
        c.execute("INSERT INTO GroupMembers (group_id, user_id, is_admin) VALUES (?,?,?)",
                  (gid, u, 1 if u == owner else 0))
    return gid

def add_expense(gid, payer, total, currency, category, desc, participants, when, contributions=None):
    """participants: list of user_ids splitting equally. contributions: {uid: amount} multi-payer (entry currency)."""
    base_cur = json.loads(c.execute("SELECT budgets_json FROM Groups WHERE id=?", (gid,)).fetchone()['budgets_json'])['currency']
    if currency != base_cur:
        rate = fake_rate(currency, base_cur)
        original_amount = total
        amount = round(total * rate, 2)
    else:
        original_amount = None
        amount = total
    c.execute("""INSERT INTO Expenses (group_id, user_id, amount, original_amount, currency, description, category, is_personal, created_at)
                 VALUES (?,?,?,?,?,?,?,0,?)""", (gid, payer, amount, original_amount, currency, desc, category, when))
    eid = c.lastrowid
    # equal splits in base currency
    per = round(amount / len(participants), 2)
    running = 0
    for i, u in enumerate(participants):
        a = round(amount - running, 2) if i == len(participants) - 1 else per
        running += a
        c.execute("INSERT INTO ExpenseSplits (expense_id, user_id, amount) VALUES (?,?,?)", (eid, u, a))
    # multi-payer contributions (stored in base currency)
    if contributions:
        for u, amt in contributions.items():
            cb = round(amt * (amount / original_amount), 4) if original_amount else amt
            c.execute("INSERT INTO ExpenseContributions (expense_id, user_id, amount) VALUES (?,?,?)", (eid, u, cb))
    return eid

def settle(gid, payer, payee, amount_base, currency, when, expense_id=None):
    c.execute("""INSERT INTO Settlements (group_id, payer_id, payee_id, amount, original_amount, currency, expense_id, created_at)
                 VALUES (?,?,?,?,?,?,?,?)""", (gid, payer, payee, amount_base, amount_base, currency, expense_id, when))

def activity(gid, uid, action, detail, when):
    c.execute("INSERT INTO ActivityLog (group_id, user_id, action, detail, created_at) VALUES (?,?,?,?,?)",
              (gid, uid, action, detail, when))

# ============================================================ GROUP 1: Albania 2026
g1 = make_group("אלבניה 2026 \U0001F1E6\U0001F1F1", 'ALL', [1, 2, 3, 4], owner=1)
add_expense(g1, 1, 480, 'EUR', 'לינה', "מלון בוטיק בסרנדה (3 לילות)", [1, 2, 3, 4], days_ago(40))
add_expense(g1, 2, 90,  'EUR', 'תחבורה', "השכרת רכב + דלק", [1, 2, 3, 4], days_ago(39))
add_expense(g1, 3, 12400, 'ALL', 'אוכל', "ארוחת ערב על המים", [1, 2, 3, 4], days_ago(38),
            contributions={3: 8400, 1: 4000})  # מורן ונופר שילמו יחד
add_expense(g1, 4, 200, 'USD', 'אטרקציות', "סיור סנפלינג בקניון", [2, 3, 4], days_ago(37))
add_expense(g1, 1, 6500, 'ALL', 'אוכל', "מכולת + יין מקומי", [1, 2, 3, 4], days_ago(36))
add_expense(g1, 2, 60,  'EUR', 'תחבורה', "מעבורת לאי", [1, 2, 3, 4], days_ago(34))
settle(g1, 2, 1, 4100, 'ALL', days_ago(20))       # partial
activity(g1, 1, 'settlement', "אבי החזיר ₪ לנופר", days_ago(20))

# ============================================================ GROUP 2: Tokyo 2025
g2 = make_group("טוקיו 2025 \U0001F1EF\U0001F1F5", 'JPY', [1, 5, 6], owner=1, budget=400000, budget_type='none')
add_expense(g2, 1, 96000, 'JPY', 'לינה', "Airbnb בשינג'וקו (5 לילות)", [1, 5, 6], days_ago(120))
add_expense(g2, 5, 14200, 'JPY', 'אוכל', "סושי אומקסה", [1, 5, 6], days_ago(119))
add_expense(g2, 6, 8800,  'JPY', 'תחבורה', "כרטיסי JR Pass", [1, 5, 6], days_ago(118))
add_expense(g2, 1, 6400,  'JPY', 'אטרקציות', "טדבורי שגיש + מוזיאון", [1, 5, 6], days_ago(116))
add_expense(g2, 5, 3900,  'JPY', 'אוכל', "ראמן איצ'יראן", [1, 5, 6], days_ago(115),
            contributions={5: 2600, 1: 1300})
add_expense(g2, 6, 5200,  'JPY', 'כללי', "מזכרות מאקיהברה", [1, 5, 6], days_ago(112))
settle(g2, 5, 1, 30000, 'JPY', days_ago(60))
settle(g2, 6, 1, 26000, 'JPY', days_ago(55))
activity(g2, 5, 'settlement', "ליאת סגרה חוב", days_ago(60))

# ============================================================ GROUP 3: Apartment 4B (monthly)
g3 = make_group("דירה 4ב' \U0001F3E0", 'ILS', [1, 2, 5], owner=2, budget=8000, budget_type='monthly')
for m, day in [(0, 90), (1, 60), (2, 30)]:
    add_expense(g3, 2, 5200, 'ILS', 'לינה', "שכר דירה", [1, 2, 5], days_ago(day))
    add_expense(g3, 1, 420,  'ILS', 'כללי', "חשמל", [1, 2, 5], days_ago(day - 2))
    add_expense(g3, 5, 180,  'ILS', 'כללי', "אינטרנט", [1, 2, 5], days_ago(day - 3))
    add_expense(g3, 1, 760,  'ILS', 'אוכל', "קניות שבועיות", [1, 2, 5], days_ago(day - 5))
settle(g3, 1, 2, 5000, 'ILS', days_ago(25))
settle(g3, 5, 2, 4800, 'ILS', days_ago(24))

# ============================================================ GROUP 4: Restaurants / nights out
g4 = make_group("יציאות \U0001F377", 'ILS', [1, 2, 3, 4, 5], owner=1)
add_expense(g4, 1, 640, 'ILS', 'אוכל', "מסעדת שף — יום הולדת", [1, 2, 3, 4, 5], days_ago(14),
            contributions={1: 340, 3: 300})
add_expense(g4, 4, 280, 'ILS', 'אוכל', "בר יין", [1, 2, 4, 5], days_ago(10))
add_expense(g4, 2, 150, 'ILS', 'תחבורה', "מוניות הביתה", [1, 2, 3, 4, 5], days_ago(10))
add_expense(g4, 3, 410, 'ILS', 'אוכל', "בראנץ' סוף שבוע", [1, 3, 5], days_ago(4))
settle(g4, 5, 1, 128, 'ILS', days_ago(2))

conn.commit()

# ---- Summary
nu = c.execute("SELECT COUNT(*) FROM Users").fetchone()[0]
ng = c.execute("SELECT COUNT(*) FROM Groups").fetchone()[0]
ne = c.execute("SELECT COUNT(*) FROM Expenses").fetchone()[0]
ns = c.execute("SELECT COUNT(*) FROM Settlements").fetchone()[0]
ncon = c.execute("SELECT COUNT(*) FROM ExpenseContributions").fetchone()[0]
conn.close()
print("Demo DB created:", DB_PATH)
print(f"  users={nu}  groups={ng}  expenses={ne}  settlements={ns}  multi-payer_contributions={ncon}")
print("  currencies: ILS, USD, EUR, ALL, JPY   |   categories: food / lodging / transport / attractions / general")
print("\nTo record against the demo DB (production-safe):")
print("  cd marketing/demo_env && python ../../Server.py")
