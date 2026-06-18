import re

with open('Static/js/components/GroupsScreen.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add a function to handle global budget update
global_budget_update = '''
        const updateGlobalBudget = (type, value) => {
            setEditTripDetails(prev => {
                const currentBudgets = prev.budgets_json || {};
                return {
                    ...prev,
                    budgets_json: { ...currentBudgets, [type]: value }
                };
            });
        };
'''

content = content.replace("const togglePermission = (field) => {", global_budget_update.strip() + '\n\n        const togglePermission = (field) => {')

# Add the UI for currency and global budgets before the advanced user budgets
global_budget_ui = '''
                                        <div className="space-y-3 pt-3 border-t border-gray-200 dark:border-gray-700 mb-4">
                                            <div className="flex items-center justify-between bg-white dark:bg-gray-900 p-2 rounded-xl border border-gray-100 dark:border-gray-700">
                                                <label className="text-[12px] font-bold text-gray-700 dark:text-gray-300 pl-1 w-1/3">מטבע קבוצה</label>
                                                <select value={trip.budgets_json?.currency || 'ILS'} onChange={(e) => updateGlobalBudget('currency', e.target.value)} className="w-2/3 bg-transparent border-none text-[12px] font-medium text-gray-900 dark:text-white focus:ring-0 outline-none dir-rtl">
                                                    <option value="ILS">ILS (₪)</option>
                                                    <option value="USD">USD ($)</option>
                                                    <option value="EUR">EUR (€)</option>
                                                    <option value="GBP">GBP (£)</option>
                                                </select>
                                            </div>
                                            
                                            <div className="flex items-center justify-between">
                                                <label className="text-sm font-bold text-gray-700 dark:text-gray-300">תקציב קבוצתי כללי</label>
                                            </div>
                                            
                                            <div className="grid grid-cols-3 gap-2">
                                                {['daily', 'monthly', 'yearly'].map((type, i) => (
                                                    <div key={global-} className="flex items-center justify-between bg-white dark:bg-gray-900 p-2 rounded-xl border border-gray-100 dark:border-gray-700">
                                                        <span className="text-[10px] font-medium text-gray-600 dark:text-gray-400 pl-1">{type === 'daily' ? 'יומי' : type === 'monthly' ? 'חודשי' : 'שנתי'}</span>
                                                        <div className="relative w-full ml-1">
                                                            <input type="number" value={trip.budgets_json?.[type] || ''} onChange={(e) => updateGlobalBudget(type, e.target.value ? parseFloat(e.target.value) : '')} placeholder="0" className="w-full pl-1 pr-1 py-1 bg-transparent border-none text-[10px] focus:ring-0 outline-none text-gray-900 dark:text-white" />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
'''

# Find the label "תקציב לכל משתתף" and insert the global budget ui BEFORE the div that contains it.
split_str = '<div className="flex items-center justify-between mb-4">'
parts = content.split(split_str)
if len(parts) >= 2:
    parts[1] = global_budget_ui.lstrip() + '\n                                        ' + split_str + parts[1]
    content = parts[0] + parts[1]

with open('Static/js/components/GroupsScreen.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

