import requests
import os
from dotenv import load_dotenv

load_dotenv()
PA_USERNAME = os.getenv('PA_USERNAME')
PA_TOKEN = os.getenv('PA_TOKEN')
PA_DOMAIN = os.getenv('PA_DOMAIN')
BASE_URL = f"https://www.pythonanywhere.com/api/v0/user/{PA_USERNAME}"
HEADERS = {'Authorization': f'Token {PA_TOKEN}'}

url = f"{BASE_URL}/files/path/home/{PA_USERNAME}/MasterSplitter/Templates/app.html"
resp = requests.get(url, headers=HEADERS)
if resp.status_code == 200:
    content = resp.text
    if 'import' in content:
        print("FOUND IMPORT IN APP.HTML!!!")
        import re
        matches = re.finditer(r'.{0,50}import.{0,50}', content)
        for m in matches:
            print("MATCH:", m.group(0).strip())
    else:
        print("NO IMPORT IN APP.HTML!")
else:
    print(f"Failed to fetch file: {resp.status_code} {resp.text}")
