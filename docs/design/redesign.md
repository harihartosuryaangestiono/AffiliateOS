# AffiliateOS visual redesign

## Audit and implementation plan

Stack: React 19, Next App Router through Vinext/Vite, Tailwind 4, Base UI,
Recharts, Supabase authentication/PostgreSQL. WorkspaceProvider owns mutations
and role checks (Admin, Affiliate Manager, Analyst, Viewer). Demo mode is existing
explicit configuration; production must continue using authenticated data.

Work in order: consolidate tokens and shared controls; shell; data-driven dashboard;
operational workflows and entity workspaces; analytics; details/overlays/states;
responsive and route QA. Preserve existing tables, relationships, exports and APIs.

## Route families to review

- Dashboard; Action Center; My Work
- Performance overview; TikTok; Shopee (all platform tabs)
- Creators; acquisition; outreach/templates/message preview; performance watch
- Campaigns; monthly planning
- HSL; SKU assignments; stock watch
- Samples; Peak Days and readiness detail
- Import Center; TikTok and Shopee upload/mapping/validation/results/history
- Reports; monthly reports; report detail/narrative/finalization/exports
- Clients; brands; products; tasks
- Entity detail: all six entities, relationship tabs and account creation
- Users; Settings and all seven tabs; targets alias; business rules
- Login; not-found; loading; workspace error
- Shared create/edit forms, confirmation dialogs, empty/filtered states

No Deals route exists. Existing planned features remain explicitly unavailable.
No schema, authentication, persistence or API changes are planned.
