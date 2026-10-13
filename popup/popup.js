// popup/popup.js
document.addEventListener('DOMContentLoaded', function () {
    const saveBtn = document.getElementById('saveBtn');
    const status = document.getElementById('status');
    const tagsInput = document.getElementById('tagsInput');
    const tagSuggestions = document.getElementById('tagSuggestions');
    const templatesList = document.getElementById('templatesList');
    const recentTagsGroup = document.getElementById('recentTagsGroup');
    const recentTagsList = document.getElementById('recentTagsList');

    // Transcript elements
    const includeTranscript = document.getElementById('includeTranscript');
    const transcriptOptions = document.getElementById('transcriptOptions');
    const includeTimestamps = document.getElementById('includeTimestamps');
    const collapsibleTranscript = document.getElementById('collapsibleTranscript');
    const preferredLang = document.getElementById('preferredLang');
    const transcriptStatusBadge = document.getElementById('transcriptStatusBadge');

    const PRESET_TEMPLATES = [
        { label: 'Tutorial', tags: ['tutorial'] },
        { label: 'Dev', tags: ['dev', 'coding'] },
        { label: 'AI', tags: ['ai', 'machine-learning'] },
        { label: 'Study', tags: ['study', 'notes'] },
        { label: 'Podcast', tags: ['podcast'] },
        { label: 'Music', tags: ['music'] }
    ];

    // Initialize UI and state
    updateButtonState();
    initTemplates();
    loadTagsState();
    loadTranscriptPreferences();

    // Event listeners
    saveBtn.addEventListener('click', async function () {
        await saveVideo();
    });

    tagsInput.addEventListener('input', function () {
        updateChipActiveStates();
        saveCurrentTagsDraft();
    });

    includeTranscript.addEventListener('change', function () {
        updateTranscriptVisibility();
        saveTranscriptPreferences();
    });

    includeTimestamps.addEventListener('change', saveTranscriptPreferences);
    collapsibleTranscript.addEventListener('change', saveTranscriptPreferences);
    preferredLang.addEventListener('change', function () {
        updateTranscriptVisibility();
        saveTranscriptPreferences();
    });

    function updateTranscriptVisibility() {
        if (includeTranscript.checked) {
            transcriptOptions.style.display = 'flex';
            transcriptStatusBadge.textContent = preferredLang.value === 'auto' ? 'Auto' : preferredLang.value.toUpperCase();
        } else {
            transcriptOptions.style.display = 'none';
            transcriptStatusBadge.textContent = 'Off';
        }
    }

    function saveTranscriptPreferences() {
        try {
            chrome.storage.sync.set({
                includeTranscript: includeTranscript.checked,
                includeTimestamps: includeTimestamps.checked,
                collapsibleTranscript: collapsibleTranscript.checked,
                preferredLang: preferredLang.value
            });
        } catch (e) {
            console.log('Error saving transcript preferences:', e);
        }
    }

    async function loadTranscriptPreferences() {
        try {
            const data = await chrome.storage.sync.get([
                'includeTranscript',
                'includeTimestamps',
                'collapsibleTranscript',
                'preferredLang'
            ]);
            if (data.includeTranscript !== undefined) {
                includeTranscript.checked = data.includeTranscript;
            }
            if (data.includeTimestamps !== undefined) {
                includeTimestamps.checked = data.includeTimestamps;
            }
            if (data.collapsibleTranscript !== undefined) {
                collapsibleTranscript.checked = data.collapsibleTranscript;
            }
            if (data.preferredLang !== undefined) {
                preferredLang.value = data.preferredLang;
            }
            updateTranscriptVisibility();
        } catch (e) {
            console.log('Error loading transcript preferences:', e);
        }
    }

    function parseTags(inputString) {
        if (!inputString || typeof inputString !== 'string') {
            return ['youtube'];
        }
        const tags = inputString
            .split(',')
            .map(tag => tag.trim().replace(/^#+/, ''))
            .map(tag => tag.replace(/\s+/g, '-'))
            .filter(tag => tag.length > 0);

        const tagSet = new Set();
        tagSet.add('youtube');
        for (const tag of tags) {
            tagSet.add(tag);
        }
        return Array.from(tagSet);
    }

    function getCurrentInputTags() {
        return tagsInput.value
            .split(',')
            .map(tag => tag.trim().replace(/^#+/, ''))
            .map(tag => tag.replace(/\s+/g, '-'))
            .filter(Boolean);
    }

    function updateChipActiveStates() {
        const currentTags = getCurrentInputTags().map(t => t.toLowerCase());

        // Update template chips
        document.querySelectorAll('.template-chip').forEach(chip => {
            const rawTags = chip.dataset.tags ? chip.dataset.tags.split(',') : [];
            const isAllActive = rawTags.length > 0 && rawTags.every(t => currentTags.includes(t.toLowerCase()));
            chip.classList.toggle('active', isAllActive);
        });

        // Update recent tag chips
        document.querySelectorAll('.recent-chip').forEach(chip => {
            const tag = chip.dataset.tag ? chip.dataset.tag.toLowerCase() : '';
            chip.classList.toggle('active', currentTags.includes(tag));
        });
    }

    function toggleTemplate(tags) {
        let currentTags = getCurrentInputTags();
        const allPresent = tags.every(t => currentTags.some(ct => ct.toLowerCase() === t.toLowerCase()));

        if (allPresent) {
            currentTags = currentTags.filter(ct => !tags.some(t => t.toLowerCase() === ct.toLowerCase()));
        } else {
            for (const t of tags) {
                if (!currentTags.some(ct => ct.toLowerCase() === t.toLowerCase())) {
                    currentTags.push(t);
                }
            }
        }

        tagsInput.value = currentTags.join(', ');
        updateChipActiveStates();
        saveCurrentTagsDraft();
    }

    function toggleTag(tag) {
        let currentTags = getCurrentInputTags();
        const index = currentTags.findIndex(ct => ct.toLowerCase() === tag.toLowerCase());

        if (index >= 0) {
            currentTags.splice(index, 1);
        } else {
            currentTags.push(tag);
        }

        tagsInput.value = currentTags.join(', ');
        updateChipActiveStates();
        saveCurrentTagsDraft();
    }

    function initTemplates() {
        templatesList.innerHTML = '';
        PRESET_TEMPLATES.forEach(tmpl => {
            const chip = document.createElement('span');
            chip.className = 'chip template-chip';
            chip.textContent = tmpl.label;
            chip.dataset.tags = tmpl.tags.join(',');
            chip.addEventListener('click', () => toggleTemplate(tmpl.tags));
            templatesList.appendChild(chip);
        });
    }

    function renderRecentTags(tags) {
        if (!tags || tags.length === 0) {
            recentTagsGroup.style.display = 'none';
            return;
        }

        recentTagsGroup.style.display = 'flex';
        recentTagsList.innerHTML = '';

        tags.forEach(tag => {
            const chip = document.createElement('span');
            chip.className = 'chip recent-chip';
            chip.textContent = tag;
            chip.dataset.tag = tag;
            chip.addEventListener('click', () => toggleTag(tag));
            recentTagsList.appendChild(chip);
        });

        updateChipActiveStates();
    }

    function populateDatalist(tags) {
        tagSuggestions.innerHTML = '';
        const uniqueTags = new Set(tags);
        PRESET_TEMPLATES.forEach(tmpl => tmpl.tags.forEach(t => uniqueTags.add(t)));

        uniqueTags.forEach(tag => {
            const option = document.createElement('option');
            option.value = tag;
            tagSuggestions.appendChild(option);
        });
    }

    function saveCurrentTagsDraft() {
        try {
            chrome.storage.sync.set({ tagsDraft: tagsInput.value });
        } catch (e) {
            console.log('Error saving tags draft:', e);
        }
    }

    async function loadTagsState() {
        try {
            const data = await chrome.storage.sync.get(['tagsDraft', 'recentTags']);
            if (data.tagsDraft) {
                tagsInput.value = data.tagsDraft;
            }
            const recentTags = data.recentTags || [];
            renderRecentTags(recentTags);
            populateDatalist(recentTags);
            updateChipActiveStates();
        } catch (e) {
            console.log('Error loading saved tags:', e);
        }
    }

    async function recordUsedTags(tags) {
        try {
            const data = await chrome.storage.sync.get(['recentTags']);
            const existing = data.recentTags || [];
            const userTags = tags.filter(t => t.toLowerCase() !== 'youtube');
            const updated = Array.from(new Set([...userTags, ...existing])).slice(0, 15);
            await chrome.storage.sync.set({
                recentTags: updated,
                tagsDraft: tagsInput.value
            });
        } catch (e) {
            console.log('Error updating recent tags:', e);
        }
    }

    async function updateButtonState() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

            if (isValidYouTubeVideoPage(tab.url)) {
                saveBtn.disabled = false;
                status.textContent = 'Ready to save this video';
                status.className = 'status';
            } else {
                saveBtn.disabled = true;
                status.textContent = 'Navigate to a YouTube video page';
                status.className = 'status';
            }
        } catch (error) {
            console.error('Error checking tab:', error);
            saveBtn.disabled = true;
            status.textContent = 'Error checking current page';
            status.className = 'status error';
        }
    }

    function isValidYouTubeVideoPage(url) {
        return url && url.includes('youtube.com/watch') && url.includes('v=');
    }

    async function saveVideo() {
        saveBtn.disabled = true;
        const transcriptOptions = {
            includeTranscript: includeTranscript.checked,
            includeTimestamps: includeTimestamps.checked,
            collapsibleTranscript: collapsibleTranscript.checked,
            preferredLang: preferredLang.value
        };

        status.textContent = includeTranscript.checked 
            ? 'Extracting video & transcript...' 
            : 'Extracting video data...';
        status.className = 'status';

        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

            if (!isValidYouTubeVideoPage(tab.url)) {
                throw new Error('Please navigate to a YouTube video page first');
            }

            // Send message to content script with timeout
            let response;
            try {
                response = await Promise.race([
                    chrome.tabs.sendMessage(tab.id, {
                        type: 'EXTRACT_VIDEO_DATA',
                        options: transcriptOptions
                    }),
                    new Promise((_, reject) =>
                        setTimeout(() => reject(new Error('Timeout: Page not ready')), 10000)
                    )
                ]);
            } catch (messageError) {
                if (messageError.message.includes('Receiving end does not exist')) {
                    throw new Error('Extension not ready on this page. Please refresh the YouTube page and try again.');
                } else if (messageError.message.includes('Timeout')) {
                    throw new Error('Page taking too long to respond. Please ensure the video page is fully loaded.');
                }
                throw messageError;
            }

            if (!response) {
                throw new Error('No response from content script');
            }

            if (!response.success) {
                throw new Error(response.error || 'Failed to extract video data');
            }

            status.textContent = 'Saving to Obsidian...';

            const tags = parseTags(tagsInput.value);

            // Send to background for processing
            const saveResponse = await chrome.runtime.sendMessage({
                type: 'SAVE_TO_OBSIDIAN',
                data: {
                    ...response.data,
                    tags: tags
                }
            });

            if (!saveResponse) {
                throw new Error('No response from background script');
            }

            if (saveResponse.cancelled) {
                status.textContent = 'Save cancelled';
                status.className = 'status';
                saveBtn.disabled = false;
                return;
            }

            if (saveResponse.success) {
                await recordUsedTags(tags);
                status.textContent = '✓ Saved successfully!';
                status.className = 'status success';

                // Close popup after successful save
                setTimeout(() => window.close(), 2000);
            } else {
                throw new Error(saveResponse.error || 'Failed to save file');
            }

        } catch (error) {
            status.textContent = `✗ ${error.message}`;
            status.className = 'status error';
            console.error('Save error:', error);

            // Re-enable button after error
            setTimeout(() => {
                updateButtonState();
            }, 3000);
        }
    }
});