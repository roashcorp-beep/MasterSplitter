import os
import sys
import time
import subprocess
from datetime import datetime

try:
    import requests
    from dotenv import load_dotenv
except ImportError:
    print("❌ Missing dependencies. Please run: pip install requests python-dotenv")
    sys.exit(1)

load_dotenv()

PA_USERNAME = os.environ.get('PA_USERNAME')
PA_TOKEN = os.environ.get('PA_TOKEN')
PA_DOMAIN = os.environ.get('PA_DOMAIN')
ADMIN_SECRET_KEY = os.environ.get('ADMIN_SECRET_KEY')

if not all([PA_USERNAME, PA_TOKEN, PA_DOMAIN]):
    print("❌ Error: PA_USERNAME, PA_TOKEN, and PA_DOMAIN must be set in your .env file.")
    sys.exit(1)

BASE_URL = f"https://www.pythonanywhere.com/api/v0/user/{PA_USERNAME}"
HEADERS = {'Authorization': f'Token {PA_TOKEN}'}

def run_local_git():
    print("\n[Step A] Running local Git operations...")
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    commit_msg = f"Auto-deploy: Admin Center Overhaul [{timestamp}]"
    try:
        subprocess.run("git add .", shell=True, check=True)
        # Check if there are changes to commit
        status = subprocess.run("git status --porcelain", shell=True, capture_output=True, text=True)
        if status.stdout.strip():
            # Use quotes around commit message
            subprocess.run(f'git commit -m "{commit_msg}"', shell=True, check=True)
            subprocess.run("git push origin main", shell=True, check=True)
            print("✅ Git commit and push successful.")
        else:
            print("ℹ️ No changes to commit (already up to date).")
    except subprocess.CalledProcessError as e:
        print(f"❌ Git operations failed. Ensure you are on branch 'main' and have remote 'origin' configured. Details: {e}")
        sys.exit(1)

def run_remote_pull():
    print("\n[Step B] Triggering remote Git pull via PythonAnywhere API...")
    try:
        # 1. Fetch available consoles
        resp = requests.get(f"{BASE_URL}/consoles/", headers=HEADERS)
        
        # If we get a 401, token is wrong. Let's fail gracefully.
        if resp.status_code == 401:
            print("❌ Invalid PythonAnywhere API Token.")
            sys.exit(1)
            
        resp.raise_for_status()
        consoles = resp.json()
        
        console_id = None
        for c in consoles:
            if c['name'] == 'Deploy Console':
                console_id = c['id']
                break
        
        for c in consoles:
            print(f"   -> Deleting old console #{c['id']}...")
            requests.delete(f"{BASE_URL}/consoles/{c['id']}/", headers=HEADERS)
            
        print("   -> Creating new 'Deploy Console'...")
        resp = requests.post(f"{BASE_URL}/consoles/", headers=HEADERS, json={'executable': 'bash', 'name': 'Deploy Console'})
        resp.raise_for_status()
        console_id = resp.json()['id']
        time.sleep(10) # Wait for console to spin up
        
        # 3. Send command to console
        cmd = "cd ~/MasterSplitter && git pull\n"
        print(f"   -> Sending command to console #{console_id}: {cmd.strip()}")
        resp = requests.post(f"{BASE_URL}/consoles/{console_id}/send_input/", headers=HEADERS, json={'input': cmd})
        resp.raise_for_status()
        
        print("✅ Remote git pull triggered. Waiting 5 seconds for completion...")
        time.sleep(5)
    except requests.exceptions.RequestException as e:
        print(f"❌ PythonAnywhere Console API failed: {e}")
        sys.exit(1)

def reload_webapp():
    print("\n[Step C] Reloading PythonAnywhere Web App...")
    try:
        resp = requests.post(f"{BASE_URL}/webapps/{PA_DOMAIN}/reload/", headers=HEADERS)
        if resp.status_code == 404:
            print(f"❌ Web App '{PA_DOMAIN}' not found. Please check PA_DOMAIN in .env.")
            sys.exit(1)
        resp.raise_for_status()
        print("✅ Web App reloaded successfully!")
    except requests.exceptions.RequestException as e:
        print(f"❌ Web App reload failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    print("=========================================")
    print("   MASTERSPLITTER CI/CD DEPLOY PIPELINE  ")
    print("=========================================")
    
    run_local_git()
    run_remote_pull()
    reload_webapp()
    
    print("\n=========================================")
    print("🚀 DEPLOYMENT COMPLETE!")
    print(f"Live Site:   https://{PA_DOMAIN}")
    print(f"Admin Panel: https://{PA_DOMAIN}/admin-panel?key={ADMIN_SECRET_KEY}")
    print("=========================================")


