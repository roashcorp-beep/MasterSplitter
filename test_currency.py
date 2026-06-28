"""Comprehensive multi-currency balance/settlement test harness.
Runs the REAL endpoints via Flask's test client against a throwaway DB with
deterministic (fake) exchange rates. Prints PASS/FAIL per scenario.
"""
import os, sys, json, tempfile, shutil

CODE_DIR = r'C:\Users\nufar\OneDrive\Desktop\AI_Agent\Master_splitter'
_tmp = tempfile.mkdtemp()
os.chdir(_tmp)                      # fresh master_splitter.db is created here
sys.path.insert(0, CODE_DIR)
import Server                       # importing runs check_db_schema() -> full schema

# --- Deterministic exchange rates: value of 1 unit expressed in ILS ---
VAL_ILS = {'ILS': 1.0, 'USD': 3.7, 'EUR': 4.0, 'ALL': 0.0367, 'GBP': 4.7}
def fake_rate(a, b='ILS'):
    if a == b:
        return 1.0
    if a in VAL_ILS and b in VAL_ILS:
        return VAL_ILS[a] / VAL_ILS[b]
    return None
Server.get_exchange_rate = fake_rate   # patch module global (safe_rate calls it too)

app = Server.app
app.config['TESTING'] = True
client = app.test_client()

PASS, FAIL = 0, 0
def check(label, cond, extra=''):
    global PASS, FAIL
    if cond:
        PASS += 1; print(f"  PASS  {label}")
    else:
        FAIL += 1; print(f"  FAIL  {label}   {extra}")

def seed():
    conn = Server.get_db_connection(); c = conn.cursor()
    for uid, name in [(1, 'Alice'), (2, 'Bob'), (3, 'Carol')]:
        c.execute("INSERT OR IGNORE INTO Users (id, name, email) VALUES (?,?,?)", (uid, name, f'{name}@x.com'))
    conn.commit(); conn.close()

_gid = [100]
def make_group(base_cur, members=(1, 2, 3)):
    _gid[0] += 1
    gid = _gid[0]
    conn = Server.get_db_connection(); c = conn.cursor()
    c.execute("INSERT INTO Groups (id, destination, owner_id, budget_type, budgets_json) VALUES (?,?,?,?,?)",
              (gid, f'G{gid}', members[0], 'none', json.dumps({'currency': base_cur})))
    for u in members:
        c.execute("INSERT INTO GroupMembers (group_id, user_id, is_admin) VALUES (?,?,?)", (gid, u, 1 if u == members[0] else 0))
    conn.commit(); conn.close()
    return gid

def sess(uid):
    with client.session_transaction() as s:
        s['user_id'] = uid

def add_expense(uid, gid, amount, currency, splits, desc='x'):
    sess(uid)
    r = client.post('/api/expenses', json={
        'group_id': gid, 'amount': amount, 'currency': currency,
        'description': desc, 'payer_id': uid, 'splits': splits})
    return r.status_code, r.get_json()

def settle(uid, gid, payer, payee, amount, currency):
    sess(uid)
    r = client.post('/api/settlements', json={
        'group_id': gid, 'payer_id': payer, 'payee_id': payee, 'amount': amount, 'currency': currency})
    return r.status_code, r.get_json()

def balances(uid, gid):
    sess(uid)
    return client.get(f'/api/balances/{gid}').get_json()

def optimized(uid, gid):
    sess(uid)
    return client.get(f'/api/groups/{gid}/optimized-balances').get_json()

def net_owes(opt):
    """Return {(from_id,to_id): amount} from optimized_settlements (converted view)."""
    return {(s['from_id'], s['to_id']): s['amount'] for s in (opt.get('optimized_settlements') or [])}

seed()
print("="*70)

