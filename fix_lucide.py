with open('Static/js/components/GroupsScreen.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('const { Users, Link, Settings, ChevronDown, Check } = window.lucide;\n', '')
if 'import { Users' not in content:
    content = 'import { Users, Link, Settings, ChevronDown, Check } from "lucide-react";\n' + content

content = content.replace('window.lucide.Users', 'Users')
content = content.replace('window.lucide.Link', 'Link')
content = content.replace('window.lucide.Settings', 'Settings')
content = content.replace('window.lucide.ChevronDown', 'ChevronDown')
content = content.replace('window.lucide.Check', 'Check')

with open('Static/js/components/GroupsScreen.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
