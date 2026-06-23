import sqlite3
import os
import sys

sys.path.append(r'/home/RoashCorp/MasterSplitter')
# Fallback to local path if not on pythonanywhere
if not os.path.exists('/home/RoashCorp/MasterSplitter'):
    sys.path.append(r'c:\Users\nufar\OneDrive\Desktop\AI_Agent\Master_splitter')

import Server
from Server import get_exchange_rate

conn = Server.get_db_connection()
cursor = conn.cursor()

print("Fixing historical Expenses...")
cursor.execute("SELECT id, amount, currency FROM Expenses WHERE original_amount IS NULL AND currency != 'ILS'")
expenses = cursor.fetchall()
for exp in expenses:
    rate = get_exchange_rate(exp['currency'])
    if rate and rate > 0:
        orig_amt = round(exp['amount'] / rate, 2)
        cursor.execute("UPDATE Expenses SET original_amount = ? WHERE id = ?", (orig_amt, exp['id']))
        print(f"Fixed Expense {exp['id']}: {exp['amount']} ILS -> {orig_amt} {exp['currency']}")

print("Fixing historical Settlements...")
cursor.execute("SELECT id, amount, currency FROM Settlements WHERE original_amount IS NULL AND currency != 'ILS'")
settlements = cursor.fetchall()
for sett in settlements:
    rate = get_exchange_rate(sett['currency'])
    if rate and rate > 0:
        orig_amt = round(sett['amount'] / rate, 2)
        cursor.execute("UPDATE Settlements SET original_amount = ? WHERE id = ?", (orig_amt, sett['id']))
        print(f"Fixed Settlement {sett['id']}: {sett['amount']} ILS -> {orig_amt} {sett['currency']}")

conn.commit()
conn.close()
print("Done!")
