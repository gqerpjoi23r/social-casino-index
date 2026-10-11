# Bing and IndexNow

The homepage includes the ownership tag supplied by the signed-in Bing Webmaster
Tools account. Keep it in place after verification. Submit `/sitemap.xml` in
Bing Webmaster Tools after ownership verification completes.

IndexNow uses a public ownership token in `src/_data/indexnow.json`. Eleventy
publishes its plain-text key file at the domain root. This is not a secret
credential and does not grant access to Bing Webmaster Tools or GSC Wizard.

The `IndexNow` GitHub workflow runs after successful production CI and operator
monitor runs. It can also be dispatched manually. It reads the committed sitemap
and public HTML pages, compares content fingerprints against the last successful
submission saved in GitHub Actions cache, and submits only new, changed or removed
URLs. If the cache is missing or evicted, the next run submits the full sitemap.
CSS-only changes and the Bing verification tag do not change fingerprints.

Before submission, the script verifies the live ownership file and checks that
each changed live page matches the committed build. A deployment mismatch, bad
key, HTTP 202 (validation pending), or any other non-200 submission response fails
the workflow without saving the new baseline. Inspect the error and rerun the
workflow once the deployment or key is ready. Do not repeatedly submit unchanged
URLs to try to force ranking.

Commands:

```sh
npm run indexnow:test
npm run indexnow:submit -- --dry-run
npm run indexnow:submit
gh workflow run indexnow.yml --repo gqerpjoi23r/social-casino-index --ref main
```

Local submissions keep their baseline in ignored `.indexnow/state.json`.
Production runs use the shared Actions cache. HTTP 200 means the engine received
the URLs, not that they were indexed, ranked, or cited by an AI answer.

Use Bing's sitemap and URL inspection reports to check indexing. Measure AI
citations and referral visits separately. No Bing API key or GSC Wizard
connection is required for this independent IndexNow integration.
