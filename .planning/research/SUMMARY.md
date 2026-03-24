# Project Research Summary

**Project:** PerioPulse -- Dental Hygiene & Treatment Tracking
**Domain:** Clinical dental charting SPA with Python serverless backend
**Researched:** 2026-03-24
**Confidence:** HIGH

## Executive Summary

PerioPulse is an interactive dental charting web application built as a React SPA with a Python FastAPI serverless backend on Vercel, backed by Neon Postgres. The domain is well-understood: dental practice management software is a mature category dominated by bloated incumbents (Dentrix, EagleSoft, Open Dental), and the specific pain points are documented -- hygienists lose time to clunky charting UIs, clinical notes get silently overwritten, and patients have no portable access to their records. The hero feature is a custom SVG tooth chart supporting full 6-point periodontal probing (192 data points), which no existing React library adequately handles.

The recommended approach is a monorepo with React 19 + Vite 8 on the frontend and a single FastAPI Vercel Function (Fluid Compute) on the backend. The stack is prescribed and well-supported: Vercel has first-class FastAPI integration, Neon provides serverless Postgres with built-in connection pooling, and the frontend uses Tailwind CSS 4 for clinical aesthetics plus Recharts for analytics. Auth uses signed cookie sessions via itsdangerous -- simpler and more secure than JWT for a same-domain SPA. The data model uses SQLAlchemy 2.0 with Alembic migrations, storing perio measurements as one row per tooth per exam (6 depth columns + 6 bleeding booleans) to balance query performance with trend analysis capability.

The key risks are: (1) SVG tooth chart performance -- 192 interactive elements will cause re-render death without careful memoization and layer separation, and this must be architected correctly from the start; (2) serverless session auth breaking on Vercel if memory-backed sessions are used instead of signed cookies or DB-backed sessions; (3) Neon connection exhaustion if the pooler endpoint is not used; and (4) the audit trail for clinical notes being implementable only at the application layer without database-level immutability constraints. All four risks have clear prevention strategies documented in the research.

## Key Findings

### Recommended Stack

The stack is prescribed (React + Python + Vercel + Neon) with research focused on specific library choices. All core choices are high-confidence, verified against official documentation.

**Core technologies:**
- **React 19 + Vite 8 + TypeScript:** SPA framework with Rolldown bundler for fast builds. TypeScript is non-negotiable for a medical charting app with complex data shapes
- **FastAPI 0.128 + Pydantic 2.x:** Single Vercel Function with Fluid Compute. Auto-detected from requirements.txt, handles concurrent requests in one instance
- **Neon Postgres + psycopg2-binary + SQLAlchemy 2.0:** Serverless Postgres with PgBouncer pooling. Use `-pooler` connection string. SQLAlchemy 2.0 style with Alembic migrations
- **Tailwind CSS 4:** Clinical color palette via CSS custom properties. v4 has zero-config Vite plugin
- **pwdlib[bcrypt] + itsdangerous:** Password hashing (replaces deprecated passlib) and signed cookie sessions
- **Recharts 3.8:** SVG-based React charting for dashboard analytics and perio trend visualizations
- **Custom SVG (not react-odontogram):** No existing library supports full perio charting. Custom SVG is the only path for the hero feature

### Expected Features

**Must have (table stakes):**
- Interactive 32-tooth chart with click targets and Universal Numbering (1-32)
- 6-point probing depths per tooth (192 total) with fast tap-cycling entry
- BOP, recession, mobility, furcation recording
- Color-coded severity (1-3mm green, 4mm yellow, 5-6mm orange, 7+ red)
- Full-mouth perio chart view (grid layout)
- Clinical notes per visit with structured note types
- Patient list/search, visit history
- Role-based access (hygienist, dentist, admin, patient)
- Treatment plans with status workflow
- Responsive/tablet-friendly (44px minimum touch targets)

**Should have (differentiators):**
- Immutable note audit trail with visual diffs -- solves the #1 hygienist complaint
- Role-based note protection (same-day author edit, then append-only)
- Patient-owned portal with perio trend visualization
- PDF record download for patient portability
- Practice analytics dashboard
- CDT code association (limited set of ~15 common codes, not full ADA database)
- Patient treatment plan acceptance from portal

**Defer entirely:**
- Voice charting, scheduling, insurance claims, HIPAA compliance, AI diagnostics, multi-practice federation, messaging, native mobile, radiograph integration, e-prescriptions

### Architecture Approach

Single-project monorepo: React SPA serves via Vercel CDN, all `/api/*` routes hit a single FastAPI Vercel Function with Fluid Compute, Neon Postgres handles persistence via PgBouncer-pooled connections. Charting data is held in React state during entry and saved as a single batch POST. Notes use an immutable version chain pattern (INSERT-only, never UPDATE content).

