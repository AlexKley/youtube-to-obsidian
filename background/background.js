// background/background.js
class ObsidianManager {
    constructor() {
        this.setupMessageListeners();
    }

    generateMarkdown(videoData) {
        const tags = Array.isArray(videoData.tags) && videoData.tags.length > 0
            ? Array.from(new Set(videoData.tags))
            : ['youtube'];

        const tagsFormatted = `[${tags.map(t => `"${this.escapeYaml(t)}"`).join(', ')}]`;

        let transcriptSection = '';
        if (videoData.transcript && videoData.transcript.text) {
            const cleanLang = (videoData.transcript.language || '').replace(/[<>"'&]/g, '').trim();
            const langLabel = cleanLang ? ` (${cleanLang})` : '';
            if (videoData.transcript.collapsible) {
                transcriptSection = `\n\n## Transcript${langLabel}\n<details>\n<summary>Click to expand transcript</summary>\n\n${videoData.transcript.text}\n\n</details>`;
            } else {
                transcriptSection = `\n\n## Transcript${langLabel}\n\n${videoData.transcript.text}`;
            }
        }

        const safeId = ((videoData && videoData.id) ? String(videoData.id) : '').replace(/[^a-zA-Z0-9_-]/g, '');
        const safeUrl = (typeof videoData.url === 'string' && videoData.url.startsWith('https://')) 
            ? videoData.url 
            : `https://www.youtube.com/watch?v=${safeId}`;

        return `---
source: YouTube
channel: "${this.escapeYaml(videoData.channel)}"
url: "${this.escapeYaml(safeUrl)}"
thumbnail: 'https://i.ytimg.com/vi/${safeId}/maxresdefault.jpg'
date_saved: "${new Date().toISOString().split('T')[0]}"
tags: ${tagsFormatted}
---

## Video embeded
![](${safeUrl})

## Title
${videoData.title}

## Description
${videoData.description}${transcriptSection}

## Notes
<!-- Add your personal notes here -->

---
*Saved with YouTube to Obsidian extension*`;
    }

    escapeYaml(text) {
        if (!text || typeof text !== 'string') return '';
        return text
            .replace(/\\/g, '\\\\')
            .replace(/"/g, '\\"')
            .replace(/[\r\n]+/g, ' ');
    }

    generateFilename(videoData) {
        // Clean and sanitize filename for filesystem
        const rawTitle = (videoData && videoData.title) ? String(videoData.title) : '';
        const cleanTitle = rawTitle
            .replace(/[\x00-\x1f\x7f-\x9f]/g, '') // Remove non-printable control characters
            .replace(/[<>:"/\\|?*]/g, '')        // Remove invalid filesystem characters
            .replace(/\.{2,}/g, '.')              // Prevent '..' directory traversal
            .replace(/^\.+/, '')                  // Prevent leading dot (hidden file)
            .replace(/\s+/g, ' ')
            .trim()
            .substring(0, 50);

        const safeId = ((videoData && videoData.id) ? String(videoData.id) : '').replace(/[^a-zA-Z0-9_-]/g, '') || Math.random().toString(36).substring(2, 9);
        const finalTitle = cleanTitle || `YouTube-Video-${safeId}`;
        return `${finalTitle}.md`;
    }

    async saveToObsidian(markdown, filename) {
        try {
            // Create a data URL instead of using createObjectURL
            const dataUrl = 'data:text/markdown;charset=utf-8,' + encodeURIComponent(markdown);
            
            // Use downloads API with data URL
            const downloadId = await chrome.downloads.download({
                url: dataUrl,
                filename: `${filename}`,
                saveAs: true,
                conflictAction: 'uniquify'
            });

            // Wait for download to complete or be interrupted (e.g., cancelled by user)
            return await new Promise((resolve, reject) => {
                const onChangedListener = (delta) => {
                    if (delta.id === downloadId) {
                        if (delta.state && delta.state.current === 'complete') {
                            chrome.downloads.onChanged.removeListener(onChangedListener);
                            chrome.downloads.search({ id: downloadId }, (items) => {
                                const savedPath = (items && items[0] && items[0].filename) ? items[0].filename : filename;
                                resolve({ success: true, path: savedPath });
                            });
                        } else if (delta.state && delta.state.current === 'interrupted') {
                            chrome.downloads.onChanged.removeListener(onChangedListener);
                            if (delta.error && delta.error.current === 'USER_CANCELED') {
                                resolve({ success: false, cancelled: true, error: 'Save was cancelled' });
                            } else {
                                reject(new Error(`Download failed: ${delta.error ? delta.error.current : 'interrupted'}`));
                            }
                        }
                    }
                };

                chrome.downloads.onChanged.addListener(onChangedListener);

                // Check if already finished before listener was registered
                chrome.downloads.search({ id: downloadId }, (items) => {
                    if (items && items[0]) {
                        if (items[0].state === 'complete') {
                            chrome.downloads.onChanged.removeListener(onChangedListener);
                            resolve({ success: true, path: items[0].filename || filename });
                        } else if (items[0].state === 'interrupted') {
                            chrome.downloads.onChanged.removeListener(onChangedListener);
                            if (items[0].error === 'USER_CANCELED') {
                                resolve({ success: false, cancelled: true, error: 'Save was cancelled' });
                            } else {
                                reject(new Error(`Download failed: ${items[0].error || 'interrupted'}`));
                            }
                        }
                    }
                });
            });
        } catch (error) {
            console.error('Download error:', error);
            throw new Error(`Failed to save file: ${error.message}`);
        }
    }

    setupMessageListeners() {
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            if (request.type === 'SAVE_TO_OBSIDIAN') {
                this.processVideoSave(request.data)
                    .then(result => {
                        try {
                            sendResponse(result);
                        } catch (e) {
                            console.log('Error sending response:', e);
                        }
                    })
                    .catch(error => {
                        try {
                            sendResponse({ 
                                success: false, 
                                error: error.message 
                            });
                        } catch (e) {
                            console.log('Error sending error response:', e);
                        }
                    });
                return true; // Keep message channel open for async
            }
        });
    }

    async processVideoSave(videoData) {
        // Validate video data
        if (!videoData || !videoData.title || !videoData.channel) {
            throw new Error('Invalid video data received');
        }

        const markdown = this.generateMarkdown(videoData);
        const filename = this.generateFilename(videoData);
        const result = await this.saveToObsidian(markdown, filename);
        return result;
    }
}

// Initialize the manager when the service worker starts
const obsidianManager = new ObsidianManager();

// Optional: Log when background script loads
console.log('YouTube to Obsidian background script loaded');