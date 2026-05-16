import sqlite3

# התחברות למסד הנתונים
conn = sqlite3.connect('master_splitter.db')
cursor = conn.cursor()

# שליפת כל המשתמשים
cursor.execute("SELECT id, name FROM Users")
users = cursor.fetchall() # רשימה של (id, name)

# שליפת סך ההוצאות לכל משתמש
cursor.execute("""
    SELECT user_id, SUM(amount)
    FROM Expenses
    GROUP BY user_id
""")
# הפיכת התוצאה למילון נוח: {user_id: total_amount}
expenses_data = dict(cursor.fetchall()) 

# חישובי בסיס
total_expenses = sum(expenses_data.values())
num_users = len(users)
average_per_person = total_expenses / num_users if num_users > 0 else 0

print("=======================================")
print("📊 MASTER SPLITTER - BUDAPEST REPORT 📊")
print("=======================================")
print(f"Total Trip Expenses: {total_expenses:.2f} ILS")
print(f"Average Per Person:  {average_per_person:.2f} ILS")
print("---------------------------------------")
print("Balances:")

# חישוב לכל משתמש
for user_id, name in users:
    # אם המשתמש לא שילם כלום, ההוצאה שלו היא 0
    paid = expenses_data.get(user_id, 0.0) 
    balance = paid - average_per_person
    
    if balance > 0:
        status = f"Owed {balance:.2f} ILS (צריך לקבל)"
    elif balance < 0:
        status = f"Owes {abs(balance):.2f} ILS (צריך לשלם)"
    else:
        status = "Settled (מאוזן)"
        
    print(f"- {name}: Paid {paid:.2f} ILS -> {status}")

print("=======================================")

conn.close()