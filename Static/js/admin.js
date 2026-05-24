document.addEventListener('DOMContentLoaded', () => {
    const logContainer = document.getElementById('log-container');
    const pollStatus = document.getElementById('poll-status');
    const adminKeyStorage = document.getElementById('admin-key-storage');
    const adminKey = adminKeyStorage ? adminKeyStorage.dataset.key : '';

    let isAutoScrolling = true;

    // Check if user has manually scrolled up to pause auto-scroll
    logContainer.addEventListener('scroll', () => {
        const threshold = 10;
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
                renderLogs(data.logs);
            }
        } catch (error) {
            console.error("Telemetry stream interrupted:", error);
            pollStatus.textContent = "Polling: ERROR";
            pollStatus.style.color = "var(--error)";
        }
    };

    const renderLogs = (logs) => {
        // Clear existing logs
        logContainer.innerHTML = '';

        logs.forEach(log => {
            const line = document.createElement('div');
            line.className = 'log-line';
            
            // Basic log highlighting
            if (log.toLowerCase().includes('error') || log.toLowerCase().includes('fail')) {
                line.classList.add('error');
            } else if (log.toLowerCase().includes('warn')) {
                line.classList.add('warn');
            }

            // Simple HTML escape
            const safeText = document.createTextNode(log);
            line.appendChild(safeText);
            logContainer.appendChild(line);
        });

        if (isAutoScrolling) {
            logContainer.scrollTop = logContainer.scrollHeight;
        }
    };

    // Initial fetch
    fetchLogs();

    // Set polling interval (3000ms = 3 seconds)
    setInterval(fetchLogs, 3000);
});
