# DnD Beyond to Foundry VTT

A browser extension that exports D&D Beyond characters to FoundryVTT by extracting character data and session cookies.

## 🎲 Features

- **Cookie Extraction**: Copies your D&D Beyond Cobalt session cookie for authentication
- **Character Data Export**: Fetches and exports complete character data from D&D Beyond
- **Cross-Browser Support**: Compatible with both Firefox and Chrome/Chromium-based browsers
- **Simple Interface**: Easy-to-use popup with two main functions

## 📋 Installation

### Firefox
1. Clone or download this repository
2. Open Firefox and navigate to `about:debugging`
3. Click "This Firefox" → "Load Temporary Add-on"
4. Select the `manifest.json` file from the extension directory

### Chrome/Edge/Brave
1. Clone or download this repository
2. Open your browser and navigate to `chrome://extensions/` (or `edge://extensions/`)
3. Enable "Developer mode" in the top right
4. Click "Load unpacked"
5. Select the extension directory

## 🚀 Usage

1. Navigate to a D&D Beyond character page (e.g., `https://www.dndbeyond.com/characters/[character-id]`)
2. Click the extension icon in your browser toolbar
3. Choose one of two options:
   - **Copy Cobalt Cookie**: Exports your session cookie along with character URL and ID
   - **Copy Character Data**: Fetches and exports complete character data from D&D Beyond's API

4. The exported data is automatically copied to your clipboard in JSON format
5. Paste the data into Foundry VTT to import your character

## 📦 Project Structure

```
Beyond-to-FoundryVVT/
├── manifest.json       # Extension configuration
├── background.js       # Background script for cookie/API handling
├── popup.html         # Extension popup interface
├── popup.js           # Popup functionality and event handlers
├── icon16.png         # Extension icon (16x16)
├── icon48.png         # Extension icon (48x48)
├── icon128.png        # Extension icon (128x128)
└── LICENSE            # License file
```

## 🔧 How It Works

### Background Script (`background.js`)
- Handles cookie retrieval from D&D Beyond
- Fetches character data from D&D Beyond's Character Service API
- Uses the CobaltSession cookie for authentication

### Popup Interface (`popup.html` & `popup.js`)
- Provides a user-friendly interface with two main buttons
- Validates that the user is on a D&D Beyond character page
- Extracts character ID from the URL
- Displays status messages for user feedback
- Copies formatted JSON data to clipboard

## 🔑 Exported Data Format

### Cookie Export
```json
{
  "cobaltCookie": "your-session-cookie",
  "characterUrl": "https://www.dndbeyond.com/characters/123456",
  "characterId": "123456",
  "timestamp": "2026-02-05T12:00:00.000Z"
}
```

### Character Data Export
```json
{
  "cobaltCookie": "your-session-cookie",
  "characterUrl": "https://www.dndbeyond.com/characters/123456",
  "characterId": "123456",
  "characterData": { /* Complete character data from D&D Beyond API */ },
  "timestamp": "2026-02-05T12:00:00.000Z"
}
```

## ⚠️ Requirements

- Active D&D Beyond account (must be logged in)
- Access to the character you want to export
- Modern browser (Firefox, Chrome, Edge, or Brave)

## 🔒 Privacy & Security

- This extension only accesses D&D Beyond cookies and character data
- No data is sent to external servers
- All data processing happens locally in your browser
- Exported data is only copied to your clipboard

## 📝 Permissions

The extension requires the following permissions:
- `cookies`: To retrieve your D&D Beyond session cookie
- `activeTab`: To detect when you're on a character page
- `clipboardWrite`: To copy exported data to your clipboard
- `*://*.dndbeyond.com/*`: To access D&D Beyond pages and API

## 🐛 Troubleshooting

**Extension says "Cobalt cookie not found"**
- Make sure you're logged into D&D Beyond
- Try refreshing the D&D Beyond page
- Check that you have an active session

**"Not on a character page" error**
- Navigate to a specific character page (URL should include `/characters/[number]`)
- Refresh the page and try again

**Character data fetch fails**
- Ensure you have access to the character
- Check your internet connection
- Try logging out and back into D&D Beyond

## 🤝 Contributing

Contributions are welcome! Feel free to:
- Report bugs
- Suggest new features
- Submit pull requests

## 📄 License

This project is licensed under the terms included in the LICENSE file.

## ⚡ Acknowledgments

- Built for the Foundry VTT community
- Uses D&D Beyond's Character Service API
- Compatible with official Foundry VTT importers

---

**Note**: This is an unofficial tool and is not affiliated with or endorsed by D&D Beyond or Foundry Gaming LLC.