import { operatorAnswer, operatorRedemption, faqJsonLd } from "../../scripts/monitor/answer-pages.mjs";

const latest = (...dates) => dates.filter(Boolean).map(date => new Date(date).toISOString().slice(0, 10)).sort().at(-1);
const monthYear = value => new Date(value).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
const pageTitle = data => `${data.operator.name} Redemption Time, Minimum and Methods (${monthYear(data.benchmarks.generatedAt)})`;

export const eleventyComputed = {
  current: data => data.benchmarks.operators.find(op => op.slug === data.operator?.slug),
  answer: data => data.operator ? operatorAnswer(data.benchmarks, data.operator.slug) : null,
  redemption: data => data.operator ? operatorRedemption(data.benchmarks, data.operator.slug) : null,
  pageTitle: data => data.operator ? pageTitle(data) : null,
  jsonld: data => {
    if (!data.operator) return data.jsonld;
    const { slug, name, verifiedAt } = data.operator;
    const url = `https://socialcasinoindex.com/redemption-times/${slug}/`;
    const answer = operatorAnswer(data.benchmarks, slug);
    const faqs = [...answer.faqs, ...(operatorRedemption(data.benchmarks, slug)?.faqs || [])]
      .filter(faq => typeof faq?.question === "string");
    return { "@context": "https://schema.org", "@graph": [
      { "@type": "Article", "@id": `${url}#article`, headline: pageTitle(data),
        description: answer.summary, datePublished: verifiedAt,
        dateModified: latest(verifiedAt, data.contentDates.operatorPages, data.benchmarks.generatedAt, "2026-09-21"),
        mainEntityOfPage: url, author: { "@id": "https://socialcasinoindex.com/#alex-rowan" },
        publisher: { "@id": "https://socialcasinoindex.com/#org" } },
      { "@type": "BreadcrumbList", itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: "https://socialcasinoindex.com/" },
        { "@type": "ListItem", position: 2, name: "Redemption times", item: "https://socialcasinoindex.com/redemption-times/" },
        { "@type": "ListItem", position: 3, name } ] },
      ...(faqs.length ? [faqJsonLd(`${url}#faq`, faqs)] : []),
    ] };
  },
};
