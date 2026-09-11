export function productionRun(manifest, env = process.env) {
  return env.GITHUB_REF === "refs/heads/main" && !env.ARCHIVE_RUN_ID &&
    manifest.scope === "production" && !manifest.reextractedFrom;
}

export function sameEvidence(record, candidate) {
  return record.sourceId === candidate.sourceId && Boolean(record.quote) &&
    record.quote === candidate.quote && record.recordType === candidate.recordType &&
    (record.field || record.kind) === (candidate.field || candidate.kind) &&
    JSON.stringify([...(record.conditions || [])].sort()) === JSON.stringify([...(candidate.conditions || [])].sort()) &&
    ["value", "upperValue", "unit", "scope", "timing", "priceUsd", "immediateSc", "goldCoins",
      "totalSc", "advertisedExtraPercent", "advertisedDiscountPercent", "extraPercentComparison",
      "intervalHours", "durationDays", "method", "stage", "comparison", "basis", "purchaseRequired",
      "promoCode", "summary"].every(key =>
      JSON.stringify(record[key] ?? null) === JSON.stringify(candidate[key] ?? null)) &&
    JSON.stringify([...(record.states || [])].sort()) === JSON.stringify([...(candidate.states || [])].sort());
}

export function publicNumeric(operators, reviewed, manifest, captures, previous = null, extracted = null, evaluation = null, blockedOperators = []) {
  return {
    schemaVersion: 1, runId: manifest.runId, lastAttemptedAt: manifest.startedAt,
    lastSuccessfulRefresh: manifest.completedAt, staleAfterHours: 36,
    operators: operators.map(operator => {
      const reference = reviewed.operators.find(row => row.slug === operator.slug);
      const sources = manifest.sources.filter(source => source.operatorId === operator.slug);
      const blocked = blockedOperators.includes(operator.slug);
      const successful = [...new Map(captures.filter(page => !blocked && page.operatorId === operator.slug && page.status === "ok")
        .map(page => [page.sourceId, page])).values()];
      const prior = previous?.operators?.find(row => row.slug === operator.slug);
      const current = blocked ? null : extracted?.operators?.find(row => row.slug === operator.slug);
      const candidates = ["offers", "facts", "statements"].flatMap(kind =>
        (current?.[kind] || []).map(record => ({ ...record, recordType: kind })));
      const records = (reference?.records || []).map(record => {
        const dependencies = record.supportingPages || [{ sourceId: record.sourceId, textHash: record.textHash }];
        const semanticChange = candidates.some(candidate => candidate.sourceId === record.sourceId &&
          candidate.recordType === record.recordType &&
          (candidate.id === record.originalId || candidate.id === record.id || candidate.quote === record.quote) &&
          !sameEvidence(record, candidate));
        const unchanged = !semanticChange && dependencies.length > 0 &&
          dependencies.every(dependency => Boolean(dependency.textHash) && successful.some(page =>
            page.sourceId === dependency.sourceId && page.textHash === dependency.textHash));
        const old = prior?.records?.find(row => row.id === record.id);
        const publicRecord = sanitizeRecord(record);
        return { ...publicRecord, runId: record.runId || reviewed.runId,
          reviewStatus: record.conflict ? "unresolved" : "reviewed",
          freshness: unchanged ? "reconfirmed" : "not_reconfirmed",
          lastConfirmedAt: unchanged ? successful.find(page => page.sourceId === record.sourceId)?.capturedAt :
            old?.lastConfirmedAt || record.capturedAt };
      });
      for (const candidate of candidates) {
        const kind = candidate.recordType;
        const saved = reference?.records?.find(record => sameEvidence(record, candidate));
        if (saved && records.some(record => record.id === saved.id && record.freshness === "reconfirmed")) continue;
        const fresh = Boolean(candidate.textHash) && successful.some(page => page.sourceId === candidate.sourceId &&
          page.textHash === candidate.textHash) && candidate.reconfirmationStatus !== "not_reconfirmed";
        const id = records.some(record => record.id === candidate.id) ? `${candidate.id}-automated-${manifest.runId}` : candidate.id;
        records.push({ ...sanitizeRecord(candidate), id, recordType: kind, runId: manifest.runId,
          reviewStatus: "automated_unreviewed", freshness: fresh ? "captured_unreviewed" : "not_reconfirmed",
          lastConfirmedAt: null, completePackage: false });
      }
      for (const old of prior?.records || []) {
        if (!records.some(record => record.id === old.id)) records.push({ ...old, freshness: "not_reconfirmed" });
      }
      return { slug: operator.slug, name: operator.name, productMode: operator.playerValue.productMode,
        attemptedPages: sources.length, readablePages: successful.length,
        lastAttempt: manifest.startedAt,
        lastSuccessfulCapture: successful.map(page => page.capturedAt).sort().at(-1) || prior?.lastSuccessfulCapture || null,
        collectionStatus: blocked ? "archive_corrupt" : !successful.length ? "unavailable" : successful.length < sources.length ? "partial" : "readable",
        extractionStatus: evaluation?.operators?.find(row => row.operator === operator.slug)?.modelStatus ||
          (current ? "available" : "unavailable"),
        changeStatus: !successful.length ? "evidence unavailable; not reconfirmed" :
          records.some(record => record.reviewStatus === "automated_unreviewed" && record.freshness === "captured_unreviewed")
          ? "automated claims published; review pending" : successful.some(page => !reference?.supportingPages?.some(saved =>
          saved.sourceId === page.sourceId && saved.textHash === page.textHash))
          ? "change awaiting review" : records.some(record => record.freshness !== "reconfirmed")
            ? "evidence unavailable; not reconfirmed" : "reviewed evidence unchanged",
        coverage: sources.map(source => ({ id: source.id, url: source.url, purpose: source.purpose,
          status: blocked ? "archive_corrupt" : source.status,
          capturedAt: successful.find(page => page.sourceId === source.id)?.capturedAt || null })),
        records, unknownValues: {
          firstPurchaseUsd: records.find(record => record.completePackage)?.priceUsd ?? null,
          firstPurchaseSc: records.find(record => record.completePackage)?.immediateSc ?? null,
        },
        unknowns: reference?.unknowns || ["No reviewed numeric values"],
        completePackages: records.filter(record => record.completePackage).map(record => record.id) };
    }),
  };
}

export function sanitizeRecord(record) {
  const privateKeys = new Set(["quote", "archiveKey", "captureId", "textHash", "supportingPages",
    "evidenceHash", "originalId", "overrides", "extractedAt"]);
  return Object.fromEntries(Object.entries(record).filter(([key]) => !privateKeys.has(key)));
}
