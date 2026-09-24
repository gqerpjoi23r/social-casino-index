// Normalize only explicitly daily claim timing, never first-ever reward wording.
export function dailyQualifierText(text) {
  return text.split(/(?<=[.!?])\s+/).map(sentence => {
    const qualified = sentence.replace(
      /\bfirst (?:log[- ]?in|claim)(?: of| on)? (?:each|every) day\b/gi, "daily claim");
    return /\b(?:once per|each|every) day\b/i.test(sentence) ?
      qualified.replace(/\bfirst daily (?:log[- ]?in|claim)\b(?!\s+only\b)/gi, "daily claim") : qualified;
  }).join(" ");
}
