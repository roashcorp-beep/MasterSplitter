"""Adversarial edge-case tests for the 'by currency' balance view after the
settlement-currency-attribution fix. Each asserts on currency_settlements
(the 'לפי מטבע' tab) directly. Run: python test_bycurrency.py"""
import os, sys, json, tempfile, shutil
CODE_DIR = r'C:\Users\nufar\OneDrive\Desktop\AI_Agent\Master_splitter'
_tmp = tempfile.mkdtemp(); os.chdir(_tmp); sys.path.insert(0, CODE_DIR)
import Server
VAL_ILS = {'ILS': 1.0, 'USD': 3.7, 'EUR': 4.0, 'ALL': 0.0367, 'GBP': 4.7}
def fake_rate(a, b='ILS'):
    if a == b: return 1.0
    return VAL_ILS[a]/VAL_ILS[b] if a in VAL_ILS and b in VAL_ILS else None
Server.get_exchange_rate = fake_rate
app = Server.app; app.config['TESTING'] = True; client = app.test_client()

PASS = FAIL = 0
def check(label, cond, extra=''):
    global PASS, FAIL
    if cond: PASS += 1; print(f"  PASS  {label}")
    else: FAIL += 1; print(f"  FAIL  {label}   {extra}")

def sess(u):
    with client.session_transaction() as s: s['user_id'] = u
_g = [300]
def make_group(base):
    _g[0] += 1; gid = _g[0]
    conn = Server.get_db_connection(); c = conn.cursor()
    for uid, name in [(1, 'Alice'), (2, 'Bob'), (3, 'Carol')]:
        c.execute("INSERT OR IGNORE INTO Users (id,name,email) VALUES (?,?,?)", (uid, name, f'{name}@x.com'))
    c.execute("INSERT INTO Groups (id,destination,owner_id,budget_type,budgets_json) VALUES (?,?,?,?,?)",
              (gid, f'G{gid}', 1, 'none', json.dumps({'currency': base})))
    for u in (1, 2, 3):
        c.execute("INSERT INTO GroupMembers (group_id,user_id,is_admin) VALUES (?,?,?)", (gid, u, 1 if u == 1 else 0))
    conn.commit(); conn.close(); return gid
def add(uid, g, amt, cur, splits, contribs=None, desc='x'):
    sess(uid)
    body = {'group_id': g, 'amount': amt, 'currency': cur, 'description': desc, 'payer_id': uid, 'splits': splits}
    if contribs: body['contributions'] = contribs
    return client.post('/api/expenses', json=body).get_json()
def settle(uid, g, payer, payee, amt, cur):
    sess(uid); return client.post('/api/settlements', json={'group_id': g, 'payer_id': payer, 'payee_id': payee, 'amount': amt, 'currency': cur}).get_json()
def cs(uid, g):
    sess(uid); return client.get(f'/api/groups/{g}/optimized-balances').get_json()['currency_settlements']
def find(bucket, frm, to):
    for s in bucket:
        if s['from_id'] == frm and s['to_id'] == to: return s['amount']
    return None
def base_of(amt, cur, base):  # base-currency value of `amt` in `cur`
    return amt * (VAL_ILS[cur] / VAL_ILS[base])

print("="*70)

# A) base ILS, Bob owes Alice 100 EUR; PARTIAL settle 40% (recorded in base ILS) -> 60 EUR
print("A) partial settle shrinks the paid currency proportionally")
g = make_group('ILS')
add(1, g, 200, 'EUR', [{'user_id': 1, 'amount': 100}, {'user_id': 2, 'amount': 100}])  # Bob owes Alice 100 EUR
c = cs(1, g); check("A0 Bob owes Alice 100 EUR", abs((find(c.get('EUR', []), 2, 1) or 0) - 100) < 0.5, c)
settle(2, g, 2, 1, base_of(40, 'EUR', 'ILS'), 'ILS')      # pay 40 EUR-worth, but in ILS
c = cs(1, g)
check("A1 EUR now 60 (no ILS phantom)", abs((find(c.get('EUR', []), 2, 1) or 0) - 60) < 0.5 and 'ILS' not in c, c)

