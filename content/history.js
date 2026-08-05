// content/history.js - Subtitle transcript history log management

window.ImmerseTL = window.ImmerseTL || {};

(function (ITL) {
  let subtitleHistory = [];
  const MAX_HISTORY = 25;
  let historyOverlay = null;
  let historyContent = null;
  let isHistoryMinimized = false;

  function ensureHistoryOverlay(targetContainer) {
    let container = targetContainer || document.querySelector('.html5-video-player') || document.querySelector('#movie_player');
    if (!container) return null;

    let existing = document.getElementById('yt-smart-translate-history');
    if (existing) {
      historyOverlay = existing;
      historyContent = document.getElementById('yt-history-content');
      return historyOverlay;
    }

    return createHistoryOverlay(container);
  }

  function createHistoryOverlay(container) {
    let existing = document.getElementById('yt-smart-translate-history');
    if (existing) {
      historyOverlay = existing;
      historyContent = document.getElementById('yt-history-content');
      return historyOverlay;
    }

    historyOverlay = document.createElement('div');
    historyOverlay.id = 'yt-smart-translate-history';
    historyOverlay.style.display = (ITL.settings && ITL.settings.showHistory) ? 'flex' : 'none';
    historyOverlay.style.setProperty('--drag-x', (ITL.settings ? ITL.settings.historyDragX : 0) + 'px');
    historyOverlay.style.setProperty('--drag-y', (ITL.settings ? ITL.settings.historyDragY : 0) + 'px');

    // Header Container
    const headerContainer = document.createElement('div');
    headerContainer.className = 'yt-history-header-container';

    // Left side: Icon & Title
    const headerLeft = document.createElement('div');
    headerLeft.style.display = 'flex';
    headerLeft.style.alignItems = 'center';
    headerLeft.style.gap = '6px';

    const headerIcon = document.createElement('span');
    headerIcon.textContent = '📜';
    headerIcon.style.fontSize = '12px';

    const headerTitle = document.createElement('div');
    headerTitle.className = 'yt-history-header-title';
    let logTitle = "SUBTITLE HISTORY";
    try { logTitle = chrome.i18n.getMessage("logTitle") || logTitle; } catch(e) {}
    headerTitle.textContent = logTitle;

    headerLeft.appendChild(headerIcon);
    headerLeft.appendChild(headerTitle);

    // Right side: Action Buttons
    const headerActions = document.createElement('div');
    headerActions.style.display = 'flex';
    headerActions.style.alignItems = 'center';
    headerActions.style.gap = '4px';

    // Clear Button
    const clearBtn = document.createElement('button');
    clearBtn.className = 'yt-history-btn yt-history-clear-btn';
    clearBtn.textContent = '🗑️';
    clearBtn.title = "Clear History";
    clearBtn.onclick = (e) => {
      e.stopPropagation();
      subtitleHistory = [];
      renderHistory();
    };

    // Minimize/Expand Button
    const minBtn = document.createElement('button');
    minBtn.className = 'yt-history-btn yt-history-min-btn';
    minBtn.textContent = isHistoryMinimized ? '+' : '−';
    minBtn.title = isHistoryMinimized ? "Expand" : "Minimize";
    minBtn.onclick = (e) => {
      e.stopPropagation();
      isHistoryMinimized = !isHistoryMinimized;
      if (isHistoryMinimized) {
        historyOverlay.classList.add('minimized');
        minBtn.textContent = '+';
        minBtn.title = "Expand";
      } else {
        historyOverlay.classList.remove('minimized');
        minBtn.textContent = '−';
        minBtn.title = "Minimize";
        if (historyContent) historyContent.scrollTop = historyContent.scrollHeight;
      }
    };

    // Close Button (X)
    const closeBtn = document.createElement('button');
    closeBtn.className = 'yt-history-btn yt-history-close-btn';
    closeBtn.innerHTML = '&times;';
    closeBtn.title = "Tutup (Close)";
    closeBtn.onclick = (e) => {
      e.stopPropagation();
      if (ITL.settings) ITL.settings.showHistory = false;
      if (historyOverlay) historyOverlay.style.display = 'none';
      try {
        chrome.storage.local.set({ showHistory: false });
      } catch (err) {}
    };

    headerActions.appendChild(clearBtn);
    headerActions.appendChild(minBtn);
    headerActions.appendChild(closeBtn);

    headerContainer.appendChild(headerLeft);
    headerContainer.appendChild(headerActions);
    historyOverlay.appendChild(headerContainer);

    // Content Container
    historyContent = document.createElement('div');
    historyContent.id = 'yt-history-content';
    historyOverlay.appendChild(historyContent);

    container.appendChild(historyOverlay);
    if (ITL.makeDraggable) {
      ITL.makeDraggable(historyOverlay, headerContainer, 'historyDragX', 'historyDragY');
    }

    renderHistory();
    return historyOverlay;
  }

  function updateHistory(text, transData = null) {
    if (!text || !text.trim()) return;
    const trimmed = text.trim();

    const entry = {
      raw: trimmed,
      romaji: transData?.romaji || null,
      translation: transData?.translation || null
    };

    if (subtitleHistory.length === 0) {
      subtitleHistory.push(entry);
    } else {
      let lastIndex = subtitleHistory.length - 1;
      let lastEntry = subtitleHistory[lastIndex];

      // Check if new caption is continuation of previous caption
      if (trimmed.startsWith(lastEntry.raw) || trimmed.includes(lastEntry.raw)) {
        subtitleHistory[lastIndex] = entry;
      } else if (lastEntry.raw.startsWith(trimmed) || lastEntry.raw.includes(trimmed)) {
        // YouTube live subtitle fluctuation/partial edit
        if (entry.translation) {
          subtitleHistory[lastIndex] = entry;
        }
      } else {
        // Distinct new sentence
        subtitleHistory.push(entry);
        if (subtitleHistory.length > MAX_HISTORY) {
          subtitleHistory.shift();
        }
      }
    }

    renderHistory();
  }

  function renderHistory() {
    ensureHistoryOverlay();
    if (!historyOverlay || !historyContent) return;

    const distanceFromBottom = historyContent.scrollHeight - historyContent.scrollTop - historyContent.clientHeight;
    const isAtBottom = distanceFromBottom < 35;

    historyContent.innerHTML = '';

    if (subtitleHistory.length === 0) {
      const emptyDiv = document.createElement('div');
      emptyDiv.className = 'yt-history-empty';
      let emptyMsg = "Menunggu subtitle video...";
      try { emptyMsg = chrome.i18n.getMessage("logEmpty") || emptyMsg; } catch(e) {}
      emptyDiv.textContent = emptyMsg;
      historyContent.appendChild(emptyDiv);
      return;
    }

    const highlightFn = (ITL.translator && ITL.translator.highlightSafeText) ? ITL.translator.highlightSafeText : (t => t);

    subtitleHistory.forEach((item, index) => {
      const p = document.createElement('div');
      p.className = 'yt-history-line' + (index === subtitleHistory.length - 1 ? ' latest' : '');

      if (item.translation) {
        const romajiHtml = item.romaji ? `<div class="yt-history-romaji">${highlightFn(item.romaji)}</div>` : '';
        p.innerHTML = `${romajiHtml}<div class="yt-history-trans">${highlightFn(item.translation)}</div>`;
      } else {
        p.innerHTML = highlightFn(item.raw);
      }

      historyContent.appendChild(p);
    });

    if (!isHistoryMinimized && isAtBottom) {
      historyContent.scrollTop = historyContent.scrollHeight;
    }
  }

  function clearHistory() {
    subtitleHistory = [];
    if (historyContent) historyContent.innerHTML = '';
  }

  ITL.history = {
    ensureOverlay: ensureHistoryOverlay,
    createOverlay: createHistoryOverlay,
    update: updateHistory,
    render: renderHistory,
    clear: clearHistory,
    get overlay() { return historyOverlay; },
    get content() { return historyContent; },
    get list() { return subtitleHistory; }
  };
})(window.ImmerseTL);
