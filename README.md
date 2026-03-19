# 🏠 Airbnb Insight AI

**AI-powered Chrome extension that analyses Airbnb reviews to give you instant, personalised insights about whether a listing matches your expectations.**

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## Features

- **Instant Review Analysis** - Scrapes and analyses all reviews on any Airbnb listing
- **Personalised Match Score** - Get a 0-100 score based on YOUR travel preferences
- **Smart Insights** - AI extracts pros, cons, and insider tips from real guest experiences
- **Theme Detection** - See what guests mention most frequently
- **One-Click Copy** - Share insights with travel companions

## Installation

### Prerequisites
- Google Chrome browser
- OpenAI API key ([Get one here](https://platform.openai.com/api-keys))

### Install the Extension

1. **Download the extension**
   - Clone this repository or download the ZIP file
   - Extract to a folder on your computer

2. **Load in Chrome**
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable **Developer mode** (toggle in top right)
   - Click **Load unpacked**
   - Select the `airbnb-insight-extension` folder

3. **Configure your API Key** (choose one method):

   **Option A: Via Settings Panel (Recommended for personal use)**
   - Click the extension icon in your toolbar
   - Click "Settings" to expand
   - Enter your OpenAI API key
   - Click "Save Settings"

   **Option B: Via Config File (For development/sharing)**
   - Copy `config.example.js` to `config.js`
   - Edit `config.js` and add your API key
   - The extension will auto-load it on startup

   
   ```javascript
   
   // config.js
   const CONFIG = {
     OPENAI_API_KEY: 'sk-your-actual-key-here',
     USER_PREFERENCES: 'I need fast WiFi and a quiet area',
     MODEL: 'gpt-4o-mini'
   };
   ```

> ⚠️ **Security Note**: Never commit `config.js` to version control! It's already in `.gitignore`.

## 📖 How to Use

1. **Navigate to any Airbnb listing** (e.g., `airbnb.com/rooms/12345`)
2. **Click the extension icon** in your Chrome toolbar
3. **Click "Analyse Reviews"** to start the AI analysis

4. **View your results:**
   - **Match Score** - How well this place fits your needs (0-100)
   - **Summary** - Quick overview of guest experiences
   - **Pros** - What guests love about this place
   - **Cons** - Common complaints and issues
   - **Tips** - Insider advice from previous guests
   - **Themes** - Frequently mentioned topics

5. **Copy insights** to share with friends or save for later

## 🔧 Configuration

### API Key
Your OpenAI API key is stored locally in Chrome and never sent anywhere except OpenAI's servers. The extension uses GPT-4o-mini for fast, affordable analysis.

### Travel Preferences
Add your preferences to get personalized match scores:
- "I need fast WiFi for remote work"
- "Quiet neighborhoods are essential"
- "I travel with pets"
- "Accessibility features required"
- "Walking distance to public transit"

## 🛠️ Technical Details

### Files Structure
```
airbnb-insight-extension/
├── manifest.json        # Extension configuration
├── popup.html           # Main UI
├── popup.css            # Styles
├── popup.js             # UI logic & OpenAI integration
├── content.js           # Airbnb page scraper
├── content.css          # Page injection styles
├── config.example.js    # API key config template
├── config.js            # Your API key (create from example, gitignored)
├── .env.example         # Environment template
├── .gitignore           # Git ignore rules
├── icons/               # Extension icons (PNG only)
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md
```

### Permissions Used
- `activeTab` - Access current Airbnb tab to scrape reviews
- `storage` - Save your API key and preferences locally
- Host permissions for Airbnb domains and OpenAI API

### API Usage
Each analysis uses approximately 500-1500 tokens depending on the number of reviews. At current GPT-4o-mini pricing (~$0.15/1M input tokens), each analysis costs less than $0.001.

## 🔒 Privacy

- Your API key is stored locally and only sent to OpenAI
- No data is collected or sent to any third-party servers
- Review data is processed in real-time and not stored
- All analysis happens directly between your browser and OpenAI

## 🐛 Troubleshooting

### "No reviews found"
- Scroll down on the Airbnb page to load reviews
- Some listings may have reviews in a modal - click "Show all reviews" first
- Try refreshing the page and clicking analyze again

### "Invalid API key"
- Double-check your OpenAI API key in settings
- Make sure you have credits in your OpenAI account
- API keys start with `sk-`

### Extension not appearing on Airbnb
- Make sure you're on a listing page (`/rooms/...`)
- Try refreshing the Airbnb page
- Check that the extension is enabled in `chrome://extensions/`

## 📝 License

MIT License - feel free to modify and distribute.

## 🤝 Contributing

Contributions welcome! Feel free to:
- Report bugs
- Suggest features
- Submit pull requests

---

**Made with ❤️ for smarter travel decisions**
