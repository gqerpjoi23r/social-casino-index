# Saved-capture extraction benchmark

Extractor: deterministic-1.1.1. Capture run: 2026-09-10T16-23-45-610Z-34501765851.
Scope: Manually labelled excerpt topic and qualifier checks, not full-page recall or independently verified operator facts.

- Cases passed: 9/12
- Topic precision: 84.6%
- Topic recall: 91.7%
- Required qualifier checks: 28/30
- Unsupported or invalid quotations: 0
- Source containment verified this run: true

## Case results

- jackpota-documents: PASS
- lucky-bunny-shell: PASS
- yay-daily-cap: Unexpected topic: daily
- yay-hypothetical: Unexpected topic: playthrough
- dorados-state-cap: PASS
- zonko-paid-month: PASS
- chumba-method-minimums: PASS
- pulsz-gift-method: PASS
- stake-purchase-limit: PASS
- wow-staged-welcome: Missing topic: welcome; Missing qualifier: welcome: SC 5; Missing qualifier: welcome: first three days
- wow-method-minimums: PASS
- mcluck-gold-welcome: PASS

This small, deliberately selected diagnostic set is not an estimate of production accuracy.
Absent labels mean no supported answer to that topic in this excerpt, not absence of an operator feature.
The timing topic includes redemption methods. State-specific redemption caps belong to minimums.
Qualifier matching checks strings, not whether their logical relationships were interpreted correctly.
No model was called by this command. Supplied responses are scored without silently filtering bad evidence.
