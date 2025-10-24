// background/background.js
class ObsidianManager {
    constructor() {
        this.setupMessageListeners();
    }

    generateMarkdown(videoData) {
        return `---
source: YouTube
channel: "${this.escapeYaml(videoData.channel)}"
url: ${videoData.url}
thumbnail: 'https://i.ytimg.com/vi/${videoData.id}/maxresdefault.jpg'
date_saved: "${new Date().toISOString().split('T')[0]}"
tags: [youtube]
---

## Video embeded
![](${videoData.url})

## Title
${videoData.title}

## Description
${videoData.description}

## Notes
<!-- Add your personal notes here -->

---
*Saved with YouTube to Obsidian extension*`;
    }

    escapeYaml(text) {
        if (!text) return '';
        return text.replace(/"/g, '\\"').replace(/\n/g, ' ');
    }

    generateFilename(videoData) {
        // Clean filename for file system
        const cleanTitle = videoData.title
            .replace(/[<>:"/\\|?*]/g, '') // Remove invalid file characters
            .replace(/\s+/g, ' ')
            .trim()
            .substring(0, 50); // Limit length
        
        // Add video ID to ensure uniqueness
        const videoId = videoData.id || Math.random().toString(36).substring(2, 9);
        return `${cleanTitle}.md`;
    }

    async saveToObsidian(markdown, filename) {
        try {
            // Get vault path from storage, but provide default
            let vaultPath = 'Obsidian/YouTube';
            
            try {
                const result = await chrome.storage.sync.get(['vaultPath']);
                vaultPath = result.vaultPath || 'Obsidian/YouTube';
            } catch (storageError) {
                console.log('Using default vault path due to storage error:', storageError);
            }

            // Create a data URL instead of using createObjectURL
            const dataUrl = 'data:text/markdown;charset=utf-8,' + encodeURIComponent(markdown);
            
            // Use downloads API with data URL
            await chrome.downloads.download({
                url: dataUrl,
                filename: `${vaultPath}/${filename}`,
                saveAs: false,
                conflictAction: 'uniquify'
            });
            
            return { success: true, path: `${vaultPath}/${filename}` };
        } catch (error) {
            console.error('Download error:', error);
            throw new Error(`Failed to save file: ${error.message}`);
        }
    }

    setupMessageListeners() {
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            if (request.type === 'SAVE_TO_OBSIDIAN') {
                this.processVideoSave(request.data)
                    .then(result => sendResponse(result))
                    .catch(error => sendResponse({ 
                        success: false, 
                        error: error.message 
                    }));
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