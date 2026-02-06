# D&D Beyond Character Importer for Foundry VTT

A Foundry VTT module that allows you to import characters from D&D Beyond using exported data. This module works in conjunction with a browser extension (available separately) to seamlessly transfer your D&D Beyond characters into Foundry VTT.

## 🎲 Features

- **Seamless Character Import**: Import complete character data from D&D Beyond
- **Automatic Stat Conversion**: Converts D&D Beyond character stats to Foundry VTT format
- **Update Existing Characters**: Updates characters if they already exist in your world
- **User-Friendly Interface**: Easy-to-use dialog with paste functionality
- **Actor Directory Integration**: Import button added directly to the Actors sidebar

## 📋 Installation

### Automatic Installation (Recommended)
1. In Foundry VTT, go to "Add-on Modules"
2. Click "Install Module"
3. Search for "D&D Beyond Character Importer" or paste this manifest URL:
   ```
   https://raw.githubusercontent.com/Nevelish/ddb-importer/main/module.json
   ```
4. Click "Install"

### Manual Installation
1. Download the latest release from the [GitHub repository](https://github.com/Nevelish/ddb-importer)
2. Extract the files to your Foundry VTT `modules` directory
3. Restart Foundry VTT
4. Enable the module in your world settings

## 🚀 Usage

### Prerequisites
You'll need to use a browser extension (available in the `firefox-extension` folder) to export character data from D&D Beyond.

### Importing a Character
1. In Foundry VTT, open the Actors Directory
2. Click the "Import from D&D Beyond" button in the header
3. In your browser, navigate to your character page on D&D Beyond
4. Use the browser extension to copy the character data
5. Paste the data into the import dialog in Foundry VTT
6. Click "Import Character"
7. The character will be created or updated in your Actors list

## 📦 File Structure

```
ddb-importer/
├── module.json                  # Module configuration and metadata
├── scripts/
│   └── main.js                  # Main module logic and character conversion
├── styles/
│   └── module.css              # Custom styling for the import interface
├── templates/
│   └── import-dialog.html      # HTML template for the import dialog
├── LICENSE                      # MIT License
└── README.md                    # This file
```

## 📄 File Descriptions

### `module.json`
The module manifest file that defines:
- Module ID: `ddb-importer`
- Title: "D&D Beyond Character Importer"
- Version: 1.0.4
- Compatibility: Foundry VTT v11-v13
- Dependencies: Requires the D&D 5e system
- Author: NevelishTV

### `scripts/main.js`
The core module script containing:
- **DDBImporterDialog**: FormApplication class that handles the import dialog
- **Character Conversion**: Converts D&D Beyond data to Foundry VTT format
  - Ability scores (STR, DEX, CON, INT, WIS, CHA)
  - Hit points and armor class
  - Character level, race, and background
  - Class information
  - Speed and proficiency bonus
- **Hook Implementations**:
  - `init`: Initializes the module and registers settings
  - `getActorDirectoryEntryContext`: Adds context menu option
  - `renderActorDirectory`: Adds import button to the directory header

### `styles/module.css`
Custom CSS styling for:
- `.ddb-import-button`: Styled import button with gradient background
- `.ddb-import-form`: Form layout and styling
- Hover effects and transitions for better UX

### `templates/import-dialog.html`
HTML template for the import dialog featuring:
- Large textarea for pasting character data
- Instructions for users
- Import button with icon
- Note about character updates vs. creation

### `LICENSE`
MIT License - Free to use, modify, and distribute

## 🔧 How It Works

### Data Import Process
1. User pastes JSON data from the D&D Beyond extension
2. Module validates the data format
3. Character data is parsed and converted to Foundry VTT format
4. System checks if a character with the same name exists
5. Character is either created or updated in the world

### Character Data Conversion
The module maps D&D Beyond data to Foundry VTT's actor system:
- **Ability Scores**: Maps numeric IDs (1-6) to ability keys (str, dex, con, int, wis, cha)
- **Hit Points**: Calculates current HP from base + bonus - removed HP
- **Armor Class**: Directly transfers AC value
- **Level**: Sums levels across all character classes
- **Proficiency Bonus**: Calculated based on character level
- **Race & Background**: Extracts from character data

## ⚠️ Requirements

- Foundry VTT version 11 or higher (verified up to v13)
- D&D 5e system installed and active
- Browser extension for exporting D&D Beyond data (see `firefox-extension` folder)

## 🔒 Privacy & Security

- All data processing happens within your Foundry VTT instance
- No data is sent to external servers
- Character data is only stored in your Foundry VTT world

## 🐛 Troubleshooting

**"Please paste character data" error**
- Make sure you've copied the character data using the "Copy Character Data" button in the browser extension
- Don't use "Copy Cobalt Cookie" - that's for authentication only

**"Invalid data format" error**
- Ensure you're using the correct browser extension
- Make sure you copied the complete JSON data
- Try copying the character data again

**Character doesn't import correctly**
- Check the browser console (F12) for detailed error messages
- Verify you have the D&D 5e system installed
- Make sure you have permission to create actors in your world

**Import button not showing**
- Verify the module is enabled in your world settings
- Check that you're using Foundry VTT v11 or higher
- Try refreshing your browser

## 🤝 Contributing

Contributions are welcome! Feel free to:
- Report bugs via [GitHub Issues](https://github.com/Nevelish/ddb-importer/issues)
- Suggest new features
- Submit pull requests
- Improve documentation

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

Copyright (c) 2026 Preben Lysa Heika

## ⚡ Acknowledgments

- Built for the Foundry VTT community
- Compatible with D&D Beyond character data
- Designed to work with the included browser extension

## 🔗 Related Projects

- **Browser Extension**: Located in the `firefox-extension` folder of this repository
- **Foundry VTT**: https://foundryvtt.com/
- **D&D Beyond**: https://www.dndbeyond.com/

---

**Note**: This is an unofficial tool and is not affiliated with or endorsed by D&D Beyond, Wizards of the Coast, or Foundry Gaming LLC.
