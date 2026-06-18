import glob, re

html_files = glob.glob('Templates/*.html')
for file in html_files:
    with open(file, 'r', encoding='utf-8') as f:
        content = f.read()
    content = content.replace('?v=2.9', '?v=3.0')
    with open(file, 'w', encoding='utf-8') as f:
        f.write(content)

with open('Static/sw.js', 'r', encoding='utf-8') as f:
    sw = f.read()
sw = re.sub(r"const CACHE_NAME = 'mastersplitter-[^']+';", "const CACHE_NAME = 'mastersplitter-v3.0';", sw)
with open('Static/sw.js', 'w', encoding='utf-8') as f:
    f.write(sw)

for file in ['Static/js/main.js', 'Static/js/components/GroupsScreen.jsx']:
    with open(file, 'r', encoding='utf-8') as f:
        content = f.read()
    content = content.replace('?v=2.9', '?v=3.0')
    with open(file, 'w', encoding='utf-8') as f:
        f.write(content)

print('Done - bumped to v3.0')
