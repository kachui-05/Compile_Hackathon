# AdaptUI — Chrome Extension

Transform any website to match how you browse.

## Modes

### Universal (work on any site)
| Mode | What it does |
|------|-------------|
| 👁 Low Vision | Larger text, high contrast, yellow focus rings, bigger cursor |
| 📖 Focus Read | Dims clutter, spotlights the main content area |
| 🌙 Force Dark | Dark mode on any site that doesn't support it natively |
| ⚡ Speed | Kills animations, hides ads/sidebars, strips noise |

### Context-Aware (auto-detected or manual)
| Mode | Best for | What it does |
|------|---------|-------------|
| 🛒 Shopping | Amazon, eBay, Etsy... | Enlarges prices, highlights deals, bolds Add-to-Cart buttons |
| 📰 News/Article | NYT, Medium, Substack... | Removes ads, cleans typography, reader-mode layout |
| 🎬 Cinema | YouTube, Netflix, Twitch... | Dims everything except the video player |
| 💻 Dev/Code | GitHub, Stack Overflow, MDN... | Wider layout, bigger code blocks, strips distractions |

## Intensity Slider
Each mode has 3 intensity levels (Subtle → Moderate → Strong), letting you control how aggressively the page is transformed.

---

## Installation (Chrome / Edge / Brave)

1. Open your browser and go to: `chrome://extensions`
2. Enable **Developer Mode** (toggle in the top-right corner)
3. Click **"Load unpacked"**
4. Select this folder (`adaptive-ui-extension/`)
5. The AdaptUI icon will appear in your toolbar — pin it for easy access

That's it! Click the icon on any website to activate a mode.

---

## How it works

- `manifest.json` — Tells Chrome what permissions the extension needs
- `popup.html/js` — The UI panel that appears when you click the extension icon
- `content.js` — Runs on every webpage; injects CSS transformations based on the active mode
- `content.css` — Minimal base stylesheet
- `icons/` — Extension icons

## Project Structure
```
adaptive-ui-extension/
├── manifest.json
├── popup.html
├── popup.js
├── content.js
├── content.css
├── README.md
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

## Adding New Modes

In `content.js`, add a new entry to the `MODES` object:

```js
mymode: (intensity) => `
  /* Your CSS here */
  body { background: red !important; }
`
```

Then add a card for it in `popup.html` with `data-mode="mymode"`.

---

Built for Compile Hackathon 🚀
