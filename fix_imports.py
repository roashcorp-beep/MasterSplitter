import re

files = [
    'Templates/profile.html',
    'Templates/reset_password.html',
    'Templates/app.html',
    'Static/js/components/GroupsScreen.jsx'
]

for file in files:
    with open(file, 'r', encoding='utf-8') as f:
        content = f.read()

    # Remove import React...
    content = re.sub(r"import\s+React\s*,\s*\{\s*([^}]+)\s*\}\s*from\s*['\"]react['\"];?", r"const { \1 } = React;", content)
    # Remove import { createRoot }...
    content = re.sub(r"import\s*\{\s*createRoot\s*\}\s*from\s*['\"]react-dom/client['\"];?", r"const { createRoot } = ReactDOM;", content)
    # Remove import from lucide-react (multi-line supported)
    content = re.sub(r"import\s*\{\s*([^}]+)\s*\}\s*from\s*['\"]lucide-react['\"];?", r"const { \1 } = window.lucide;", content)

    # Clean up multi-line const { ... } to single line or just let it be, but JS allows multi-line object destructuring!
    
    with open(file, 'w', encoding='utf-8') as f:
        f.write(content)
