// AdaptUI Content Script
// Injected into every page - listens for mode messages and transforms the DOM

(function () {
  'use strict';

  let currentMode = null;
  let styleEl = null;
  let overlayEl = null;

  // ============================================================
  // MODE STYLESHEETS
  // ============================================================

  const MODES = {

  // ---- LOW VISION ----
  lowvision: (i) => {
    const zoom = i === 1 ? 1.15 : i === 2 ? 1.3 : 1.5;
    const cols = i === 1 ? 3 : 2;
    return `
      /* Step 1: reflow Amazon's grid to fewer columns FIRST */
      .s-main-slot {
        display: grid !important;
        grid-template-columns: repeat(${cols}, 1fr) !important;
      }
      .s-main-slot .s-result-item,
      [data-component-type="s-search-result"] {
        width: 100% !important;
        max-width: 100% !important;
        grid-column: span 1 !important;
      }
      .s-image {
        width: 100% !important;
        height: auto !important;
        max-height: none !important;
        object-fit: contain !important;
      }
      /* Step 2: then zoom the whole page */
      html {
        zoom: ${zoom} !important;
      }
      :focus, :focus-visible {
        outline: 3px solid #ffcc00 !important;
        outline-offset: 3px !important;
      }
      a { text-decoration: underline !important; }
      #__adaptui_toolbar__, #__adaptui_toast__ {
        zoom: ${(1 / zoom).toFixed(3)} !important;
      }
    `;
  },

    // ---- FOCUS / READ ----
    focus: (intensity) => {
      const blur = intensity === 1 ? '1px' : intensity === 2 ? '2px' : '4px';
      const dim = intensity === 1 ? '0.6' : intensity === 2 ? '0.4' : '0.2';
      return `
        /* Focus Mode */
        body::before {
          content: '';
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,${dim});
          z-index: 999998;
          pointer-events: none;
        }
        /* Spotlight the main content */
        article, main, [role="main"], .article, .post, .content, .entry-content {
          position: relative;
          z-index: 999999 !important;
          background: var(--bg, #fff) !important;
          max-width: 720px !important;
          margin: 0 auto !important;
          padding: 40px !important;
          box-shadow: 0 0 80px rgba(0,0,0,0.5) !important;
          font-size: 1.1em !important;
          line-height: 1.85 !important;
        }
        /* Hide distracting elements */
        ${intensity >= 2 ? `
          aside, .sidebar, .ads, .advertisement, .banner, nav,
          [class*="sidebar"], [class*="widget"], [class*="related"],
          [class*="recommended"], [id*="sidebar"] {
            opacity: 0.1 !important;
            pointer-events: none !important;
          }
        ` : ''}
        ${intensity === 3 ? `
          header, footer { opacity: 0 !important; pointer-events: none !important; }
        ` : ''}
      `;
    },

    // ---- FORCE DARK ----
    dark: (intensity) => `
      /* Force Dark Mode */
      html {
        filter: invert(${intensity === 1 ? '85%' : intensity === 2 ? '90%' : '95%'}) hue-rotate(180deg) !important;
      }
      img, video, canvas, svg, picture, iframe {
        filter: invert(100%) hue-rotate(180deg) !important;
      }
      [class*="logo"], [id*="logo"] {
        filter: invert(100%) hue-rotate(180deg) !important;
      }
    `,

    // ---- SPEED ----
    speed: (intensity) => `
      /* Speed Mode */
      ${intensity >= 1 ? `
        *, *::before, *::after {
          animation: none !important;
          transition: none !important;
          animation-duration: 0s !important;
          transition-duration: 0s !important;
        }
      ` : ''}
      ${intensity >= 2 ? `
        [class*="ad"], [class*="banner"], [id*="ad"], [id*="banner"],
        [class*="popup"], [class*="modal"], [class*="overlay"],
        [class*="newsletter"], [class*="cookie"],
        aside, .sidebar, [class*="sidebar"] {
          display: none !important;
        }
        video[autoplay]:not([controls]) { display: none !important; }
      ` : ''}
      ${intensity === 3 ? `
        header { position: static !important; }
        nav { display: none !important; }
        footer { display: none !important; }
        img:not([src*="product"]):not([src*="item"]) { display: none !important; }
      ` : ''}
    `,

    // ---- SHOPPING ----
    shopping: (intensity) => `
      /* Shopping Mode */
      /* Enlarge prices */
      [class*="price"], [class*="Price"], [id*="price"],
      [class*="cost"], [class*="amount"], [class*="total"],
      [data-price], [itemprop="price"], .a-price, .price {
        font-size: ${intensity === 1 ? '1.4em' : intensity === 2 ? '1.8em' : '2.4em'} !important;
        font-weight: 900 !important;
        color: #e8500a !important;
        letter-spacing: -0.02em !important;
      }
      /* Highlight discounts */
      [class*="discount"], [class*="sale"], [class*="saving"],
      [class*="off"], [class*="deal"], .savingsPercentage {
        background: #ff4d0015 !important;
        border: 2px solid #ff4d00 !important;
        border-radius: 6px !important;
        padding: 2px 8px !important;
        color: #ff4d00 !important;
        font-weight: 800 !important;
        font-size: 1.1em !important;
      }
      /* Highlight add-to-cart buttons */
      [id*="add-to-cart"], [class*="add-to-cart"], [class*="addToCart"],
      [class*="buy-now"], [class*="buyNow"], button[type="submit"] {
        background: #e8500a !important;
        color: white !important;
        font-size: ${intensity >= 2 ? '1.2em' : '1em'} !important;
        padding: ${intensity >= 2 ? '14px 28px' : '10px 20px'} !important;
        border-radius: 8px !important;
        border: none !important;
        font-weight: 800 !important;
        box-shadow: 0 4px 20px rgba(232,80,10,0.4) !important;
      }
      ${intensity >= 2 ? `
        /* Dim non-product content */
        header, nav, footer, aside, .sidebar { opacity: 0.5 !important; }
        /* Make product images pop */
        [class*="product"] img, [class*="item"] img {
          transform: scale(1.02) !important;
          box-shadow: 0 8px 30px rgba(0,0,0,0.2) !important;
          border-radius: 8px !important;
        }
      ` : ''}
      ${intensity === 3 ? `
        /* Really aggressive - big prices everywhere */
        [class*="price"]:after {
          content: ' 💰';
          font-size: 0.7em;
        }
      ` : ''}
    `,

    // ---- NEWS / ARTICLE ----
    news: (intensity) => `
      /* News/Article Mode */
      article, main, [role="main"], .article-body, .story-body,
      .article__body, .post-content, .entry-content, .article-content {
        max-width: 700px !important;
        margin: 0 auto !important;
        font-size: ${intensity === 1 ? '1.05em' : intensity === 2 ? '1.15em' : '1.25em'} !important;
        line-height: ${intensity === 1 ? '1.7' : '1.85'} !important;
        padding: 20px !important;
      }
      /* Clean up typography */
      article p, .article p, main p {
        margin-bottom: 1.4em !important;
      }
      ${intensity >= 2 ? `
        /* Hide known ad/tracker elements */
        [class*=" ad-"], [class*="advertisement"], [class*="sponsored"],
        [class*="promo"], [class*="outbrain"], [class*="taboola"],
        [id*="taboola"], [id*="outbrain"], [class*="newsletter"],
        [class*="paywall-"] { display: none !important; }
      ` : ''}
      ${intensity >= 2 ? `
        aside, .sidebar, [class*="sidebar"], [class*="widget"] {
          opacity: 0.2 !important;
          pointer-events: none !important;
        }
      ` : ''}
      ${intensity === 3 ? `
        header, nav, footer { display: none !important; }
        body { background: #f9f6ef !important; color: #2c2416 !important; }
      ` : ''}
    `,

    // ---- VIDEO / CINEMA ----
    video: (intensity) => `
      /* Cinema Mode */
      ${intensity >= 1 ? `
        /* Dim everything that isn't the video */
        body > *:not(video):not([class*="player"]):not([id*="player"]) {
          opacity: ${intensity === 1 ? '0.6' : intensity === 2 ? '0.3' : '0.05'} !important;
          transition: opacity 0.5s ease !important;
        }
        body > *:not(video):not([class*="player"]):not([id*="player"]):hover {
          opacity: 1 !important;
        }
        video, [class*="player"], [id*="player"], .html5-video-container {
          opacity: 1 !important;
        }
      ` : ''}
      ${intensity >= 2 ? `
        /* Dark overlay around video */
        body {
          background: #000 !important;
        }
        [class*="recommended"], [class*="suggestion"], #related,
        [class*="comments"], [class*="description"] {
          opacity: 0.1 !important;
        }
      ` : ''}
      ${intensity === 3 ? `
        header, nav, footer, aside { display: none !important; }
        body { overflow: hidden !important; }
        video { width: 100vw !important; max-width: 100vw !important; }
      ` : ''}
    `,

    // ---- DEV / CODE ----
    code: (intensity) => `
      /* Dev/Code Mode */
      pre, code, .code, [class*="code-block"], .highlight, .prism {
        font-size: ${intensity === 1 ? '1em' : intensity === 2 ? '1.1em' : '1.2em'} !important;
        line-height: 1.6 !important;
        border-radius: 8px !important;
        padding: 16px !important;
        overflow-x: auto !important;
      }
      /* Wider layout for code sites */
      ${intensity >= 2 ? `
        main, .content, article, .container {
          max-width: 90vw !important;
          width: 90vw !important;
        }
      ` : ''}
      ${intensity >= 2 ? `
        /* Hide distractions */
        [class*="ad"], [class*="banner"], [class*="promo"] { display: none !important; }
        .sidebar:not([class*="toc"]):not([class*="nav"]) { display: none !important; }
      ` : ''}
      ${intensity === 3 ? `
        /* Max code focus */
        header, footer, nav { opacity: 0.2 !important; }
        body { background: #0d1117 !important; color: #e6edf3 !important; }
        a { color: #58a6ff !important; }
      ` : ''}
    `
  };

  // ============================================================
  // APPLY / REMOVE MODE
  // ============================================================

  function applyMode(mode, intensity) {
    removeMode();

    if (!mode) return;

    const css = MODES[mode] ? MODES[mode](intensity) : '';
    if (!css) return;

    styleEl = document.createElement('style');
    styleEl.id = '__adaptui_style__';
    styleEl.textContent = css;
    document.head.appendChild(styleEl);

    // Flash indicator
    showToast(mode, intensity);

    currentMode = mode;
  }

  function removeMode() {
    if (styleEl) { styleEl.remove(); styleEl = null; }
    if (overlayEl) { overlayEl.remove(); overlayEl = null; }
    currentMode = null;
  }

  function showToast(mode, intensity) {
    const existing = document.getElementById('__adaptui_toast__');
    if (existing) existing.remove();

    const labels = {
      lowvision: '👁 Low Vision Mode',
      focus: '📖 Focus Mode',
      dark: '🌙 Force Dark Mode',
      speed: '⚡ Speed Mode',
      shopping: '🛒 Shopping Mode',
      news: '📰 Article Mode',
      video: '🎬 Cinema Mode',
      code: '💻 Dev Mode'
    };

    const stars = '●'.repeat(intensity) + '○'.repeat(3 - intensity);

    const toast = document.createElement('div');
    toast.id = '__adaptui_toast__';
    toast.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 2147483647;
      background: #0c0c0f;
      color: #f0f0f8;
      border: 1px solid #2a2a36;
      border-radius: 12px;
      padding: 12px 18px;
      font-family: system-ui, sans-serif;
      font-size: 13px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 10px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.5);
      animation: adaptui-slide-in 0.3s cubic-bezier(0.23,1,0.32,1) both;
      pointer-events: none;
    `;

    const styleAnim = document.createElement('style');
    styleAnim.textContent = `
      @keyframes adaptui-slide-in {
        from { opacity:0; transform: translateY(12px); }
        to { opacity:1; transform: translateY(0); }
      }
    `;
    document.head.appendChild(styleAnim);

    toast.innerHTML = `
      <span>${labels[mode] || mode}</span>
      <span style="color:#7c6aff;font-family:monospace;font-size:11px;">${stars}</span>
    `;

    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2500);
  }

  // ============================================================
  // MESSAGE LISTENER
  // ============================================================

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.action === 'setMode') {
      if (msg.mode) {
        applyMode(msg.mode, msg.intensity || 2);
      } else {
        removeMode();
      }
    }
  });

  // ============================================================
  // RESTORE MODE ON PAGE LOAD
  // ============================================================

  chrome.storage.local.get(null, (items) => {
    // We don't have tab ID in content script easily,
    // so we store the last active mode per hostname
    const hostname = window.location.hostname;
    const mode = items['host_mode_' + hostname];
    const intensity = items['host_intensity_' + hostname] || 2;
    if (mode) applyMode(mode, intensity);
  });

  // Listen for storage changes (when popup sets a mode)
  chrome.storage.onChanged.addListener((changes) => {
    for (const key of Object.keys(changes)) {
      if (key.startsWith('host_mode_') && key.includes(window.location.hostname)) {
        const mode = changes[key].newValue;
        const intensity = 2;
        if (mode) applyMode(mode, intensity);
        else removeMode();
      }
    }
  });

})();

// Eye tracking bridge
let socket;

function connectEyeTracker() {
  socket = new WebSocket("ws://localhost:6789");

  socket.addEventListener("message", (event) => {
    if (event.data === "ENABLE_FOCUS") {
      // Trigger your existing focus mode — replace with whatever
      // function your extension already uses to activate focus mode
      activateMode("focus");   // 👈 match your existing function name
    }
    if (event.data === "DISABLE_FOCUS") {
      deactivateMode("focus"); // 👈 match your existing function name
    }
  });

  socket.addEventListener("close", () => setTimeout(connectEyeTracker, 3000));
  socket.addEventListener("error", () => socket.close());
}

connectEyeTracker();
