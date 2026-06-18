import re
import glob

html_files = glob.glob('Templates/*.html')
for file in html_files:
    with open(file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Replace ?v=2.3 with ?v=2.4
    content = content.replace('?v=2.3', '?v=2.4')
    
    # Add ?v=2.4 to GroupsScreen.jsx
    content = content.replace("GroupsScreen.jsx') }}\"", "GroupsScreen.jsx') }}?v=2.4\"")
    # If it already had ?v=2.4?v=2.4, fix it
    content = content.replace("?v=2.4?v=2.4", "?v=2.4")

    with open(file, 'w', encoding='utf-8') as f:
        f.write(content)
