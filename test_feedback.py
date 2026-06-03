import requests

# Test feedback API
session = requests.Session()
# Login first
res = session.post("http://localhost:5000/api/login", json={"username": "test", "password": "password"})
if res.status_code == 200:
    print("Logged in successfully.")
else:
    # Try to register
    res = session.post("http://localhost:5000/api/register", json={"username": "test", "password": "password"})
    print("Register response:", res.json())
    res = session.post("http://localhost:5000/api/login", json={"username": "test", "password": "password"})

res = session.post("http://localhost:5000/api/feedback", json={"content": "This is a test feedback!"})
print("Feedback response:", res.json())
