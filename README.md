# AdaptUI — Chrome Extension

Transform any website to match how you browse.

## Modes

| Mode | What it does |
|------|-------------|
| 👁 Low Vision | Makes everything bigger — zooms the whole page, reflows layout so nothing gets cut off |
| 📖 Focus Read | Dims distracting sidebars, ads, and clutter so you can concentrate on the main content |
| ⚡ Speed | Highlights the important parts of the current site, strips animations, hides noise |

## Intensity Slider
Each mode has 3 intensity levels (Subtle → Moderate → Strong), letting you control how aggressively the page is transformed.

---

## Installation (Chrome / Edge / Brave)

1. Open your browser and go to: `chrome://extensions`
2. Enable **Developer Mode** (toggle in the top-right corner)
3. Click **"Load unpacked"**
4. Select this folder (`adaptive-ui-extension/`)
5. The AdaptUI icon will appear in your toolbar — pin it for easy access
6. Click the icon or press **Alt+A** to toggle the toolbar on any page

---

## How it works

- `manifest.json` — Tells Chrome what permissions the extension needs
- `popup.html/js` — The UI panel that appears when you click the extension icon
- `content.js` — Runs on every webpage; injects CSS transformations based on the active mode
- `content.css` — Minimal base stylesheet
- `background.js` — Handles extension icon color changes per mode
- `icons/` — Extension icons

## Project Structure
```
adaptive-ui-extension/
├── manifest.json
├── popup.html
├── popup.js
├── content.js
├── content.css
├── background.js
├── README.md
└── icons/
```

## Eyetracking Features
When user is visiting a webpage, our extension tracks user's eye motion to evaluate if the user is focused or distracted and gives feedback based on the mode turned on. After a few seconds of being distracted, we automatically shift to our Focus mode and update the website respectively.

Built for Compile Hackathon 🚀