**Major components:**
1. **React SPA** -- All UI rendering, SVG tooth chart interaction, client-side routing, optimistic local state for charting
2. **FastAPI App** -- Auth middleware, RBAC enforcement, business logic, data validation, all exposed as REST endpoints under `/api/*`
3. **Neon Postgres** -- Persistent storage with schema enforcing audit trail immutability. Key tables: practices, users, patients, visits, charting_sessions, charting_readings, notes (version-chained), treatment_plans, treatment_items, sessions (auth)

**Key patterns:**
- Optimistic local state for charting (batch save, not per-click API calls)
- Immutable notes with version chain via parent_id
- Dual-layer RBAC (React for UX, FastAPI for security)
- Connection pool via FastAPI lifespan + Neon pooler endpoint

### Critical Pitfalls

1. **SVG tooth chart re-render performance** -- Separate static/interactive SVG layers, use React.memo with flat data structures, batch state updates. Must be architected in initial tooth chart build; costly to retrofit
2. **Serverless session auth** -- Use signed cookies (itsdangerous) or DB-backed sessions, never memory/filesystem storage. Test on deployed Vercel URL, not just localhost
3. **Neon connection exhaustion** -- Use `-pooler` hostname from day one. Keep connections short-lived. Set `pool_pre_ping=True` in SQLAlchemy for scale-to-zero recovery
4. **Audit trail circumvention** -- Store note versions in separate table, add DB-level constraints preventing UPDATE/DELETE on version rows. The API must never expose UPDATE for versions
5. **Tooth numbering confusion** -- Hard-code Universal Numbering (1-32), document in schema. Tooth 1 = upper-right third molar. Verify against reference diagram before demo

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Foundation (Database + Auth + Project Setup)
**Rationale:** Everything depends on the data layer and auth. Vercel routing config must be correct before any feature work. The database schema design (especially perio measurements table structure) affects every subsequent phase.
**Delivers:** Working Vercel deployment with React SPA + FastAPI backend, database schema with all tables, auth system with 4 roles, patient CRUD
**Addresses:** Auth & roles, patient list/search (table stakes)
**Avoids:** Serverless session auth failure (Pitfall 3), Neon connection exhaustion (Pitfall 4), SPA routing conflicts (Pitfall 6), perio data model issues (Pitfall 7), frontend-only RBAC (Pitfall 13)

### Phase 2: Interactive Tooth Chart (Hero Feature)
**Rationale:** This is the visual centerpiece and highest demo impact. Depends on database schema and patient data from Phase 1. Most complex frontend work -- must be built with performance architecture from the start.
**Delivers:** Full SVG tooth chart with 6-point probing, BOP, recession, mobility, furcation, color-coded severity, full-mouth perio chart view, fast tap-cycling entry
**Addresses:** All charting table stakes features, fast entry differentiator
**Avoids:** SVG re-render performance death (Pitfall 1), wrong tooth numbering (Pitfall 2), wrong clinical thresholds (Pitfall 8), small touch targets (Pitfall 11)

### Phase 3: Clinical Notes + Treatment Plans
**Rationale:** Notes depend on visits (created during charting). Treatment plans link to teeth and charting findings. These complete the clinical workflow.
**Delivers:** Immutable note system with version history and visual diffs, role-based note protection, treatment plans with CDT codes and status workflow
**Addresses:** Clinical notes (table stakes), audit trail and note protection (differentiators), treatment plans with CDT codes
**Avoids:** Audit trail circumvention (Pitfall 5), CDT code licensing issues (Pitfall 12)

### Phase 4: Patient Portal + Dashboard + Polish
**Rationale:** Patient portal and analytics are read-only views over data created in Phases 1-3. PDF export needs complete patient data. Dashboard aggregates existing clinical data. Seed data should be finalized last.
**Delivers:** Patient portal with trend visualization, PDF record download, treatment plan acceptance, practice dashboard with analytics, polished demo seed data (20 patients with clinically plausible profiles)
**Addresses:** All remaining differentiators (patient portal, PDF export, analytics dashboard)
**Avoids:** PDF generation failure on Vercel (Pitfall 10 -- use fpdf2 or client-side jspdf), fake-looking seed data (Pitfall 9)

### Phase Ordering Rationale

