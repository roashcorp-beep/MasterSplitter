import sqlite3

# שנה את השם של הקובץ בהתאם לשם של מסד הנתונים שלך בפרויקט
DB_NAME = 'master_splitter.db' 

try:
    conn = sqlite3.connect(DB_NAME)
    # מוסיף את העמודה החסרה לתמונת הפרופיל
    conn.execute("ALTER TABLE Users ADD COLUMN avatar_url TEXT")
    conn.commit()
    print("✅ עמודת avatar_url התווספה בהצלחה! אפשר להפעיל את השרת.")
except Exception as e:
    print(f"❌ שגיאה: {e} (כנראה שהעמודה כבר קיימת או ששם הקובץ לא נכון)")
finally:
    conn.close()