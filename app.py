import streamlit as st
import sqlite3

# עיצוב בסיסי לעמוד
st.set_page_config(page_title="Master Splitter", page_icon="💸", layout="centered")
st.title("💸 Master Splitter")
st.subheader("✈️ Budapest Trip")

# התחברות למסד הנתונים
conn = sqlite3.connect('master_splitter.db')
cursor = conn.cursor()

# שליפת נתוני המשתמשים
cursor.execute("SELECT id, name FROM Users")
users = cursor.fetchall()
user_dict = {user[1]: user[0] for user in users}

# --- אזור הוספת הוצאה חדשה ---
st.write("### ➕ הוסף הוצאה חדשה")
with st.form("add_expense_form", clear_on_submit=True):
    col1, col2 = st.columns(2)
    with col1:
        payer_name = st.selectbox("מי שילם?", list(user_dict.keys()))
        amount = st.number_input("סכום (ILS)", min_value=0.0, format="%.2f")
    with col2:
        description = st.text_input("על מה?")
        
    submit = st.form_submit_button("הוסף לחשבון")

    if submit and amount > 0:
        payer_id = user_dict[payer_name]
        cursor.execute("INSERT INTO Expenses (trip_id, user_id, amount, currency, description) VALUES (1, ?, ?, 'ILS', ?)", 
                       (payer_id, amount, description))
        conn.commit()
        st.success("ההוצאה נוספה בהצלחה!")
        st.rerun()

# --- אזור סיכום היתרות ---
st.write("### 📊 מצב החשבון")

cursor.execute("SELECT user_id, SUM(amount) FROM Expenses GROUP BY user_id")
expenses_data = dict(cursor.fetchall()) 

total_expenses = sum(expenses_data.values())
num_users = len(users)
average_per_person = total_expenses / num_users if num_users > 0 else 0

col1, col2 = st.columns(2)
col1.metric("סך כל ההוצאות בטיול", f"₪ {total_expenses:.2f}")
col2.metric("ממוצע לאדם", f"₪ {average_per_person:.2f}")

st.divider()

for user_id, name in users:
    paid = expenses_data.get(user_id, 0.0) 
    balance = paid - average_per_person
    
    if balance > 0:
        st.info(f"**{name}** שילם ₪{paid:.2f}  👉  **צריך לקבל ₪{balance:.2f}**")
    elif balance < 0:
        st.error(f"**{name}** שילם ₪{paid:.2f}  👉  **חייב לשלם ₪{abs(balance):.2f}**")
    else:
        st.success(f"**{name}** שילם ₪{paid:.2f}  👉  **מאוזן**")

st.divider()

# --- אזור היסטוריית הוצאות עם אפשרות מחיקה ---
st.write("### 📜 פירוט הוצאות הטיול")

# הפעם אנחנו שולפים גם את ה-id של ההוצאה כדי שנוכל למחוק אותה
cursor.execute("""
    SELECT Expenses.id, Users.name, Expenses.amount, Expenses.description 
    FROM Expenses 
    JOIN Users ON Expenses.user_id = Users.id
    ORDER BY Expenses.id DESC
""")
history = cursor.fetchall()

if history:
    # יצירת כותרות לטבלה
    col_h1, col_h2, col_h3, col_h4 = st.columns([2, 2, 4, 1])
    col_h1.write("**מי שילם**")
    col_h2.write("**סכום**")
    col_h3.write("**על מה**")
    col_h4.write("**פעולה**")
    
    # הדפסת כל שורה עם כפתור מחיקה
    for row in history:
        exp_id, payer, amount, desc = row
        col1, col2, col3, col4 = st.columns([2, 2, 4, 1])
        
        col1.write(payer)
        col2.write(f"₪ {amount:.2f}")
        col3.write(desc)
        
        # כפתור המחיקה. ה-key חייב להיות ייחודי לכל שורה
        with col4:
            if st.button("❌", key=f"del_{exp_id}"):
                cursor.execute("DELETE FROM Expenses WHERE id = ?", (exp_id,))
                conn.commit()
                st.rerun() # רענון העמוד כדי להציג את החישוב החדש
else:
    st.write("עדיין אין הוצאות בטיול הזה.")

conn.close()