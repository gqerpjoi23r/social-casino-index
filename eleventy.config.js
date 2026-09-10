import { readFileSync } from "node:fs";

export default function (eleventyConfig) {
  // Passthrough: files served as-is from the docs/ output.
  eleventyConfig.addPassthroughCopy({ "src/assets": "assets" });
  eleventyConfig.addPassthroughCopy({ "CNAME": "CNAME" });
  eleventyConfig.addPassthroughCopy({ "src/robots.txt": "robots.txt" });

  eleventyConfig.addFilter("isoDate", (value) => {
    if (!value) return "";
    return new Date(value).toISOString().slice(0, 10);
  });

  eleventyConfig.addFilter("readableDate", (value) => {
    if (!value) return "";
    return new Date(value).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "UTC",
    });
  });

  eleventyConfig.addFilter("json", (value) => JSON.stringify(value, null, 2));

  eleventyConfig.addFilter("limit", (items = [], n = 3) =>
    [...items].slice(0, n),
  );

  eleventyConfig.addFilter("sortByDateDesc", (items = []) =>
    [...items].sort((a, b) => {
      const aDate = a.data?.publishedAt || a.date || 0;
      const bDate = b.data?.publishedAt || b.date || 0;
      const dateOrder = new Date(bDate) - new Date(aDate);
      return dateOrder || (a.url || "").localeCompare(b.url || "");
    }),
  );

  eleventyConfig.addFilter("sortByUrl", (items = []) =>
    [...items].sort((a, b) => (a.url || "").localeCompare(b.url || "")),
  );

  // Collections for paginated data files: the sitemap template iterates
  // collections.all, but paginated templates produce one page item per
  // record, so these exist for navigation/linking convenience.
  eleventyConfig.addCollection("statePages", (collectionApi) =>
    collectionApi.getFilteredByTag("statePages"),
  );

  // Data collection of closed states (statute/enforcement) that have a page slug.
  // Used by the paginated state template so only states with a slug get a page.
  eleventyConfig.addCollection("closedStates", () => {
    const states = JSON.parse(
      readFileSync(new URL("./src/_data/states.json", import.meta.url), "utf8"),
    );
    return states.filter(
      (s) => (s.status === "statute" || s.status === "enforcement") && s.slug,
    );
  });

  const loadStates = () =>
    JSON.parse(readFileSync(new URL("./src/_data/states.json", import.meta.url), "utf8"));
  eleventyConfig.addCollection("statuteStates", () =>
    loadStates().filter((s) => s.status === "statute" && s.slug),
  );
  eleventyConfig.addCollection("enforcementStates", () =>
    loadStates().filter((s) => s.status === "enforcement" && s.slug),
  );

  const loadOperators = () =>
    JSON.parse(readFileSync(new URL("./src/_data/operators.json", import.meta.url), "utf8"));
  eleventyConfig.addCollection("comparisonOperators", () =>
    loadOperators().filter((op) => op.playerValue.productMode !== "entertainment_only")
      .sort((a, b) => a.name.localeCompare(b.name)),
  );
  eleventyConfig.addCollection("entertainmentOperators", () =>
    loadOperators().filter((op) => op.playerValue.productMode === "entertainment_only"),
  );

  return {
    dir: {
      input: "src",
      output: "docs",
      includes: "_includes",
      data: "_data",
    },
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
    templateFormats: ["html", "md", "njk"],
  };
}
