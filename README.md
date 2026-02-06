# 🎲 D&D Beyond Character Importer for Foundry VTT

A complete solution for importing D&D Beyond characters into Foundry VTT. This project includes both a Foundry VTT module and a browser extension that work together to seamlessly transfer your D&D Beyond characters into your Foundry VTT games.

## ✨ What's Included

This repository contains two components:

1. **Foundry VTT Module** (`foundry-module/`) - A module that adds import functionality to Foundry VTT
2. **Browser Extension** (`firefox-extension/`) - A Firefox/Chrome extension that exports character data from D&D Beyond

## 🚀 Quick Start

### Install the Foundry VTT Module

#### Option 1: Install via Manifest URL (Recommended)

1. Open Foundry VTT and navigate to **Add-on Modules**
2. Click **Install Module**
3. Paste this manifest URL into the field at the bottom:
   ```
   https://raw.githubusercontent.com/Nevelish/nevelish-ddb-importer/main/foundry-module/module.json
   ```
4. Click **Install**
5. Enable the module in your world settings

#### Option 2: Manual Installation

1. Download the latest release
2. Extract to your Foundry VTT `Data/modules` directory
3. Restart Foundry VTT
4. Enable the module in your world settings

### Install the Browser Extension

#### Firefox
1. Navigate to the `firefox-extension` folder
2. Open Firefox and go to `about:debugging`
3. Click **This Firefox** → **Load Temporary Add-on**
4. Select the `manifest.json` file from the `firefox-extension` directory

#### Chrome/Edge/Brave
1. Navigate to the `firefox-extension` folder
2. Open your browser and go to `chrome://extensions/` (or `edge://extensions/`)
3. Enable **Developer mode**
4. Click **Load unpacked**
5. Select the `firefox-extension` directory

## 📋 Features

### Foundry VTT Module
- ✅ Seamless character import from D&D Beyond
- ✅ Automatic stat conversion to Foundry VTT format
- ✅ Update existing characters or create new ones
- ✅ User-friendly import dialog
- ✅ Integration with Actors sidebar
- ✅ Compatible with Foundry VTT v11-v13

### Browser Extension
- ✅ Cookie extraction for D&D Beyond authentication
- ✅ Complete character data export
- ✅ Cross-browser support (Firefox, Chrome, Edge, Brave)
- ✅ Simple one-click interface
- ✅ Automatic clipboard copy

## 🎯 How to Use

1. **In your browser**: Navigate to your character page on D&D Beyond
2. **Click the extension icon** and select **Copy Character Data**
3. **In Foundry VTT**: Open the Actors Directory
4. **Click** the **Import from D&D Beyond** button
5. **Paste** the character data into the dialog
6. **Click Import Character** - Done! 🎉

Your character will be created or updated in Foundry VTT with all their stats, abilities, and information.

## 📚 Documentation

For detailed documentation, please see:
- [Foundry Module README](foundry-module/README.md) - Detailed module documentation
- [Browser Extension README](firefox-extension/README.md) - Extension installation and usage

## ⚙️ Requirements

- **Foundry VTT**: Version 11 or higher (verified up to v13)
- **System**: D&D 5e system must be installed
- **Browser**: Modern browser (Firefox, Chrome, Edge, or Brave)
- **D&D Beyond Account**: Active account with character access

## 🔒 Privacy & Security

- ✅ All data processing happens locally
- ✅ No data sent to external servers
- ✅ Character data only stored in your Foundry VTT world
- ✅ Session cookies handled securely by your browser

## 🐛 Troubleshooting

### Module Not Working
- Verify the module is enabled in world settings
- Check that D&D 5e system is installed and active
- Ensure you're using Foundry VTT v11 or higher

### Character Data Not Importing
- Make sure you clicked "Copy Character Data" (not "Copy Cobalt Cookie")
- Verify the complete JSON was copied
- Check browser console (F12) for error messages

### Extension Not Working
- Ensure you're logged into D&D Beyond
- Navigate to a specific character page
- Refresh the page and try again

For more troubleshooting help, see the individual component READMEs.

## 🤝 Contributing

Contributions are welcome! Here's how you can help:

1. **Report Bugs**: Open an issue describing the problem
2. **Suggest Features**: Share your ideas for improvements
3. **Submit Pull Requests**: Fix bugs or add new features
4. **Improve Documentation**: Help make the docs clearer

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

Copyright (c) 2026 Preben Lysa Heika

## 🙏 Acknowledgments

- Built for the Foundry VTT community
- Compatible with D&D Beyond character data
- Thanks to all contributors and users

## 🔗 Links

- **GitHub Repository**: https://github.com/Nevelish/nevelish-ddb-importer
- **Issues**: https://github.com/Nevelish/nevelish-ddb-importer/issues
- **Foundry VTT**: https://foundryvtt.com/
- **D&D Beyond**: https://www.dndbeyond.com/

---

**Note**: This is an unofficial tool and is not affiliated with or endorsed by D&D Beyond, Wizards of the Coast, or Foundry Gaming LLC.
