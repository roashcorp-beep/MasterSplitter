import re
with open('Static/js/components/GroupsScreen.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = re.sub(r"[^\x00-\x7F]+const \{ useState", "const { useState", content)

with open('Static/js/components/GroupsScreen.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
