// options/options.js
document.addEventListener('DOMContentLoaded', function() {
    const vaultPathInput = document.getElementById('vaultPath');
    const saveBtn = document.getElementById('saveBtn');
    const status = document.getElementById('status');

    // Load saved settings
    loadSettings();

    saveBtn.addEventListener('click', function() {
        saveSettings();
    });

    async function loadSettings() {
        try {
            const result = await chrome.storage.sync.get(['vaultPath']);
            vaultPathInput.value = result.vaultPath || 'Obsidian/YouTube';
        } catch (error) {
            console.log('Could not load settings, using default:', error);
            vaultPathInput.value = 'Obsidian/YouTube';
        }
    }

    async function saveSettings() {
        const vaultPath = vaultPathInput.value.trim() || 'Obsidian/YouTube';
        
        try {
            await chrome.storage.sync.set({ vaultPath });
            status.textContent = '✓ Settings saved successfully!';
            status.className = 'status success';
            
            setTimeout(() => {
                status.textContent = '';
                status.className = 'status';
            }, 2000);
        } catch (error) {
            status.textContent = '✗ Failed to save settings';
            status.className = 'status error';
            console.error('Settings save error:', error);
        }
    }
});