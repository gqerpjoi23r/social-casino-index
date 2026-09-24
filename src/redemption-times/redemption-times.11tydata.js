export const eleventyComputed = {
  current: data => data.benchmarks.operators.find(op => op.slug === data.operator?.slug),
};
