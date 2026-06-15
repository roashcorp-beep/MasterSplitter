# -*- coding: utf-8 -*-
with open('Static/js/components/GroupsScreen.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# We know the exact block to move: from <div className="form-group"> with setEditShowBudget to the end of <div id="advanced-budget-settings" ...>
import re
block_re = r'(<div className="form-group">\s*<button type="button" className="w-full bg-blue-100[^>]+onClick=\{\(\) => setEditShowBudget\(!editShowBudget\)\}[\s\S]*?</div>\s*</div>)'

m = re.search(block_re, content)
if m:
    block = m.group(1)
    content = content.replace(block, '')
    
    # Insert it before the second <div className="modal-actions">
    parts = content.split('<div className="modal-actions">')
    if len(parts) >= 3:
        parts[2] = block + '\n<div className="modal-actions">' + parts[2]
        content = parts[0] + '<div className="modal-actions">' + parts[1] + parts[2]
        
        with open('Static/js/components/GroupsScreen.jsx', 'w', encoding='utf-8') as f:
            f.write(content)
        print('Fixed edit modal layout')
    else:
        print('Could not find modal-actions')
else:
    print('Could not find block')