# --- Scenario 1: base ILS, expense in ILS (the simple, already-working case) ---
print("Scenario 1: base=ILS, expense=ILS  (Alice pays 100, split 50/50)")
g = make_group('ILS')
add_expense(1, g, 100, 'ILS', [{'user_id': 1, 'amount': 50}, {'user_id': 2, 'amount': 50}])
opt = optimized(1, g); owes = net_owes(opt)
check("Bob owes Alice 50 ILS", abs(owes.get((2, 1), 0) - 50) < 0.5, owes)
check("optimized list non-empty", len(opt.get('optimized_settlements') or []) == 1, opt)
settle(2, g, 2, 1, 50, 'ILS')
opt = optimized(1, g)
check("after settle: nothing owed", len(opt.get('optimized_settlements') or []) == 0, net_owes(opt))

# --- Scenario 2: base ILS, expense entered in USD ---
print("Scenario 2: base=ILS, expense=USD  (Alice pays 100 USD, split 50/50)")
g = make_group('ILS')
add_expense(1, g, 100, 'USD', [{'user_id': 1, 'amount': 50}, {'user_id': 2, 'amount': 50}])
opt = optimized(1, g); owes = net_owes(opt)
# Bob owes 50 USD = 185 ILS (display=ILS for user 1)
check("Bob owes Alice ~185 ILS", abs(owes.get((2, 1), 0) - 185) < 1, owes)
settle(2, g, 2, 1, 185, 'ILS')
opt = optimized(1, g)
check("after settle in ILS: cleared", len(opt.get('optimized_settlements') or []) == 0, net_owes(opt))

# --- Scenario 3: base ALL, expenses in ILS + USD  (the reported bug) ---
print("Scenario 3: base=ALL, expenses ILS+USD (mixed)  [the reported bug]")
g = make_group('ALL')
# Alice pays 200 ILS (split 100/100) -> Bob owes Alice 100 ILS
add_expense(1, g, 200, 'ILS', [{'user_id': 1, 'amount': 100}, {'user_id': 2, 'amount': 100}])
# Bob pays 50 USD (split 25/25) -> Alice owes Bob 25 USD
add_expense(2, g, 50, 'USD', [{'user_id': 1, 'amount': 25}, {'user_id': 2, 'amount': 25}])
opt = optimized(1, g); owes = net_owes(opt)
# Net (display=ILS): Bob owes 100 ILS; Alice owes 25 USD=92.5 ILS -> net Bob owes Alice 7.5 ILS
check("optimized non-empty (mixed currencies)", len(opt.get('optimized_settlements') or []) >= 1, opt)
check("net ~Bob owes Alice 7.5 ILS", abs(owes.get((2, 1), 0) - 7.5) < 1.0, owes)
# settle the net from the converted view (in ILS)
net_amt = owes.get((2, 1), 0)
if net_amt:
    settle(2, g, 2, 1, net_amt, 'ILS')
opt = optimized(1, g)
check("after settling the net: cleared", len(opt.get('optimized_settlements') or []) == 0, net_owes(opt))

# --- Scenario 4: base ALL, settle in base currency ---
print("Scenario 4: base=ALL, expense in EUR, settle in ALL (base)")
g = make_group('ALL')
add_expense(1, g, 30, 'EUR', [{'user_id': 1, 'amount': 15}, {'user_id': 2, 'amount': 15}])
# Bob owes 15 EUR = 60 ILS = 60/0.0367 = 1634.9 ALL
opt = optimized(2, g)  # request as Bob (display = ILS default)
owes = net_owes(opt)
check("Bob owes Alice (EUR expense, ALL base) non-empty", len(opt.get('optimized_settlements') or []) == 1, opt)
# settle full debt in base ALL: 15 EUR in ALL = 15*4.0/0.0367 = 1634.9
settle(2, g, 2, 1, 1634.88, 'ALL')
opt = optimized(1, g)
check("after settle in ALL base: cleared", len(opt.get('optimized_settlements') or []) == 0, net_owes(opt))

