import requests
import os
from dotenv import load_dotenv

load_dotenv()
PA_USERNAME = os.getenv('PA_USERNAME')
PA_TOKEN = os.getenv('PA_TOKEN')
PA_DOMAIN = os.getenv('PA_DOMAIN')
BASE_URL = f"https://www.pythonanywhere.com/api/v0/user/{PA_USERNAME}"
HEADERS = {'Authorization': f'Token {PA_TOKEN}'}

# We can't easily query SQLite over PA API, but we can upload a script to run it and read the output!
script = '''
import sqlite3
import json
conn = sqlite3.connect('/home/roashcorp/MasterSplitter/instance/database.db')
c = conn.cursor()
try:
    c.execute("SELECT id, username, email FROM user")
    rows = c.fetchall()
    print(json.dumps(rows))
except Exception as e:
    print(str(e))
'''

import tempfile
with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.py') as f:
    f.write(script)
    tmp_name = f.name

upload_url = f"{BASE_URL}/files/path/home/{PA_USERNAME}/MasterSplitter/db_check.py"
with open(tmp_name, 'rb') as f:
    resp = requests.post(upload_url, headers=HEADERS, files={'content': f})

if resp.status_code in [200, 201]:
    # Run the script using PythonAnywhere console? No, we don't have console API.
    pass

