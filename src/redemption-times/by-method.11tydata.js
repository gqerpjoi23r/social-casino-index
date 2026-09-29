import { methodTimings, faqJsonLd } from "../../scripts/monitor/answer-pages.mjs";

export const eleventyComputed = {
  jsonld: data => {
    const timings = methodTimings(data.benchmarks);
    const url = "https://socialcasinoindex.com/redemption-times/by-method/";
    return { "@context": "https://schema.org", "@graph": [
      { "@type": "Article", "@id": `${url}#article`, headline: data.title, description: timings.summary,
        datePublished: data.publishedAt, dateModified: data.updatedAt, mainEntityOfPage: url,
        author: { "@id": "https://socialcasinoindex.com/#alex-rowan" }, publisher: { "@id": "https://socialcasinoindex.com/#org" } },
      faqJsonLd(`${url}#faq`, [{ question: "Which sweepstakes casino payment method is fastest?",
        answer: "Social Casino Index does not name a fastest method yet. Published windows cover different stages, and funded tests are still needed for a measured comparison." }]),
    ] };
  },
};
