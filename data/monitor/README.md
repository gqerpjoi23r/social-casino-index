# Daily operator monitor

The daily GitHub Actions workflow collects the existing ten operators at 06:17 UTC.
Use `workflow_dispatch` for an additional run. Schedules can start late.

## Collection

- Direct HTTP/PDF first; Firecrawl fallback when access fails.
- Firecrawl uses the repository secret `FIRECRAWL_API_KEY`.
- Firecrawl requests `markdown`, `html`, `rawHtml` and `links` together, with
  `onlyMainContent: true` and `maxAge: 0`. A source-specific
  `sourceOptions[id].onlyMainContent: false` can retain surrounding content.
- At most 50 sources, 35 Firecrawl calls, 12 model calls and 40 minutes per run.
- The configured dollar allowances are provisional reservations, not billing guarantees.
- No accounts, purchases, review scraping, or eligibility circumvention.
- Numeric extraction uses `gpt-5.6-terra` through the configured Azure endpoint.
  GitHub Actions makes the call; Lambda is not required. Bright Data remains disabled.

## Source selection

The source registry is `src/_data/operators.json`; URL overrides are in
`data/monitor/config.json`. Each run checks only those configured URLs, not a
complete site crawl. Captured links support later manual discovery. There is no
guarantee that a public page contains the latest, personalized or account-only offer.
The manifest records requested and final URLs, provider, status and capture time.
A capture date is not an offer start date or a verified page-update date.

## Outputs

- `/updates/`: source passages, source availability and dated changes.
- `/updates/data.json`: the same observations as structured data.
- `data/monitor/runs/`: dated run records and before/after evidence.
- Private S3: `s3://socialcasinoindex-monitor-349131272959/runs/<run-id>/`.
  Captures, HTML/Markdown, model inputs/outputs, numeric records and evaluations
  stay out of the public repository and public Actions artifacts.
- `results.md`: readable per-operator values, exact evidence, all URLs, missing
  categories and rejected records.
- `runs/latest.json`: pointer to completed observation and usable numeric baselines.
- Bucket: `eu-north-1`, public access blocked, encryption, versioning and TLS-only
  policy. GitHub assumes a repository/branch-scoped OIDC role. The model key
  comes from SSM `/socialcasinoindex/monitor/model-key`, not a committed secret.

## Numeric schema

Schema version `2.0.0` is defined in `scripts/monitor/schema.mjs`.

- Offers: kind, USD price, immediate SC, total SC, GC, advertised extra percentage,
  duration, interval, purchase requirement, promo code and conditions.
- Numeric policies: redemption minimum/cap/time, playthrough and minimum age,
  with value/range, unit, comparison, method, timing stage, states and scope text.
- Statements: verification, restrictions, closure clauses and other terms that
  cannot safely be reduced to a number.
- Every accepted record carries its exact quote, source URL, capture timestamp,
  archive key/hash, extractor version and `reviewStatus: unreviewed`.
- Unknown amounts are `null`, not zero. Conflicting sources remain separate.
  Ratios are computed only for fully specified immediate purchase packages.
  They are not guaranteed cash values or measured returns.
- Deterministic candidates and model output both pass schema and evidence checks.
  Rejected records are retained. Grounding is not semantic accuracy.

## Safety boundaries

The monitor does not overwrite reviewed operator facts. A passage is evidence
for review, not a verified payout claim. A missing passage is not zero, and a
failed fetch does not remove prior observations. First observations create a
baseline; subsequent differences are source-wording changes, not new offers.
Do not compare entertainment-only coins with redeemable rewards.

## Evaluation

Run `npm run monitor:test` and `npm run release`.
After restoring a run from private S3:

```sh
aws sts get-caller-identity
aws s3 cp s3://socialcasinoindex-monitor-349131272959/runs/<run-id>/ .monitor/<run-id>/ --recursive --region eu-north-1
node scripts/monitor/evaluate.mjs /absolute/path/to/captures
MONITOR_CACHE_ONLY=true MONITOR_USE_MODEL=true MONITOR_MODEL=gpt-5.6-terra \
  npm run monitor:numeric -- .monitor/<run-id>
npm run monitor:report -- .monitor/<run-id>
```

Cache-only mode requires matching stored model inputs and makes no scrape or model
requests. A cache miss fails evaluation. To test a revised prompt or model against
saved captures, disable cache-only mode and supply the model endpoint and key;
only the model call consumes new service usage. Do not set `MONITOR_BUCKET` for
an exploratory replay unless you intend to update the archived run.

Checks validate verbatim evidence, numeric grounding and identical replay.
Human review must still assess relevance, qualifiers and missing facts.
Same-day repeats do not establish multi-day reliability.

## Publication

The main-branch workflow validates the site before committing data and generated
`docs/`. It then explicitly deploys a Pages artifact, because the automatic
data commit uses the workflow token. Branch runs do not commit or deploy.
Concurrent main changes cause the push to fail rather than overwrite work.
Numeric results remain staged in S3; this workflow does not overwrite reviewed
operator facts or publish a purchase-value benchmark.
