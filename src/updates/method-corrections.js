import { createHash } from "node:crypto";

// The 2.2.0 schema omitted "cash". These exact public records are supported by
// the saved operator pages; never reinterpret new or changed ambiguous records.
const cashRecords = new Set([
  "61bcf4d15d0f027298d3a548b0021bccbb14b78dad4d40cd775dd41231416864",
  "7a5a4b2c1784069b2aa4ec1fc275d2c144b2adb766f67e062fc26bd9cf09f324",
  "125e113eb97c9b1f6c8c975ccb7c21d61bfd9cc62cd81202db6e93884d0a6a52",
  "36fdeb5c474552c8a2ddb2e7e3a1c959eec6c2686a0b55e3a8b45b02367439c5",
]);

export function comparisonRecord(record) {
  const fingerprint = createHash("sha256").update(JSON.stringify(record)).digest("hex");
  if (!cashRecords.has(fingerprint)) return record;
  return {
    ...record,
    method: "cash",
    methodCorrection: `Cash method corrected from "${record.method}" for this saved record. The linked operator source explicitly identifies cash prizes. Original extraction metadata is preserved below.`,
  };
}
