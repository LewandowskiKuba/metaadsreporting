# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.1] - 2026-04-01

### Changed

- **Google Ads Developer Token** — `GOOGLE_ADS_DEVELOPER_TOKEN` skonfigurowany w `.env` lokalnie i na serwerze produkcyjnym (Hetzner). Aktualny poziom dostępu: **testowy** — wniosek o basic access złożony; do czasu zatwierdzenia API działa tylko z testowymi kontami Google Ads.

---

## [2.0.0] - 2026-03-31

### Added

- **Google Ads integration** — full sync pipeline (`db/sync-google.js`) using Google Ads API v18 (GAQL) with OAuth2 token refresh from database
- **Google Ads OAuth flow** — admin connects account via `/api/auth/google-ads/*` endpoints; refresh token stored in `platform_connections` table tied to user ID; auto-triggers account discovery on connect
- **Platform switcher** — dashboard toggle between Meta Ads and Google Ads views
- **Google Ads metrics** — spend, impressions, clicks, CTR, CPC, conversions, cost per conversion, video views, video quartile retention (p25/p50/p75/p100) aggregated from campaign level
- **`GoogleVideoSection` component** — video retention bars with Google-branded styling, cost per conversion card
- **Clients management** — `/clients` page for creating clients and assigning Meta/Google Ads accounts; CRUD via `clients` and `client_accounts` tables
- **Admin panel dropdown** — Navigation redesigned: logo links to dashboard, "Panel Administratora" dropdown with: Zarządzanie użytkownikami, Zarządzanie Klientami, Połącz Google Ads (OAuth)
- **Settings page** — `/settings` shows platform connection status (Meta: system token, Google Ads: OAuth), disconnect and manual sync controls
- **`platform_connections` table** — stores per-user OAuth tokens for external platforms (currently Google Ads)
- **Auto-migration** — if `GOOGLE_ADS_REFRESH_TOKEN` exists in `.env`, it is automatically migrated to `platform_connections` on server startup (backward compatibility)
- **`checkGoogleAccountAccess` middleware** — row-level security for Google Ads accounts via `user_google_accounts` join table
- **Google Ads cron** — daily sync at 3:00 CET extended to include Google Ads (`syncGoogleYesterday`)
- **`isGoogleAdsConfigured()`** — runtime check: app credentials in `.env` + connected OAuth token in DB
- New DB tables: `google_accounts`, `google_daily_metrics`, `clients`, `client_accounts`, `user_google_accounts`, `platform_connections`
- New API endpoints: `GET/POST/PUT/DELETE /api/clients`, `GET /api/gads/*`, `GET/DELETE /api/auth/google-ads`, `GET /api/auth/connections`

### Changed

- **Navigation** — logo `.eliteagency` is now clickable (links to `/dashboard`); standalone "Dashboard" and "Użytkownicy" buttons replaced by logo + admin dropdown
- **`server.js`** — imports `verifyToken` (used in OAuth state validation)
- **`DashboardPage`** — refactored into `MetaDashboard` and `GoogleAdsDashboard` sub-components with shared platform switcher

### Removed

- Standalone "Dashboard" nav button (replaced by clickable logo)
- Standalone "Użytkownicy" nav button (moved into admin dropdown)
- `META_ACCESS_TOKEN` dependency for Google Ads (Meta still uses system token; Google uses DB-stored OAuth token)

---

## [1.0.0] - 2026-03-31

### Added

- **SQLite-based metrics caching** — daily ad metrics (spend, impressions, reach, clicks, unique_clicks, outbound_clicks, leads, calls, purchase_value) fetched from Meta Graph API and stored locally, eliminating per-request API calls
- **Daily cron sync at 3:00 CET** — scheduled `syncYesterday` for all configured Meta accounts
- **Auto-backfill on startup** — if no metrics exist for an account, server backfills 90 days of history immediately
- **Multi-user authentication** — email/password login, bcrypt, JWT (30-day expiry), `admin` and `viewer` roles
- **Per-account access control** — `user_accounts` join table; viewers restricted to assigned accounts
- **Meta API proxy** — `META_ACCESS_TOKEN` kept server-side only; all Graph API calls routed through backend
- **Server-side KPI computation** — CPM, CPC, CTR, CPL, CVR, cost_per_call, ROAS derived on read
- **VideoCards component** — per-creative video retention, quartile breakdowns (25/50/75/95/100%), ThruPlay, avg watch time
- **AdCards component** — horizontal creative cards with pagination and conversions metric
- **PerformanceChart** — daily trend chart (Recharts) for spend, impressions, clicks
- **TargetingAnalysis** — age and region breakdowns with bar charts
- **UsersPage** — admin interface for creating, editing, deleting users and managing account assignments
