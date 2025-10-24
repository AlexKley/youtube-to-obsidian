// content/content.js
class YouTubeDataExtractor {
    extractVideoData() {
        try {
            // Get video ID from URL first
            const urlParams = new URLSearchParams(window.location.search);
            const videoId = urlParams.get('v');
            if (!videoId) {
                throw new Error('Not a YouTube video page');
            }

            // Wait for page to fully load and elements to be available
            return this.waitForElements().then(() => {
                // Extract title with multiple fallback selectors
                const title = this.extractTitle();
                const channel = this.extractChannel();
                const description = this.extractDescription();

                return {
                    id: videoId,
                    title,
                    channel,
                    description,
                    url: window.location.href,
                    timestamp: new Date().toISOString()
                };
            });

        } catch (error) {
            console.error('Error extracting YouTube data:', error);
            throw error;
        }
    }

    waitForElements() {
        return new Promise((resolve) => {
            const maxWaitTime = 3000; // 3 seconds max
            const startTime = Date.now();

            const checkElements = () => {
                const title = this.extractTitle();
                const channel = this.extractChannel();

                if (title && channel && title !== 'Unknown Title' && channel !== 'Unknown Channel') {
                    resolve();
                } else if (Date.now() - startTime > maxWaitTime) {
                    // Resolve anyway after timeout
                    resolve();
                } else {
                    setTimeout(checkElements, 100);
                }
            };

            checkElements();
        });
    }

    extractTitle() {
        const selectors = [
            'h1.ytd-watch-metadata yt-formatted-string',
            'h1 yt-formatted-string',
            'h1.title',
            '#container h1',
            'ytd-watch-metadata h1',
            'h1'
        ];

        for (const selector of selectors) {
            const element = document.querySelector(selector);
            if (element && element.textContent.trim()) {
                return element.textContent.trim();
            }
        }
        return 'Unknown Title';
    }

    extractChannel() {
        const selectors = [
            '#owner #channel-name a',
            '#channel-name a',
            '.ytd-channel-name a',
            '#upload-info a',
            '.ytd-video-owner-renderer a',
            '#owner-container a',
            'ytd-video-owner-renderer a'
        ];

        for (const selector of selectors) {
            const element = document.querySelector(selector);
            if (element && element.textContent.trim()) {
                return element.textContent.trim();
            }
        }
        return 'Unknown Channel';
    }

    extractDescription() {
        const selectors = [
            '#description yt-formatted-string',
            '#description-text',
            '.description',
            'ytd-text-inline-expander yt-formatted-string'
        ];

        for (const selector of selectors) {
            const element = document.querySelector(selector);
            if (element && element.textContent.trim()) {
                // Limit description length
                const fullDescription = element.textContent.trim();
                return fullDescription.length > 500 ? 
                    fullDescription.substring(0, 500) + '...' : 
                    fullDescription;
            }
        }
        return '';
    }

}

// Initialize extractor
const extractor = new YouTubeDataExtractor();

// Message listener
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Content script received message:', request.type);
    
    if (request.type === 'EXTRACT_VIDEO_DATA') {
        // Handle the extraction asynchronously
        extractor.extractVideoData()
            .then(videoData => {
                sendResponse({ success: true, data: videoData });
            })
            .catch(error => {
                sendResponse({ 
                    success: false, 
                    error: error.message 
                });
            });
        
        return true; // Keep message channel open for async response
    }
    
    return false;
});

console.log('YouTube to Obsidian content script loaded successfully');