import re

files = [
    'Templates/app.html',
    'Templates/login.html',
    'Templates/profile.html',
    'Templates/reset_password.html'
]

cdn_scripts = '''    <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
    <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
'''

for file in files:
    with open(file, 'r', encoding='utf-8') as f:
        content = f.read()

    # Remove any existing importmaps if any snuck back in
    content = re.sub(r"<script type=\"importmap\">.*?</script>", "", content, flags=re.DOTALL)
    
    # Check if the CDNs are already there
    if "unpkg.com/react@18" not in content:
        # Insert them before the babel script
        content = content.replace('<script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>', cdn_scripts + '    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>')

    with open(file, 'w', encoding='utf-8') as f:
        f.write(content)
