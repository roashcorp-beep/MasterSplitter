import requests
import os
from dotenv import load_dotenv

load_dotenv()
PA_USERNAME = os.getenv('PA_USERNAME')
PA_TOKEN = os.getenv('PA_TOKEN')
PA_DOMAIN = os.getenv('PA_DOMAIN')
BASE_URL = f"https://www.pythonanywhere.com/api/v0/user/{PA_USERNAME}"
HEADERS = {'Authorization': f'Token {PA_TOKEN}'}

print(f"Reloading {PA_DOMAIN}...")
resp = requests.post(f"{BASE_URL}/webapps/{PA_DOMAIN}/reload/", headers=HEADERS)
resp.raise_for_status()
print("✅ Web App reloaded successfully!")
