
import sqlite3

def init_db():
    conn = sqlite3.connect('master_splitter.db')
    cursor = conn.cursor()

    # Create Trips table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS Trips (
            id INTEGER PRIMARY KEY,
            destination TEXT
        )
    """)

    # Create Users table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS Users (
            id INTEGER PRIMARY KEY,
            name TEXT
        )
    """)

    # Create Expenses table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS Expenses (
            id INTEGER PRIMARY KEY,
            trip_id INTEGER,
            user_id INTEGER,
            amount REAL,
            currency TEXT,
            description TEXT,
            FOREIGN KEY (trip_id) REFERENCES Trips(id),
            FOREIGN KEY (user_id) REFERENCES Users(id)
        )
    """)

    # Insert sample trip
    cursor.execute("INSERT INTO Trips (destination) VALUES (?)", ("Budapest",))
    trip_id = cursor.lastrowid

    # Insert sample users
    users = [("Avi",), ("Alon",), ("Shlomi",), ("Yonatan",)]
    cursor.executemany("INSERT INTO Users (name) VALUES (?)", users)

    # Get user IDs for sample expenses (assuming IDs are 1, 2, 3, 4 for Avi, Alon, Shlomi, Yonatan respectively)
    # In a real application, you'd fetch these IDs dynamically.
    # For this example, we'll assume the order of insertion matches the IDs.
    cursor.execute("SELECT id FROM Users WHERE name = 'Avi'")
    avi_id = cursor.fetchone()[0]
    cursor.execute("SELECT id FROM Users WHERE name = 'Alon'")
    alon_id = cursor.fetchone()[0]
    cursor.execute("SELECT id FROM Users WHERE name = 'Shlomi'")
    shlomi_id = cursor.fetchone()[0]
    cursor.execute("SELECT id FROM Users WHERE name = 'Yonatan'")
    yonatan_id = cursor.fetchone()[0]


    # Insert sample expenses
    expenses = [
        (trip_id, avi_id, 500.00, "HUF", "Hotel for 2 nights"),
        (trip_id, alon_id, 150.00, "HUF", "Dinner at local restaurant"),
        (trip_id, shlomi_id, 75.50, "HUF", "Museum entrance"),
        (trip_id, yonatan_id, 20.00, "HUF", "Coffee and pastry"),
        (trip_id, avi_id, 300.00, "HUF", "Taxi to airport"),
    ]
    cursor.executemany("INSERT INTO Expenses (trip_id, user_id, amount, currency, description) VALUES (?, ?, ?, ?, ?)", expenses)

    conn.commit()
    conn.close()

if __name__ == "__main__":
    init_db()
