# -*- coding: utf-8 -*-
import re

with open('Static/js/components/GroupsScreen.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# For Create Modal:
create_budget_toggle_re = r'(<div className="form-group">\s*<button type="button" class[^>]+onClick=\{\(\) => setCreateShowBudget\(!createShowBudget\)\}[^>]+>\s*⚙️ <span>[^<]+</span>\s*</button>\s*</div>)'
create_budget_block_re = r'(\{createShowBudget && \(\s*<div id="advanced-budget-settings"[\s\S]+?</div>\s*\)\})'

c_toggle = re.search(create_budget_toggle_re, content)
c_block = re.search(create_budget_block_re, content)

if c_toggle and c_block:
    content = content.replace(c_toggle.group(1), '')
    content = content.replace(c_block.group(1), '')
    
    # insert before <div className="modal-actions">
    insertion = c_toggle.group(1) + '\n' + c_block.group(1) + '\n'
    content = content.replace('<div className="modal-actions">', insertion + '<div className="modal-actions">', 1)

# For Edit Modal:
edit_budget_toggle_re = r'(<div className="form-group">\s*<button type="button" class[^>]+onClick=\{\(\) => setEditShowBudget\(!editShowBudget\)\}[^>]+>\s*⚙️ <span>[^<]+</span>\s*</button>\s*</div>)'
edit_budget_block_re = r'(\{editShowBudget && \(\s*<div id="edit-advanced-budget-settings"[\s\S]+?</div>\s*\)\})'

e_toggle = re.search(edit_budget_toggle_re, content)
e_block = re.search(edit_budget_block_re, content)

if e_toggle and e_block:
    content = content.replace(e_toggle.group(1), '')
    content = content.replace(e_block.group(1), '')
    
    # The second occurrence of <div className="modal-actions">
    parts = content.split('<div className="modal-actions">')
    if len(parts) >= 3:
        parts[2] = e_toggle.group(1) + '\n' + e_block.group(1) + '\n<div className="modal-actions">' + parts[2]
        content = parts[0] + '<div className="modal-actions">' + parts[1] + parts[2]

# Fix spacing in 'My Groups' layout
content = content.replace('p-4 pt-24 mt-8', 'p-4 pt-16')

with open('Static/js/components/GroupsScreen.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('Done layout fix')
