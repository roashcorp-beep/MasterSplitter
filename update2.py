import re

with open('Static/js/main.js', 'r', encoding='utf-8') as f:
    content = f.read()

save_func_old = '''window.saveEditTripFromReact = async function(trip) {
    if (!trip.id) return;

    // Remove duplicates or match participants
    const participants = (trip.participants || []).map(p => ({
        id: p.id || null,
        name: p.name,
        contact: p.contact || p.name,
        type: p.type || 'registered',
        budgets_json: trip.is_budget_per_user && trip.user_budgets ? { daily: trip.user_budgets[p.contact] } : {}
    }));'''

save_func_new = '''window.saveEditTripFromReact = async function(trip) {
    if (!trip.id) return;

    // Remove duplicates or match participants
    const participants = (trip.participants || []).map(p => {
        let bJson = {};
        if (trip.is_budget_per_user && trip.user_budgets && trip.user_budgets[p.contact]) {
            const uBudget = trip.user_budgets[p.contact];
            bJson = {
                daily: uBudget.daily || '',
                monthly: uBudget.monthly || '',
                yearly: uBudget.yearly || ''
            };
        }
        return {
            id: p.id || null,
            name: p.name,
            contact: p.contact || p.name,
            type: p.type || 'registered',
            budgets_json: bJson
        };
    });'''

content = content.replace(save_func_old, save_func_new)

with open('Static/js/main.js', 'w', encoding='utf-8') as f:
    f.write(content)
