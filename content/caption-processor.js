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

        // Rolling caption check (YouTube Live rolling ASR window):
        // In live streams, words roll off from the left as new words are added on the right.
        // If the end of prevWords matches the beginning of nextWords (overlap >= 2 words),
        // it is a rolling continuation of the same dialogue, not a brand new cue.
        const cleanWord = w => w.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"'’]/g, '');
        const maxOverlap = Math.min(prevWords.length, nextWords.length, 6);
        for (let k = maxOverlap; k >= 2; k--) {
          const prevSlice = prevWords.slice(-k).map(cleanWord).filter(Boolean).join(' ');
          const nextSlice = nextWords.slice(0, k).map(cleanWord).filter(Boolean).join(' ');
          if (prevSlice && prevSlice === nextSlice) {
            return false;
          }
        }
      }

      // Character suffix-to-prefix check for non-spaced languages (e.g. Japanese, Chinese)
      const minCharOverlap = 4;
      const maxCharOverlap = Math.min(prev.length, next.length, 20);
      for (let c = maxCharOverlap; c >= minCharOverlap; c--) {
        if (prev.endsWith(next.slice(0, c))) {
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

  const AUDIO_TAG_REGEX = /\[\s*(?:music|applause|laughter|cheers|cheering|sigh|sighs|gasp|gasps|cough|coughs|groan|groans|snicker|snickers|silence|applause\s+and\s+cheers|laughter\s+and\s+applause|music\s+playing|upbeat\s+music|dramatic\s+music|instrumental\s+music)\s*\]|\(\s*(?:music|applause|laughter|cheers|cheering|sigh|sighs|gasp|gasps|cough|coughs|groan|groans|snicker|snickers|silence)\s*\)|[（［(\[]\s*(?:拍手|笑い|笑|音楽|歓声|ため息|せき|咳|沈黙|拍手と歓声)\s*[）］)\]]|[♪♫♬♩]+/gi;

  function filterAudioTags(text) {
    if (!text) return "";
    return text
      .replace(AUDIO_TAG_REGEX, '')
      .replace(/[\s\u3000]{2,}/g, ' ')
      .trim();
  }

  ITL.captionProcessor = {
    isNewDialogueCue: isNewDialogueCue,
    chunkCaptionText: chunkCaptionText,
    filterAudioTags: filterAudioTags
  };
  
  // Export for testing
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { isNewDialogueCue, chunkCaptionText, filterAudioTags };
  }
})(window.ImmerseTL);
