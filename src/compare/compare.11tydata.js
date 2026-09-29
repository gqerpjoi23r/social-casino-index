import { pairAnswers, faqJsonLd } from "../../scripts/monitor/answer-pages.mjs";

export const eleventyComputed = {
  answers: data => data.comparison ? pairAnswers(data.benchmarks, data.comparison) : null,
  updatedAt: data => data.benchmarks?.generatedAt?.slice(0, 10) || "2026-09-29",
  jsonld: data => {
    if (!data.comparison) return null;
    const url = `https://socialcasinoindex.com${data.comparison.url}`;
    const answers = pairAnswers(data.benchmarks, data.comparison);
    return { "@context": "https://schema.org", "@graph": [
      { "@type": "Article", "@id": `${url}#article`, headline: `${data.comparison.title}: cash minimums, signup coins and purchase offers`,
        description: answers.summary, datePublished: "2026-09-21", dateModified: data.benchmarks.generatedAt,
        mainEntityOfPage: url, author: { "@id": "https://socialcasinoindex.com/#alex-rowan" },
        publisher: { "@id": "https://socialcasinoindex.com/#org" } },
      faqJsonLd(`${url}#faq`, answers.faqs),
    ] };
  },
};
