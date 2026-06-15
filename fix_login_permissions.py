# -*- coding: utf-8 -*-
with open('Templates/login.html', 'r', encoding='utf-8') as f:
    content = f.read()

permissions_html = """
    <!-- Permissions Onboarding Modal -->
    <div id="permissions-modal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm transition-opacity duration-300 opacity-0" style="display: none;">
        <div class="bg-white dark:bg-gray-800 w-[90%] max-w-sm rounded-2xl shadow-2xl overflow-hidden transform transition-all scale-95 opacity-0" id="permissions-modal-content">
            <div class="p-6">
                <div class="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center mx-auto mb-4">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                    </svg>
                </div>
                <h3 class="text-xl font-bold text-center text-gray-900 dark:text-white mb-2" style="font-family: 'Heebo', sans-serif;">ברוך הבא! נשמח לכמה הרשאות:</h3>
                
                <div class="space-y-4 mt-6">
                    <div class="flex items-start gap-4 p-3 bg-gray-50 dark:bg-gray-700/30 rounded-xl">
                        <div class="text-2xl mt-1">📇</div>
                        <div>
                            <div class="font-bold text-gray-900 dark:text-white">אנשי קשר</div>
                            <div class="text-sm text-gray-500 dark:text-gray-400 mt-1">להזמנת חברים בקלות.</div>
                        </div>
                    </div>
                    
                    <div class="flex items-start gap-4 p-3 bg-gray-50 dark:bg-gray-700/30 rounded-xl">
                        <div class="text-2xl mt-1">🌗</div>
                        <div>
                            <div class="font-bold text-gray-900 dark:text-white">תצוגה</div>
                            <div class="text-sm text-gray-500 dark:text-gray-400 mt-1">להתאמת מצב כהה/בהיר.</div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                <button onclick="grantAppPermissions()" class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition-colors shadow-lg shadow-indigo-600/20">
                    אשר והמשך
                </button>
            </div>
        </div>
    </div>

    <script>
        document.addEventListener('DOMContentLoaded', () => {
            if (localStorage.getItem('app_permissions_granted') !== 'true') {
                const modal = document.getElementById('permissions-modal');
                const content = document.getElementById('permissions-modal-content');
                modal.style.display = 'flex';
                // Trigger reflow for animation
                void modal.offsetWidth;
                modal.classList.remove('opacity-0');
                content.classList.remove('scale-95', 'opacity-0');
                content.classList.add('scale-100', 'opacity-100');
            }
        });

        function grantAppPermissions() {
            localStorage.setItem('app_permissions_granted', 'true');
            const modal = document.getElementById('permissions-modal');
            const content = document.getElementById('permissions-modal-content');
            
            modal.classList.add('opacity-0');
            content.classList.remove('scale-100', 'opacity-100');
            content.classList.add('scale-95', 'opacity-0');
            
            setTimeout(() => {
                modal.style.display = 'none';
            }, 300);
        }
    </script>
"""

content = content.replace('</body>', permissions_html + '\n</body>')

with open('Templates/login.html', 'w', encoding='utf-8') as f:
    f.write(content)
print("Permissions modal added to login.html")
