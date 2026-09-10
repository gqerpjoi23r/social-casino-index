export default {
  eleventyComputed: {
    updatedAt: data => data.monitor.lastAttemptedAt || "2026-09-10",
  },
};
