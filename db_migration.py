import sqlite3

DATABASE_PATH = 'Master_Splitter/master_splitter.db'

def migrate_db():
    conn = None
    try:
        conn = sqlite3.connect(DATABASE_PATH)
        cursor = conn.cursor()

        # Add 'budget' column to 'Trips' table if it doesn't exist
        cursor.execute("PRAGMA table_info(Trips)")
        columns = [col[1] for col in cursor.fetchall()]
        if 'budget' not in columns:
            cursor.execute("ALTER TABLE Trips ADD COLUMN budget REAL DEFAULT 0")
            print("Added 'budget' column to 'Trips' table.")
        else:
            print("'budget' column already exists in 'Trips' table.")

        # Add 'category' column to 'Expenses' table if it doesn't exist
        cursor.execute("PRAGMA table_info(Expenses)")
        columns = [col[1] for col in cursor.fetchall()]
        if 'category' not in columns:
            cursor.execute("ALTER TABLE Expenses ADD COLUMN category TEXT DEFAULT 'General'")
            print("Added 'category' column to 'Expenses' table.")
        else:
            print("'category' column already exists in 'Expenses' table.")

        conn.commit()
        print("Database migration completed successfully.")

    except sqlite3.Error as e:
        print(f"Database error: {e}")
    finally:
        if conn:
            conn.close()

if __name__ == '__main__':
    migrate_db()
