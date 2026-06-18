import glob
import re

html_files = glob.glob('Templates/*.html')
for file in html_files:
    with open(file, 'r', encoding='utf-8') as f:
        content = f.read()
    content = content.replace('?v=2.8', '?v=2.9')
    with open(file, 'w', encoding='utf-8') as f:
        f.write(content)

with open('Static/sw.js', 'r', encoding='utf-8') as f:
    sw = f.read()
sw = re.sub(r"const CACHE_NAME = 'mastersplitter-[^']+';", "const CACHE_NAME = 'mastersplitter-v2.9';", sw)
with open('Static/sw.js', 'w', encoding='utf-8') as f:
    f.write(sw)
