# Daily operator monitor

The daily GitHub Actions workflow collects the existing ten operators at 06:17 UTC.
Use `workflow_dispatch` for an additional run. Schedules can start late.

## Collection

- Direct HTTP/PDF first; Firecrawl fallback when access fails.
- Firecrawl uses the repository secret `FIRECRAWL_API_KEY`.
- At most 50 sources, 35 Firecrawl calls, and 40 minutes per run.
- The configured dollar allowances are provisional reservations, not billing guarantees.
- No accounts, purchases, review scraping, or eligibility circumvention.
- Bright Data and model adapters are not enabled in the workflow.

## Outputs

- `/updates/`: source passages, source availability and dated changes.
- `/updates/data.json`: the same observations as structured data.
- `data/monitor/runs/`: dated run records and before/after evidence.
- Actions artifacts: source captures, extracted text and evaluation summary, retained 14 days.
- Artifacts follow repository visibility. This is a public repository; do not collect private data.

## Safety boundaries

The monitor does not overwrite reviewed operator facts. A passage is evidence
for review, not a verified payout claim. A missing passage is not zero, and a
failed fetch does not remove prior observations. First observations create a
baseline; subsequent differences are source-wording changes, not new offers.
Do not compare entertainment-only coins with redeemable rewards.

## Evaluation

Run `npm run monitor:test` and `npm run release`.
After downloading a run's capture artifact and fetching its data commit:

```sh
node scripts/monitor/evaluate.mjs /absolute/path/to/captures
```

This checks verbatim evidence against captures and replays an identical
observation. Human review must still assess relevance, qualifiers and missing
facts. Same-day repeats do not establish multi-day reliability.

### Frozen extraction benchmark

`npm run monitor:benchmark` scores 12 manually labelled excerpts across the ten
operators. This uses saved evidence only: no requests, credentials or paid calls.
The separate `Offline extraction benchmark` Actions workflow runs the same checks
and uploads its report. A successful job means the evaluation ran, not that every
extraction passed.

The initial baseline is in `data/monitor/benchmark/baseline/results.md`.
It passes 9/12 cases, with two incorrect topic assignments and one missed topic.
This intentionally selected diagnostic set is not production precision/recall.
The daily publication workflow and extractor are unchanged.

To verify excerpt containment and source hashes against the original captures:

```sh
npm run monitor:benchmark -- --captures /absolute/path/to/captures
```

Outputs include `inputs.json` with no expected answers, plus `results.json` and
`results.md`. A model comparison can use the same inputs and return a JSON object
keyed by case ID, with all eight topic keys and quote arrays for each case.
Score saved responses without making a model call:

```sh
npm run monitor:benchmark -- --responses /absolute/path/to/responses.json --out .monitor/model-benchmark
```

Malformed/missing responses fail rather than silently falling back to deterministic
extraction. Unsupported quotes are counted before any evidence filtering.
Qualifiers are string-presence checks, not a test of logical interpretation.

The live model comparison has not run: Azure token validation returned
`AADSTS700082` (expired refresh token). Restore approved authentication before
any cloud calls. Do not enable model publication based on this benchmark alone.
After comparison, review full saved pages for missed facts and require no
unsupported quotations or critical lost conditions on the labelled cases.
Reserve new, unseen cases for validation after tuning either extractor.

## Publication

The main-branch workflow validates the site before committing data and generated
`docs/`. It then explicitly deploys a Pages artifact, because the automatic
data commit uses the workflow token. Branch runs do not commit or deploy.
Concurrent main changes cause the push to fail rather than overwrite work.
