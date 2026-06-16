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
                <h2 data-i18n="lobby_my_trips">{i18n("lobby_my_trips") || "הקבוצות שלי"}</h2>
                <button className="primary-btn sm" onClick={() => setIsCreateOpen(true)} data-i18n="lobby_btn_create">
                    {i18n("lobby_btn_create") || "+ צור קבוצה חדשה"}
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
                        let cardCurrency = "₪";
                        let highestBudget = null;
                        let highestBudgetLabel = "";
                        if (trip.budgets_json) {
                            cardCurrency = trip.budgets_json.currency === 'USD' ? '$' : 
                                      trip.budgets_json.currency === 'EUR' ? '€' : 
                                      trip.budgets_json.currency === 'GBP' ? '£' : '₪';
                            if (trip.budgets_json.yearly) {
                                highestBudget = trip.budgets_json.yearly;
                                highestBudgetLabel = i18n("yearly") || "שנתי";
                            } else if (trip.budgets_json.monthly) {
                                highestBudget = trip.budgets_json.monthly;
                                highestBudgetLabel = i18n("monthly") || "חודשי";
                            } else if (trip.budgets_json.daily) {
                                highestBudget = trip.budgets_json.daily;
                                highestBudgetLabel = i18n("daily") || "יומי";
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
                                            <span className="mx-1">•</span>
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
                        <h3>{i18n("create_trip_title") || "צור קבוצה חדשה"}</h3>
                        <button className="modal-close-x" onClick={() => setIsCreateOpen(false)}>
                            <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        </button>
                    </div>

                    <div className="modal-body-content space-y-4">
                    <div className="form-group">
                        <label>{i18n("create_trip_name") || "שם הקבוצה"}</label>
                        <input type="text" id="create-trip-name" placeholder={i18n("create_trip_name_ph") || "למשל: דירה, חופשה, משרד..."} />
                    </div>

                    <div className="form-group">
                        <label>{i18n("invite_members_title") || "הזמן חברים"}</label>
                        <button type="button" className="w-full mb-3 flex items-center justify-center p-3 rounded-xl bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-800 dark:text-white border-0 outline-none transition-all" onClick={() => window.pickContact && window.pickContact('create', 'wa')}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '8px', display: 'inline-block'}}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                            <span>{i18n("invite_add_contacts") || "הוסף מאנשי קשר"}</span>
                        </button>
                        <div className="invite-tabs-container">
                            <div className="invite-tabs-header">
                                <button type="button" className={`invite-tab-btn ${createTab === 'whatsapp' ? 'active' : ''}`} onClick={() => setCreateTab('whatsapp')}>
                                    <span>{i18n("invite_tab_whatsapp") || "וואטסאפ"}</span>
                                </button>
                                <button type="button" className={`invite-tab-btn ${createTab === 'email' ? 'active' : ''}`} onClick={() => setCreateTab('email')}>
                                    <span>{i18n("invite_tab_email") || "אימייל"}</span>
                                </button>
                                <button type="button" className={`invite-tab-btn ${createTab === 'guest' ? 'active' : ''}`} onClick={() => setCreateTab('guest')}>
                                    <span>{i18n("invite_tab_guest") || "אורח"}</span>
                                </button>
                            </div>

                            <div className={`invite-tab-panel ${createTab === 'whatsapp' ? 'active' : ''}`} style={{ display: createTab === 'whatsapp' ? 'block' : 'none' }}>
                                <div className="invite-input-group">
                                    <input type="text" id="create-wa-phone" placeholder={i18n("invite_phone_ph") || "מספר טלפון"} />
                                </div>
                                
                                <button type="button" className="invite-action-btn whatsapp" onClick={() => window.sendWhatsAppInviteFromTab('create')}>
                                    <span>{i18n("invite_send_whatsapp") || "שלח הזמנה בוואטסאפ"}</span>
                                </button>
                            </div>

                            <div className={`invite-tab-panel ${createTab === 'email' ? 'active' : ''}`} style={{ display: createTab === 'email' ? 'block' : 'none' }}>
                                <div className="invite-input-group">
                                    <input type="text" id="create-email-name" placeholder={i18n("invite_name_ph") || "שם"} />
                                    <input type="email" id="create-email-addr" placeholder={i18n("invite_email_ph") || "כתובת אימייל"} />
                                </div>
                                <button type="button" className="invite-action-btn email-invite" onClick={() => window.sendEmailInviteFromTab('create')}>
                                    <span>{i18n("invite_send_email") || "שלח הזמנה באימייל"}</span>
                                </button>
                            </div>

                            <div className={`invite-tab-panel ${createTab === 'guest' ? 'active' : ''}`} style={{ display: createTab === 'guest' ? 'block' : 'none' }}>
                                <div className="invite-input-group">
                                    <input type="text" id="create-guest-name" placeholder={i18n("invite_name_ph") || "שם"} />
                                    <p className="text-xs text-gray-400 mt-1" style={{ textAlign: 'right' }}>{i18n("guest_offline_note") || "עבור משתמש שאינו מקוון"}</p>
                                </div>
                                <button type="button" className="invite-action-btn guest" onClick={() => window.addGuestFromTab('create')}>
                                    <span>{i18n("invite_add_guest") || "הוסף אורח"}</span>
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
                        <button className="secondary-btn" onClick={() => setIsCreateOpen(false)}>{i18n("btn_cancel") || "ביטול"}</button>
                        <button className="primary-btn" onClick={() => window.createTrip()}>{i18n("create_trip_btn") || "צור קבוצה"}</button>
                    </div>
                </div>
            </div>
        );
    };

    
        const renderEditModal = () => {
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
