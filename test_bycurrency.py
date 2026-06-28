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

# C) two same-direction currencies, partial settle from summaries (in base ALL): the settle-up
#    FIFO-links to the OLDEST expense first, so it clears the EUR debt then dents USD — the
#    by-currency view reflects what was actually paid down (oldest-first), not a flat shrink.
print("C) partial settle FIFO-clears the oldest currency first, then dents the next")
g = make_group('ALL')
add(1, g, 200, 'EUR', [{'user_id': 1, 'amount': 100}, {'user_id': 2, 'amount': 100}])  # Bob owes 100 EUR (oldest)
add(1, g, 400, 'USD', [{'user_id': 1, 'amount': 200}, {'user_id': 2, 'amount': 200}])  # Bob owes 200 USD
total = base_of(100, 'EUR', 'ALL') + base_of(200, 'USD', 'ALL')
settle(2, g, 2, 1, total / 2, 'ALL')                       # pay half the total base, FIFO oldest-first
c = cs(1, g)
# half = 50% of total; EUR share (1/3 of total) is cleared fully, the rest (~half-EUR) dents USD
usd_left = 200 - (total / 2 - base_of(100, 'EUR', 'ALL')) * (VAL_ILS['ALL'] / VAL_ILS['USD'])
check("C1 EUR cleared first, USD reduced, no ALL phantom",
      not c.get('EUR') and abs((find(c.get('USD', []), 2, 1) or 0) - usd_left) < 1 and 'ALL' not in c, c)

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

# K) REAL CASE (live group 11): base=ALL, a USD debt + an ILS debt; the ILS expense is
#    settled via a summaries settle-up recorded in the BASE currency (ALL) but FIFO-linked
#    to the ILS expense. The USD debt must stay intact ($100, not shrunk), ILS must clear.
print("K) settle ILS expense recorded in base ALL -> USD stays $100, ILS clears (group-11 repro)")
g = make_group('ALL')
# Oldest expense first (FIFO target): Alice pays 210 ILS, split 3 ways (70 each)
add(1, g, 210, 'ILS', [{'user_id': 1, 'amount': 70}, {'user_id': 2, 'amount': 70}, {'user_id': 3, 'amount': 70}])
# Then Alice pays 300 USD, split 3 ways (100 each)
add(1, g, 300, 'USD', [{'user_id': 1, 'amount': 100}, {'user_id': 2, 'amount': 100}, {'user_id': 3, 'amount': 100}])
c = cs(1, g)
check("K0 before: Bob owes USD 100 and ILS 70",
      abs((find(c.get('USD', []), 2, 1) or 0) - 100) < 1 and abs((find(c.get('ILS', []), 2, 1) or 0) - 70) < 1, c)
# Settle the ILS share for Bob & Carol from summaries, recorded in BASE (ALL); FIFO links to the ILS expense
for u in (2, 3):
    settle(u, g, u, 1, base_of(70, 'ILS', 'ALL'), 'ALL')
c = cs(1, g)
check("K1 USD still 100 for Bob (not shrunk)", abs((find(c.get('USD', []), 2, 1) or 0) - 100) < 1, c)
check("K2 USD still 100 for Carol (not shrunk)", abs((find(c.get('USD', []), 3, 1) or 0) - 100) < 1, c)
check("K3 ILS fully cleared (no shekel bucket)", not c.get('ILS'), c)
# Moran (payer) is owed exactly 2 x 100 USD, nothing in ILS
sess(1)
ucb = client.get(f'/api/groups/{g}/optimized-balances').get_json()['user_currency_balances'].get('1', {})
check("K4 payer owed USD 200, no ILS line", abs(ucb.get('USD', 0) - 200) < 1 and abs(ucb.get('ILS', 0)) < 1, ucb)

# L) a settlement that rounds a few cents OVER its own currency's debt must not shave another
#    currency (the live group-11 "ALL 199.95 instead of 200" bug).
print("L) settlement rounding overflow does not leak into another currency")
g = make_group('ALL')
add(1, g, 200, 'ILS', [{'user_id': 1, 'amount': 66.67}, {'user_id': 2, 'amount': 66.67}, {'user_id': 3, 'amount': 66.66}])  # ILS (oldest)
add(1, g, 600, 'ALL', [{'user_id': 1, 'amount': 200}, {'user_id': 2, 'amount': 200}, {'user_id': 3, 'amount': 200}])         # ALL, 200 each
conn = Server.get_db_connection(); cc = conn.cursor()
ils_eid = cc.execute("SELECT id FROM Expenses WHERE group_id=? AND currency='ILS'", (g,)).fetchone()['id']
bob_ils = float(cc.execute("SELECT amount FROM ExpenseSplits WHERE expense_id=? AND user_id=2", (ils_eid,)).fetchone()['amount'])
# settlement overpays Bob's ILS share by 0.05 base, recorded in ALL, linked to the ILS expense
cc.execute("INSERT INTO Settlements (group_id,payer_id,payee_id,amount,original_amount,currency,expense_id,created_at) VALUES (?,?,?,?,?,?,?,?)",
           (g, 2, 1, bob_ils + 0.05, bob_ils + 0.05, 'ALL', ils_eid, '2026-01-01T00:00:00'))
conn.commit(); conn.close()
sess(1)
full = client.get(f'/api/groups/{g}/optimized-balances').get_json()
c = full['currency_settlements']
check("L1 by-currency: Bob's ALL stays exactly 200 (overflow discarded)", abs((find(c.get('ALL', []), 2, 1) or 0) - 200) < 0.02, c)
check("L2 Bob's ILS is cleared", not any(s['from_id'] == 2 for s in c.get('ILS', [])), c.get('ILS'))
# group-currency (base) view must also be exact, not 199.95
bob_base = next((s['amount'] for s in full['base_settlements'] if s['from_id'] == 2 and s['to_id'] == 1), None)
check("L3 group-currency view: Bob owes exactly 200 (not 199.95)", abs((bob_base or 0) - 200) < 0.02, full['base_settlements'])

print("="*70)
print(f"RESULT: {PASS} passed, {FAIL} failed")
os.chdir(CODE_DIR); shutil.rmtree(_tmp, ignore_errors=True)
sys.exit(1 if FAIL else 0)
