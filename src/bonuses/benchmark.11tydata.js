import { faqJsonLd, signupAnswers } from "../../scripts/monitor/answer-pages.mjs";

export const eleventyComputed = {
  jsonld: data => {
    const base = { "@context": "https://schema.org", "@type": "CollectionPage", name: data.benchmark.title,
      description: data.benchmark.explanation };
    if (data.benchmark.id !== "signup") return base;
    const url = `https://socialcasinoindex.com${data.benchmark.url}`;
    const answers = signupAnswers(data.benchmarks);
    return { "@context": "https://schema.org", "@graph": [
      { "@type": "CollectionPage", "@id": `${url}#collection`, name: data.benchmark.title,
        description: data.benchmark.explanation, url, dateModified: data.benchmarks.generatedAt },
      faqJsonLd(`${url}#faq`, answers.faqs),
    ] };
  },
};
