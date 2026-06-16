import os
import re

import_map = '''
    <script type="importmap">
    {
      "imports": {
        "react": "https://esm.sh/react@18.2.0",
        "react-dom/client": "https://esm.sh/react-dom@18.2.0/client",
        "react/jsx-runtime": "https://esm.sh/react@18.2.0/jsx-runtime",
        "lucide-react": "https://esm.sh/lucide-react@0.292.0"
      }
    }
    </script>
'''

files = ['templates/profile.html', 'templates/admin.html', 'templates/app.html', 'templates/login.html', 'templates/reset_password.html']

for f in files:
    if not os.path.exists(f):
        continue
    with open(f, 'r', encoding='utf-8') as file:
        content = file.read()
    
    # Remove existing importmaps to avoid duplicates
    content = re.sub(r'<script\s+type="importmap">.*?</script>', '', content, flags=re.DOTALL)
    
    # Remove legacy react scripts
    content = re.sub(r'<script\s+crossorigin\s+src="https://unpkg\.com/react@18/umd/react\.production\.min\.js"></script>', '', content)
    content = re.sub(r'<script\s+crossorigin\s+src="https://unpkg\.com/react-dom@18/umd/react-dom\.production\.min\.js"></script>', '', content)
    
    # Insert new import map right after <head> or before <script src="https://unpkg.com/@babel/standalone/babel.min.js">
    # If babel script exists, inject before it
    if '<script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>' in content:
        content = content.replace('<script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>', import_map + '    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>')
    else:
        # Just inject before </head>
        content = content.replace('</head>', import_map + '\n</head>')

    with open(f, 'w', encoding='utf-8') as file:
        file.write(content)
        print(f'Updated {f}')

