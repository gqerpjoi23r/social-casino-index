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
