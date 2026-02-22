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
  if (mode === currentMode) mode = null;
  currentMode = mode;

  await chrome.storage.local.set({
    ['mode_' + currentTab.id]: mode,
    ['intensity_' + currentTab.id]: currentIntensity
  });

  updateActiveCard(mode);
  updateStatus(mode);

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

// Sync popup UI if toolbar on page changes the mode
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === 'syncMode') {
    currentMode = msg.mode;
    updateActiveCard(msg.mode);
    updateStatus(msg.mode);
  }
});

// Attach mode card clicks
document.querySelectorAll('.mode-card').forEach(card => {
  card.addEventListener('click', () => setMode(card.dataset.mode));
});

document.getElementById('off-btn').addEventListener('click', () => setMode(null));

init();

