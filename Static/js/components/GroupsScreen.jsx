import { Users, Link, Settings, ChevronDown, Check } from "lucide-react";
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
        const t = typeof i18n === 'function' ? { group_name: i18n('create_trip_name') } : {};
        const isRTL = document.dir === 'rtl';
        const onClose = () => setIsEditOpen(false);

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

        const participants = trip?.participants?.length > 0 ? trip.participants : [
            { name: window.currentUser?.username || (window.currentUser?.email ? window.currentUser.email.split('@')[0] : 'Me'), role: 'admin' }
        ];

        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md" dir={isRTL ? 'rtl' : 'ltr'}>
                <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl border border-white/20 dark:border-gray-700 shadow-2xl rounded-[2rem] w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-300 flex flex-col max-h-[90vh]">
                    
                    {/* Header - WhatsApp Style */}
                    <div className="p-6 bg-gradient-to-b from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 border-b border-gray-100 dark:border-gray-700 flex flex-col items-center relative">
                        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 bg-gray-100 dark:bg-gray-700 rounded-full p-2 transition-colors">?</button>
                        
                        <div className="relative group cursor-pointer mb-3">
                            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-4xl shadow-lg border-4 border-white dark:border-gray-800 overflow-hidden" style={{ background: avatarColors[trip.id % avatarColors.length] }}>
                                {trip?.image_url ? <img src={trip.image_url} className="w-full h-full object-cover" /> : (trip?.name ? String(trip.name).charAt(0).toUpperCase() : '?')}
                            </div>
                            <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className="text-white text-xs font-bold text-center leading-tight">???<br/>?????</span>
                            </div>
                        </div>
                        
                        <input 
                            type="text" 
                            defaultValue={trip?.name || ''} 
                            onChange={(e) => setEditTripDetails(prev => ({...prev, name: e.target.value}))}
                            className="text-2xl font-bold text-gray-900 dark:text-white bg-transparent text-center focus:outline-none focus:border-b-2 focus:border-indigo-500 w-3/4 transition-all"
                            placeholder={t?.group_name || '?? ??????'}
                        />
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{participants.length} ?????</p>
                    </div>

                    {/* Scrollable Body */}
                    <div className="flex-1 overflow-y-auto p-0">
                        
                        {/* Action Buttons */}
                        <div className="flex justify-center gap-6 p-4 border-b border-gray-100 dark:border-gray-700">
                            {isAdmin && (
                                <button onClick={() => window.pickContact && window.pickContact('edit', 'wa')} className="flex flex-col items-center gap-1.5 text-indigo-600 dark:text-indigo-400 hover:scale-105 transition-transform">
                                    <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-full shadow-sm"><Users size={22} /></div>
                                    <span className="text-xs font-medium">???? ???</span>
                                </button>
                            )}
                            <button onClick={() => window.copyInviteLink(trip.id, trip.invite_token)} className="flex flex-col items-center gap-1.5 text-indigo-600 dark:text-indigo-400 hover:scale-105 transition-transform">
                                <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-full shadow-sm"><Link size={22} /></div>
                                <span className="text-xs font-medium">????? ?????</span>
                            </button>
                        </div>

                        {/* Participants List */}
                        <div className="p-4">
                            <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-3 px-2">???????</h3>
                            <div className="space-y-2">
                                {participants.map((p, idx) => {
                                    const name = p.name || p.username || (p.email ? String(p.email).split('@')[0] : '?????');
                                    const initial = name ? String(name).charAt(0).toUpperCase() : '?';
                                    const isParticipantAdmin = p.is_admin || p.role === 'admin';
                                    return (
                                        <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-700">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-lg">
                                                    {initial}
                                                </div>
                                                <span className="font-medium text-gray-900 dark:text-white">{name}</span>
                                            </div>
                                            {isParticipantAdmin ? 
                                                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/30 px-2.5 py-1 rounded-full">????</span> :
                                                isAdmin && !p.is_owner ? <button onClick={() => removeUser(p.contact)} className="text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 px-2.5 py-1 rounded-full transition-colors">???</button> : null
                                            }
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Advanced Settings */}
                        {isAdmin && (
                            <div className="p-4 border-t border-gray-100 dark:border-gray-700">
                                <button onClick={() => setEditTripDetails(prev => ({...prev, showAdvancedBudget: !prev.showAdvancedBudget}))} className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-2xl transition-colors border border-gray-100 dark:border-gray-700">
                                    <div className="flex items-center gap-2 text-gray-700 dark:text-gray-200 font-medium">
                                        <Settings size={18} className="text-indigo-500" /> ?????? ????? ??????
                                    </div>
                                    <ChevronDown size={16} className={	ext-gray-500 transition-transform duration-300 } />
                                </button>

                                {trip.showAdvancedBudget && (
                                    <div className="mt-3 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-700 animate-in fade-in slide-in-from-top-2">
                                        <div className="flex items-center justify-between mb-4">
                                            <label className="text-sm font-bold text-gray-700 dark:text-gray-300">????? ??? ?????</label>
                                            <input type="checkbox" checked={trip.is_budget_per_user || false} onChange={() => togglePermission('is_budget_per_user')} className="w-4 h-4 text-indigo-600 rounded cursor-pointer" />
                                        </div>
                                        
                                        {trip.is_budget_per_user && (
                                            <div className="space-y-3 pt-3 border-t border-gray-200 dark:border-gray-700 mb-4">
                                                {participants.map((p, idx) => {
                                                    const uBudget = trip.user_budgets?.[p.contact] || { daily: '', monthly: '', yearly: '' };
                                                    return (
                                                        <div key={idx} className="mb-4">
                                                            <div className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">{p.name}</div>
                                                            <div className="grid grid-cols-3 gap-2">
                                                                {['daily', 'monthly', 'yearly'].map((type, i) => (
                                                                    <div key={i} className="flex items-center justify-between bg-white dark:bg-gray-900 p-2 rounded-xl border border-gray-100 dark:border-gray-700">
                                                                        <span className="text-[10px] font-medium text-gray-600 dark:text-gray-400 pl-1">{type === 'daily' ? '????' : type === 'monthly' ? '?????' : '????'}</span>
                                                                        <div className="relative w-full ml-1">
                                                                            <span className="absolute inset-y-0 left-0 pl-1 flex items-center text-gray-500 pointer-events-none text-[10px]">?</span>
                                                                            <input type="number" value={uBudget[type] || ''} onChange={(e) => updateBudget(p.contact, type, e.target.value)} placeholder="0" className="w-full pl-4 pr-1 py-1 bg-transparent border-none text-[10px] focus:ring-0 outline-none text-gray-900 dark:text-white" />
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        )}
                                        
                                        <div className="pt-3 border-t border-gray-200 dark:border-gray-700 space-y-3">
                                            <div className="flex items-center justify-between">
                                                <label className="text-sm text-gray-700 dark:text-gray-300">??? ?????? ?????</label>
                                                <input type="checkbox" checked={trip.is_public_expenses !== false} onChange={() => togglePermission('is_public_expenses')} className="w-4 h-4 text-indigo-600 rounded cursor-pointer" />
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <label className="text-sm text-gray-700 dark:text-gray-300">???? ?????? ?????</label>
                                                <input type="checkbox" checked={trip.allow_member_delete !== false} onChange={() => togglePermission('allow_member_delete')} className="w-4 h-4 text-indigo-600 rounded cursor-pointer" />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800">
                        <button onClick={() => window.saveEditTripFromReact(trip)} className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 dark:shadow-none transition-all flex items-center justify-center gap-2 active:scale-95">
                            <Check size={18} /> ???? ???????
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
