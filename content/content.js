// content/content.js
class YouTubeDataExtractor {
    async extractVideoData(options = {}) {
        try {
            // Get video ID from URL first
            const urlParams = new URLSearchParams(window.location.search);
            const videoId = urlParams.get('v');
            if (!videoId) {
                throw new Error('Not a YouTube video page');
            }

            // Wait for page to fully load and elements to be available
            await this.waitForElements();

            const title = this.extractTitle();
            const channel = this.extractChannel();
            const description = this.extractDescription();

            const videoData = {
                id: videoId,
                title,
                channel,
                description,
                url: window.location.href,
                timestamp: new Date().toISOString()
            };

            // Extract transcript if requested
            if (options.includeTranscript) {
                try {
                    videoData.transcript = await this.extractTranscript(options);
                } catch (transcriptError) {
                    console.warn('Transcript extraction error:', transcriptError);
                    videoData.transcript = null;
                }
            } else {
                videoData.transcript = null;
            }

            return videoData;

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
                const fullDescription = element.textContent.trim();
                return fullDescription.length > 500 ? 
                    fullDescription.substring(0, 500) + '...' : 
                    fullDescription;
            }
        }
        return '';
    }

    // --- TRANSCRIPT EXTRACTION ---

    async extractTranscript(options = {}) {
        // Strategy 1: Attempt to extract via captionTracks in page scripts/player
        let transcriptResult = await this.extractFromCaptionTracks(options);

        // Strategy 2: Fallback to DOM transcript panel scraping
        if (!transcriptResult || !transcriptResult.segments || transcriptResult.segments.length === 0) {
            transcriptResult = await this.scrapeTranscriptFromDOM();
        }

        if (!transcriptResult || !transcriptResult.segments || transcriptResult.segments.length === 0) {
            return {
                available: false,
                text: ''
            };
        }

        const formattedText = this.formatTranscript(transcriptResult.segments, options);

        return {
            available: true,
            language: transcriptResult.language || 'Default',
            text: formattedText,
            collapsible: options.collapsibleTranscript !== false
        };
    }

    async extractFromCaptionTracks(options = {}) {
        try {
            const tracks = this.findCaptionTracks();
            if (!tracks || !Array.isArray(tracks) || tracks.length === 0) {
                return null;
            }

            // Pick track based on preferred language
            const track = this.selectCaptionTrack(tracks, options.preferredLang);
            if (!track || !track.baseUrl) {
                return null;
            }

            const langName = track.name ? (track.name.simpleText || track.name) : (track.languageCode || 'Default');

            // Attempt fetching the track (with json3 format first, then raw)
            let segments = await this.fetchCaptionTrack(track.baseUrl + '&fmt=json3');
            if (!segments || segments.length === 0) {
                segments = await this.fetchCaptionTrack(track.baseUrl);
            }

            if (segments && segments.length > 0) {
                return {
                    language: langName,
                    segments
                };
            }
        } catch (e) {
            console.log('Error extracting from caption tracks:', e);
        }
        return null;
    }

    findCaptionTracks() {
        try {
            const scripts = document.querySelectorAll('script');
            for (const script of scripts) {
                const text = script.textContent;
                if (text && text.includes('captionTracks')) {
                    const match = text.match(/"captionTracks":\s*(\[[^\]]+\])/);
                    if (match) {
                        try {
                            const parsed = JSON.parse(match[1]);
                            if (Array.isArray(parsed) && parsed.length > 0) {
                                return parsed;
                            }
                        } catch (err) {}
                    }
                }
            }
        } catch (e) {}
        return null;
    }

    selectCaptionTrack(tracks, preferredLang) {
        if (!tracks || tracks.length === 0) return null;

        // User preference
        if (preferredLang && preferredLang !== 'auto') {
            const match = tracks.find(t => 
                t.languageCode && t.languageCode.toLowerCase().startsWith(preferredLang.toLowerCase())
            );
            if (match) return match;
        }

        // Browser language
        const browserLang = (navigator.language || 'en').split('-')[0].toLowerCase();
        const browserMatch = tracks.find(t => 
            t.languageCode && t.languageCode.toLowerCase().startsWith(browserLang)
        );
        if (browserMatch) return browserMatch;

        // English fallback
        const enMatch = tracks.find(t => 
            t.languageCode && t.languageCode.toLowerCase().startsWith('en')
        );
        if (enMatch) return enMatch;

        // Default to first track
        return tracks[0];
    }

    async fetchCaptionTrack(url) {
        try {
            // Security: strictly validate URL to prevent credential leakage/SSRF
            const parsedUrl = new URL(url);
            const isYouTubeHost = parsedUrl.hostname === 'www.youtube.com' || parsedUrl.hostname === 'youtube.com';
            if (parsedUrl.protocol !== 'https:' || !isYouTubeHost) {
                console.warn('Rejected non-YouTube caption URL:', url);
                return null;
            }

            const res = await fetch(url, { credentials: 'include' });
            if (!res.ok) return null;
            const text = await res.text();
            if (!text || !text.trim()) return null;
            return this.parseCaptionResponse(text);
        } catch (e) {
            return null;
        }
    }

    parseCaptionResponse(rawText) {
        const trimmed = rawText.trim();

        // 1. Check for JSON format
        if (trimmed.startsWith('{')) {
            try {
                const data = JSON.parse(trimmed);
                if (data.events && Array.isArray(data.events)) {
                    const segments = [];
                    for (const ev of data.events) {
                        if (!ev.segs) continue;
                        const text = ev.segs.map(s => s.utf8 || '').join('').trim();
                        if (!text || text === '\n') continue;
                        const startSec = (ev.tStartMs || 0) / 1000;
                        segments.push({
                            time: this.formatSeconds(startSec),
                            seconds: startSec,
                            text: text
                        });
                    }
                    if (segments.length > 0) return segments;
                }
            } catch (e) {}
        }

        // 2. Check for XML format
        try {
            const parser = new DOMParser();
            const xml = parser.parseFromString(trimmed, 'text/xml');
            const textNodes = xml.querySelectorAll('text');
            if (textNodes.length > 0) {
                const segments = [];
                textNodes.forEach(node => {
                    const startSec = parseFloat(node.getAttribute('start') || '0');
                    const text = this.decodeHtmlEntities(node.textContent.trim());
                    if (text) {
                        segments.push({
                            time: this.formatSeconds(startSec),
                            seconds: startSec,
                            text: text
                        });
                    }
                });
                if (segments.length > 0) return segments;
            }
        } catch (e) {}

        return null;
    }

    async scrapeTranscriptFromDOM() {
        try {
            let segments = this.getSegmentsFromDOM();
            if (segments.length > 0) {
                return { language: 'Video', segments };
            }

            // Expand description if necessary
            const expandBtn = document.querySelector([
                '#description #expand',
                'ytd-text-inline-expander #expand',
                '#description-inline-expander #expand',
                'tp-yt-paper-button#expand'
            ].join(', '));
            if (expandBtn && expandBtn.offsetParent !== null) {
                expandBtn.click();
                await new Promise(r => setTimeout(r, 250));
            }

            // Find Show Transcript button
            const transcriptBtn = this.findTranscriptButton();
            if (!transcriptBtn) {
                return null;
            }

            transcriptBtn.click();

            // Wait for transcript segments to load
            const startTime = Date.now();
            while (Date.now() - startTime < 3500) {
                await new Promise(r => setTimeout(r, 150));
                segments = this.getSegmentsFromDOM();
                if (segments.length > 0) {
                    break;
                }
            }

            // Optionally close the transcript panel so the user's view is clean
            try {
                const closeBtn = document.querySelector([
                    'ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-searchable-transcript"] #visibility-button button',
                    'ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-searchable-transcript"] button[aria-label="Close" i]',
                    'ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-searchable-transcript"] button[aria-label="Fechar" i]'
                ].join(', '));
                if (closeBtn) closeBtn.click();
            } catch (e) {}

            if (segments.length > 0) {
                return { language: 'Video', segments };
            }
        } catch (e) {
            console.log('DOM transcript scrape error:', e);
        }
        return null;
    }

    findTranscriptButton() {
        const selectors = [
            'ytd-video-description-transcript-section-renderer button',
            'ytd-button-renderer.ytd-video-description-transcript-section-renderer button',
            'button[aria-label="Show transcript" i]',
            'button[aria-label="Mostrar transcrição" i]',
            'button[aria-label*="transcript" i]',
            'button[aria-label*="transcrição" i]'
        ];

        for (const sel of selectors) {
            const btn = document.querySelector(sel);
            if (btn) return btn;
        }

        const descButtons = document.querySelectorAll('#description button, ytd-watch-metadata button');
        for (const btn of descButtons) {
            const text = (btn.textContent || '').toLowerCase();
            if (text.includes('transcript') || text.includes('transcrição')) {
                return btn;
            }
        }
        return null;
    }

    getSegmentsFromDOM() {
        const segmentEls = document.querySelectorAll('ytd-transcript-segment-renderer');
        if (!segmentEls || segmentEls.length === 0) return [];

        const segments = [];
        segmentEls.forEach(el => {
            const timeEl = el.querySelector('.segment-timestamp, [class*="segment-timestamp"]');
            const textEl = el.querySelector('.segment-text, yt-formatted-string.segment-text, [class*="segment-text"]');
            const time = timeEl ? timeEl.textContent.trim() : '';
            const text = textEl ? textEl.textContent.trim() : '';
            if (text) {
                segments.push({ time, text });
            }
        });
        return segments;
    }

    formatTranscript(segments, options = {}) {
        if (!segments || segments.length === 0) return '';
        const includeTimestamps = options.includeTimestamps !== false;

        if (includeTimestamps) {
            return segments
                .map(s => s.time ? `[${s.time}] ${s.text}` : s.text)
                .join('\n');
        } else {
            // Group segments into natural readable paragraphs (4-5 segments per paragraph)
            const paragraphs = [];
            let currentGroup = [];

            for (let i = 0; i < segments.length; i++) {
                currentGroup.push(segments[i].text);
                if (currentGroup.length >= 4 || i === segments.length - 1) {
                    paragraphs.push(currentGroup.join(' '));
                    currentGroup = [];
                }
            }
            return paragraphs.join('\n\n');
        }
    }

    formatSeconds(totalSec) {
        const s = Math.floor(totalSec % 60);
        const m = Math.floor((totalSec / 60) % 60);
        const h = Math.floor(totalSec / 3600);
        if (h > 0) {
            return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        }
        return `${m}:${s.toString().padStart(2, '0')}`;
    }

    decodeHtmlEntities(str) {
        const doc = new DOMParser().parseFromString(str, 'text/html');
        return doc.documentElement.textContent || str;
    }
}

// Initialize extractor
const extractor = new YouTubeDataExtractor();

// Message listener
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Content script received message:', request.type);
    
    if (request.type === 'EXTRACT_VIDEO_DATA') {
        extractor.extractVideoData(request.options || {})
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