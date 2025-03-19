# Autoji - AI Emoji Suggester 🤖✨

A Chrome extension that uses AI to suggest the perfect emoji for any text. Because apparently, humans can't be trusted to choose their own emojis anymore.

## Features

- 🎯 Instant emoji suggestions for selected text
- 🧠 AI-powered recommendations
- ⚡ Quick access via right-click menu or keyboard shortcut
- 🎨 Beautiful, minimal interface
- 🔒 Privacy-focused: No data collection

## Installation

1. Download from the [Chrome Web Store](https://chrome.google.com/webstore/detail/autoji) (Coming soon)

Or install manually (if you enjoy pain):

1. Clone this repository
2. Run `npm install` to install dependencies (another set of node_modules to burden your hard drive)
3. Run `npm run build:prod` to create a production build
4. Open Chrome and navigate to `chrome://extensions`
5. Enable "Developer mode" in the top right
6. Click "Load unpacked" and select the `dist` directory
7. Question your life choices that led you to installing yet another browser extension

## Usage

1. Select any text on a webpage
2. Right-click and select "Suggest Emoji with Autoji"
3. Or use the keyboard shortcut: `Ctrl+Shift+E` (Windows/Linux) or `⌘+Shift+E` (Mac)
4. Marvel at the AI's attempt to understand human emotion
5. Click to copy the suggested emoji

## Development

The extension development process is as meaningless as existence itself, but here's how to do it:

### Prerequisites

1. Install Vercel CLI (because we need more global dependencies):
```bash
npm install -g vercel
```

2. Login to Vercel (if you haven't already):
```bash
vercel login
```

### Development Workflow

```bash
# Install dependencies (because we can't live without them)
npm install

# Start the API server locally (watch as your CPU weeps)
vercel dev

# In another terminal of despair:
# 1. Make your changes to the source files
# 2. Manually reload the extension in chrome://extensions
# 3. Question your life choices
```

For local development:
1. Start the API server with `vercel dev`
2. Load the extension in Chrome from the root directory
3. Make your changes to the source files
4. Click the reload button in `chrome://extensions`
5. Repeat steps 3-4 until you lose all hope

The extension will use:
- Development: `http://localhost:3000` (provided by Vercel dev server)
- Production: `https://autoji.vercel.app`

### Production Build

When you're ready to submit your extension to the Chrome Web Store (though why bother?):

```bash
# Create a production build (another zip file destined for rejection)
npm run build:prod
```

This is the only npm script we have. Because sometimes less is more depressing.

## Privacy

This extension requires minimal permissions (though that's what they all say):

- `contextMenus`: For the right-click menu functionality
- `storage`: To remember your preferences (if you have any)
- `clipboardWrite`: To copy emojis to clipboard

## Support

If something goes wrong (and it probably will):

- Open an issue on GitHub
- Send a carrier pigeon
- Scream into the void

## License

MIT - Because sharing is caring, even in this meaningless universe.

## Chrome Web Store Submission Checklist

### Required Materials

- [ ] Extension ZIP file (created with `npm run build:prod`)
- [ ] Store listing assets:
  - [ ] Icon (128x128)
  - [ ] Screenshots (1280x800 or 640x400)
  - [ ] Promotional tile images (440x280)
- [ ] Privacy policy URL
- [ ] Detailed description
- [ ] At least 2 screenshots/promotional images

### Store Listing Content

**Detailed Description:**
```
Autoji: Your AI-Powered Emoji Assistant 🤖✨

Transform your text with intelligent emoji suggestions! Autoji uses AI to analyze your text and suggest the perfect emoji that captures its meaning.

Key Features:
🎯 Instant AI-powered emoji suggestions
🔒 Privacy-first: Your API key, your control
⚡ Quick access via right-click or keyboard shortcut
🎨 Clean, intuitive interface
🌐 Works on any webpage

How to Use:
1. Add your OpenAI API key in the extension settings
2. Select any text on a webpage
3. Right-click or use Ctrl+Shift+E (⌘+Shift+E on Mac)
4. Get instant emoji suggestions!

Perfect for:
• Social media posts
• Messages and emails
• Content creation
• Adding emotion to any text

Note: Requires an OpenAI API key (not included)
```

**Privacy Policy Points:**
- No data collection
- User-provided API keys stored locally
- No tracking or analytics
- Text processing happens through user's OpenAI account

### Build Process

1. Run `npm install` to install dependencies
2. Run `npm run build:prod` to create the production build
3. Find the packaged extension in `dist/autoji.zip`
4. Test the packaged extension thoroughly (or don't, what difference does it make?)
5. Submit to Chrome Web Store
6. Wait in existential dread for review (usually 2-3 business days)

---
Made with 🤖 and existential dread by Dany (MajorBaguette)
