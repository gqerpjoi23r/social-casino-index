const small = Object.fromEntries("zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen".split(" ").map((word, value) => [word, value]));
const tens = { twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 };
const scales = { thousand: 1000, million: 1000000, billion: 1000000000 };
const words = [...Object.keys(small), ...Object.keys(tens), ...Object.keys(scales), "hundred"];
const phrase = new RegExp(`\\b(?:${words.join("|")})(?:(?:[ -]+|\\s+and\\s+)(?:${words.join("|")}))*\\b`, "gi");

// Normalize number words for grounding only. Never change the stored source quote.
export function evidenceNumbers(text) {
  const normalized = String(text).replace(/(\d),(?=\d)/g, "$1")
    .replace(/\bonce\b|\bone time\b/gi, "1").replace(/\btwice\b/gi, "2")
    .replace(phrase, match => {
      let total = 0, group = 0, previous = null, lastScale = Infinity;
      for (const word of match.toLowerCase().split(/[ -]+/)) {
        if (word === "and") continue;
        if (word === "hundred") {
          if (!group || group > 9 || previous === "hundred") return match;
          group *= 100;
        } else if (scales[word]) {
          if (!group || scales[word] >= lastScale) return match;
          total += group * scales[word]; group = 0; lastScale = scales[word];
        } else {
          if (previous && (small[previous] !== undefined ||
            tens[previous] && !(small[word] > 0 && small[word] < 10))) return match;
          group += small[word] ?? tens[word];
        }
        previous = word;
      }
      return String(total + group);
    });
  const values = [...normalized.matchAll(/\d+(?:\.\d+)?/g)].map(match => Number(match[0]));
  for (const match of String(text).matchAll(/(\d+(?:\.\d+)?)\s*(million|thousand|m|k)\b/gi))
    values.push(Number(match[1]) * (/^(million|m)$/i.test(match[2]) ? 1000000 : 1000));
  return values;
}
