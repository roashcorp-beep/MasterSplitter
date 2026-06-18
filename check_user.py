import sqlite3
conn = sqlite3.connect('database.db')
c = conn.cursor()
c.execute("SELECT id, username, email FROM users WHERE username LIKE '%Moran%' OR email LIKE '%Moran%'")
rows = c.fetchall()
for r in rows:
    print(r)
