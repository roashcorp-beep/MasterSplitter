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
    const [groups, setGroups] = useState([]);
    const [lang, setLang] = useState(localStorage.getItem("lang") || "he");
    const [localCurrencies, setLocalCurrencies] = useState(window.globalCurrencies || []);

    // Create Modal State
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [createTab, setCreateTab] = React.useState("whatsapp");
    const [editTab, setEditTab] = React.useState("whatsapp");
    const fileInputRef = React.useRef(null);
    const [createShowBudget, setCreateShowBudget] = useState(false);

    // Edit Modal State
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editGroupId, setEditGroupId] = useState(null);
    const [editShowBudget, setEditShowBudget] = useState(false);
    const [editGroupDetails, setEditGroupDetails] = useState(null);
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

        window.reactUpdateGroups = (newGroups) => setGroups([...newGroups]);
        window.reactOpenCreateModal = () => {
            setCreateTab("whatsapp");
            setIsCreateOpen(true);
        };
        window.reactCloseCreateModal = () => setIsCreateOpen(false);
                window.reactOpenEditModal = (id) => {
            const group = window.allGroups ? window.allGroups.find(t => t.id === id) : groups.find(t => t.id === id);
            if (group) {
                let participants = group.participants || [];
                const updatedGroup = { ...group, participants };
                
                if (!updatedGroup.user_budgets) updatedGroup.user_budgets = {};
                participants.forEach(p => {
                    if (p.budgets_json) {
                        updatedGroup.user_budgets[p.contact] = { ...p.budgets_json };
                    }
                    if (typeof updatedGroup.user_budgets[p.contact] !== 'object') {
                        updatedGroup.user_budgets[p.contact] = {
                            daily: updatedGroup.user_budgets[p.contact] || '',
                            monthly: '',
                            yearly: ''
                        };
                    }
                });

                setEditGroupId(id);
                setEditGroupDetails(updatedGroup);
                setEditTab("whatsapp");
                setIsEditOpen(true);
            } else {
                console.error("Group not found for ID:", id);
            }
        };
        window.reactSetEditGroupDetails = (details) => {
            setEditGroupDetails(details);
        };
        window.reactCloseEditModal = () => setIsEditOpen(false);
        window.reactAddParticipantToEditGroup = (p) => { setEditGroupDetails(prev => { if (!prev) return prev; return { ...prev, participants: [...(prev.participants || []), p] }; }); };

        window.addEventListener("storage", i18nSync);
        const onCurrenciesLoaded = () => setLocalCurrencies([...(window.globalCurrencies || [])]);
        window.addEventListener("currenciesLoaded", onCurrenciesLoaded);
        
        if (window.allGroups) setGroups([...window.allGroups]);

        return () => {
            window.removeEventListener("storage", i18nSync);
            window.removeEventListener("currenciesLoaded", onCurrenciesLoaded);
        };
    }, []);

    // Notify the (vanilla) tour engine when the create/edit modals open, so it can run a
    // first-time mini-tour over them.
    useEffect(() => { if (isCreateOpen && typeof window.onCreateGroupOpened === "function") window.onCreateGroupOpened(); }, [isCreateOpen]);
    useEffect(() => { if (isEditOpen && typeof window.onEditGroupOpened === "function") window.onEditGroupOpened(); }, [isEditOpen]);

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

    const handleGroupClick = (id) => {
        if (typeof window.openGroup === "function") {
            window.openGroup(id);
        }
    };

    const handleUploadGroupImage = async (groupId, file) => {
        if (!file) return;
        const formData = new FormData();
        formData.append("avatar", file);
        try {
            const res = await fetch(`/api/groups/${groupId}/upload-avatar`, {
                method: "POST",
                body: formData
            });
            const data = await res.json();
            if (res.ok && data.success) {
                if (window.showToast) window.showToast(i18n("toast_image_updated") || "Image updated successfully", "success");
                setEditGroupDetails(prev => ({ ...prev, image_url: data.avatar_url }));
                // update global list as well
                setGroups(prev => prev.map(t => t.id === groupId ? { ...t, image_url: data.avatar_url } : t));
                if (window.loadLobby) window.loadLobby();
            } else {
                if (window.showToast) window.showToast(data.error || (i18n("error_upload_image") || "Error uploading image"), "error");
            }
        } catch (e) {
            console.error(e);
            if (window.showToast) window.showToast(i18n("error_network") || "Network error", "error");
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
                <h2 data-i18n="lobby_my_groups">{i18n("lobby_my_groups") || "הקבוצות שלי"}</h2>
                <button className="primary-btn sm" onClick={() => setIsCreateOpen(true)} data-i18n="lobby_btn_create">
                    {i18n("lobby_btn_create") || "+ יצירת קבוצה"}
                </button>
            </div>
            
            <div id="groups-list" className="groups-grid">
                {groups.length === 0 ? (
                    <div className="empty-state">
                        <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" style={{ marginBottom: 12 }}>
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                        </svg>
                        <p>{i18n("lobby_no_groups") || "אין קבוצות עדיין"}</p>
                    </div>
                ) : (
                    groups.map((group, i) => {
                        const initial = group && group.name ? String(group.name).charAt(0).toUpperCase() : '?';
                        const isAdmin = group.is_admin !== undefined ? group.is_admin : group.is_owner;
                        let cardCurrency = "";
                        let highestBudget = null;
                        let highestBudgetLabel = "";
                        if (group.budgets_json) {
                            const cCode = group.budgets_json.currency || 'ILS';
                            const cObj = localCurrencies?.find(c => c.code === cCode);
                            cardCurrency = cObj?.symbol ? cObj.symbol : (cCode === 'USD' ? '$' : cCode === 'EUR' ? '€' : cCode === 'GBP' ? '£' : '₪');
                            if (group.budgets_json.yearly) {
                                highestBudget = group.budgets_json.yearly;
                                highestBudgetLabel = i18n("yearly") || "שנתי";
                            } else if (group.budgets_json.monthly) {
                                highestBudget = group.budgets_json.monthly;
                                highestBudgetLabel = i18n("monthly") || "חודשי";
                            } else if (group.budgets_json.daily) {
                                highestBudget = group.budgets_json.daily;
                                highestBudgetLabel = i18n("daily") || "יומי";
                            }
                        }
                        if (highestBudget !== null && group.is_budget_per_user) {
                            const memberCount = group.participants?.length || 1;
                            highestBudget = highestBudget * memberCount;
                        }
                        const memberCount = group.participants?.length || 0;
                        
                        return (
                            <div key={group.id} className="group-card-v2" onClick={() => handleGroupClick(group.id)}>
                                <div className="group-card-avatar overflow-hidden" style={{ background: avatarColors[i % avatarColors.length] }}>
                                    {group.image_url ? <img src={group.image_url} className="w-full h-full object-cover" /> : initial}
                                </div>
                                <div className="group-card-v2-body">
                                    <div className="group-card-v2-name">{group.name}</div>
                                    <div className="group-card-v2-meta">
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
                                <div className="group-card-v2-right">
                                    {isAdmin && (
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); window.openEditGroupModal(group.id); }} 
                                            className="group-edit-btn"
                                            title={i18n("edit_group") || "Edit Group"}
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                                        </button>
                                    )}
                                    <span className="group-card-v2-arrow"></span>
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
            <div id="create-group-modal" className="modal-overlay open">
                <div className="modal-card">
                    <div className="modal-header">
                        <h3>{i18n("create_group_title") || "צור קבוצה חדשה"}</h3>
                        <button className="modal-close-x" onClick={() => setIsCreateOpen(false)}>
                            <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        </button>
                    </div>

                    <div className="modal-body-content space-y-4">
                    <div className="form-group">
                        <label>{i18n("create_group_name") || "שם הקבוצה"}</label>
                        <input type="text" id="create-group-name" placeholder={i18n("create_group_name_ph") || "למשל: דירה, חופשה, משרד..."} />
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
                        <button className="primary-btn" onClick={() => window.createGroup()}>{i18n("create_group_btn") || "צור קבוצה"}</button>
                    </div>
                </div>
            </div>
        );
    };

    
            const renderEditModal = () => {
        if (!isEditOpen || !editGroupDetails) return null;
        const group = editGroupDetails;
        const t = typeof i18n === 'function' ? { group_name: i18n('create_group_name') } : {};
        const isRTL = document.dir === 'rtl';
        const onClose = () => setIsEditOpen(false);

        const currentPhone = window.currentUser?.phone || window.currentUser?.email;
        const isAdmin = group.is_admin || group.is_owner || (group.participants && group.participants.some(p => (p.contact === currentPhone || p.id === window.currentUser?.id) && p.is_admin));

        const updateGlobalBudget = (type, value) => {
            setEditGroupDetails(prev => {
                const currentBudgets = prev.budgets_json || {};
                return {
                    ...prev,
                    budgets_json: { ...currentBudgets, [type]: value }
                };
            });
        };

        const togglePermission = (field) => {
            setEditGroupDetails(prev => ({ ...prev, [field]: prev[field] === false ? true : false }));
        };

        const updateBudget = (contact, type, value) => {
            setEditGroupDetails(prev => {
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
                window.removeGroupMember(group.id, contact);
            }
        };

        const handleLeaveGroup = async () => {
            if (window.confirm(i18n("confirm_leave_group") || "Are you sure you want to leave this group? The group will become read-only.")) {
                try {
                    const res = await fetch(`/api/groups/${group.id}/leave`, { method: 'POST', headers: { 'Authorization': `Bearer ${window.authToken}` } });
                    if (res.ok) {
                        window.location.reload();
                    } else {
                        const err = await res.json();
                        alert(err.error || (i18n("error_leave_group") || "Error leaving group"));
                    }
                } catch (e) {
                    console.error(e);
                }
            }
        };

        const handleHideGroup = async () => {
            if (window.confirm(i18n("confirm_hide_group") || "Are you sure you want to remove this group from your list?")) {
                try {
                    const res = await fetch(`/api/groups/${group.id}/hide`, { method: 'POST', headers: { 'Authorization': `Bearer ${window.authToken}` } });
                    if (res.ok) {
                        window.location.reload();
                    } else {
                        const err = await res.json();
                        alert(err.error || (i18n("error_hide_group") || "Error removing group"));
                    }
                } catch (e) {
                    console.error(e);
                }
            }
        };

        const participants = group?.participants?.length > 0 ? group.participants : [
            { name: window.currentUser?.username || (window.currentUser?.email ? window.currentUser.email.split('@')[0] : 'Me'), role: 'admin' }
        ];

        const cCode = group.budgets_json?.currency || 'ILS';
        const cObj = localCurrencies?.find(c => c.code === cCode);
        const currencySymbol = cObj?.symbol ? cObj.symbol : (cCode === 'USD' ? '$' : cCode === 'EUR' ? '€' : cCode === 'GBP' ? '£' : '₪');

        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" dir={isRTL ? 'rtl' : 'ltr'}>
                <div className="bg-white/85 dark:bg-[#12122a]/90 backdrop-blur-3xl border border-purple-300/60 dark:border-purple-500/40 rounded-3xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-300 flex flex-col max-h-[90vh] relative" style={{ boxShadow: '0 0 50px -10px rgba(168,85,247,0.45)' }}>
                    
                    {/* Header - Gemini Style */}
                    <div className="p-6 bg-gradient-to-b from-purple-50/50 to-white/50 dark:from-purple-900/30 dark:to-transparent border-b border-purple-100/50 dark:border-purple-800/30 flex flex-col items-center relative">
                        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-purple-600 dark:text-gray-400 dark:hover:text-purple-300 bg-white/50 dark:bg-gray-800/50 hover:bg-purple-50 dark:hover:bg-purple-900/50 rounded-full p-2 transition-colors backdrop-blur-sm">✕</button>
                        
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            className="hidden" 
                            accept="image/*" 
                            onChange={(e) => {
                                if (e.target.files && e.target.files[0]) {
                                    handleUploadGroupImage(group.id, e.target.files[0]);
                                }
                            }} 
                        />
                        <div className="relative group cursor-pointer mb-3" onClick={() => fileInputRef.current?.click()}>
                            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white font-bold text-4xl shadow-lg border-4 border-white dark:border-gray-800 overflow-hidden" style={{ background: avatarColors[group.id % avatarColors.length] }}>
                                {group?.image_url ? <img src={group.image_url} className="w-full h-full object-cover" /> : (group?.name ? String(group.name).charAt(0).toUpperCase() : '?')}
                            </div>
                            <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className="text-white text-xs font-bold text-center leading-tight">{i18n("edit_group_change") || "שנה"}<br/>{i18n("edit_group_image") || "תמונה"}</span>
                            </div>
                        </div>
                        
                        <input
                            type="text"
                            data-tour="edit-name"
                            defaultValue={group?.name || ''}
                            onChange={(e) => setEditGroupDetails(prev => ({...prev, name: e.target.value}))}
                            className="text-2xl font-bold text-gray-900 dark:text-white bg-transparent text-center focus:outline-none focus:border-b-2 focus:border-purple-500 w-3/4 transition-all"
                            placeholder={t?.group_name || 'שם הקבוצה'}
                        />
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{participants.length} {i18n("members") || "חברים"}</p>
                    </div>

                    {/* Scrollable Body */}
                    <div className="flex-1 overflow-y-auto p-0">
                        
                        {/* Action Buttons */}
                        <div className="flex justify-center gap-6 p-4 border-b border-gray-100 dark:border-gray-700">
                            {isAdmin && (
                                <button onClick={() => window.pickContact && window.pickContact('edit', 'wa')} className="flex flex-col items-center gap-1.5 text-purple-600 dark:text-purple-400 hover:scale-105 transition-transform">
                                    <div className="p-3 bg-purple-50 dark:bg-purple-900/30 rounded-full shadow-sm"><IconUsers size={22} /></div>
                                    <span className="text-xs font-medium">{i18n("add_member") || "הוסף חבר"}</span>
                                </button>
                            )}
                            <button onClick={() => window.copyInviteLink(group.id, group.invite_token)} className="flex flex-col items-center gap-1.5 text-purple-600 dark:text-purple-400 hover:scale-105 transition-transform">
                                <div className="p-3 bg-purple-50 dark:bg-purple-900/30 rounded-full shadow-sm"><IconLink size={22} /></div>
                                <span className="text-xs font-medium">{i18n("copy_link") || "העתק קישור"}</span>
                            </button>
                        </div>

                        {/* Participants List */}
                        <div className="p-4">
                            <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-3 px-2">{i18n("participants") || "משתתפים"}</h3>
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
                                                    <img src={p.avatar_url} className="w-10 h-10 rounded-full object-cover border border-purple-100" />
                                                ) : (
                                                    <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold text-lg">
                                                        {initial}
                                                    </div>
                                                )}
                                                <span className="font-medium text-gray-900 dark:text-white">{name}</span>
                                            </div>
                                            {p.type === 'pending' ? (
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-[10px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-900/30 px-2 py-1 rounded-md border border-amber-200 dark:border-amber-700/50 shadow-sm whitespace-nowrap">{i18n("status_pending") || "ממתין"}</span>
                                                    {isAdmin && (
                                                        <button onClick={() => removeUser(p.contact)} className="text-xs font-medium text-red-600 bg-red-100 hover:bg-red-200 dark:bg-red-900/20 px-2.5 py-1.5 rounded-full transition-colors shadow-sm">{i18n("btn_remove") || "הסר"}</button>
                                                    )}
                                                </div>
                                            ) : isParticipantAdmin ? 
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-xs font-bold text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/30 px-2.5 py-1 rounded-full">{i18n("role_admin") || "Admin"}</span>
                                                    {isAdmin && !p.is_owner && (
                                                        <button onClick={() => { if(window.removeMemberAdmin) window.removeMemberAdmin(group, p.contact); }} className="text-xs font-medium text-gray-600 bg-gray-100 hover:bg-red-100 hover:text-red-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-red-900/30 px-2.5 py-1.5 rounded-full transition-colors shadow-sm">{i18n("remove_admin") || "Remove Admin"}</button>
                                                    )}
                                                </div> :
                                                isAdmin && !p.is_owner ? (
                                                    <div className="flex items-center gap-1.5">
                                                        <button onClick={() => { if(window.makeMemberAdmin) window.makeMemberAdmin(group, p.contact); }} className="text-xs font-medium text-purple-600 bg-purple-100 hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-400 px-2.5 py-1.5 rounded-full transition-colors shadow-sm">{i18n("make_admin") || "Admin"}</button>
                                                        <button onClick={() => removeUser(p.contact)} className="text-xs font-medium text-red-600 bg-red-100 hover:bg-red-200 dark:bg-red-900/20 px-2.5 py-1.5 rounded-full transition-colors shadow-sm">{i18n("btn_remove") || "Remove"}</button>
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
                                <button data-tour="edit-advanced" onClick={() => setEditGroupDetails(prev => ({...prev, showAdvancedBudget: !prev.showAdvancedBudget}))} className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-2xl transition-colors border border-gray-100 dark:border-gray-700">
                                    <div className="flex items-center gap-2 text-gray-700 dark:text-gray-200 font-medium">
                                        <IconSettings size={18} className="text-purple-500" /> {i18n("admin_settings") || "הגדרות מנהל"}  
                                    </div>
                                    <IconChevronDown size={16} className={`text-gray-500 transition-transform duration-300 ${group.showAdvancedBudget ? 'rotate-180' : ''}`} />
                                </button>

                                {group.showAdvancedBudget && (
                                    <div className="mt-3 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-700 animate-in fade-in slide-in-from-top-2">
                                        <div className="space-y-3 pt-3 border-t border-gray-200 dark:border-gray-700 mb-4">
                                            <div className="flex items-center justify-between bg-white dark:bg-gray-900 p-2 rounded-xl border border-gray-100 dark:border-gray-700">
                                                <label className="text-[12px] font-bold text-gray-700 dark:text-gray-300 pl-1 w-1/3">{i18n("group_currency") || "מטבע קבוצה"}</label>
                                                <button 
                                                    type="button"
                                                    onClick={() => {
                                                        if (typeof window.openCurrencyPicker === 'function') {
                                                            window.openCurrencyPicker((val) => updateGlobalBudget('currency', val));
                                                        }
                                                    }}
                                                    className="w-2/3 bg-transparent border-none text-[12px] font-medium text-gray-900 dark:text-white focus:ring-0 outline-none dir-rtl text-left cursor-pointer"
                                                >
                                                    {group.budgets_json?.currency || 'ILS'}
                                                </button>
                                            </div>
                                            
                                            <div className="flex items-center justify-between">
                                                <label className="text-sm font-bold text-gray-700 dark:text-gray-300">{i18n("global_budget") || "תקציב קבוצתי"}</label>
                                            </div>
                                            
                                            <div className="grid grid-cols-3 gap-2 mt-2">
                                                {['daily', 'monthly', 'yearly'].map((type, i) => (
                                                    <div key={'global-' + type} className="flex flex-col gap-1 w-full">
                                                        <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300 text-center">{type === 'daily' ? (i18n('budget_daily') || 'תקציב יומי') : type === 'monthly' ? (i18n('budget_monthly') || 'תקציב חודשי') : (i18n('budget_yearly') || 'תקציב שנתי')}</span>
                                                        <button type="button" onClick={() => setBudgetPopup({ key: 'global', type, value: group.budgets_json?.[type] || '', name: i18n('all_group') || 'כל הקבוצה' })} className="w-full text-center py-2.5 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-900 dark:text-white shadow-sm hover:border-purple-300 transition-colors">
                                                            {group.budgets_json?.[type] ? `${group.budgets_json?.[type]} ${currencySymbol}` : (i18n('enter_amount') || 'הזן סכום')}
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between mb-4">
                                            <label className="text-sm font-bold text-gray-700 dark:text-gray-300">{i18n("personal_budget_per_user") || "תקציב אישי לכל משתתף"}</label>
                                            <div 
                                                className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-300 ease-in-out ${group.is_budget_per_user ? 'bg-purple-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                                                onClick={() => togglePermission('is_budget_per_user')}
                                            >
                                                <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform duration-300 ease-in-out ${group.is_budget_per_user ? (isRTL ? 'translate-x-0' : 'translate-x-5') : (isRTL ? '-translate-x-5' : 'translate-x-0')}`}></div>
                                            </div>
                                        </div>
                                        
                                        {group.is_budget_per_user && (
                                            <div className="space-y-3 pt-3 border-t border-gray-200 dark:border-gray-700 mb-4">
                                                {participants.map((participant, idx) => {
                                                    const p = typeof participant === 'string' ? { name: participant, contact: participant } : participant;
                                                    const key = p.contact || p.email || p.phone || p.name;
                                                    const uBudget = group.user_budgets?.[key] || { daily: '', monthly: '', yearly: '' };
                                                    const pName = p.name || p.username || p.email || p.phone || '?';
                                                    return (
                                                        <div key={idx} className="mb-4">
                                                            <div className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">{pName}</div>
                                                            <div className="grid grid-cols-3 gap-2 mt-2">
                                                                {['daily', 'monthly', 'yearly'].map((type, i) => (
                                                                    <div key={i} className="flex flex-col gap-1 w-full">
                                                                        <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300 text-center">{type === 'daily' ? (i18n('budget_daily') || 'תקציב יומי') : type === 'monthly' ? (i18n('budget_monthly') || 'תקציב חודשי') : (i18n('budget_yearly') || 'תקציב שנתי')}</span>
                                                                        <button type="button" onClick={() => setBudgetPopup({ key, type, value: uBudget[type] || '', name: pName })} className="w-full text-center py-2.5 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-bold text-gray-900 dark:text-white shadow-sm hover:border-purple-300 transition-colors">
                                                                            {uBudget[type] ? `${uBudget[type]} ${currencySymbol}` : (i18n('enter_amount') || 'הזן סכום')}
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
                                                <label className="text-sm text-gray-700 dark:text-gray-300">{i18n("public_expenses") || "הצג הוצאות לכולם"}</label>
                                                <div 
                                                    className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-300 ease-in-out ${group.is_public_expenses !== false ? 'bg-purple-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                                                    onClick={() => togglePermission('is_public_expenses')}
                                                >
                                                    <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform duration-300 ease-in-out ${group.is_public_expenses !== false ? (isRTL ? 'translate-x-0' : 'translate-x-5') : (isRTL ? '-translate-x-5' : 'translate-x-0')}`}></div>
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <label className="text-sm text-gray-700 dark:text-gray-300">{i18n("public_settlements") || "הצג קיזוזים לכולם"}</label>
                                                <div
                                                    className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-300 ease-in-out ${group.is_public_settlements === true ? 'bg-purple-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                                                    onClick={() => togglePermission('is_public_settlements')}
                                                >
                                                    <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform duration-300 ease-in-out ${group.is_public_settlements === true ? (isRTL ? '-translate-x-5' : 'translate-x-5') : 'translate-x-0'}`}></div>
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <label className="text-sm text-gray-700 dark:text-gray-300">{i18n("allow_member_delete_lbl") || "אפשר למשתתפים למחוק הוצאות"}</label>
                                                <div
                                                    className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-300 ease-in-out ${group.allow_member_delete !== false ? 'bg-purple-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                                                    onClick={() => togglePermission('allow_member_delete')}
                                                >
                                                    <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform duration-300 ease-in-out ${group.allow_member_delete !== false ? (isRTL ? 'translate-x-0' : 'translate-x-5') : (isRTL ? '-translate-x-5' : 'translate-x-0')}`}></div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Action Buttons inside scroll area */}
                        <div className="mt-8 mb-4 space-y-3 px-2">
                            {!group.is_readonly && (
                                <button data-tour="edit-save" onClick={() => window.saveEditGroupFromReact(group)} className="w-full py-3.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-[0_0_15px_rgba(99,102,241,0.4)] transition-all flex items-center justify-center gap-2 active:scale-95">
                                    <IconCheck size={18} /> {i18n("save_changes") || "שמור שינויים"}
                                </button>
                            )}
                            {!group.is_readonly && (
                                <button onClick={handleLeaveGroup} className="w-full py-3 bg-orange-100/80 hover:bg-orange-200 dark:bg-orange-900/30 dark:hover:bg-orange-800/50 text-orange-700 dark:text-orange-400 font-bold rounded-xl transition-all flex items-center justify-center gap-2 active:scale-95 border border-orange-200/50 dark:border-orange-800/30">
                                    <IconUserMinus size={18} /> {i18n("leave_group") || "עזוב קבוצה"}
                                </button>
                            )}
                            <button onClick={handleHideGroup} className="w-full py-3 bg-red-100/80 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-800/50 text-red-700 dark:text-red-400 font-bold rounded-xl transition-all flex items-center justify-center gap-2 active:scale-95 border border-red-200/50 dark:border-red-800/30">
                                <IconTrash size={18} /> {i18n("hide_group") || "מחק קבוצה מהרשימה"}
                            </button>
                        </div>
                    </div>

                    {budgetPopup && (
                        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" dir="rtl">
                            <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-2xl w-full max-w-xs transform scale-100 animate-in zoom-in-95 duration-200">
                                <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-1">
                                    {i18n("budget") || "תקציב"} {budgetPopup.type === 'daily' ? (i18n('daily') || 'יומי') : budgetPopup.type === 'monthly' ? (i18n('monthly') || 'חודשי') : (i18n('yearly') || 'שנתי')}
                                </h4>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">{i18n("for") || "עבור"} {budgetPopup.name}</p>
                                
                                <div className="relative mb-5 flex items-center bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-purple-500">
                                    <span className={`px-4 text-gray-500 font-bold ${isRTL ? 'border-l' : 'border-r'} border-gray-200 dark:border-gray-700`}>{currencySymbol}</span>
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
                                    <button onClick={() => setBudgetPopup(null)} className="flex-1 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 rounded-xl transition-colors">{i18n("btn_cancel") || "ביטול"}</button>
                                    <button onClick={() => { 
                                        if (budgetPopup.key === 'global') {
                                            updateGlobalBudget(budgetPopup.type, budgetPopup.value);
                                        } else {
                                            updateBudget(budgetPopup.key, budgetPopup.type, budgetPopup.value);
                                        }
                                        setBudgetPopup(null); 
                                    }} className="flex-1 py-2 text-sm font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl transition-colors">{i18n("btn_confirm") || "אישור"}</button>
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


