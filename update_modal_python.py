with open('Static/js/components/GroupsScreen.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

with open('new_modal.txt', 'r', encoding='utf-8') as f:
    new_modal = f.read()

if 'import { Users' not in content:
    content = 'import { Users, Link, Settings, ChevronDown, Check } from "lucide-react";\n' + content

render_edit_modal_start = content.find('const renderEditModal = () => {')
render_edit_modal_end = content.find('return (\n        <React.Fragment>')
if render_edit_modal_end == -1:
    render_edit_modal_end = content.find('return (\r\n        <React.Fragment>')

content = content[:render_edit_modal_start] + new_modal + '\n\n' + content[render_edit_modal_end:]

with open('Static/js/components/GroupsScreen.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
