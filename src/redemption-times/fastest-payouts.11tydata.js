import { methodTimings, faqJsonLd } from "../../scripts/monitor/answer-pages.mjs";

const faqs = timings => [
  { question: "What is the fastest payout sweepstakes casino?", answer: "Social Casino Index does not name a single fastest casino yet. The shortest published windows cover different stages, and funded tests are still needed for measured payout speed." },
  { question: "Which sweepstakes casinos publish 24-hour payout windows?", answer: timings.shortestSummary },
  { question: "Are instant sweepstakes casino payouts guaranteed?", answer: "No. Identity checks, operator review and payment delivery can each add time, so a published window is not a guaranteed instant payout." },
];

export const eleventyComputed = {
  updatedAt: data => data.benchmarks?.generatedAt?.slice(0, 10) || data.publishedAt,
  jsonld: data => {
    const timings = methodTimings(data.benchmarks);
    const url = "https://socialcasinoindex.com/redemption-times/fastest-sweepstakes-casino-payouts/";
    return { "@context": "https://schema.org", "@graph": [
      { "@type": "Article", "@id": `${url}#article`, headline: data.title, description: timings.summary,
        datePublished: data.publishedAt, dateModified: data.benchmarks.generatedAt, mainEntityOfPage: url,
        author: { "@id": "https://socialcasinoindex.com/#alex-rowan" }, publisher: { "@id": "https://socialcasinoindex.com/#org" } },
      faqJsonLd(`${url}#faq`, faqs(timings)),
    ] };
  },
};
