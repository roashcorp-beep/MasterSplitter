document.addEventListener('DOMContentLoaded', () => {
    const logContainer = document.getElementById('log-container');
    const pollStatus = document.getElementById('poll-status');
    const adminKeyStorage = document.getElementById('admin-key-storage');
    const adminKey = adminKeyStorage ? adminKeyStorage.dataset.key : '';

    let isAutoScrolling = true;
    let logsActive = false; // Flag to indicate if logs are actively streaming
    let isPolling = true;
    let pollIntervalId = null;

    // Select all role cards
    const roles = {
        architect: document.querySelector('[data-role="architect"]'),
        developer: document.querySelector('[data-role="developer"]'),
        qa: document.querySelector('[data-role="qa"]'),
        devops: document.querySelector('[data-role="devops"]'),
        product: document.querySelector('[data-role="product"]')
    };

    // Check if user has manually scrolled up to pause auto-scroll
    logContainer.addEventListener('scroll', () => {
        const threshold = 20;
        const position = logContainer.scrollTop + logContainer.clientHeight;
        const height = logContainer.scrollHeight;
        isAutoScrolling = position >= height - threshold;
    });

    const fetchLogs = async () => {
        try {
            // Short Polling API Request
            const response = await fetch('/api/admin/logs', {
                headers: {
                    'X-Admin-Key': adminKey
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.error) {
                console.error("Log fetch error:", data.error);
                return;
            }

            if (data.logs && Array.isArray(data.logs)) {
                // Determine if there are new logs compared to current state
                logsActive = data.logs.length > 0;
                renderLogs(data.logs);
            }
        } catch (error) {
            console.error("Telemetry stream interrupted:", error);
            pollStatus.textContent = "Polling: ERROR";
            pollStatus.style.color = "var(--error-red)";
            logsActive = false;
        }
    };

    const parseLogForTags = (logText) => {
        let tag = 'INFO';
        let cssClass = 'info';
        
        const lowerLog = logText.toLowerCase();
        if (lowerLog.includes('error') || lowerLog.includes('fail') || lowerLog.includes('exception')) {
            tag = 'ERROR';
            cssClass = 'error';
        } else if (lowerLog.includes('warn')) {
            tag = 'WARN';
            cssClass = 'warn';
        }
        
        return { tag, cssClass, text: logText };
    };

    const renderLogs = (logs) => {
        logContainer.innerHTML = '';
        
        if (logs.length === 0) {
            const line = document.createElement('div');
            line.className = 'log-line';
            line.innerHTML = `<span class="log-tag info">INFO</span><span class="log-content">Awaiting telemetry stream...</span>`;
            logContainer.appendChild(line);
            return;
        }

        logs.forEach(log => {
            const { tag, cssClass, text } = parseLogForTags(log);
            const line = document.createElement('div');
            line.className = `log-line ${cssClass}-text`;
            
            // Basic escaping
            const safeText = text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
            
            line.innerHTML = `<span class="log-tag ${cssClass}">${tag}</span><span class="log-content">${safeText}</span>`;
            logContainer.appendChild(line);
        });

        if (isAutoScrolling) {
            logContainer.scrollTop = logContainer.scrollHeight;
        }
    };

    // --- Dynamic Real-Time Simulation ---
    const updateProductivity = () => {
        Object.keys(roles).forEach(roleKey => {
            const card = roles[roleKey];
            if (!card) return;

            const progressBar = card.querySelector('.progress-bar');
            const prodValue = card.querySelector('.prod-value');

            // Default random fluctuation between 78% and 97%
            let min = 78;
            let max = 97;

            // Spike developer and QA productivity if logs are actively being added
            if (logsActive && (roleKey === 'developer' || roleKey === 'qa')) {
                min = 92;
                max = 100;
            }

            const newValue = Math.floor(Math.random() * (max - min + 1)) + min;
            
            // Update UI
            if (progressBar && prodValue) {
                progressBar.style.width = `${newValue}%`;
                prodValue.textContent = `${newValue}%`;
            }
        });
        
        // Slightly fluctuate logs flag to simulate bursts when actually polling
        if (logsActive && Math.random() > 0.8) {
            logsActive = false; // simulate a pause
        }
    };

    // Initial fetch
    fetchLogs();
    
    // Set polling interval for logs (3000ms)
    pollIntervalId = setInterval(fetchLogs, 3000);

    // Set productivity simulation interval (2500ms)
    setInterval(updateProductivity, 2500);
    
    // Initialize productivity immediately
    updateProductivity();

    // Log Controls
    const togglePollBtn = document.getElementById('toggle-poll-btn');
    const clearLogsBtn = document.getElementById('clear-logs-btn');

    if (togglePollBtn) {
        togglePollBtn.addEventListener('click', () => {
            isPolling = !isPolling;
            if (isPolling) {
                togglePollBtn.textContent = 'Live';
                togglePollBtn.classList.add('active');
                pollStatus.textContent = "Polling: 3s";
                pollStatus.style.color = "";
                pollIntervalId = setInterval(fetchLogs, 3000);
                fetchLogs(); // Fetch immediately on resume
            } else {
                togglePollBtn.textContent = 'Paused';
                togglePollBtn.classList.remove('active');
                pollStatus.textContent = "Polling: Paused";
                pollStatus.style.color = "var(--text-secondary)";
                clearInterval(pollIntervalId);
            }
        });
    }

    if (clearLogsBtn) {
        clearLogsBtn.addEventListener('click', () => {
            logContainer.innerHTML = '';
        });
    }
});
