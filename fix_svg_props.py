import re

with open('Static/js/components/GroupsScreen.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('const IconUsers = ({size=22}) => <svg', 'const IconUsers = ({size=22, ...props}) => <svg {...props}')
content = content.replace('const IconLink = ({size=22}) => <svg', 'const IconLink = ({size=22, ...props}) => <svg {...props}')
content = content.replace('const IconSettings = ({size=18}) => <svg', 'const IconSettings = ({size=18, ...props}) => <svg {...props}')
content = content.replace('const IconChevronDown = ({size=16}) => <svg', 'const IconChevronDown = ({size=16, ...props}) => <svg {...props}')
content = content.replace('const IconCheck = ({size=18}) => <svg', 'const IconCheck = ({size=18, ...props}) => <svg {...props}')
content = content.replace('const IconPlus = ({size=18}) => <svg', 'const IconPlus = ({size=18, ...props}) => <svg {...props}')
content = content.replace('const IconEdit2 = ({size=16}) => <svg', 'const IconEdit2 = ({size=16, ...props}) => <svg {...props}')

with open('Static/js/components/GroupsScreen.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