- **Foundation first** because auth middleware and database schema are dependencies for every feature. Getting Vercel routing correct early prevents cascading deployment issues.
- **Tooth chart second** because it is the hero feature with the highest architectural risk (SVG performance). Building it early allows time to optimize. It also produces the most visually impressive demo output.
- **Notes and treatment plans third** because they depend on visit data from charting and represent the key differentiator (immutable audit trail). Grouping them together makes sense because they share the visit data model.
- **Portal and dashboard last** because they are pure consumers of data created by earlier phases. They carry the least architectural risk and can be polished quickly.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 2 (Tooth Chart):** The SVG architecture for 32 teeth with 192 probing points is the highest-risk component. Needs careful component design, performance profiling approach, and reference to existing open-source dental chart SVG implementations (jacobwalkr/dental-chart, react-odontogram for layout reference only).
- **Phase 4 (PDF Export):** PDF generation in Vercel serverless has library constraints. Must validate fpdf2 works in Vercel Python runtime, or fall back to client-side generation.

Phases with standard patterns (skip deep research):
- **Phase 1 (Foundation):** FastAPI + SQLAlchemy + Neon + session auth is thoroughly documented with official examples. Vercel FastAPI deployment is a known pattern.
- **Phase 3 (Notes + Treatment Plans):** CRUD with version chaining is a standard pattern. The only nuance is DB-level immutability constraints, which are straightforward PostgreSQL.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All technologies verified against official docs (Vercel, Neon, Vite, FastAPI). Prescribed stack reduces decision risk. Only MEDIUM item: pwdlib is newer with less community usage |
| Features | HIGH | Feature landscape well-documented via CareStack, Curve, Open Dental references. Clear table stakes vs. differentiators. Anti-features well-scoped |
| Architecture | HIGH | Single FastAPI function on Vercel is the officially documented pattern. Data model uses established perio charting schema patterns. Session auth is standard |
| Pitfalls | HIGH | Pitfalls sourced from official docs (Neon pooling, Vercel serverless), clinical standards (probing thresholds, tooth numbering), and performance analysis (SVG re-renders). Actionable prevention strategies for each |

**Overall confidence:** HIGH

### Gaps to Address

- **Vite 8 + @react-pdf/renderer compatibility:** MEDIUM confidence that @react-pdf/renderer bundles correctly with Vite 8's Rolldown bundler. Test early; fall back to client-side jspdf if needed
- **Vercel Python function size limit:** If SQLAlchemy + psycopg2-binary + other deps approach 250MB, may need to slim dependencies. Monitor during Phase 1
- **FastAPI CORS configuration for Vercel:** The exact CORS setup for SPA + API on the same Vercel project needs validation. May need explicit CORS middleware or may work implicitly since same domain
- **Tailwind CSS 4 + Vite 8 integration:** Both are recent major versions. Verify the `@tailwindcss/vite` plugin works with Vite 8's new architecture

## Sources

### Primary (HIGH confidence)
- [Vercel Python Runtime Docs](https://vercel.com/docs/functions/runtimes/python) -- Python version support, ASGI detection
- [Vercel FastAPI Docs](https://vercel.com/docs/frameworks/backend/fastapi) -- Single function deployment, Fluid Compute
- [Neon Connection Pooling](https://neon.com/docs/connect/connection-pooling) -- PgBouncer transaction mode
- [Neon Python Guide](https://neon.com/docs/guides/python) -- psycopg2 connection patterns
- [Vite 8.0 Release](https://vite.dev/blog/announcing-vite8) -- Rolldown bundler
- [Tailwind CSS v4.0](https://tailwindcss.com/blog/tailwindcss-v4) -- Vite plugin, CSS custom properties
- [Open Dental Perio Chart](https://opendental.com/manual/perio.html) -- Industry standard perio chart layout
- [ADA Dental Record Standards](https://www.ada.org/resources/practice/practice-management/writing-in-the-dental-record) -- Legal requirements

### Secondary (MEDIUM confidence)
- [CareStack Periodontal Charting](https://carestack.com/dental-software/features/periodontal-charting) -- Feature reference
- [Curve Dental Perio Charting](https://www.curvedental.com/perio-charting) -- Speed optimization reference
- [FastAPI pwdlib Discussion](https://github.com/fastapi/fastapi/discussions/11773) -- passlib deprecation
- [Vercel Community: React + FastAPI](https://community.vercel.com/t/deploying-a-react-ts-frontend-with-fastapi-python-backend/967) -- Deployment patterns
- [Felt: SVG to Canvas Performance](https://www.felt.com/blog/from-svg-to-canvas-part-1-making-felt-faster) -- SVG rendering optimization

### Tertiary (LOW confidence)
- [react-odontogram](https://github.com/biomathcode/react-odontogram) -- Layout reference only, rejected for production use
- [jacobwalkr/dental-chart](https://github.com/jacobwalkr/dental-chart) -- Simple SVG dental charting reference

---
*Research completed: 2026-03-24*
*Ready for roadmap: yes*