# --- Scenario 5: get_balances zero-sum invariant across a mixed group ---
print("Scenario 5: balances sum to ~0 (mixed-currency group)")
g = make_group('ALL')
add_expense(1, g, 200, 'ILS', [{'user_id': 1, 'amount': 70}, {'user_id': 2, 'amount': 70}, {'user_id': 3, 'amount': 60}])
add_expense(3, g, 90, 'USD', [{'user_id': 1, 'amount': 30}, {'user_id': 2, 'amount': 30}, {'user_id': 3, 'amount': 30}])
bal = balances(1, g)
total = sum(b['balance'] for b in bal['balances'])
check("per-user balances sum to ~0", abs(total) < 1.0, f"sum={total} balances={bal['balances']}")

# --- Scenario 6: the 3 views (by currency / group base / my currency) ---
print("Scenario 6: 3 views — base=ALL, Alice pays 200 ILS, Bob pays 50 USD")
g = make_group('ALL')
add_expense(1, g, 200, 'ILS', [{'user_id': 1, 'amount': 100}, {'user_id': 2, 'amount': 100}])  # Bob owes 100 ILS
add_expense(2, g, 50, 'USD', [{'user_id': 1, 'amount': 25}, {'user_id': 2, 'amount': 25}])        # Alice owes 25 USD
opt = optimized(1, g)
# By-currency view: a bucket per entry currency
cs = opt.get('currency_settlements') or {}
check("by-currency has ILS bucket", 'ILS' in cs, cs)
check("by-currency has USD bucket", 'USD' in cs, cs)
check("ILS bucket: Bob owes Alice 100", any(s['from_id'] == 2 and s['to_id'] == 1 and abs(s['amount'] - 100) < 1 for s in cs.get('ILS', [])), cs.get('ILS'))
check("USD bucket: Alice owes Bob 25", any(s['from_id'] == 1 and s['to_id'] == 2 and abs(s['amount'] - 25) < 1 for s in cs.get('USD', [])), cs.get('USD'))
# Group-base view: single net in ALL
bs = opt.get('base_settlements') or []
check("group-base view: single net debt", len(bs) == 1, bs)
check("base_currency is ALL", opt.get('base_currency') == 'ALL', opt.get('base_currency'))
# My-currency view: single net in display (ILS): Bob owes 100 - 25*3.7=92.5 -> ~7.5
oc = opt.get('optimized_settlements') or []
check("my-currency view: net ~7.5 ILS", len(oc) == 1 and abs(oc[0]['amount'] - 7.5) < 1, oc)

# --- Scenario 7: settlement visibility (private by default; admin/public see all) ---
print("Scenario 7: settlement permissions (private default, admin sees all)")
g = make_group('ILS')  # owner=1 (admin); 2,3 non-admin
add_expense(1, g, 300, 'ILS', [{'user_id': 1, 'amount': 100}, {'user_id': 2, 'amount': 100}, {'user_id': 3, 'amount': 100}])
optB = optimized(2, g)
ocB = optB.get('optimized_settlements') or []
check("Bob (non-admin) sees only his own debt", len(ocB) == 1 and all(s['from_id'] == 2 or s['to_id'] == 2 for s in ocB), ocB)
balB = balances(2, g)
check("Bob's balance list = only Bob", all(b['user_id'] == 2 for b in balB['balances']), balB['balances'])
optA = optimized(1, g)
check("Alice (admin) sees all debts", len(optA.get('optimized_settlements') or []) == 2, optA.get('optimized_settlements'))
_c = Server.get_db_connection(); _c.execute("UPDATE Groups SET is_public_settlements=1 WHERE id=?", (g,)); _c.commit(); _c.close()
optB2 = optimized(2, g)
check("after public ON: Bob sees all debts", len(optB2.get('optimized_settlements') or []) == 2, optB2.get('optimized_settlements'))

print("="*70)
print(f"RESULT: {PASS} passed, {FAIL} failed")
os.chdir(CODE_DIR)
shutil.rmtree(_tmp, ignore_errors=True)
sys.exit(1 if FAIL else 0)
