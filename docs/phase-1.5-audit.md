# Phase 1.5 baseline audit

Existing App Router workspace routes, generic CRUD drawers/tables, command palette, account relationships, Supabase SSR membership, workspace-scoped composite foreign keys and separate TikTok/Shopee performance tables are reusable. Browser demo state is explicitly local and is retained across upgrades.

Gaps: imports stage raw data but do not process performance; reporting is a placeholder; campaign products/content/files are marked Coming Soon; creator join has no locking audit; date logic is historical rather than H-2; operational pipelines, stock, samples, outreach and finalized reporting do not exist. Existing CSV validation and all original entity routes will be extended, not replaced.

Migration: additive columns on creators/campaigns/tasks/reports/campaign_creators; new operational tables with workspace-scoped foreign keys, roles, audit triggers and immutable report snapshots. Reuse campaign_creators as activation membership. No database reset. Live database migration and live authentication verification require the user's Supabase project; current acceptance environment is the approved labeled demo.

UI: preserve shared light surfaces, typography, drawers, navigation shell and original CRUD. Extend shared forms/table behaviors. Derived alerts and readiness must reference actual records; no marketplace API or automatic messaging.
