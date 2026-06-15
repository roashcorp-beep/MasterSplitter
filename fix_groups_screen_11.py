# -*- coding: utf-8 -*-
with open('Static/js/components/GroupsScreen.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

import re

# Add editTripDetails state
state_search = r'const \[editTripId, setEditTripId\] = useState\(null\);'
content = content.replace(state_search, "const [editTripId, setEditTripId] = useState(null);\n    const [editTripDetails, setEditTripDetails] = useState(null);")

# Update window.reactOpenEditModal and window.reactCloseEditModal
open_modal_search = r'window\.reactOpenEditModal = \(id\) => \{[\s\S]*?setIsEditOpen\(true\);\s*\};'
new_open_modal = """window.reactOpenEditModal = (id) => {
            setEditTripId(id);
            setEditTab("whatsapp");
            setIsEditOpen(true);
        };
        window.reactSetEditTripDetails = (details) => {
            setEditTripDetails(details);
        };"""
content = re.sub(open_modal_search, new_open_modal, content)

close_modal_search = r'window\.reactCloseEditModal = \(\) => setIsEditOpen\(false\);'
new_close_modal = 'window.reactCloseEditModal = () => { setIsEditOpen(false); setEditTripDetails(null); };'
content = content.replace(close_modal_search, new_close_modal)

# Update renderEditModal trip logic
render_edit_search = r'const trip = trips\.find\(t => t\.id === editTripId\);'
new_render_edit = """const baseTrip = trips.find(t => t.id === editTripId);
        const trip = editTripDetails || baseTrip || {};"""
content = content.replace(render_edit_search, new_render_edit)

# Fix Budgets
daily_search = r'<input type="number" id="edit-budget-daily-amt" placeholder="0" min="0" />'
content = content.replace(daily_search, '<input type="number" id="edit-budget-daily-amt" placeholder="0" min="0" defaultValue={trip?.budgets_json?.daily || ""} />')

monthly_search = r'<input type="number" id="edit-budget-monthly-amt" placeholder="0" min="0" />'
content = content.replace(monthly_search, '<input type="number" id="edit-budget-monthly-amt" placeholder="0" min="0" defaultValue={trip?.budgets_json?.monthly || ""} />')

yearly_search = r'<input type="number" id="edit-budget-yearly-amt" placeholder="0" min="0" />'
content = content.replace(yearly_search, '<input type="number" id="edit-budget-yearly-amt" placeholder="0" min="0" defaultValue={trip?.budgets_json?.yearly || ""} />')

currency_search = r'<select id="edit-trip-currency" className="w-full">'
content = content.replace(currency_search, '<select id="edit-trip-currency" className="w-full" defaultValue={trip?.budgets_json?.currency || "ILS"}>')

# Replace edit-friends-chips with React rendered participants
chips_search = r'<div id="edit-friends-chips" className="modal-members-list"></div>'
new_chips = """<div id="edit-friends-chips" className="modal-members-list mt-4">
                            {trip?.participants?.map((p, idx) => (
                                <div key={idx} className="modal-member-chip flex items-center justify-between p-2 border-b border-gray-100 dark:border-gray-700">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-sm">
                                            {p.name ? p.name.charAt(0).toUpperCase() : '?'}
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="font-medium text-gray-900 dark:text-white">{p.name}</span>
                                            {p.is_guest && <span className="text-xs text-blue-500">אורח</span>}
                                        </div>
                                    </div>
                                    <button type="button" onClick={() => {
                                        if(window.confirm(i18n('confirm_remove_user') || 'Are you sure you want to remove this user?')) {
                                            if (window.removeParticipant) {
                                                window.removeParticipant(trip.id, p.id || p.phone || p.email);
                                            } else if (window.removeEditFriend) {
                                                window.removeEditFriend(idx);
                                            }
                                        }
                                    }} className="text-red-500 hover:text-red-700 ml-2 font-bold px-2 py-1">✕</button>
                                </div>
                            ))}
                        </div>"""
content = content.replace(chips_search, new_chips)

# Also add Contacts button explicitly
# CREATE MODAL CONTACTS BTN
create_tabs_search = r'(<div className="invite-tabs-container">)'
new_contacts_btn = """<button type="button" className="invite-action-btn contacts-btn w-full mb-3" onClick={() => window.pickContact && window.pickContact('create')}>
                            📇 {i18n('contacts') || 'הוסף מאנשי קשר'}
                        </button>\n                        \\1"""
# We will use re.sub with count=1 for create, and count=1 for edit since they have the same class name but different pickContact args
# Wait, my previous python script might have failed to replace or maybe it did but it had a bug? Let's check what's currently in GroupsScreen.jsx

with open('Static/js/components/GroupsScreen.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Applied bindings and state logic")
