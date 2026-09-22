# Phase 1.8 — Operational Intelligence

## Operational signals and priority

The deterministic engine lives in `lib/intelligence/actions.ts`. Each action includes a stable rule ID, category, title, reason, next action, P0–P3 priority, severity, affected entity, deterministic deduplication key, due date, and structured evidence.

- P0: an immediate Peak Day or active HSL/critical-stock risk.
- P1: overdue work, critical stock, HSL readiness gaps, or meaningful creator decline.
- P2: due follow-up, sample delay, normal readiness gap, or scheduled operating work.
- P3: monitoring and scaling opportunities without an immediate deadline.

Priority comes from explicit conditions, never an opaque score.

## Action lifecycle, assignment and deduplication

`operational_actions` supports OPEN, IN_PROGRESS, SNOOZED, RESOLVED, and DISMISSED. It stores assignment to an existing workspace profile, start/snooze/resolve timestamps, authenticated resolver, resolution note, task linkage, source rule, and evidence snapshot. The workspace/deduplication key is unique. Refresh updates evidence instead of inserting duplicates; materially changed evidence reopens a resolved/dismissed action. Resolved records are retained.

The Action Center groups Urgent, Today, Upcoming, Monitoring, and Completed/Resolved actions. It supports assignment to an existing workspace member, context navigation, Start, Resolve, Reopen, and Create Task. A created task keeps the action linkage and appears in My Work.

## Rule coverage

- **Creator performance:** last 7 days versus the previous 7 days, clearly labeled as an operational comparison. Decline/spike requires a configured baseline and minimum sales days.
- **Reactivation:** previous sales, configured inactivity interval, and no active outreach.
- **Outreach:** H+3, H+7, and H+14 from persisted contact dates; progressed outreach does not trigger.
- **HSL and stock:** missing hero SKU plus compound risk when latest stock affects active HSL assignments.
- **Samples:** shipped without receipt and received without activation after configured intervals.
- **Peak Day:** exact missing creator locks and strategy readiness within the configured warning window.
- **Weekly rhythm:** recurring templates drive weekday/week-of-month actions, so the UI contains no giant weekday switch.
- **Tasks:** overdue and due-today actions.

## Settings

Workspace preferences add decline %, minimum baseline GMV, spike %, minimum sales days, inactivity, HSL window, stock thresholds, sample delay, H+3/H+7/H+14, reactivation interval, and Peak Day warning window. Existing values remain intact; new columns use documented defaults.

## Explainability

Every card answers what happened, why the rule surfaced it, and the next manual step. Evidence expands to show comparison range, values, relevant dates, stock quantity, workflow status, or readiness counts. Creator contact details and raw import rows are never stored in action evidence or audit events.

## RLS and audit

RLS scopes reads and operator mutations to `current_workspace()`. Admin and Affiliate Manager may manage actions. Database triggers derive lifecycle timestamps and resolver identity from `auth.uid()`, protect immutable action identity, and write Action generated/started/snoozed/resolved/dismissed, evidence update, and task-created events.

## Dashboard and mobile

Dashboard shows only the five highest-priority actions and links to Action Center. The Action Center uses cards rather than a wide table; at 390×844 controls wrap below the evidence summary while priority, reason, and next action stay readable.

## PPT template source and snapshot mapping

The private template, slide mapping, branding decisions, source hash, and visual inspection are documented in `docs/report-template-dinda-anymind.md`. The authenticated finalized-only export still provides all data from the immutable snapshot and records template ID/version in `report_exports`. Excel remains snapshot-driven.

## Tests and limitations

Tests cover deterministic generation, priority order, deduplication, persisted resolution, outreach milestones, HSL-stock compound risk, samples, Peak Day, recurring work, RLS/audit migration controls, source hash, source immutability, branding media, snapshot population, and PPT package reopening. The PowerPoint pipeline does not create charts when the snapshot lacks time-series data. Assignment options come from existing workspace profiles; the API rejects profiles from another workspace.

The eight Phase 1.7B business rules remain OPEN. Operational comparisons do not claim to be official reporting Growth, and production metric formulas remain unchanged.
