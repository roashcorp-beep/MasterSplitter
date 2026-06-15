# -*- coding: utf-8 -*-
with open('Static/js/components/GroupsScreen.jsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

def add_wrapper(lines, modal_start_str):
    modal_start = -1
    for i, l in enumerate(lines):
        if modal_start_str in l:
            modal_start = i
            break
            
    if modal_start == -1: return lines
    
    # We want to wrap from right after <div className="modal-header">...</div> up to just before <div className="modal-actions">
    header_end = -1
    for i in range(modal_start, len(lines)):
        if '<div className="form-group">' in lines[i]:
            header_end = i
            break
            
    actions_start = -1
    for i in range(modal_start, len(lines)):
        if '<div className="modal-actions">' in lines[i]:
            actions_start = i
            break
            
    if header_end != -1 and actions_start != -1 and header_end < actions_start:
        new_lines = lines[:header_end]
        new_lines.append('                    <div className="modal-body-content space-y-4">\n')
        new_lines += lines[header_end:actions_start]
        new_lines.append('                    </div>\n')
        new_lines += lines[actions_start:]
        return new_lines
        
    return lines

lines = add_wrapper(lines, 'const renderCreateModal = () => {')
lines = add_wrapper(lines, 'const renderEditModal = () => {')

with open('Static/js/components/GroupsScreen.jsx', 'w', encoding='utf-8') as f:
    f.writelines(lines)
print('Done wrapper!')
