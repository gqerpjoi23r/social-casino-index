import { displayRecord } from "./display.js";
export default {
  eleventyComputed: {
    updatedAt: data => data.numeric?.lastSuccessfulRefresh || data.monitor.lastAttemptedAt || "2026-09-11",
    numericRows: data => (data.numeric?.operators || []).map(operator => ({
      ...operator, records: operator.records.map(displayRecord),
    })),
    refreshStale: data => !data.numeric?.lastSuccessfulRefresh ||
      Date.now() - Date.parse(data.numeric.lastSuccessfulRefresh) > 36 * 60 * 60 * 1000,
  },
};
