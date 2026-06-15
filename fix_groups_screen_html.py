# -*- coding: utf-8 -*-
with open('Static/js/components/GroupsScreen.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

import re

# We want to replace the modal-member-chip inside GroupsScreen.jsx
old_react_chip = r"""<div key=\{idx\} className="modal-member-chip flex items-center justify-between p-2 border-b border-gray-100 dark:border-gray-700">[\s\S]*?className="text-red-500 hover:text-red-700 ml-2 font-bold px-2 py-1">✕</button>\s*</div>"""

new_react_chip = """<div key={idx} className="whatsapp-contact-row flex flex-col py-3 border-b border-gray-200 dark:border-gray-700 w-full">
                                    <div className="flex items-center w-full">
                                        <div className="contact-avatar w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg ml-3 flex-shrink-0" style={{background: 'linear-gradient(135deg, #a855f7, #6366f1)'}}>
                                            {p.name ? p.name.charAt(0).toUpperCase() : '?'}
                                        </div>
                                        <div className="contact-info flex-1 flex flex-col justify-center text-right">
                                            <div className="font-bold text-gray-900 dark:text-white text-base">{p.name}</div>
                                            <div className="text-xs mt-0.5 flex items-center" style={{color: p.is_guest ? '#3b82f6' : '#10b981'}}>
                                                <span className="inline-block w-1.5 h-1.5 rounded-full ml-1" style={{backgroundColor: p.is_guest ? '#3b82f6' : '#10b981'}}></span>
                                                {p.is_guest ? 'אורח' : 'חבר'}
                                            </div>
                                        </div>
                                        <span className="chip-remove cursor-pointer text-gray-400 hover:text-red-500 text-2xl px-2" onClick={() => {
                                            if(window.confirm(i18n('confirm_remove_user') || 'Are you sure you want to remove this user?')) {
                                                if (window.removeParticipant) {
                                                    window.removeParticipant(trip.id, p.id || p.phone || p.email);
                                                } else if (window.removeEditFriend) {
                                                    window.removeEditFriend(idx);
                                                }
                                            }
                                        }}>&times;</span>
                                    </div>
                                </div>"""

content = re.sub(old_react_chip, new_react_chip, content)

# Match "Add from Contacts" button style
old_contacts_btn = r'<button type="button" className="invite-action-btn contacts-btn w-full mb-3" onClick=\{\(\) => window\.pickContact && window\.pickContact\(\'(create|edit)\'\)\}> 📇 \{i18n\(\'contacts\'\) \|\| \'הוסף מאנשי קשר\'\}</button>'

# The old button looked exactly like this:
# <button type="button" className="invite-action-btn guest w-full mb-3 border-dashed" onClick={() => window.pickContact('create', 'wa')}>
#    <svg ...>
#    <span>{i18n("invite_add_contacts") || "הוסף מאנשי קשר"}</span>
# </button>

new_contacts_btn = r"""<button type="button" className="invite-action-btn guest w-full mb-3 border-dashed" onClick={() => window.pickContact && window.pickContact('\1', 'wa')}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '8px', display: 'inline-block'}}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                            <span>{i18n("invite_add_contacts") || "הוסף מאנשי קשר"}</span>
                        </button>"""

content = re.sub(old_contacts_btn, new_contacts_btn, content)

with open('Static/js/components/GroupsScreen.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated GroupsScreen HTML structures")