# B) settle EXACT in the same currency -> cleared
print("B) exact same-currency settle clears the bucket")
g = make_group('ILS')
add(1, g, 200, 'EUR', [{'user_id': 1, 'amount': 100}, {'user_id': 2, 'amount': 100}])
settle(2, g, 2, 1, 100, 'EUR')                             # 100 EUR exactly (amount is in `currency` units)
c = cs(1, g); check("B1 EUR cleared", not c.get('EUR'), c)

# C) two same-direction currencies, partial (50%) settle in base -> both shrink proportionally
print("C) partial settle of a 2-currency debt shrinks both proportionally")
g = make_group('ALL')
add(1, g, 200, 'EUR', [{'user_id': 1, 'amount': 100}, {'user_id': 2, 'amount': 100}])  # Bob owes 100 EUR
add(1, g, 400, 'USD', [{'user_id': 1, 'amount': 200}, {'user_id': 2, 'amount': 200}])  # Bob owes 200 USD
total = base_of(100, 'EUR', 'ALL') + base_of(200, 'USD', 'ALL')
settle(2, g, 2, 1, total / 2, 'ALL')                       # pay half the total base
c = cs(1, g)
check("C1 EUR ~50, USD ~100, no ALL phantom",
      abs((find(c.get('EUR', []), 2, 1) or 0) - 50) < 1 and abs((find(c.get('USD', []), 2, 1) or 0) - 100) < 1 and 'ALL' not in c, c)

# D) settle the NET of two opposite-direction currencies -> everything clears
print("D) settling the mixed net clears the by-currency view")
g = make_group('ALL')
add(1, g, 200, 'ILS', [{'user_id': 1, 'amount': 100}, {'user_id': 2, 'amount': 100}])  # Bob owes Alice 100 ILS
add(2, g, 50, 'USD', [{'user_id': 1, 'amount': 25}, {'user_id': 2, 'amount': 25}])      # Alice owes Bob 25 USD
net_base = base_of(100, 'ILS', 'ALL') - base_of(25, 'USD', 'ALL')   # Bob owes Alice, net in base
settle(2, g, 2, 1, net_base, 'ALL')
c = cs(1, g); check("D1 by-currency fully cleared", not c, c)

# E) multi-payer contribution stays in the expense currency, settle in base clears
print("E) contribution (multi-payer) + settle in base")
g = make_group('ALL')
# Alice pays 100 EUR dinner; Bob contributed 30 EUR of it; split 50/50
add(1, g, 100, 'EUR',
    [{'user_id': 1, 'amount': 50}, {'user_id': 2, 'amount': 50}],
    contribs=[{'user_id': 1, 'amount': 70}, {'user_id': 2, 'amount': 30}])   # contributions are in EUR
c = cs(1, g)
# Bob owes 50 (his split) - 30 (he already paid) = 20 EUR
check("E1 Bob owes Alice ~20 EUR", abs((find(c.get('EUR', []), 2, 1) or 0) - 20) < 1.0 and 'EUR' in c, c)
settle(2, g, 2, 1, base_of(20, 'EUR', 'ALL'), 'ALL')
c = cs(1, g); check("E2 cleared after base settle", not c.get('EUR'), c)

# F) two independent pairs do not bleed into each other
print("F) independent pairs stay separate")
g = make_group('ILS')
add(1, g, 100, 'EUR', [{'user_id': 1, 'amount': 50}, {'user_id': 2, 'amount': 50}])  # Bob->Alice 50 EUR
add(1, g, 60, 'USD', [{'user_id': 1, 'amount': 30}, {'user_id': 3, 'amount': 30}])   # Carol->Alice 30 USD
settle(2, g, 2, 1, base_of(50, 'EUR', 'ILS'), 'ILS')  # Bob settles his EUR debt in ILS
c = cs(1, g)
check("F1 Bob's EUR cleared", find(c.get('EUR', []), 2, 1) is None, c)
check("F2 Carol's USD untouched (30)", abs((find(c.get('USD', []), 3, 1) or 0) - 30) < 0.5, c)

