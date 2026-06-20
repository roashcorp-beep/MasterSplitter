with open('GroupsScreen_backup.jsx', 'r', encoding='utf-16le') as f:
    content = f.read()
with open('GroupsScreen_backup_utf8.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Converted")
