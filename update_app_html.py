import re

with open('Templates/app.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace const { useEffect, useState } = React;
content = re.sub(r"const\s*\{\s*useEffect,\s*useState\s*\}\s*=\s*React;", "", content)
# Replace const { createRoot } = ReactDOM;
content = re.sub(r"const\s*\{\s*createRoot\s*\}\s*=\s*ReactDOM;", "", content)

# Replace useState with React.useState
content = re.sub(r"\buseState\b", "React.useState", content)
# Replace useEffect with React.useEffect
content = re.sub(r"\buseEffect\b", "React.useEffect", content)
# Replace createRoot with ReactDOM.createRoot
content = re.sub(r"\bcreateRoot\b", "ReactDOM.createRoot", content)

with open('Templates/app.html', 'w', encoding='utf-8') as f:
    f.write(content)
