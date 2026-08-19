// content/caption-processor.js - Pure functions for caption processing

if (typeof window === 'undefined') {
  global.window = {};
}
window.ImmerseTL = window.ImmerseTL || {};

(function (ITL) {
  function isNewDialogueCue(previousText, newText, lastCueTime, now) {
    if (!previousText || previousText.trim() === "") return true;
    
    // If it's been more than 1.5s since the last change, treat as new cue
    if (now - lastCueTime > 1500) return true;

    const prev = previousText.trim().toLowerCase();
    const next = newText.trim().toLowerCase();

    // Incremental streaming typing check: if new text is simply extending the old text
    if (next.startsWith(prev) && (next.length - prev.length) < 15) {
      return false; // incremental update, avoid re-triggering full pop animation
    }

    // Word similarity check for sentence continuity
    if (next.length > 5 && prev.length > 5) {
      const prevWords = prev.split(/\s+/);
      const nextWords = next.split(/\s+/);
      if (prevWords.length >= 2 && nextWords.length >= 2) {
        if (prevWords[0] === nextWords[0] && prevWords[1] === nextWords[1]) {
          return false;
        }
      }
    }

    return true;
  }

  function chunkCaptionText(text) {
    if (!text || !text.trim()) return "";
    
    // Smart sentence grouping (~25 words)
    let rawSentences = text.match(/[^.!?。！？]+[.!?。！？]*/g) || [text];
    let sentences = [];
    for (let i = 0; i < rawSentences.length; i++) {
      if (i === 0 || rawSentences[i].trim() !== rawSentences[i-1].trim()) {
        sentences.push(rawSentences[i]);
      }
    }
    
    let displayText = "";
    let wordCount = 0;
    
    for (let i = sentences.length - 1; i >= 0; i--) {
      let sentence = sentences[i];
      let sentenceWordCount = sentence.trim().split(/\s+/).length;
      if (wordCount + sentenceWordCount > 25 && displayText !== "") {
        break;
      }
      displayText = sentence + displayText;
      wordCount += sentenceWordCount;
    }
    
    displayText = displayText.trim();
    let finalWords = displayText.split(/\s+/);
    if (finalWords.length > 30) {
      displayText = finalWords.slice(-30).join(' ');
    }
    
    return displayText;
  }

  ITL.captionProcessor = {
    isNewDialogueCue: isNewDialogueCue,
    chunkCaptionText: chunkCaptionText
  };
  
  // Export for testing
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { isNewDialogueCue, chunkCaptionText };
  }
})(window.ImmerseTL);
