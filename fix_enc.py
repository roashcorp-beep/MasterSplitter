with open('Static/js/components/GroupsScreen.jsx', 'r', encoding='utf-8') as f:
    content = f.read()
with open('Static/js/components/GroupsScreen.jsx', 'w', encoding='utf-8') as f:
    f.write(content.encode('cp1252', errors='ignore').decode('utf-8', errors='ignore'))
print("Done")
