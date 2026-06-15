# -*- coding: utf-8 -*-
with open('Static/js/components/GroupsScreen.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

import re

# 1. Smart Budget Logic
budget_logic = """                        const isAdmin = currentUser && trip.owner_id === currentUser.id;
                        let currency = "₪";
                        let highestBudget = null;
                        let highestBudgetLabel = "";
                        if (trip.budgets_json) {
                            currency = trip.budgets_json.currency === 'USD' ? '$' : 
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
"""

content = re.sub(r'const isAdmin = currentUser && trip.owner_id === currentUser\.id;\s*let currency = "₪";\s*if \(trip\.budgets_json && trip\.budgets_json\.currency\) \{[^\}]+\}', budget_logic, content)

# Replace the text-right div with the split budget and edit button
old_text_right = """<div className="text-right">
                                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1" data-i18n="total_budget">{i18n("total_budget") || "Total"}</div>
                                    <div className="font-bold text-xl text-indigo-600 dark:text-indigo-400 flex items-center justify-end gap-2" dir="ltr">
                                        {isAdmin && (
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); window.openEditTripModal(trip.id); }} 
                                                className="border border-gray-300 dark:border-gray-600 rounded-md p-1.5 text-gray-500 hover:text-indigo-600 hover:border-indigo-600 transition-all"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                                            </button>
                                        )}
                                        <span><span className="text-sm mr-1">{currency}</span>{trip.budget ? window.formatNumber(trip.budget) : "0.00"}</span>
                                    </div>
                                </div>"""

new_text_right = """<div className="flex items-center gap-3 text-right">
                                    {highestBudget !== null && (
                                        <div className="border-r border-gray-200 dark:border-gray-700 pr-3 mr-1">
                                            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{highestBudgetLabel}</div>
                                            <div className="font-bold text-xl text-indigo-600 dark:text-indigo-400 flex items-center justify-end gap-1" dir="ltr">
                                                <span className="text-sm mr-1">{currency}</span>
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
                                </div>"""

content = content.replace(old_text_right, new_text_right)

with open('Static/js/components/GroupsScreen.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Budget smart display applied")
