// popup/popup.js
document.addEventListener('DOMContentLoaded', function() {
    const saveBtn = document.getElementById('saveBtn');
    const status = document.getElementById('status');
    const settingsLink = document.getElementById('settingsLink');

    // Initialize
    updateButtonState();

    saveBtn.addEventListener('click', async function() {
        await saveVideo();
    });

    settingsLink.addEventListener('click', function(e) {
        e.preventDefault();
        chrome.runtime.openOptionsPage();
    });

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
        status.textContent = 'Extracting video data...';
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
                        type: 'EXTRACT_VIDEO_DATA' 
                    }),
                    new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('Timeout: Page not ready')), 5000)
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

            // Send to background for processing with timeout
            const saveResponse = await Promise.race([
                chrome.runtime.sendMessage({
                    type: 'SAVE_TO_OBSIDIAN',
                    data: response.data
                }),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Save operation timed out')), 10000)
                )
            ]);

            if (saveResponse.success) {
                status.textContent = `✓ Saved to ${saveResponse.path}`;
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