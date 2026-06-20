import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';

const GroupsScreen = () => {
    const [trips, setTrips] = useState([]);
    const [lang, setLang] = useState(localStorage.getItem("lang") || "he");

    // Create Modal State
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [createTab, setCreateTab] = useState("whatsapp");
    const [createShowBudget, setCreateShowBudget] = useState(false);

    // Edit Modal State
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editTripId, setEditTripId] = useState(null);
    const [editTab, setEditTab] = useState("whatsapp");
    const [editShowBudget, setEditShowBudget] = useState(false);
    const [editTripDetails, setEditTripDetails] = useState(null);

    useEffect(() => {
        const i18nSync = (e) => {
            if (e.key === "lang" && e.newValue) setLang(e.newValue);
        };
        const handleLangChanged = () => {
            setLang(localStorage.getItem("lang") || "he");
        };
        window.addEventListener("storage", i18nSync);
        window.addEventListener("languageChanged", handleLangChanged);

        window.reactUpdateTrips = (newTrips) => setTrips([...newTrips]);
        window.reactOpenCreateModal = () => {
            setCreateTab("whatsapp");
            setIsCreateOpen(true);
        };
        window.reactCloseCreateModal = () => setIsCreateOpen(false);
        window.reactOpenEditModal = (id) => {
            const trip = window.allTrips ? window.allTrips.find(t => t.id === id) : trips.find(t => t.id === id);
            if (trip) {
                setEditTripId(id);
                setEditTripDetails(trip);
                setEditTab("whatsapp");
                setIsEditOpen(true);

                // Let React render the empty #edit-friends-chips div first, then fill it
                setTimeout(() => {
                    if (window.renderEditFriendsChips) {
                        window.renderEditFriendsChips(trip.participants || []);
                    }
                }, 50);
            } else {
                console.error("Trip not found for ID:", id);
            }
        };
        window.reactSetEditTripDetails = (details) => {
            setEditTripDetails(details);
        };
        window.reactCloseEditModal = () => setIsEditOpen(false);
        window.reactAddParticipantToEditTrip = (p) => { setEditTripDetails(prev => { if (!prev) return prev; return { ...prev, participants: [...(prev.participants || []), p] }; }); };

        if (window.allTrips) setTrips([...window.allTrips]);

        return () => window.removeEventListener("storage", i18nSync);
    }, []);

    const i18n = (key) => {
        const lang = localStorage.getItem('lang') || 'he';
        // Priority 1: Check translations.js dictionary
        if (window.translations && window.translations[lang] && window.translations[lang][key]) {
            return window.translations[lang][key];
        }
        // Priority 2: Check i18n.js dictionary
        if (window.i18n && typeof window.i18n.getTranslation === "function") {
            const val = window.i18n.getTranslation(key);
            if (val !== key) return val;
        }
        // Priority 3: Fallback (returns null so the || "default" works in JSX)
        return null;
    };

    const handleTripClick = (id) => {
        if (typeof window.openTrip === "function") {
            window.openTrip(id);
        }
    };

    const avatarColors = [
        "linear-gradient(135deg, #a855f7, #6366f1)",
        "linear-gradient(135deg, #06d6a0, #22d3ee)",
        "linear-gradient(135deg, #f59e0b, #ef4444)",
        "linear-gradient(135deg, #3b82f6, #8b5cf6)",
        "linear-gradient(135deg, #ec4899, #f43f5e)",
        "linear-gradient(135deg, #14b8a6, #06b6d4)"
    ];

    const renderGroupsLobby = () => (
        <div className="relative z-10 w-full max-w-4xl mx-auto p-4 pt-4">
            <div className="lobby-header">
                <h2 data-i18n="lobby_my_trips">{i18n("lobby_my_trips") || "×”×§×‘×•×¦×•×ª ×©×œ×™"}</h2>
                <button className="primary-btn sm" onClick={() => setIsCreateOpen(true)} data-i18n="lobby_btn_create">
                    {i18n("lobby_btn_create") || "+ ×¦×•×¨ ×§×‘×•×¦×” ×—×“×©×”"}
                </button>
            </div>
            
            <div id="trips-list" className="trips-grid">
                {trips.length === 0 ? (
                    <div className="empty-state">
                        <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" style={{ marginBottom: 12 }}>
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                        </svg>
                        <p>{i18n("lobby_no_groups") || "No groups yet"}</p>
                    </div>
                ) : (
                    trips.map((trip, i) => {
                        const initial = trip && trip.name ? String(trip.name).charAt(0).toUpperCase() : '?';
                        const isAdmin = trip.is_admin !== undefined ? trip.is_admin : trip.is_owner;
                        let cardCurrency = "â‚ª";
                        let highestBudget = null;
                        let highestBudgetLabel = "";
                        if (trip.budgets_json) {
                            cardCurrency = trip.budgets_json.currency === 'USD' ? '$' : 
                                      trip.budgets_json.currency === 'EUR' ? 'â‚¬' : 
                                      trip.budgets_json.currency === 'GBP' ? 'Â£' : 'â‚ª';
                            if (trip.budgets_json.yearly) {
                                highestBudget = trip.budgets_json.yearly;
                                highestBudgetLabel = i18n("yearly") || "×©× ×ª×™";
                            } else if (trip.budgets_json.monthly) {
                                highestBudget = trip.budgets_json.monthly;
                                highestBudgetLabel = i18n("monthly") || "×—×•×“×©×™";
                            } else if (trip.budgets_json.daily) {
                                highestBudget = trip.budgets_json.daily;
                                highestBudgetLabel = i18n("daily") || "×™×•×ž×™";
                            }
                        }
                        // If budget is per-user, multiply by participant count
                        if (highestBudget !== null && trip.is_budget_per_user) {
                            const memberCount = trip.participants?.length || 1;
                            highestBudget = highestBudget * memberCount;
                        }
                        
                        return (
                            <div key={trip.id} className="trip-card-v2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-2xl p-4 shadow-lg border border-gray-100 dark:border-gray-700 flex justify-between items-center cursor-pointer hover:shadow-xl transition-all" onClick={() => handleTripClick(trip.id)}>
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-inner" style={{ background: avatarColors[i % avatarColors.length] }}>
                                        {initial}
                                    </div>

                                    <div>
                                        <h3 className="font-bold text-gray-900 dark:text-white text-lg">{trip.name}</h3>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                            <span className="inline-block w-2 h-2 rounded-full bg-green-500"></span>
                                            <span data-i18n="active_trip">{i18n("active_trip") || "Active"}</span>
                                            <span className="mx-1">â€¢</span>
                                            <span>{trip.participants?.length || 0} Members</span>
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 text-right">
                                    {highestBudget !== null && (
                                        <div className="border-r border-gray-200 dark:border-gray-700 pr-3 mr-1">
                                            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                                                {i18n("total_budget") || "Total"} <span className="text-[10px]">({highestBudgetLabel})</span>
                                            </div>
                                            <div className="font-bold text-xl text-indigo-600 dark:text-indigo-400 flex items-center justify-end gap-1" dir="ltr">
                                                <span className="text-sm mr-1">{cardCurrency}</span>
                                                <span>{window.formatNumber(highestBudget)}</span>
                                            </div>
                                        </div>
                                    )}
                                    {isAdmin && (
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); window.openEditTripModal(trip.id); }} 
                                            className="border border-gray-300 dark:border-gray-600 rounded-md p-1.5 text-gray-500 hover:text-indigo-600 hover:border-indigo-600 transition-all flex-shrink-0"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );

    const renderCreateModal = () => {
        if (!isCreateOpen) return null;
        return (
            <div id="create-trip-modal" className="modal-overlay open">
                <div className="modal-card">
                    <div className="modal-header">
                        <h3>{i18n("create_trip_title") || "×¦×•×¨ ×§×‘×•×¦×” ×—×“×©×”"}</h3>
                        <button className="modal-close-x" onClick={() => setIsCreateOpen(false)}>
                            <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        </button>
                    </div>

                    <div className="modal-body-content space-y-4">
                    <div className="form-group">
                        <label>{i18n("create_trip_name") || "×©× ×”×§×‘×•×¦×”"}</label>
                        <input type="text" id="create-trip-name" placeholder={i18n("create_trip_name_ph") || "×œ×ž×©×œ: ×“×™×¨×”, ×—×•×¤×©×”, ×ž×©×¨×“..."} />
                    </div>

                    <div className="form-group">
                        <label>{i18n("invite_members_title") || "×”×–×ž×Ÿ ×—×‘×¨×™×"}</label>
                        <button type="button" className="w-full mb-3 flex items-center justify-center p-3 rounded-xl bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-800 dark:text-white border-0 outline-none transition-all" onClick={() => window.pickContact && window.pickContact('create', 'wa')}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '8px', display: 'inline-block'}}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                            <span>{i18n("invite_add_contacts") || "×”×•×¡×£ ×ž×× ×©×™ ×§×©×¨"}</span>
                        </button>
                        <div className="invite-tabs-container">
                            <div className="invite-tabs-header">
                                <button type="button" className={`invite-tab-btn ${createTab === 'whatsapp' ? 'active' : ''}`} onClick={() => setCreateTab('whatsapp')}>
                                    <span>{i18n("invite_tab_whatsapp") || "×•×•××˜×¡××¤"}</span>
                                </button>
                                <button type="button" className={`invite-tab-btn ${createTab === 'email' ? 'active' : ''}`} onClick={() => setCreateTab('email')}>
                                    <span>{i18n("invite_tab_email") || "××™×ž×™×™×œ"}</span>
                                </button>
                                <button type="button" className={`invite-tab-btn ${createTab === 'guest' ? 'active' : ''}`} onClick={() => setCreateTab('guest')}>
                                    <span>{i18n("invite_tab_guest") || "××•×¨×—"}</span>
                                </button>
                            </div>

                            <div className={`invite-tab-panel ${createTab === 'whatsapp' ? 'active' : ''}`} style={{ display: createTab === 'whatsapp' ? 'block' : 'none' }}>
                                <div className="invite-input-group">
                                    <input type="text" id="create-wa-phone" placeholder={i18n("invite_phone_ph") || "×ž×¡×¤×¨ ×˜×œ×¤×•×Ÿ"} />
                                </div>
                                
                                <button type="button" className="invite-action-btn whatsapp" onClick={() => window.sendWhatsAppInviteFromTab('create')}>
                                    <span>{i18n("invite_send_whatsapp") || "×©×œ×— ×”×–×ž× ×” ×‘×•×•××˜×¡××¤"}</span>
                                </button>
                            </div>

                            <div className={`invite-tab-panel ${createTab === 'email' ? 'active' : ''}`} style={{ display: createTab === 'email' ? 'block' : 'none' }}>
                                <div className="invite-input-group">
                                    <input type="text" id="create-email-name" placeholder={i18n("invite_name_ph") || "×©×"} />
                                    <input type="email" id="create-email-addr" placeholder={i18n("invite_email_ph") || "×›×ª×•×‘×ª ××™×ž×™×™×œ"} />
                                </div>
                                <button type="button" className="invite-action-btn email-invite" onClick={() => window.sendEmailInviteFromTab('create')}>
                                    <span>{i18n("invite_send_email") || "×©×œ×— ×”×–×ž× ×” ×‘××™×ž×™×™×œ"}</span>
                                </button>
                            </div>

                            <div className={`invite-tab-panel ${createTab === 'guest' ? 'active' : ''}`} style={{ display: createTab === 'guest' ? 'block' : 'none' }}>
                                <div className="invite-input-group">
                                    <input type="text" id="create-guest-name" placeholder={i18n("invite_name_ph") || "×©×"} />
                                    <p className="text-xs text-gray-400 mt-1" style={{ textAlign: 'right' }}>{i18n("guest_offline_note") || "×¢×‘×•×¨ ×ž×©×ª×ž×© ×©××™× ×• ×ž×§×•×•×Ÿ"}</p>
                                </div>
                                <button type="button" className="invite-action-btn guest" onClick={() => window.addGuestFromTab('create')}>
                                    <span>{i18n("invite_add_guest") || "×”×•×¡×£ ××•×¨×—"}</span>
                                </button>
                            </div>
                        </div>
                        {/* Vanilla JS will populate this div */}
                        <div id="friends-chips" className="modal-members-list"></div>
                    </div>
                    <div className="form-group">
                    </div>
                    </div>
                    <div className="modal-actions">
                        <button className="secondary-btn" onClick={() => setIsCreateOpen(false)}>{i18n("btn_cancel") || "×‘×™×˜×•×œ"}</button>
                        <button className="primary-btn" onClick={() => window.createTrip()}>{i18n("create_trip_btn") || "×¦×•×¨ ×§×‘×•×¦×”"}</button>
                    </div>
                </div>
            </div>
        );
    };

    
    const renderEditModal = () => {
        if (!isEditOpen || !editTripDetails) return null;
        const trip = editTripDetails;
        
        const isUserAdmin = trip.participants?.find(p => {
            const currentPhone = window.currentUser?.phone || window.currentUser?.email;
            return (p.contact === currentPhone || p.id === window.currentUser?.id) && p.is_admin;
        });
        
        const isAdmin = !!isUserAdmin || trip.is_owner;

        const updateBudget = (contact, amount) => {
            const newTrip = { ...trip };
            newTrip.user_budgets = newTrip.user_budgets || {};
            newTrip.user_budgets[contact] = amount;
            setEditTripDetails(newTrip);
        };

        const togglePermission = (key) => {
            if (!isAdmin) return;
            const newTrip = { ...trip };
            newTrip[key] = !newTrip[key];
            setEditTripDetails(newTrip);
        };
        
        const makeAdmin = async (contact) => {
            // we will implement the API call in main.js or here
            window.makeMemberAdmin(trip.id, contact);
        };
        
        const removeUser = async (contact) => {
            if (window.confirm(i18n("confirm_delete_member") || "Are you sure you want to remove this member?")) {
                window.removeTripMember(trip.id, contact);
            }
        };

        return (
            <div id="edit-trip-modal" className="modal-overlay open" key={editTripId}>
                <div className="modal-card edit-group-info">
                    <div className="modal-header">
                        <h3>{i18n("group_info") || "×¤×¨×˜×™ ×§×‘×•×¦×”"}</h3>
                        <button className="modal-close-x" onClick={() => setIsEditOpen(false)}>
                            <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        </button>
                    </div>

                    <div className="modal-body-content space-y-4">
                        {/* Header: Avatar, Name, Member Count */}
                        <div className="group-info-header text-center">
                            <div className="w-20 h-20 rounded-full mx-auto flex items-center justify-center text-white font-bold text-3xl shadow-inner mb-3" style={{ background: avatarColors[trip.id % avatarColors.length] }}>
                                {trip && trip.name ? String(trip.name).charAt(0).toUpperCase() : '?'}
                            </div>
                            <input 
                                type="text" 
                                id="edit-trip-name" 
                                className="text-2xl font-bold text-center bg-transparent border-b border-dashed border-gray-300 focus:border-indigo-500 outline-none w-3/4 mx-auto"
                                defaultValue={trip?.name || ''} 
                                placeholder={i18n("create_trip_name") || "×©× ×”×§×‘×•×¦×”"} 
                            />
                            <p className="text-gray-500 mt-1">{trip.participants?.length || 0} {i18n("members") || "×ž×©×ª×ª×¤×™×"}</p>
                        </div>

                        {/* Invite Link */}
                        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 flex justify-between items-center cursor-pointer hover:bg-gray-100 transition" onClick={() => window.copyInviteLink(trip.id, trip.invite_token)}>
                            <div className="flex items-center gap-3">
                                <div className="bg-green-100 text-green-600 p-2 rounded-full">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
                                </div>
                                <div>
                                    <h4 className="font-semibold text-sm">{i18n("invite_via_link") || "×”×–×ž× ×” ×‘××ž×¦×¢×•×ª ×§×™×©×•×¨"}</h4>
                                    <p className="text-xs text-gray-500">{window.location.origin}/#join={trip.invite_token}</p>
                                </div>
                            </div>
                        </div>

                        {/* Admin Permissions */}
                        {isAdmin && (
                            <div className="permissions-section bg-gray-50 dark:bg-gray-800 rounded-xl p-4 space-y-3">
                                <h4 className="font-bold text-sm text-gray-700 dark:text-gray-300 uppercase tracking-wide">{i18n("admin_settings") || "×”×’×“×¨×•×ª ×ž× ×”×œ"}</h4>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm">{i18n("show_all_expenses") || "×”×¦×’ ××ª ×›×œ ×”×”×•×¦××•×ª ×œ×›×•×œ×"}</span>
                                    <label className="mini-toggle">
                                        <input type="checkbox" checked={trip.is_public_expenses !== false} onChange={() => togglePermission('is_public_expenses')} />
                                        <span className="mini-toggle-slider"></span>
                                    </label>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm">{i18n("allow_member_delete") || "××¤×©×¨ ×œ×ž×©×ª×ª×¤×™× ×œ×ž×—×•×§ ×”×•×¦××•×ª"}</span>
                                    <label className="mini-toggle">
                                        <input type="checkbox" checked={trip.allow_member_delete !== false} onChange={() => togglePermission('allow_member_delete')} />
                                        <span className="mini-toggle-slider"></span>
                                    </label>
                                </div>
                                <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                                    <div>
                                        <span className="text-sm font-semibold">{i18n("budget_per_user") || "×ª×§×¦×™×‘ ×œ×›×œ ×ž×©×ª×ª×£"}</span>
                                    </div>
                                    <label className="mini-toggle">
                                        <input type="checkbox" id="edit-trip-budget-per-user" checked={trip.is_budget_per_user || false} onChange={() => togglePermission('is_budget_per_user')} />
                                        <span className="mini-toggle-slider"></span>
                                    </label>
                                </div>
                            </div>
                        )}

                        {/* Members List */}
                        <div className="members-section mt-4">
                            <h4 className="font-bold text-sm text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-2">{i18n("members") || "×ž×©×ª×ª×¤×™×"}</h4>
                            <div className="space-y-2">
                                {(trip.participants || []).map((p, idx) => (
                                    <div key={idx} className="flex justify-between items-center p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300 font-bold">
                                                {p && p.name ? String(p.name).charAt(0).toUpperCase() : '?'}
                                            </div>
                                            <div>
                                                <div className="font-medium text-sm flex items-center gap-2">
                                                    {p.name}
                                                    {p.is_owner && <span className="bg-purple-100 text-purple-700 text-[10px] px-2 py-0.5 rounded-full">{i18n("creator") || "×™×•×¦×¨"}</span>}
                                                    {p.is_admin && !p.is_owner && <span className="bg-blue-100 text-blue-700 text-[10px] px-2 py-0.5 rounded-full">{i18n("admin") || "×ž× ×”×œ"}</span>}
                                                </div>
                                                <div className="text-xs text-gray-500">{p.contact}</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {trip.is_budget_per_user && (
                                                <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg px-2 py-1">
                                                    <span className="text-xs text-gray-500 mr-1">â‚ª</span>
                                                    <input 
                                                        type="number" 
                                                        className="w-16 bg-transparent outline-none text-sm text-right" 
                                                        placeholder="0"
                                                        value={trip.user_budgets?.[p.contact] || ''}
                                                        onChange={(e) => updateBudget(p.contact, e.target.value)}
                                                        disabled={!isAdmin}
                                                    />
                                                </div>
                                            )}
                                            {isAdmin && !p.is_owner && (
                                                <div className="relative group cursor-pointer p-1 text-gray-400 hover:text-gray-700">
                                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>
                                                    <div className="absolute left-0 top-full mt-1 w-36 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-100 dark:border-gray-700 hidden group-hover:block z-50">
                                                        {!p.is_admin && <button onClick={() => makeAdmin(p.contact)} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700">{i18n("make_admin") || "×”×¤×•×š ×œ×ž× ×”×œ"}</button>}
                                                        <button onClick={() => removeUser(p.contact)} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-gray-700">{i18n("remove_user") || "×”×¡×¨ ×ž×©×ª×ž×©"}</button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                
                                {/* Add member button within the list for Admins */}
                                {isAdmin && (
                                    <div className="flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition" onClick={() => window.pickContact && window.pickContact('edit', 'wa')}>
                                        <div className="w-10 h-10 rounded-full bg-green-100 text-green-600 flex items-center justify-center font-bold">
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                                        </div>
                                        <div className="font-medium text-sm text-green-600">{i18n("add_member") || "×”×•×¡×£ ×ž×©×ª×ª×£"}</div>
                                    </div>
                                )}
                            </div>
                        </div>

                    </div>
                    <div className="modal-actions mt-6">
                        <button className="secondary-btn" onClick={() => setIsEditOpen(false)}>{i18n("btn_cancel") || "×‘×™×˜×•×œ"}</button>
                        <button className="primary-btn" onClick={() => window.saveEditTripFromReact(trip)}>{i18n("save_changes") || "×©×ž×•×¨ ×©×™× ×•×™×™×"}</button>
                    </div>
                </div>
            </div>
        );
    };
    return (
        <React.Fragment>
            {renderGroupsLobby()}
            {renderCreateModal()}
            {renderEditModal()}
        </React.Fragment>
    );
};

const root = createRoot(document.getElementById('react-groups-root'));
root.render(<GroupsScreen />);
