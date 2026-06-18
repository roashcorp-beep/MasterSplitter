import re

with open('Static/sw.js', 'r', encoding='utf-8') as f:
    content = f.read()

content = re.sub(r"const CACHE_NAME = 'mastersplitter-[^']+';", "const CACHE_NAME = 'mastersplitter-v2.5';", content)

with open('Static/sw.js', 'w', encoding='utf-8') as f:
    f.write(content)
