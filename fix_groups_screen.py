# -*- coding: utf-8 -*-
with open('Static/js/components/GroupsScreen.jsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

def fix_modal(lines, modal_start_str, budget_toggle_start_str, invite_start_str, actions_start_str):
    modal_start = -1
    for i, l in enumerate(lines):
        if modal_start_str in l:
            modal_start = i
            break
            
    if modal_start == -1: return lines
    
    budget_start = -1
    budget_end = -1
    invite_start = -1
    actions_start = -1
    
    # find budget block
    for i in range(modal_start, len(lines)):
        if budget_toggle_start_str in lines[i]:
            budget_start = i
            break
            
    # find invite start
    for i in range(modal_start, len(lines)):
        if invite_start_str in lines[i]:
            invite_start = i
            break
            
    # budget end is right before invite start
    budget_end = invite_start - 1
    
    # find actions start
    for i in range(modal_start, len(lines)):
        if actions_start_str in lines[i]:
            actions_start = i
            break
            
    if budget_start != -1 and invite_start != -1 and actions_start != -1 and budget_start < invite_start:
        # extract budget block
        budget_block = lines[budget_start:invite_start]
        
        # we will rebuild the modal lines
        # Up to budget_start
        new_lines = lines[:budget_start]
        # From invite_start to actions_start
        new_lines += lines[invite_start:actions_start]
        # Add budget block
        new_lines += budget_block
        # Add actions and rest
        new_lines += lines[actions_start:]
        return new_lines
        
    return lines

# CREATE MODAL
lines = fix_modal(lines, 
    'const renderCreateModal = () => {',
    'setCreateShowBudget(!createShowBudget)',
    'i18n("invite_members_title")',
    '<div className="modal-actions">'
)

# EDIT MODAL
lines = fix_modal(lines, 
    'const renderEditModal = () => {',
    'setEditShowBudget(!editShowBudget)',
    'i18n("invite_members_title")',
    '<div className="modal-actions">'
)

with open('Static/js/components/GroupsScreen.jsx', 'w', encoding='utf-8') as f:
    f.writelines(lines)
print('Done!')
