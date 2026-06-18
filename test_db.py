import json
import sqlite3

conn = sqlite3.connect('instance/database.db')
c = conn.cursor()
c.execute("SELECT id, destination, owner_id FROM Trips LIMIT 1")
t = c.fetchone()
if not t:
    print("No trips")
else:
    c.execute("SELECT user_id, guest_name FROM TripMembers WHERE trip_id=?", (t[0],))
    members = c.fetchall()
    print("Trip:", t)
    print("Members:", members)

