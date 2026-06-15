# -*- coding: utf-8 -*-
with open('Static/js/components/GroupsScreen.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Move "Add from Contacts" above tabs
# We remove it from whatsapp panel and insert it above invite-tabs-header

import re

# CREATE MODAL
add_contacts_btn_create = r'<button type="button" className="invite-action-btn guest w-full" onClick=\{\(\) => window\.pickContact\(\'create\', \'wa\'\)\} style=\{\{ marginBottom: 8 \}\}>\s*<span>\{i18n\("invite_add_contacts"\) \|\| "הוסף מאנשי קשר"\}</span>\s*</button>'
content = re.sub(add_contacts_btn_create, '', content)

create_tabs_header_re = r'(<div className="invite-tabs-container">)'
new_btn_create = """<button type="button" className="invite-action-btn guest w-full mb-3 border-dashed" onClick={() => window.pickContact('create', 'wa')}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '8px', display: 'inline-block'}}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                            <span>{i18n("invite_add_contacts") || "הוסף מאנשי קשר"}</span>
                        </button>\n                        \\1"""
content = re.sub(create_tabs_header_re, new_btn_create, content, count=1)

# EDIT MODAL
add_contacts_btn_edit = r'<button type="button" className="invite-action-btn guest w-full" onClick=\{\(\) => window\.pickContact\(\'edit\', \'wa\'\)\} style=\{\{ marginBottom: 8 \}\}>\s*<span>\{i18n\("invite_add_contacts"\) \|\| "הוסף מאנשי קשר"\}</span>\s*</button>'
content = re.sub(add_contacts_btn_edit, '', content)

edit_tabs_header_re = r'(<div className="invite-tabs-container">)'
# Wait, replacing <div className="invite-tabs-container"> will hit both. We use count=1 for first, and then it's the second.
# Let's just do it again!
new_btn_edit = """<button type="button" className="invite-action-btn guest w-full mb-3 border-dashed" onClick={() => window.pickContact('edit', 'wa')}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '8px', display: 'inline-block'}}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                            <span>{i18n("invite_add_contacts") || "הוסף מאנשי קשר"}</span>
                        </button>\n                        \\1"""
content = re.sub(edit_tabs_header_re, new_btn_edit, content, count=1)


# 2. Add Guest Note
guest_note = """<input type="text" id="create-guest-name" placeholder={i18n("invite_name_ph") || "שם"} />
                                    <p className="text-xs text-gray-400 mt-1" style={{ textAlign: 'right' }}>{i18n("guest_offline_note") || "עבור משתמש שאינו מקוון"}</p>"""
content = content.replace('<input type="text" id="create-guest-name" placeholder={i18n("invite_name_ph") || "שם"} />', guest_note)

guest_note_edit = """<input type="text" id="edit-guest-name" placeholder={i18n("invite_name_ph") || "שם"} />
                                    <p className="text-xs text-gray-400 mt-1" style={{ textAlign: 'right' }}>{i18n("guest_offline_note") || "עבור משתמש שאינו מקוון"}</p>"""
content = content.replace('<input type="text" id="edit-guest-name" placeholder={i18n("invite_name_ph") || "שם"} />', guest_note_edit)


# 3. Reduce spacing above "My Groups"
content = content.replace('className="flex justify-between items-end mb-6 mt-8"', 'className="flex justify-between items-end mb-6 mt-4"')

with open('Static/js/components/GroupsScreen.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Layout formatting applied")
