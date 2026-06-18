import requests
import json
import random

session = requests.Session()

# 1. Signup
url_signup = "https://roashcorp.pythonanywhere.com/api/signup"
rand_phone = str(random.randint(1000000000, 9999999999))
payload_signup = {
    "username": "testuser_agent2",
    "email": f"testuser_{rand_phone}@roash.com",
    "phone": rand_phone,
    "password": "Password123!"
}
resp_signup = session.post(url_signup, json=payload_signup)
print("Signup:", resp_signup.status_code, resp_signup.text)

# 2. Login
url_login = "https://roashcorp.pythonanywhere.com/api/login"
payload_login = {
    "username": "testuser_agent2",
    "password": "Password123!"
}
resp_login = session.post(url_login, json=payload_login)
print("Login:", resp_login.status_code, resp_login.text)

# 3. Create Trip
url_create = "https://roashcorp.pythonanywhere.com/api/trips/create"
payload_create = {
    "name": "Test Trip Agent",
    "budget": 500,
    "participants": [
        {"type": "guest", "name": "Guest1"}
    ],
    "budgets_json": {"currency": "USD", "daily": 100},
    "is_budget_per_user": True
}
resp_create = session.post(url_create, json=payload_create)
print("Create Trip:", resp_create.status_code, resp_create.text)

# 4. Get Trips
url_trips = "https://roashcorp.pythonanywhere.com/api/trips"
resp_trips = session.get(url_trips)
print("Trips:", resp_trips.status_code)
try:
    data = resp_trips.json()
    print("Trips data:")
    print(json.dumps(data, indent=2))
except Exception as e:
    print("Error parsing JSON:", e)

