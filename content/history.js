// content/history.js - Subtitle transcript history log management

window.ImmerseTL = window.ImmerseTL || {};

(function (ITL) {
  let subtitleHistory = [];
  const MAX_HISTORY = 3000;
  let historyOverlay = null;
  let historyContent = null;
  let isHistoryMinimized = false;

  function getTargetContainer() {
    const isFree = ITL.settings ? (ITL.settings.isFreeFloating === true) : false;
    return isFree ? document.body : (document.querySelector('.html5-video-player') || document.querySelector('#movie_player') || document.body);
  }

  function updatePositioningMode() {
    if (historyOverlay) {
      const container = getTargetContainer();
      if (historyOverlay.parentElement !== container) {
        container.appendChild(historyOverlay);
      }
      const isFree = ITL.settings ? (ITL.settings.isFreeFloating === true) : false;
      historyOverlay.style.position = isFree ? 'fixed' : 'absolute';
    }
  }

  function ensureHistoryOverlay(targetContainer) {
    let container = targetContainer || getTargetContainer();
    if (!container) return null;

    let existing = document.getElementById('yt-smart-translate-history');
    if (existing) {
      historyOverlay = existing;
      historyContent = document.getElementById('yt-history-content');
      
      if (historyOverlay.parentElement !== container) {
         container.appendChild(historyOverlay);
      }

      updatePositioningMode();
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
    
    updatePositioningMode();

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
    let clearTitle = "Clear History";
    try { clearTitle = chrome.i18n.getMessage("btnHistoryClear") || clearTitle; } catch(e) {}
    clearBtn.title = clearTitle;
    clearBtn.onclick = (e) => {
      e.stopPropagation();
      subtitleHistory = [];
      renderHistory();
    };

    // Export Button
    const exportBtn = document.createElement('button');
    exportBtn.className = 'yt-history-btn yt-history-export-btn';
    exportBtn.textContent = '💾';
    exportBtn.title = 'Export History to JSON';
    exportBtn.onclick = (e) => {
      e.stopPropagation();
      if (subtitleHistory.length === 0) return;
      const blob = new Blob([JSON.stringify(subtitleHistory, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ImmerseTL_History_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    };

    // Minimize/Expand Button
    const minBtn = document.createElement('button');
    minBtn.className = 'yt-history-btn yt-history-min-btn';
    minBtn.textContent = isHistoryMinimized ? '+' : '−';
    let minTitle = "Minimize";
    let expTitle = "Expand";
    try { 
      minTitle = chrome.i18n.getMessage("btnHistoryMin") || minTitle; 
      expTitle = chrome.i18n.getMessage("btnHistoryExp") || expTitle;
    } catch(e) {}
    
    minBtn.title = isHistoryMinimized ? expTitle : minTitle;
    minBtn.onclick = (e) => {
      e.stopPropagation();
      isHistoryMinimized = !isHistoryMinimized;
      if (isHistoryMinimized) {
        historyOverlay.classList.add('minimized');
        minBtn.textContent = '+';
        minBtn.title = expTitle;
      } else {
        historyOverlay.classList.remove('minimized');
        minBtn.textContent = '−';
        minBtn.title = minTitle;
        if (historyContent) historyContent.scrollTop = historyContent.scrollHeight;
      }
    };

    // Close Button (X)
    const closeBtn = document.createElement('button');
    closeBtn.className = 'yt-history-btn yt-history-close-btn';
    closeBtn.innerHTML = '&times;';
    let closeTitle = "Tutup (Close)";
    try { closeTitle = chrome.i18n.getMessage("btnHistoryClose") || closeTitle; } catch(e) {}
    closeBtn.title = closeTitle;
    closeBtn.onclick = (e) => {
      e.stopPropagation();
      if (ITL.settings) ITL.settings.showHistory = false;
      if (historyOverlay) historyOverlay.style.display = 'none';
      try {
        chrome.storage.local.set({ showHistory: false });
      } catch (err) {}
    };

    headerActions.appendChild(exportBtn);
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

      if (trimmed.startsWith(lastEntry.raw) || trimmed.includes(lastEntry.raw)) {
        subtitleHistory[lastIndex] = entry;
      } else if (lastEntry.raw.startsWith(trimmed) || lastEntry.raw.includes(trimmed)) {
        if (entry.translation) {
          subtitleHistory[lastIndex] = entry;
        }
      } else {
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

    const emptyDiv = historyContent.querySelector('.yt-history-empty');
    if (emptyDiv) emptyDiv.remove();

    if (subtitleHistory.length === 0) {
      historyContent.innerHTML = '';
      const emptyDivNew = document.createElement('div');
      emptyDivNew.className = 'yt-history-empty';
      let emptyMsg = "Menunggu subtitle video...";
      try { emptyMsg = chrome.i18n.getMessage("logEmpty") || emptyMsg; } catch(e) {}
      emptyDivNew.textContent = emptyMsg;
      historyContent.appendChild(emptyDivNew);
      return;
    }

    const highlightFn = (ITL.translator && ITL.translator.highlightSafeText) ? ITL.translator.highlightSafeText : (t => t);

    // Sync DOM node count with history array length (handle shifts)
    while (historyContent.children.length > subtitleHistory.length) {
      historyContent.removeChild(historyContent.firstChild);
    }

    for (let i = 0; i < subtitleHistory.length; i++) {
      const item = subtitleHistory[i];
      let child = historyContent.children[i];
      
      let htmlContent = '';
      if (item.translation) {
        const romajiHtml = item.romaji ? `<div class="yt-history-romaji">${highlightFn(item.romaji)}</div>` : '';
        htmlContent = `${romajiHtml}<div class="yt-history-trans">${highlightFn(item.translation)}</div>`;
      } else {
        htmlContent = highlightFn(item.raw);
      }

      if (!child) {
        child = document.createElement('div');
        historyContent.appendChild(child);
      }
      
      child.className = 'yt-history-line' + (i === subtitleHistory.length - 1 ? ' latest' : '');
      
      // Only update DOM if content actually changed to save CPU cycles
      if (child.dataset.cachedHtml !== htmlContent) {
        child.innerHTML = htmlContent;
        child.dataset.cachedHtml = htmlContent;
      }
    }

    if (!isHistoryMinimized && isAtBottom) {
      historyContent.scrollTop = historyContent.scrollHeight;
    }
  }

  function clearHistory() {
    subtitleHistory = [];
    let existingOverlay = document.getElementById('yt-smart-translate-history');
    if (existingOverlay) {
      existingOverlay.remove();
    }
    historyOverlay = null;
    historyContent = null;
  }

  ITL.history = {
    ensureOverlay: ensureHistoryOverlay,
    updatePositioningMode: updatePositioningMode,
    update: updateHistory,
    render: renderHistory,
    clear: clearHistory,
    get overlay() { return historyOverlay; },
    get content() { return historyContent; },
    get list() { return subtitleHistory; }
  };
})(window.ImmerseTL);