# G) settling ONE currency line in its own currency clears THAT line and leaves others alone
print("G) per-currency settle clears its own currency, not the others")
g = make_group('ALL')
add(1, g, 200, 'EUR', [{'user_id': 1, 'amount': 100}, {'user_id': 2, 'amount': 100}])  # Bob owes 100 EUR
add(1, g, 400, 'USD', [{'user_id': 1, 'amount': 200}, {'user_id': 2, 'amount': 200}])  # Bob owes 200 USD
settle(2, g, 2, 1, 100, 'EUR')                             # pay the EUR line in full, in EUR
c = cs(1, g)
check("G1 EUR cleared", not c.get('EUR'), c)
check("G2 USD still 200 (untouched)", abs((find(c.get('USD', []), 2, 1) or 0) - 200) < 1, c)

# H) partial settle of one currency line shrinks only that currency
print("H) partial per-currency settle shrinks only that currency")
g = make_group('ALL')
add(1, g, 200, 'EUR', [{'user_id': 1, 'amount': 100}, {'user_id': 2, 'amount': 100}])  # Bob owes 100 EUR
add(1, g, 400, 'USD', [{'user_id': 1, 'amount': 200}, {'user_id': 2, 'amount': 200}])  # Bob owes 200 USD
settle(2, g, 2, 1, 40, 'EUR')                              # pay 40 EUR of the EUR line
c = cs(1, g)
check("H1 EUR -> 60, USD -> 200 (untouched)",
      abs((find(c.get('EUR', []), 2, 1) or 0) - 60) < 1 and abs((find(c.get('USD', []), 2, 1) or 0) - 200) < 1, c)

# I) cross-currency offset that nets to ~0 in base: by-currency must be EMPTY like the other tabs
print("I) cross-currency offset (net ~0) is hidden in by-currency too")
g = make_group('ALL')
add(1, g, 200, 'EUR', [{'user_id': 1, 'amount': 100}, {'user_id': 2, 'amount': 100}])  # Bob owes Alice 100 EUR
# Bob pays a USD expense worth the SAME base as 100 EUR, so Alice owes Bob ~100 EUR-worth USD
usd_amount = base_of(100, 'EUR', 'ALL') / (VAL_ILS['USD'] / VAL_ILS['ALL'])              # USD that equals 100 EUR in base
add(2, g, usd_amount * 2, 'USD', [{'user_id': 1, 'amount': usd_amount}, {'user_id': 2, 'amount': usd_amount}])
sess(1)
full = client.get(f'/api/groups/{g}/optimized-balances').get_json()
check("I1 base view shows nothing (square)", not full.get('base_settlements'), full.get('base_settlements'))
check("I2 by-currency also shows nothing", not full.get('currency_settlements'), full.get('currency_settlements'))

# J) a NON-square pair still shows its per-currency breakdown (offset must not over-hide)
print("J) partially-offsetting pair still shows the per-currency lines")
g = make_group('ALL')
add(1, g, 200, 'EUR', [{'user_id': 1, 'amount': 100}, {'user_id': 2, 'amount': 100}])  # Bob owes Alice 100 EUR
add(2, g, 100, 'USD', [{'user_id': 1, 'amount': 50}, {'user_id': 2, 'amount': 50}])      # Alice owes Bob 50 USD
c = cs(1, g)
check("J1 EUR line present (Bob->Alice 100)", abs((find(c.get('EUR', []), 2, 1) or 0) - 100) < 1, c)
check("J2 USD line present (Alice->Bob 50)", abs((find(c.get('USD', []), 1, 2) or 0) - 50) < 1, c)

print("="*70)
print(f"RESULT: {PASS} passed, {FAIL} failed")
os.chdir(CODE_DIR); shutil.rmtree(_tmp, ignore_errors=True)
sys.exit(1 if FAIL else 0)
