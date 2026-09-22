# Phase 1.7B — Business Confirmation Workflow

## Result

AffiliateOS now records unresolved metric definitions as workspace-scoped, versioned, effective-dated business rules. The eight Phase 1.7 questions are seeded as `OPEN`; no answer or actor is fabricated. Admins may confirm, defer, or create a superseding version. Affiliate Managers and other workspace members have read access.

## Controls

- RLS limits reads to the active workspace and writes to `Admin`.
- Confirmation actor and timestamp are derived by PostgreSQL from `auth.uid()` and `now()`.
- The API does not accept an actor field.
- Confirmed, deferred, and superseded records are immutable. A changed definition requires a new version.
- Every create/confirm/defer/supersede operation writes an activity log containing rule key, version, and status without business-user PII.
- A finalized report snapshot freezes the applicable rule ID, key, version, scope, status, selected definition, and effective dates. Older snapshots without this optional metadata remain readable.
- Rule resolution uses effective dates and precedence: report template, client, marketplace, then global.

## Runtime behavior

`Settings → Business Rules` displays the question, evidence, current application behavior, impacted metrics, status, version, and effective date. Admin controls require an explicit definition and effective date before confirmation; no definition is preselected. Affiliate Managers see the same evidence as read-only.

Report metric cards display one of:

- `CONFIRMED` when an applicable confirmed rule exists;
- `BUSINESS CONFIRMATION REQUIRED` when an applicable open or deferred rule exists;
- `PROVISIONAL` when no governed definition applies.

The existing production formulas remain unchanged until a human confirms a rule. A confirmed rule records governance metadata; formula implementation requires a separately reviewed change when the selected definition differs from current behavior.

## Parity harness

The original validated source pair remains the default and still runs without extra flags. A second source pair can supply `--manifest <json>` with a period and marketplace reference metrics, so a new period does not require code changes. Missing references remain `SOURCE_UNAVAILABLE`, never zero.

Manifest shape:

```json
{
  "period": { "start": "2026-08-01", "end": "2026-08-06" },
  "references": {
    "Shopee": { "affiliateGmv": 0, "quantity": 0 },
    "TikTok": { "affiliateGmv": 0, "quantity": 0 }
  }
}
```

## Business status

All eight questions remain **BLOCKED — DINDA CONFIRMATION REQUIRED**. The human confirmation pack is in `docs/phase-1.7b-confirmation-pack.md`.
