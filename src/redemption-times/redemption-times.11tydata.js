import { operatorAnswer, faqJsonLd } from "../../scripts/monitor/answer-pages.mjs";

const latest = (...dates) => dates.filter(Boolean).map(date => new Date(date).toISOString().slice(0, 10)).sort().at(-1);

export const eleventyComputed = {
  current: data => data.benchmarks.operators.find(op => op.slug === data.operator?.slug),
  answer: data => data.operator ? operatorAnswer(data.benchmarks, data.operator.slug) : null,
  jsonld: data => {
    if (!data.operator) return data.jsonld;
    const { slug, name, verifiedAt } = data.operator;
    const url = `https://socialcasinoindex.com/redemption-times/${slug}/`;
    const answer = operatorAnswer(data.benchmarks, slug);
    return { "@context": "https://schema.org", "@graph": [
      { "@type": "Article", "@id": `${url}#article`, headline: `${name} Offers and Redemption Requirements`,
        description: answer.summary, datePublished: verifiedAt,
        dateModified: latest(verifiedAt, data.contentDates.operatorPages, data.benchmarks.generatedAt, "2026-09-21"),
        mainEntityOfPage: url, author: { "@id": "https://socialcasinoindex.com/#alex-rowan" },
        publisher: { "@id": "https://socialcasinoindex.com/#org" } },
      { "@type": "BreadcrumbList", itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: "https://socialcasinoindex.com/" },
        { "@type": "ListItem", position: 2, name: "Redemption times", item: "https://socialcasinoindex.com/redemption-times/" },
        { "@type": "ListItem", position: 3, name } ] },
      ...(answer.faqs.length ? [faqJsonLd(`${url}#faq`, answer.faqs)] : []),
    ] };
  },
};
