# YouTube to Obsidian

A Chrome extension that automatically saves YouTube videos as markdown notes directly to your Obsidian vault. Perfect for anyone who wants to organize YouTube content in their knowledge management system.

## 🚀 Features

- **One-Click Saving**: Save YouTube videos as markdown files with a single click
- **Rich Metadata**: Automatically extracts title, channel, description and thumbnail
- **Obsidian Ready**: Formatted markdown with YAML frontmatter for optimal Obsidian integration
- **Thumbnail Support**: Includes video thumbnails in the markdown
- **Customizable Storage**: Choose where to save files in your Obsidian vault

## 🛠 Installation

### Method 1: Chrome Web Store (Coming Soon)
*(Will be available once published)*

### Method 2: Manual Installation
1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top-right corner
4. Click "Load unpacked" and select the extension folder
5. The extension will be installed and ready to use

## 📖 How to Use

### Basic Usage:
1. **Navigate to any YouTube video**
2. **Click the extension icon** in Chrome's toolbar
4. **Click "Save Video to Obsidian"**
5. **Check your Obsidian vault** - the markdown file will be saved in your specified folder

### Setting Up Your Vault Path:
1. Click the extension icon
2. Click "Settings"
3. Enter the relative path where you want files saved (e.g., `YouTube/Videos`)
4. Click "Save Settings"

### Example Output:
The extension creates markdown files with this structure:

```markdown
---
source: YouTube
channel: "Channel Name"
url: https://www.youtube.com/watch?v=...
date_saved: "2024-01-15"
thumbnail: "https://img.youtube.com/vi/.../maxresdefault.jpg"
tags: ["youtube", "video", "your-custom-tags"]
---

# Video Title

![YouTube Thumbnail](https://img.youtube.com/vi/.../maxresdefault.jpg)

**Channel:** Channel Name  
**URL:** [Watch on YouTube](https://www.youtube.com/watch?v=...)  
**Saved:** 1/15/2024, 3:30:45 PM  
**Tags:** youtube, video

## Description
Video description goes here...

## Notes
<!-- Add your personal notes here -->

---
*Saved with YouTube to Obsidian extension*
```

## 🤝 Contributing

We welcome contributions! Here's how you can help:

### Development Setup:
1. Fork the repository
2. Clone your fork locally
3. Load the extension in Chrome as described in Installation
4. Make your changes
5. Test thoroughly on different YouTube pages
6. Submit a pull request

### Areas for Contribution:
- **Bug fixes**: Report or fix any issues you encounter
- **New features**: Check our TODO list below for planned features
- **UI improvements**: Enhance the popup or options page design
- **Documentation**: Improve this README or add tutorials
- **Browser compatibility**: Help make it work with other Chromium browsers

### Code Structure:
```
src/
├── manifest.json          # Extension configuration
├── background/
│   └── background.js      # Background service worker
├── content/
│   └── content.js         # YouTube page content script
├── popup/
│   ├── popup.html         # Popup interface
│   └── popup.js           # Popup functionality
└── options/
    ├── options.html       # Settings page
    └── options.js         # Settings functionality
```

### Pull Request Guidelines:
- Follow the existing code style
- Add comments for complex logic
- Test your changes on multiple YouTube pages
- Update documentation if needed
- Keep PRs focused on a single feature or fix

## 🐛 Reporting Issues

Found a bug? Please create an issue with:
1. **Description** of the problem
2. **Steps to reproduce**
3. **Expected behavior**
4. **Screenshots** (if applicable)
5. **Chrome version** and **OS**

## 📋 TODO List

### High Priority
- [x] **Add manual tags in popup**
  - [x] Tags input field in popup
  - [x] Comma-separated tag parsing
  - [x] Tag persistence across sessions
  - [x] Frontmatter integration
  - [x] Tag suggestions based on previous usage
  - [x] Predefined tag templates

- [ ] **Add creation video data from tooltip**
  - [ ] Extract video upload date from YouTube tooltip
  - [ ] Parse and format date consistently
  - [ ] Add to YAML frontmatter as `date_uploaded`
  - [ ] Fallback methods for date extraction
  - [ ] Date formatting options in settings

### Medium Priority
- [x] **Transcript extraction**
  - [x] Automatic transcript scraping when available
  - [x] Transcript formatting options
  - [x] Toggle for including/excluding transcripts
  - [x] Multiple language support

- [ ] **Advanced templating system**
  - [ ] Customizable markdown templates
  - [ ] Template variables system
  - [ ] Template management in options
  - [ ] Default template presets

- [ ] **Bulk operations**
  - [ ] Save multiple videos from a playlist
  - [ ] Batch tag application
  - [ ] Progress indicators for bulk operations

### Low Priority
- [ ] **Keyboard shortcuts**
  - [ ] Quick save shortcut
  - [ ] Shortcut to open popup
  - [ ] Customizable key bindings

- [ ] **Export options**
  - [ ] JSON export
  - [ ] CSV export for video lists
  - [ ] Custom export formats

- [ ] **Integration enhancements**
  - [ ] Obsidian URI scheme support
  - [ ] Direct vault detection
  - [ ] Plugin compatibility checks

## 🛡 Privacy

This extension:
- ✅ Runs entirely locally on your device
- ✅ Does not collect any personal data
- ✅ Does not send data to external servers
- ✅ Only accesses YouTube pages when you activate it
- ✅ Stores settings locally in your browser

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](https://github.com/AlexKley/youtube-to-obsidian?tab=MIT-1-ov-file) file for details.

## 🙏 Acknowledgments

- Built for the Obsidian community
- Thanks to all contributors and testers
- Inspired by the need for better YouTube content management in PKM systems

---

**Happy Note-Taking!** 📝✨

If you find this extension useful, please consider giving it a star on GitHub and sharing it with others in the Obsidian community!