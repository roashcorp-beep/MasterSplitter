"""Utility: Print the schema of all tables in the MasterSplitter database."""
import sqlite3

ALLOWED_TABLE_CHARS = set('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_')

conn = sqlite3.connect('master_splitter.db')
cursor = conn.cursor()
cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
tables = cursor.fetchall()
for table in tables:
    table_name = table[0]
    # Whitelist table name characters to prevent SQL injection
    if not all(c in ALLOWED_TABLE_CHARS for c in table_name):
        print(f"  ⚠️ Skipping table with invalid name: {table_name!r}")
        continue
    print(f"Table: {table_name}")
    # PRAGMA doesn't support parameterized queries, so we whitelist instead
    cursor.execute(f"PRAGMA table_info([{table_name}])")
    columns = cursor.fetchall()
    for col in columns:
        print(f"  {col[1]} ({col[2]})")
conn.close()
