import { hash } from "./core.mjs";

export function baselineScope(env = process.env) {
  return env.GITHUB_REF === "refs/heads/main" ? "production" :
    `trial-${hash(env.GITHUB_REF || "local").slice(0, 16)}`;
}

export function baselineKey(env = process.env) {
  return `runs/baselines/${baselineScope(env)}/latest.json`;
}

export function usableRun(manifest, evaluation, replay) {
  return Boolean(manifest.completedAt && manifest.sources?.some(source => source.status === "ok") &&
    evaluation?.schemaValid && evaluation.modelErrors.length === 0 && evaluation.replayEvents === 0 &&
    replay?.unsupportedQuotes === 0 && replay.identicalReplayEvents === 0);
}

export function pagePurpose(source) {
  const id = source.id;
  if (/home$/.test(id)) return "homepage";
  if (/terms|rules|rollover/.test(id)) return "terms_or_rules";
  if (/redeem|bank|gift|redemption/.test(id)) return "redemption_help";
  if (/signup|welcome|promo|daily|packages/.test(id)) return "offer_or_rewards";
  return "support_or_availability";
}
