with open('Static/js/components/GroupsScreen.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

if '/** @jsx React.createElement */' not in content:
    content = "/** @jsx React.createElement */\n/** @jsxFrag React.Fragment */\n" + content
    with open('Static/js/components/GroupsScreen.jsx', 'w', encoding='utf-8') as f:
        f.write(content)
