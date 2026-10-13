// options/options.js
document.addEventListener('DOMContentLoaded', function() {
    const vaultPathInput = document.getElementById('vaultPath');
    const includeTranscriptInput = document.getElementById('includeTranscript');
    const includeTimestampsInput = document.getElementById('includeTimestamps');
    const collapsibleTranscriptInput = document.getElementById('collapsibleTranscript');
    const preferredLangInput = document.getElementById('preferredLang');
    const saveBtn = document.getElementById('saveBtn');
    const status = document.getElementById('status');

    // Load saved settings
    loadSettings();

    saveBtn.addEventListener('click', function() {
        saveSettings();
    });

    async function loadSettings() {
        try {
            const result = await chrome.storage.sync.get([
                'vaultPath',
                'includeTranscript',
                'includeTimestamps',
                'collapsibleTranscript',
                'preferredLang'
            ]);
            vaultPathInput.value = result.vaultPath || 'Obsidian/YouTube';
            if (result.includeTranscript !== undefined) {
                includeTranscriptInput.checked = result.includeTranscript;
            }
            if (result.includeTimestamps !== undefined) {
                includeTimestampsInput.checked = result.includeTimestamps;
            }
            if (result.collapsibleTranscript !== undefined) {
                collapsibleTranscriptInput.checked = result.collapsibleTranscript;
            }
            if (result.preferredLang !== undefined) {
                preferredLangInput.value = result.preferredLang;
            }
        } catch (error) {
            console.log('Could not load settings, using default:', error);
            vaultPathInput.value = 'Obsidian/YouTube';
        }
    }

    async function saveSettings() {
        const vaultPath = vaultPathInput.value.trim() || 'Obsidian/YouTube';
        const includeTranscript = includeTranscriptInput.checked;
        const includeTimestamps = includeTimestampsInput.checked;
        const collapsibleTranscript = collapsibleTranscriptInput.checked;
        const preferredLang = preferredLangInput.value;
        
        try {
            await chrome.storage.sync.set({ 
                vaultPath,
                includeTranscript,
                includeTimestamps,
                collapsibleTranscript,
                preferredLang
            });
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