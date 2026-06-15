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
            setEditTripId(id);
            setEditTab("whatsapp");
            setIsEditOpen(true);
        };
        window.reactSetEditTripDetails = (details) => {
            setEditTripDetails(details);
        };
        window.reactCloseEditModal = () => setIsEditOpen(false);

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
                        const initial = (trip.name || "?").charAt(0).toUpperCase();
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

                        <button type="button" className="w-full bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 py-2 rounded-lg font-medium mt-4" onClick={() => setCreateShowBudget(!createShowBudget)}>
                            ⚙️ <span>{i18n("advanced_budget") || "Advanced Budget Settings"}</span>
                        </button>
                    </div>

                    {createShowBudget && (
                        <div id="advanced-budget-settings" className="mt-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700">
                            <div className="budget-per-user-row" style={{ marginBottom: 10 }}>
                                <div>
                                    <div className="toggle-label">{i18n("budget_per_user") || "תקציב לכל משתתף"}</div>
                                    <div className="toggle-hint">{i18n("budget_per_user_hint")}</div>
                                </div>
                                <label className="mini-toggle">
                                    <input type="checkbox" id="trip-budget-per-user" onChange={() => {
                                        if (typeof window.toggleBudgetFields === "function") window.toggleBudgetFields("create");
                                    }} />
                                    <span className="mini-toggle-slider"></span>
                                </label>
                            </div>
                            <div className="form-group" style={{ marginBottom: 15 }}>
                                <label>{i18n("budget_currency") || "מטבע הקבוצה"}</label>
                                <select id="create-trip-currency" className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg p-2 mt-1">
                                    <option value="ILS">ILS (₪)</option>
                                    <option value="USD">USD ($)</option>
                                    <option value="EUR">EUR (€)</option>
                                    <option value="GBP">GBP (£)</option>
                                </select>
                            </div>
                            <div id="create-global-budgets">
                                <div className="form-group" id="create-budget-daily-group" style={{ marginBottom: 10 }}>
                                    <label>סכום תקציב יומי כללי</label>
                                    <input type="number" id="create-budget-daily-amt" placeholder="0" min="0" />
                                </div>
                                <div className="form-group" id="create-budget-monthly-group" style={{ marginBottom: 10 }}>
                                    <label>סכום תקציב חודשי כללי</label>
                                    <input type="number" id="create-budget-monthly-amt" placeholder="0" min="0" />
                                </div>
                                <div className="form-group" id="create-budget-yearly-group" style={{ marginBottom: 10 }}>
                                    <label>סכום תקציב שנתי כללי</label>
                                    <input type="number" id="create-budget-yearly-amt" placeholder="0" min="0" />
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="form-group">
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
        if (!isEditOpen) return null;
        const trip = trips.find(t => t.id === editTripId);
        return (
            <div id="edit-trip-modal" className="modal-overlay open">
                <div className="modal-card">
                    <div className="modal-header">
                        <h3>{i18n("modal_edit_trip") || "עריכת קבוצה"}</h3>
                        <button className="modal-close-x" onClick={() => setIsEditOpen(false)}>
                            <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        </button>
                    </div>

                    <div className="modal-body-content space-y-4">
                    <div className="form-group">
                        <label>{i18n("create_trip_name") || "שם הקבוצה"}</label>
                        <input type="text" id="edit-trip-name" defaultValue={trip?.name || ''} placeholder="שם הקבוצה" />
                    </div>

                    <div className="form-group">
                        <label>{i18n("invite_members_title") || "הזמן חברים"}</label>
                        <button type="button" className="w-full mb-3 flex items-center justify-center p-3 rounded-xl bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-800 dark:text-white border-0 outline-none transition-all" onClick={() => window.pickContact && window.pickContact('edit', 'wa')}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '8px', display: 'inline-block'}}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                            <span>{i18n("invite_add_contacts") || "הוסף מאנשי קשר"}</span>
                        </button>
                        <div className="invite-tabs-container">
                            <div className="invite-tabs-header">
                                <button type="button" className={`invite-tab-btn ${editTab === 'whatsapp' ? 'active' : ''}`} onClick={() => setEditTab('whatsapp')}>
                                    <span>{i18n("invite_tab_whatsapp") || "וואטסאפ"}</span>
                                </button>
                                <button type="button" className={`invite-tab-btn ${editTab === 'email' ? 'active' : ''}`} onClick={() => setEditTab('email')}>
                                    <span>{i18n("invite_tab_email") || "אימייל"}</span>
                                </button>
                                <button type="button" className={`invite-tab-btn ${editTab === 'guest' ? 'active' : ''}`} onClick={() => setEditTab('guest')}>
                                    <span>{i18n("invite_tab_guest") || "אורח"}</span>
                                </button>
                            </div>

                            <div className={`invite-tab-panel ${editTab === 'whatsapp' ? 'active' : ''}`} style={{ display: editTab === 'whatsapp' ? 'block' : 'none' }}>
                                <div className="invite-input-group">
                                    <input type="text" id="edit-wa-phone" placeholder={i18n("invite_phone_ph") || "מספר טלפון"} />
                                </div>
                                
                                <button type="button" className="invite-action-btn whatsapp" onClick={() => window.sendWhatsAppInviteFromTab('edit')}>
                                    <span>{i18n("invite_send_whatsapp") || "שלח הזמנה בוואטסאפ"}</span>
                                </button>
                            </div>

                            <div className={`invite-tab-panel ${editTab === 'email' ? 'active' : ''}`} style={{ display: editTab === 'email' ? 'block' : 'none' }}>
                                <div className="invite-input-group">
                                    <input type="text" id="edit-email-name" placeholder={i18n("invite_name_ph") || "שם"} />
                                    <input type="email" id="edit-email-addr" placeholder={i18n("invite_email_ph") || "כתובת אימייל"} />
                                </div>
                                <button type="button" className="invite-action-btn email-invite" onClick={() => window.sendEmailInviteFromTab('edit')}>
                                    <span>{i18n("invite_send_email") || "שלח הזמנה באימייל"}</span>
                                </button>
                            </div>

                            <div className={`invite-tab-panel ${editTab === 'guest' ? 'active' : ''}`} style={{ display: editTab === 'guest' ? 'block' : 'none' }}>
                                <div className="invite-input-group">
                                    <input type="text" id="edit-guest-name" placeholder={i18n("invite_name_ph") || "שם"} />
                                    <p className="text-xs text-gray-400 mt-1" style={{ textAlign: 'right' }}>{i18n("guest_offline_note") || "עבור משתמש שאינו מקוון"}</p>
                                </div>
                                <button type="button" className="invite-action-btn guest" onClick={() => window.addGuestFromTab('edit')}>
                                    <span>{i18n("invite_add_guest") || "הוסף אורח"}</span>
                                </button>
                            </div>
                        </div>
                        {/* Vanilla JS will populate this div */}
                        <div id="edit-friends-chips" className="modal-members-list mt-4">
                            {trip?.participants?.map((p, idx) => (
                                <div key={idx} className="flex items-center justify-between p-3 border-b border-gray-100 dark:border-gray-700 last:border-0">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-lg">
                                            {p.name ? p.name.charAt(0).toUpperCase() : '?'}
                                        </div>
                                        <span className="font-medium text-gray-900 dark:text-white">{p.name}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {p.type === 'guest' || p.is_guest ? (
                                            <span className="px-2.5 py-1 text-xs rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-medium">
                                                {i18n('guest') || 'אורח'}
                                            </span>
                                        ) : (
                                            <span className="px-2.5 py-1 text-xs rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-medium">
                                                {i18n('member') || 'חבר'}
                                            </span>
                                        )}
                                        <button type="button" onClick={() => {
                                            if(window.confirm(i18n('confirm_remove_user') || 'Remove user?')) {
                                                if (window.removeParticipant) {
                                                    window.removeParticipant(trip.id, p.id || p.phone || p.email);
                                                } else if (window.removeEditFriend) {
                                                    window.removeEditFriend(idx);
                                                }
                                            }
                                        }} className="text-red-500 hover:text-red-700 dark:text-red-400 p-1">✕</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                        <button type="button" className="w-full bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 py-2 rounded-lg font-medium mt-4" onClick={() => setEditShowBudget(!editShowBudget)}>
                            ⚙️ <span>{i18n("advanced_budget") || "Advanced Budget Settings"}</span>
                        </button>
                    </div>

                        <div id="advanced-budget-settings" className="mt-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700" style={{ display: editShowBudget ? 'block' : 'none' }}>
                            <div className="budget-per-user-row" style={{ marginBottom: 10 }}>
                                <div>
                                    <div className="toggle-label">{i18n("budget_per_user") || "תקציב לכל משתתף"}</div>
                                    <div className="toggle-hint">{i18n("budget_per_user_hint")}</div>
                                </div>
                                <label className="mini-toggle">
                                    <input type="checkbox" id="edit-trip-budget-per-user" onChange={() => {
                                        if (typeof window.toggleBudgetFields === "function") window.toggleBudgetFields("edit");
                                    }} />
                                    <span className="mini-toggle-slider"></span>
                                </label>
                            </div>
                            <div className="form-group" style={{ marginBottom: 15 }}>
                                <label>{i18n("budget_currency") || "מטבע הקבוצה"}</label>
                                <select id="edit-trip-currency" className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg p-2 mt-1">
                                    <option value="ILS">ILS (₪)</option>
                                    <option value="USD">USD ($)</option>
                                    <option value="EUR">EUR (€)</option>
                                    <option value="GBP">GBP (£)</option>
                                </select>
                            </div>
                            <div id="edit-global-budgets">
                                <div className="form-group" id="edit-budget-daily-group" style={{ marginBottom: 10 }}>
                                    <label>סכום תקציב יומי כללי</label>
                                    <input type="number" id="edit-budget-daily-amt" placeholder="0" min="0" defaultValue={trip?.budgets_json?.daily || ""} />
                                </div>
                                <div className="form-group" id="edit-budget-monthly-group" style={{ marginBottom: 10 }}>
                                    <label>סכום תקציב חודשי כללי</label>
                                    <input type="number" id="edit-budget-monthly-amt" placeholder="0" min="0" defaultValue={trip?.budgets_json?.monthly || ""} />
                                </div>
                                <div className="form-group" id="edit-budget-yearly-group" style={{ marginBottom: 10 }}>
                                    <label>סכום תקציב שנתי כללי</label>
                                    <input type="number" id="edit-budget-yearly-amt" placeholder="0" min="0" defaultValue={trip?.budgets_json?.yearly || ""} />
                                </div>
                            </div>
                        </div>

                    <div className="form-group">
                    </div>
                    <div className="modal-actions">
                        <button className="secondary-btn" onClick={() => setIsEditOpen(false)}>{i18n("btn_cancel") || "ביטול"}</button>
                        <button className="primary-btn" onClick={() => window.saveEditTrip()}>{i18n("save_changes") || "שמור שינויים"}</button>
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
