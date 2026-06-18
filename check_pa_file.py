import requests
import os
from dotenv import load_dotenv

load_dotenv()
PA_USERNAME = os.getenv('PA_USERNAME')
PA_TOKEN = os.getenv('PA_TOKEN')
PA_DOMAIN = os.getenv('PA_DOMAIN')
BASE_URL = f"https://www.pythonanywhere.com/api/v0/user/{PA_USERNAME}"
HEADERS = {'Authorization': f'Token {PA_TOKEN}'}

# Get the contents of GroupsScreen.jsx on PythonAnywhere
url = f"{BASE_URL}/files/path/home/{PA_USERNAME}/MasterSplitter/Static/js/components/GroupsScreen.jsx"
resp = requests.get(url, headers=HEADERS)
if resp.status_code == 200:
    content = resp.text
    if 'import ' in content:
        print("FOUND IMPORT IN PYTHONANYWHERE FILE!!!")
        print(content[:200])
    else:
        print("NO IMPORT IN PYTHONANYWHERE FILE!")
        print(content[:200])
else:
    print(f"Failed to fetch file: {resp.status_code} {resp.text}")
