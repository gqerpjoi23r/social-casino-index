import { lowRedemption, faqJsonLd } from "../../scripts/monitor/answer-pages.mjs";

export const eleventyComputed = {
  jsonld: data => {
    const low = lowRedemption(data.benchmarks);
    const url = "https://socialcasinoindex.com/bonuses/sweepstakes-casinos-under-50-sc-redemption/";
    return { "@context": "https://schema.org", "@graph": [
      { "@type": "Article", "@id": `${url}#article`, headline: data.title, description: low.summary,
        datePublished: data.publishedAt, dateModified: data.updatedAt, mainEntityOfPage: url,
        author: { "@id": "https://socialcasinoindex.com/#alex-rowan" }, publisher: { "@id": "https://socialcasinoindex.com/#org" } },
      faqJsonLd(`${url}#faq`, [
        { question: "Can I redeem less than 50 SC for cash?", answer: low.cashText },
        { question: "Can I redeem less than 50 SC for a gift card?", answer: low.giftText },
      ]),
    ] };
  },
};
