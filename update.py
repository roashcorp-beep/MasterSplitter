import re

with open('Static/js/components/GroupsScreen.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

react_open_modal_new = '''        window.reactOpenEditModal = (id) => {
            const trip = window.allTrips ? window.allTrips.find(t => t.id === id) : trips.find(t => t.id === id);
            if (trip) {
                let participants = trip.participants || [];
                if (window.currentUser) {
                    const currentPhone = window.currentUser.phone || window.currentUser.email;
                    if (!participants.some(p => p.contact === currentPhone || p.id === window.currentUser.id)) {
                        participants = [
                            {
                                id: window.currentUser.id,
                                name: window.currentUser.name || "Me",
                                contact: currentPhone,
                                is_owner: true,
                                is_admin: true,
                                type: "registered"
                            },
                            ...participants
                        ];
                    }
                }
                const updatedTrip = { ...trip, participants };
                
                if (!updatedTrip.user_budgets) updatedTrip.user_budgets = {};
                participants.forEach(p => {
                    if (typeof updatedTrip.user_budgets[p.contact] !== 'object') {
                        updatedTrip.user_budgets[p.contact] = {
                            daily: updatedTrip.user_budgets[p.contact] || '',
                            monthly: '',
                            yearly: ''
                        };
                    }
                });

                setEditTripId(id);
                setEditTripDetails(updatedTrip);
                setEditTab("whatsapp");
                setIsEditOpen(true);
            } else {
                console.error("Trip not found for ID:", id);
            }
        };'''

content = re.sub(
    r'window\.reactOpenEditModal\s*=\s*\(id\)\s*=>\s*\{.*?(?=window\.reactSetEditTripDetails)',
    react_open_modal_new + '\n        ',
    content,
    flags=re.DOTALL
)

render_edit_modal_start = content.find('const renderEditModal = () => {')
render_edit_modal_end = content.find('return (\n        <React.Fragment>')
if render_edit_modal_end == -1:
    render_edit_modal_end = content.find('return (\r\n        <React.Fragment>')

new_render_edit_modal = '''    const renderEditModal = () => {
        if (!isEditOpen || !editTripDetails) return null;
        const trip = editTripDetails;
        const currentPhone = window.currentUser?.phone || window.currentUser?.email;
        const isAdmin = trip.is_admin || trip.is_owner || (trip.participants && trip.participants.some(p => (p.contact === currentPhone || p.id === window.currentUser?.id) && p.is_admin));

        const togglePermission = (field) => {
            setEditTripDetails(prev => ({ ...prev, [field]: prev[field] === false ? true : false }));
        };

        const updateBudget = (contact, type, value) => {
            setEditTripDetails(prev => {
                const currentBudgets = prev.user_budgets || {};
                const userBudget = typeof currentBudgets[contact] === 'object' ? { ...currentBudgets[contact] } : { daily: currentBudgets[contact] || '', monthly: '', yearly: '' };
                userBudget[type] = value;
                return {
                    ...prev,
                    user_budgets: { ...currentBudgets, [contact]: userBudget }
                };
            });
        };

        const makeAdmin = (contact) => {
            setEditTripDetails(prev => ({
                ...prev,
                participants: prev.participants.map(p => p.contact === contact ? { ...p, is_admin: true } : p)
            }));
        };

        const removeUser = async (contact) => {
            if (window.confirm(i18n("confirm_delete_member") || "Are you sure you want to remove this member?")) {
                window.removeTripMember(trip.id, contact);
            }
        };

        return (
            <div id="edit-trip-modal" className="modal-overlay open z-[60]" key={editTripId}>
                <div className="modal-card edit-group-info bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl border border-gray-100 dark:border-gray-700 shadow-2xl rounded-[2rem] max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 relative">
                    <button className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 dark:hover:text-white transition" onClick={() => setIsEditOpen(false)}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                    
                    <div className="flex flex-col items-center mt-4 mb-6">
                        <div className="w-24 h-24 rounded-full flex items-center justify-center text-white font-bold text-4xl shadow-xl mb-4" style={{ background: avatarColors[trip.id % avatarColors.length] }}>
                            {trip && trip.name ? String(trip.name).charAt(0).toUpperCase() : '?'}
                        </div>
                        <input 
                            type="text" 
                            id="edit-trip-name" 
                            className="text-2xl font-bold text-center bg-transparent border-b-2 border-transparent focus:border-indigo-500 transition-colors outline-none w-3/4"
                            defaultValue={trip?.name || ''} 
                            placeholder={i18n("create_trip_name") || "?? ??????"} 
                        />
                        <p className="text-gray-500 mt-2 text-sm">{trip.participants?.length || 0} {i18n("members") || "???????"}</p>
                    </div>

                    <div className="space-y-6">
                        <div className="bg-gray-50/50 dark:bg-gray-900/50 rounded-2xl p-4 border border-gray-100 dark:border-gray-700">
                            <div className="flex justify-between items-center mb-4">
                                <h4 className="font-bold text-sm text-gray-600 dark:text-gray-400 uppercase tracking-wider">{i18n("members") || "???????"}</h4>
                                {isAdmin && (
                                    <button onClick={() => window.pickContact && window.pickContact('edit', 'wa')} className="text-indigo-600 hover:text-indigo-800 text-sm font-medium flex items-center gap-1">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                                        {i18n("add_member") || "????"}
                                    </button>
                                )}
                            </div>
                            <div className="space-y-3">
                                {(trip.participants || []).map((p, idx) => (
                                    <div key={idx} className="flex justify-between items-center bg-white dark:bg-gray-800 p-3 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900 dark:to-purple-900 flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-bold">
                                                {p && p.name ? String(p.name).charAt(0).toUpperCase() : '?'}
                                            </div>
                                            <div>
                                                <div className="font-medium text-sm flex items-center gap-2 text-gray-800 dark:text-gray-200">
                                                    {p.name}
                                                    {p.is_owner && <span className="bg-purple-100 text-purple-700 text-[10px] px-2 py-0.5 rounded-full font-semibold">{i18n("creator") || "????"}</span>}
                                                    {p.is_admin && !p.is_owner && <span className="bg-blue-100 text-blue-700 text-[10px] px-2 py-0.5 rounded-full font-semibold">{i18n("admin") || "????"}</span>}
                                                </div>
                                                <div className="text-xs text-gray-500">{p.contact}</div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {isAdmin && (
                            <div className="bg-gray-50/50 dark:bg-gray-900/50 rounded-2xl p-4 border border-gray-100 dark:border-gray-700">
                                <div className="flex justify-between items-center mb-4">
                                    <h4 className="font-bold text-sm text-gray-600 dark:text-gray-400 uppercase tracking-wider">{i18n("budget_per_user") || "????? ??? ?????"}</h4>
                                    <label className="mini-toggle">
                                        <input type="checkbox" checked={trip.is_budget_per_user || false} onChange={() => togglePermission('is_budget_per_user')} />
                                        <span className="mini-toggle-slider"></span>
                                    </label>
                                </div>
                                {trip.is_budget_per_user && (
                                    <div className="space-y-3 mt-4">
                                        {(trip.participants || []).map((p, idx) => {
                                            const uBudget = trip.user_budgets?.[p.contact] || { daily: '', monthly: '', yearly: '' };
                                            return (
                                            <div key={idx} className="bg-white dark:bg-gray-800 p-3 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                                                <div className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">{p.name}</div>
                                                <div className="grid grid-cols-3 gap-2">
                                                    <div>
                                                        <label className="text-[10px] text-gray-500 block mb-1">{i18n("daily") || "????"}</label>
                                                        <input type="number" value={uBudget.daily || ''} onChange={(e) => updateBudget(p.contact, 'daily', e.target.value)} className="w-full bg-gray-100 dark:bg-gray-700 rounded px-2 py-1 text-sm outline-none" placeholder="?0" />
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] text-gray-500 block mb-1">{i18n("monthly") || "?????"}</label>
                                                        <input type="number" value={uBudget.monthly || ''} onChange={(e) => updateBudget(p.contact, 'monthly', e.target.value)} className="w-full bg-gray-100 dark:bg-gray-700 rounded px-2 py-1 text-sm outline-none" placeholder="?0" />
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] text-gray-500 block mb-1">{i18n("yearly") || "????"}</label>
                                                        <input type="number" value={uBudget.yearly || ''} onChange={(e) => updateBudget(p.contact, 'yearly', e.target.value)} className="w-full bg-gray-100 dark:bg-gray-700 rounded px-2 py-1 text-sm outline-none" placeholder="?0" />
                                                    </div>
                                                </div>
                                            </div>
                                        )})}
                                    </div>
                                )}
                            </div>
                        )}

                        {isAdmin && (
                            <div className="bg-gray-50/50 dark:bg-gray-900/50 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 space-y-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{i18n("show_all_expenses") || "??? ???"}</span>
                                    <label className="mini-toggle">
                                        <input type="checkbox" checked={trip.is_public_expenses !== false} onChange={() => togglePermission('is_public_expenses')} />
                                        <span className="mini-toggle-slider"></span>
                                    </label>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{i18n("allow_member_delete") || "???? ?????"}</span>
                                    <label className="mini-toggle">
                                        <input type="checkbox" checked={trip.allow_member_delete !== false} onChange={() => togglePermission('allow_member_delete')} />
                                        <span className="mini-toggle-slider"></span>
                                    </label>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="mt-8">
                        <button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-xl shadow-lg transition-colors" onClick={() => window.saveEditTripFromReact(trip)}>
                            {i18n("save_changes") || "???? ???????"}
                        </button>
                    </div>
                </div>
            </div>
        );
    };
'''

content = content[:render_edit_modal_start] + new_render_edit_modal + content[render_edit_modal_end:]

with open('Static/js/components/GroupsScreen.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
