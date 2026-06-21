/** @jsx React.createElement */
/** @jsxFrag React.Fragment */
const { useState, useEffect } = React;

// Inline SVGs to replace lucide-react dependencies safely
const IconUsers = ({size=22, ...props}) => <svg {...props} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
const IconLink = ({size=22, ...props}) => <svg {...props} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>;
const IconSettings = ({size=18, ...props}) => <svg {...props} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>;
const IconChevronDown = ({size=16, ...props}) => <svg {...props} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>;
const IconCheck = ({size=18, ...props}) => <svg {...props} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;
const IconPlus = ({size=18, ...props}) => <svg {...props} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const IconEdit2 = ({size=16, ...props}) => <svg {...props} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>;
const IconUserMinus = ({size=18, ...props}) => <svg {...props} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="23" y1="11" x2="17" y2="11"/></svg>;
const IconTrash = ({size=18, ...props}) => <svg {...props} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>;

const GroupsScreen = () => {
    const [trips, setTrips] = useState([]);
    const [lang, setLang] = useState(localStorage.getItem("lang") || "he");

    // Create Modal State
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [createTab, setCreateTab] = React.useState("whatsapp");
    const [editTab, setEditTab] = React.useState("whatsapp");
    const fileInputRef = React.useRef(null);
    const [createShowBudget, setCreateShowBudget] = useState(false);

    // Edit Modal State
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editTripId, setEditTripId] = useState(null);
    const [editShowBudget, setEditShowBudget] = useState(false);
    const [editTripDetails, setEditTripDetails] = useState(null);
    const [budgetPopup, setBudgetPopup] = useState(null);

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
                const updatedTrip = { ...trip, participants };
                
                if (!updatedTrip.user_budgets) updatedTrip.user_budgets = {};
                participants.forEach(p => {
                    if (p.budgets_json) {
                        updatedTrip.user_budgets[p.contact] = { ...p.budgets_json };
                    }
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

    const handleUploadTripImage = async (tripId, file) => {
        if (!file) return;
        const formData = new FormData();
        formData.append("avatar", file);
        try {
            const res = await fetch(`/api/trips/${tripId}/upload-avatar`, {
                method: "POST",
                body: formData
            });
            const data = await res.json();
            if (res.ok && data.success) {
                if (window.showToast) window.showToast("התמונה עודכנה בהצלחה", "success");
                setEditTripDetails(prev => ({ ...prev, image_url: data.avatar_url }));
                // update global list as well
                setTrips(prev => prev.map(t => t.id === tripId ? { ...t, image_url: data.avatar_url } : t));
                if (window.loadLobby) window.loadLobby();
            } else {
                if (window.showToast) window.showToast(data.error || "שגיאה בהעלאת התמונה", "error");
            }
        } catch (e) {
            console.error(e);
            if (window.showToast) window.showToast("שגיאת רשת", "error");
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
                    {i18n("lobby_btn_create") || "+ יצירת קבוצה"}
                </button>
            </div>
            
            <div id="trips-list" className="trips-grid">
                {trips.length === 0 ? (
                    <div className="empty-state">
                        <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" style={{ marginBottom: 12 }}>
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                        </svg>
                        <p>{i18n("lobby_no_groups") || "אין קבוצות עדיין"}</p>
                    </div>
                ) : (
                    trips.map((trip, i) => {
                        const initial = trip && trip.name ? String(trip.name).charAt(0).toUpperCase() : '?';
                        const isAdmin = trip.is_admin !== undefined ? trip.is_admin : trip.is_owner;
                        let cardCurrency = "";
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
                        if (highestBudget !== null && trip.is_budget_per_user) {
                            const memberCount = trip.participants?.length || 1;
                            highestBudget = highestBudget * memberCount;
                        }
                        const memberCount = trip.participants?.length || 0;
                        
                        return (
                            <div key={trip.id} className="trip-card-v2" onClick={() => handleTripClick(trip.id)}>
                                <div className="trip-card-avatar overflow-hidden" style={{ background: avatarColors[i % avatarColors.length] }}>
                                    {trip.image_url ? <img src={trip.image_url} className="w-full h-full object-cover" /> : initial}
                                </div>
                                <div className="trip-card-v2-body">
                                    <div className="trip-card-v2-name">{trip.name}</div>
                                    <div className="trip-card-v2-meta">
                                        <span className="meta-item">
                                            <svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                                            {memberCount} {i18n("members") || "משתתפים"}
                                        </span>
                                        {highestBudget !== null && (
                                            <span className="meta-item">
                                                {cardCurrency}{window.formatNumber ? window.formatNumber(highestBudget) : highestBudget} <span style={{fontSize:'0.7em'}}>({highestBudgetLabel})</span>
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="trip-card-v2-right">
                                    {isAdmin && (
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); window.openEditTripModal(trip.id); }} 
                                            className="trip-edit-btn"
                                            title="ערוך קבוצה"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                                        </button>
                                    )}
                                    <span className="trip-card-v2-arrow"></span>
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
                            <span>{i18n("invite_add_contacts") || "הוסף אנשי קשר"}</span>
                        </button>
                        <div className="invite-tabs-container">
                            <div className="invite-tabs-header">
                                <button type="button" className={`invite-tab-btn ${createTab === 'whatsapp' ? 'active' : ''}`} onClick={() => setCreateTab('whatsapp')}>
                                    <span>{i18n("invite_tab_whatsapp") || "ווטסאפ"}</span>
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
                                    <span>{i18n("invite_send_whatsapp") || "שלח הזמנה בווטסאפ"}</span>
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

        const updateGlobalBudget = (type, value) => {
            setEditTripDetails(prev => {
                const currentBudgets = prev.budgets_json || {};
                return {
                    ...prev,
                    budgets_json: { ...currentBudgets, [type]: value }
                };
            });
        };

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

        const removeUser = async (contact) => {
            if (window.confirm(i18n("confirm_delete_member") || "Are you sure you want to remove this member?")) {
                window.removeTripMember(trip.id, contact);
            }
        };

        const handleLeaveTrip = async () => {
            if (window.confirm("האם אתה בטוח שברצונך לעזוב את הקבוצה? הקבוצה תעבור למצב קריאה בלבד.")) {
                try {
                    const res = await fetch(`/api/trips/${trip.id}/leave`, { method: 'POST', headers: { 'Authorization': `Bearer ${window.authToken}` } });
                    if (res.ok) {
                        window.location.reload();
                    } else {
                        const err = await res.json();
                        alert(err.error || "שגיאה בעזיבת הקבוצה");
                    }
                } catch (e) {
                    console.error(e);
                }
            }
        };

        const handleHideTrip = async () => {
            if (window.confirm("האם אתה בטוח שברצונך למחוק את הקבוצה מהרשימה שלך?")) {
                try {
                    const res = await fetch(`/api/trips/${trip.id}/hide`, { method: 'POST', headers: { 'Authorization': `Bearer ${window.authToken}` } });
                    if (res.ok) {
                        window.location.reload();
                    } else {
                        const err = await res.json();
                        alert(err.error || "שגיאה במחיקת הקבוצה");
                    }
                } catch (e) {
                    console.error(e);
                }
            }
        };

        const participants = trip?.participants?.length > 0 ? trip.participants : [
            { name: window.currentUser?.username || (window.currentUser?.email ? window.currentUser.email.split('@')[0] : 'Me'), role: 'admin' }
        ];

        const currencySymbol = trip.budgets_json?.currency === 'USD' ? '$' : 
                               trip.budgets_json?.currency === 'EUR' ? '€' : 
                               trip.budgets_json?.currency === 'GBP' ? '£' : '₪';

        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md" dir={isRTL ? 'rtl' : 'ltr'}>
                <div className="bg-white/85 dark:bg-[#0f172a]/85 backdrop-blur-2xl border border-indigo-200/50 dark:border-indigo-500/30 shadow-[0_0_40px_-10px_rgba(99,102,241,0.5)] dark:shadow-[0_0_40px_-10px_rgba(99,102,241,0.4)] rounded-[2rem] w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-300 flex flex-col max-h-[90vh] relative">
                    
                    {/* Header - Gemini Style */}
                    <div className="p-6 bg-gradient-to-b from-indigo-50/50 to-white/50 dark:from-indigo-900/30 dark:to-transparent border-b border-indigo-100/50 dark:border-indigo-800/30 flex flex-col items-center relative">
                        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-300 bg-white/50 dark:bg-gray-800/50 hover:bg-indigo-50 dark:hover:bg-indigo-900/50 rounded-full p-2 transition-colors backdrop-blur-sm">✕</button>
                        
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            className="hidden" 
                            accept="image/*" 
                            onChange={(e) => {
                                if (e.target.files && e.target.files[0]) {
                                    handleUploadTripImage(trip.id, e.target.files[0]);
                                }
                            }} 
                        />
                        <div className="relative group cursor-pointer mb-3" onClick={() => fileInputRef.current?.click()}>
                            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-4xl shadow-lg border-4 border-white dark:border-gray-800 overflow-hidden" style={{ background: avatarColors[trip.id % avatarColors.length] }}>
                                {trip?.image_url ? <img src={trip.image_url} className="w-full h-full object-cover" /> : (trip?.name ? String(trip.name).charAt(0).toUpperCase() : '?')}
                            </div>
                            <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className="text-white text-xs font-bold text-center leading-tight">שנה<br/>תמונה</span>
                            </div>
                        </div>
                        
                        <input 
                            type="text" 
                            defaultValue={trip?.name || ''} 
                            onChange={(e) => setEditTripDetails(prev => ({...prev, name: e.target.value}))}
                            className="text-2xl font-bold text-gray-900 dark:text-white bg-transparent text-center focus:outline-none focus:border-b-2 focus:border-indigo-500 w-3/4 transition-all"
                            placeholder={t?.group_name || 'שם הקבוצה'}
                        />
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{participants.length} חברים</p>
                    </div>

                    {/* Scrollable Body */}
                    <div className="flex-1 overflow-y-auto p-0">
                        
                        {/* Action Buttons */}
                        <div className="flex justify-center gap-6 p-4 border-b border-gray-100 dark:border-gray-700">
                            {isAdmin && (
                                <button onClick={() => window.pickContact && window.pickContact('edit', 'wa')} className="flex flex-col items-center gap-1.5 text-indigo-600 dark:text-indigo-400 hover:scale-105 transition-transform">
                                    <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-full shadow-sm"><IconUsers size={22} /></div>
                                    <span className="text-xs font-medium">הוסף חבר</span>
                                </button>
                            )}
                            <button onClick={() => window.copyInviteLink(trip.id, trip.invite_token)} className="flex flex-col items-center gap-1.5 text-indigo-600 dark:text-indigo-400 hover:scale-105 transition-transform">
                                <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-full shadow-sm"><IconLink size={22} /></div>
                                <span className="text-xs font-medium">העתק קישור</span>
                            </button>
                        </div>

                        {/* Participants List */}
                        <div className="p-4">
                            <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-3 px-2">משתתפים</h3>
                            <div className="space-y-2">
                                {participants.map((participant, idx) => {
                                    const p = typeof participant === 'string' ? { name: participant, contact: participant } : participant;
                                    const name = p.name || p.contact || p.username || p.email || p.phone || '?';
                                    const initial = name && name !== '?' ? String(name).charAt(0).toUpperCase() : '?';
                                    const isParticipantAdmin = p.is_admin || p.role === 'admin';
                                    return (
                                        <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-700">
                                            <div className="flex items-center gap-3">
                                                {p.avatar_url ? (
                                                    <img src={p.avatar_url} className="w-10 h-10 rounded-full object-cover border border-indigo-100" />
                                                ) : (
                                                    <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-lg">
                                                        {initial}
                                                    </div>
                                                )}
                                                <span className="font-medium text-gray-900 dark:text-white">{name}</span>
                                            </div>
                                            {p.type === 'pending' ? (
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-[10px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-900/30 px-2 py-1 rounded-md border border-amber-200 dark:border-amber-700/50 shadow-sm whitespace-nowrap">ממתין</span>
                                                    {isAdmin && (
                                                        <button onClick={() => removeUser(p.contact)} className="text-xs font-medium text-red-600 bg-red-100 hover:bg-red-200 dark:bg-red-900/20 px-2.5 py-1.5 rounded-full transition-colors shadow-sm">הסר</button>
                                                    )}
                                                </div>
                                            ) : isParticipantAdmin ? 
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/30 px-2.5 py-1 rounded-full">מנהל</span>
                                                    {isAdmin && !p.is_owner && (
                                                        <button onClick={() => { if(window.removeMemberAdmin) window.removeMemberAdmin(trip, p.contact); }} className="text-xs font-medium text-gray-600 bg-gray-100 hover:bg-red-100 hover:text-red-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-red-900/30 px-2.5 py-1.5 rounded-full transition-colors shadow-sm">הסר מניהול</button>
                                                    )}
                                                </div> :
                                                isAdmin && !p.is_owner ? (
                                                    <div className="flex items-center gap-1.5">
                                                        <button onClick={() => { if(window.makeMemberAdmin) window.makeMemberAdmin(trip, p.contact); }} className="text-xs font-medium text-indigo-600 bg-indigo-100 hover:bg-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400 px-2.5 py-1.5 rounded-full transition-colors shadow-sm">ניהול</button>
                                                        <button onClick={() => removeUser(p.contact)} className="text-xs font-medium text-red-600 bg-red-100 hover:bg-red-200 dark:bg-red-900/20 px-2.5 py-1.5 rounded-full transition-colors shadow-sm">הסר</button>
                                                    </div>
                                                ) : null
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
                                        <IconSettings size={18} className="text-indigo-500" /> הגדרות מנהל  
                                    </div>
                                    <IconChevronDown size={16} className={`text-gray-500 transition-transform duration-300 ${trip.showAdvancedBudget ? 'rotate-180' : ''}`} />
                                </button>

                                {trip.showAdvancedBudget && (
                                    <div className="mt-3 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-700 animate-in fade-in slide-in-from-top-2">
                                        <div className="space-y-3 pt-3 border-t border-gray-200 dark:border-gray-700 mb-4">
                                            <div className="flex items-center justify-between bg-white dark:bg-gray-900 p-2 rounded-xl border border-gray-100 dark:border-gray-700">
                                                <label className="text-[12px] font-bold text-gray-700 dark:text-gray-300 pl-1 w-1/3">מטבע קבוצה</label>
                                                <select value={trip.budgets_json?.currency || 'ILS'} onChange={(e) => updateGlobalBudget('currency', e.target.value)} className="w-2/3 bg-transparent border-none text-[12px] font-medium text-gray-900 dark:text-white focus:ring-0 outline-none dir-rtl" style={{ textOverflow: 'ellipsis' }}>
                                                    {window.globalCurrencies && window.globalCurrencies.length > 0 ? window.globalCurrencies.map(c => {
                                                        const isHe = window.currentLanguage === 'he' || document.documentElement.lang === 'he';
                                                        const name = isHe ? c.name_he : c.name_en;
                                                        return <option key={c.code} value={c.code}>{c.code} - {name} ({c.symbol})</option>;
                                                    }) : (
                                                        <>
                                                            <option value="ILS">ILS - שקל חדש (₪)</option>
                                                            <option value="USD">USD - דולר ארה"ב ($)</option>
                                                            <option value="EUR">EUR - אירו (€)</option>
                                                        </>
                                                    )}
                                                </select>
                                            </div>
                                            
                                            <div className="flex items-center justify-between">
                                                <label className="text-sm font-bold text-gray-700 dark:text-gray-300">תקציב קבוצתי</label>
                                            </div>
                                            
                                            <div className="grid grid-cols-3 gap-2 mt-2">
                                                {['daily', 'monthly', 'yearly'].map((type, i) => (
                                                    <div key={'global-' + type} className="flex flex-col gap-1 w-full">
                                                        <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300 text-center">{type === 'daily' ? 'תקציב יומי' : type === 'monthly' ? 'תקציב חודשי' : 'תקציב שנתי'}</span>
                                                        <button type="button" onClick={() => setBudgetPopup({ key: 'global', type, value: trip.budgets_json?.[type] || '', name: 'כל הקבוצה' })} className="w-full text-center py-2.5 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-900 dark:text-white shadow-sm hover:border-indigo-300 transition-colors">
                                                            {trip.budgets_json?.[type] ? `${trip.budgets_json?.[type]} ${currencySymbol}` : 'הזן סכום'}
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between mb-4">
                                            <label className="text-sm font-bold text-gray-700 dark:text-gray-300">תקציב אישי לכל משתתף</label>
                                            <div 
                                                className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-300 ease-in-out ${trip.is_budget_per_user ? 'bg-indigo-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                                                onClick={() => togglePermission('is_budget_per_user')}
                                            >
                                                <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform duration-300 ease-in-out ${trip.is_budget_per_user ? 'translate-x-0' : '-translate-x-5'}`}></div>
                                            </div>
                                        </div>
                                        
                                        {trip.is_budget_per_user && (
                                            <div className="space-y-3 pt-3 border-t border-gray-200 dark:border-gray-700 mb-4">
                                                {participants.map((participant, idx) => {
                                                    const p = typeof participant === 'string' ? { name: participant, contact: participant } : participant;
                                                    const key = p.contact || p.email || p.phone || p.name;
                                                    const uBudget = trip.user_budgets?.[key] || { daily: '', monthly: '', yearly: '' };
                                                    const pName = p.name || p.username || p.email || p.phone || '?';
                                                    return (
                                                        <div key={idx} className="mb-4">
                                                            <div className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">{pName}</div>
                                                            <div className="grid grid-cols-3 gap-2 mt-2">
                                                                {['daily', 'monthly', 'yearly'].map((type, i) => (
                                                                    <div key={i} className="flex flex-col gap-1 w-full">
                                                                        <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300 text-center">{type === 'daily' ? 'תקציב יומי' : type === 'monthly' ? 'תקציב חודשי' : 'תקציב שנתי'}</span>
                                                                        <button type="button" onClick={() => setBudgetPopup({ key, type, value: uBudget[type] || '', name: pName })} className="w-full text-center py-2.5 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-bold text-gray-900 dark:text-white shadow-sm hover:border-indigo-300 transition-colors">
                                                                            {uBudget[type] ? `${uBudget[type]} ${currencySymbol}` : 'הזן סכום'}
                                                                        </button>
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
                                                <label className="text-sm text-gray-700 dark:text-gray-300">הצג הוצאות לכולם</label>
                                                <div 
                                                    className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-300 ease-in-out ${trip.is_public_expenses !== false ? 'bg-indigo-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                                                    onClick={() => togglePermission('is_public_expenses')}
                                                >
                                                    <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform duration-300 ease-in-out ${trip.is_public_expenses !== false ? 'translate-x-0' : '-translate-x-5'}`}></div>
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <label className="text-sm text-gray-700 dark:text-gray-300">אפשר למשתתפים למחוק הוצאות</label>
                                                <div 
                                                    className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-300 ease-in-out ${trip.allow_member_delete !== false ? 'bg-indigo-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                                                    onClick={() => togglePermission('allow_member_delete')}
                                                >
                                                    <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform duration-300 ease-in-out ${trip.allow_member_delete !== false ? 'translate-x-0' : '-translate-x-5'}`}></div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Action Buttons inside scroll area */}
                        <div className="mt-8 mb-4 space-y-3 px-2">
                            {!trip.is_readonly && (
                                <button onClick={() => window.saveEditTripFromReact(trip)} className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-[0_0_15px_rgba(99,102,241,0.4)] transition-all flex items-center justify-center gap-2 active:scale-95">
                                    <IconCheck size={18} /> שמור שינויים
                                </button>
                            )}
                            {!trip.is_readonly && (
                                <button onClick={handleLeaveTrip} className="w-full py-3 bg-orange-100/80 hover:bg-orange-200 dark:bg-orange-900/30 dark:hover:bg-orange-800/50 text-orange-700 dark:text-orange-400 font-bold rounded-xl transition-all flex items-center justify-center gap-2 active:scale-95 border border-orange-200/50 dark:border-orange-800/30">
                                    <IconUserMinus size={18} /> עזוב קבוצה
                                </button>
                            )}
                            <button onClick={handleHideTrip} className="w-full py-3 bg-red-100/80 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-800/50 text-red-700 dark:text-red-400 font-bold rounded-xl transition-all flex items-center justify-center gap-2 active:scale-95 border border-red-200/50 dark:border-red-800/30">
                                <IconTrash size={18} /> מחק קבוצה מהרשימה
                            </button>
                        </div>
                    </div>

                    {budgetPopup && (
                        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" dir="rtl">
                            <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-2xl w-full max-w-xs transform scale-100 animate-in zoom-in-95 duration-200">
                                <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-1">
                                    תקציב {budgetPopup.type === 'daily' ? 'יומי' : budgetPopup.type === 'monthly' ? 'חודשי' : 'שנתי'}
                                </h4>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">עבור {budgetPopup.name}</p>
                                
                                <div className="relative mb-5 flex items-center bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500">
                                    <span className="pl-3 pr-4 text-gray-500 font-bold border-l border-gray-200 dark:border-gray-700">{currencySymbol}</span>
                                    <input 
                                        type="number" 
                                        autoFocus
                                        value={budgetPopup.value} 
                                        onChange={(e) => setBudgetPopup({ ...budgetPopup, value: e.target.value })} 
                                        className="w-full text-center text-lg font-bold py-3 bg-transparent border-none outline-none dir-ltr dark:text-white"
                                        placeholder="0"
                                    />
                                </div>
                                
                                <div className="flex gap-2">
                                    <button onClick={() => setBudgetPopup(null)} className="flex-1 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 rounded-xl transition-colors">ביטול</button>
                                    <button onClick={() => { 
                                        if (budgetPopup.key === 'global') {
                                            updateGlobalBudget(budgetPopup.type, budgetPopup.value);
                                        } else {
                                            updateBudget(budgetPopup.key, budgetPopup.type, budgetPopup.value);
                                        }
                                        setBudgetPopup(null); 
                                    }} className="flex-1 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors">אישור</button>
                                </div>
                            </div>
                        </div>
                    )}
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

const root = ReactDOM.createRoot(document.getElementById('react-groups-root'));
root.render(<GroupsScreen />);


