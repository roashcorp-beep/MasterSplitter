import requests

url = "https://roashcorp.pythonanywhere.com/api/login"

for user in ["Moran Roash", "moran", "moran@roash.com", "moranroash"]:
    payload = {"username": user, "password": "Romora29@!"}
    try:
        resp = requests.post(url, json=payload)
        print(f"Trying {user}: {resp.status_code} {resp.text}")
    except Exception as e:
        print(f"Error for {user}: {e}")
