// Site context detection rules
const SITE_CONTEXTS = [
  {
    type: 'shopping',
    name: 'Shopping site',
    icon: '🛒',
    mode: 'shopping',
    patterns: [
      /amazon\./i, /ebay\./i, /etsy\./i, /walmart\./i, /target\./i,
      /bestbuy\./i, /shop\./i, /store\./i, /shopify\./i, /aliexpress\./i,
      /wayfair\./i, /zappos\./i, /newegg\./i, /asos\./i, /zara\./i
    ]
  },
  {
    type: 'news',
    name: 'News / Article',
    icon: '📰',
    mode: 'news',
    patterns: [
      /nytimes\./i, /washingtonpost\./i, /theguardian\./i, /bbc\./i,
      /cnn\./i, /reuters\./i, /apnews\./i, /medium\./i, /substack\./i,
      /news\./i, /article/i, /blog\./i, /wordpress\./i
    ]
  },
  {
    type: 'video',
    name: 'Video / Media',
    icon: '🎬',
    mode: 'video',
    patterns: [
      /youtube\./i, /netflix\./i, /hulu\./i, /twitch\./i, /vimeo\./i,
      /disneyplus\./i, /hbomax\./i, /primevideo\./i, /peacock\./i
    ]
  },
  {
    type: 'code',
    name: 'Developer site',
    icon: '💻',
    mode: 'code',
    patterns: [
      /github\./i, /stackoverflow\./i, /mdn\./i, /docs\./i,
      /gitlab\./i, /codepen\./i, /replit\./i, /developer\./i, /dev\.to/i
    ]
  }
];

let currentTab = null;
let currentMode = null;
let currentIntensity = 2;

// Init
async function init() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  currentTab = tab;

  const url = tab.url || '';
  const hostname = new URL(url).hostname.replace('www.', '');

  document.getElementById('site-badge').textContent = hostname;

  // Detect site context
  for (const ctx of SITE_CONTEXTS) {
    if (ctx.patterns.some(p => p.test(url))) {
      showContextBanner(ctx);
      break;
    }
  }

  // Load saved state for this tab
  chrome.storage.local.get(['mode_' + tab.id, 'intensity_' + tab.id], (result) => {
    const savedMode = result['mode_' + tab.id];
    const savedIntensity = result['intensity_' + tab.id] || 2;

    currentIntensity = savedIntensity;
    document.getElementById('intensity').value = savedIntensity;
    document.getElementById('intensity-val').textContent = savedIntensity;

    if (savedMode) {
      currentMode = savedMode;
      updateActiveCard(savedMode);
      updateStatus(savedMode);
    }
  });
}

function showContextBanner(ctx) {
  const banner = document.getElementById('context-banner');
  document.getElementById('ctx-icon').textContent = ctx.icon;
  document.getElementById('ctx-name').textContent = ctx.name;
  banner.classList.add('visible');

  document.getElementById('ctx-auto-btn').addEventListener('click', () => {
    setMode(ctx.mode);
    banner.style.borderColor = 'var(--accent)';
    document.getElementById('ctx-auto-btn').textContent = '✓ Applied';
    document.getElementById('ctx-auto-btn').style.background = '#22c55e';
  });
}

function updateActiveCard(mode) {
  document.querySelectorAll('.mode-card').forEach(c => {
    c.classList.toggle('active', c.dataset.mode === mode);
  });
  document.getElementById('off-btn').classList.toggle('dimmed', !mode);
}

function updateStatus(mode) {
  const dot = document.getElementById('status-dot');
  const text = document.getElementById('status-text');
  if (mode) {
    dot.classList.remove('off');
    const card = document.querySelector(`[data-mode="${mode}"]`);
    const name = card ? card.querySelector('.mode-name').textContent : mode;
    text.textContent = name + ' active';
  } else {
    dot.classList.add('off');
    text.textContent = 'No mode active';
  }
}

async function setMode(mode) {
  currentMode = mode;

  // Save state
  await chrome.storage.local.set({
    ['mode_' + currentTab.id]: mode,
    ['intensity_' + currentTab.id]: currentIntensity
  });

  updateActiveCard(mode);
  updateStatus(mode);

  // Send to content script
  chrome.tabs.sendMessage(currentTab.id, {
    action: 'setMode',
    mode: mode,
    intensity: currentIntensity
  });
}

// Intensity slider
document.getElementById('intensity').addEventListener('input', (e) => {
  currentIntensity = parseInt(e.target.value);
  document.getElementById('intensity-val').textContent = currentIntensity;

  if (currentMode) {
    chrome.tabs.sendMessage(currentTab.id, {
      action: 'setMode',
      mode: currentMode,
      intensity: currentIntensity
    });
    chrome.storage.local.set({ ['intensity_' + currentTab?.id]: currentIntensity });
  }
});

init();

// Attach mode card clicks
document.querySelectorAll('.mode-card').forEach(card => {
  card.addEventListener('click', () => {
    setMode(card.dataset.mode);
  });
});
