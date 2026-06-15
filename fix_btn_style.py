# -*- coding: utf-8 -*-
with open('Static/js/components/GroupsScreen.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    'className="invite-action-btn guest w-full mb-3 border-dashed"',
    'className="w-full mb-3 flex items-center justify-center p-3 rounded-xl bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-800 dark:text-white border-0 outline-none transition-all"'
)

with open('Static/js/components/GroupsScreen.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
