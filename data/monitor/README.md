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

## Publication

The main-branch workflow validates the site before committing data and generated
`docs/`. It then explicitly deploys a Pages artifact, because the automatic
data commit uses the workflow token. Branch runs do not commit or deploy.
Concurrent main changes cause the push to fail rather than overwrite work.
