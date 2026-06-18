import requests

BASE_URL = "https://www.pythonanywhere.com/api/v0/user/RoashCorp"
PA_TOKEN = "a08d29ff70a5c4ba5e1351ef67fb630ec8b8cdcd"
HEADERS = {'Authorization': f'Token {PA_TOKEN}'}
PA_DOMAIN = "roashcorp.pythonanywhere.com"

resp = requests.post(f"{BASE_URL}/webapps/{PA_DOMAIN}/reload/", headers=HEADERS)
print("Status Code:", resp.status_code)
print("Response:", resp.text)
