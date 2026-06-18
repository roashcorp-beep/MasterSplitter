import requests
import json

session = requests.Session()

# 1. Signup
url_signup = "https://roashcorp.pythonanywhere.com/api/signup"
payload_signup = {
    "username": "testuser_agent1",
    "email": "testuser_agent1@roash.com",
    "phone": "0501234567",
    "password": "Password123!"
}
resp_signup = session.post(url_signup, json=payload_signup)
print("Signup:", resp_signup.status_code, resp_signup.text)

# 2. Login
url_login = "https://roashcorp.pythonanywhere.com/api/login"
payload_login = {
    "username": "testuser_agent1",
    "password": "Password123!"
}
resp_login = session.post(url_login, json=payload_login)
print("Login:", resp_login.status_code, resp_login.text)

# 3. Get Dashboard
url_dashboard = "https://roashcorp.pythonanywhere.com/api/dashboard"
resp_dashboard = session.get(url_dashboard)
print("Dashboard:", resp_dashboard.status_code)
try:
    print(json.dumps(resp_dashboard.json(), ensure_ascii=False)[:500])
except:
    pass

