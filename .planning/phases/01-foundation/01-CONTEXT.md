# Phase 1: Foundation - Context

**Gathered:** 2026-03-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Database schema, authentication system with 4 roles (hygienist, dentist, admin, patient), patient CRUD operations, and Vercel deployment pipeline. Staff can log in, manage patients, and the full React + Python + Neon Postgres stack works end-to-end on Vercel.

</domain>

<decisions>
## Implementation Decisions

### Login & Role Routing
- Single login page for all roles (email + password)
- After login, redirect based on role:
  - Hygienist → Patient list (their primary workflow)
  - Dentist → Patient list (reviews charting)
  - Admin → Practice dashboard (placeholder until Phase 4)
  - Patient → Patient portal (placeholder until Phase 4)
- Unauthorized route access redirects to login
- Role-restricted pages return 403 for wrong roles

### Patient List & Details
- Clean data table with columns: name, DOB, last visit date, status indicator
- Search by patient name (client-side filter for demo scale)
- Patient detail page: summary header (name, DOB, contact info) with tabbed navigation
- Tabs: Overview, Charting, Notes, Treatment Plans — later tabs show "Coming in Phase X" placeholder
- Staff can create new patients via modal form (name, DOB, phone, email, address)

### Database & Schema Strategy
- SQLAlchemy ORM with model definitions in Python
- Neon Postgres via pooled connection string (use -pooler hostname)
- Schema includes: practices, users, patients, sessions tables for Phase 1
- Design schema to accommodate future tables (perio_exams, notes, treatment_plans) but don't create them yet
- Seed script in Python that creates demo practice + 4 staff accounts
- Use psycopg2-binary for database driver

### Session Management
- Database-backed sessions stored in sessions table
- Signed HTTP-only cookies with session ID
- Session expiry: 24 hours for staff, 7 days for patients
- Logout clears session from DB and cookie
- Middleware checks session on every API request

### Vercel Deployment
- FastAPI app in api/index.py as single Vercel function
- vercel.json with rewrites: /api/* → api/index.py, everything else → React SPA
- Vite build outputs to dist/ directory
- Environment variables: DATABASE_URL, SESSION_SECRET

### Claude's Discretion
- Exact Tailwind color palette values (within medical/clinical theme)
- Component library choices (headless UI vs custom)
- Exact form validation approach
- Loading states and error handling patterns
- Navigation/sidebar layout design

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

No external specs — requirements are fully captured in decisions above and in:

### Project Context
- `.planning/PROJECT.md` — Project vision, constraints, tech stack decisions
- `.planning/REQUIREMENTS.md` — AUTH-01 through AUTH-05, PAT-01 through PAT-03
- `.planning/research/STACK.md` — Technology choices with versions and rationale
- `.planning/research/ARCHITECTURE.md` — Component boundaries, data flow, deployment patterns
- `.planning/research/PITFALLS.md` — Session auth in serverless, Neon connection pooling pitfalls

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- None — greenfield project, no existing code

### Established Patterns
- None yet — this phase establishes the foundational patterns

### Integration Points
- Vercel deployment pipeline (vercel.json config)
- Neon Postgres (DATABASE_URL environment variable)
- React SPA routing (client-side router with API proxy)

</code_context>

<specifics>
## Specific Ideas

- Medical/clinical color palette: clean whites (#FAFBFC), calm blues (#2563EB, #3B82F6), professional greens (#059669, #10B981)
- The app shell (nav, sidebar) should feel like a modern SaaS tool — think Linear or Notion, not legacy medical software
- Demo accounts must work immediately after seed: hygienist@periopulse.app, dentist@periopulse.app, admin@periopulse.app, patient@periopulse.app — all with password "demo1234"

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-foundation*
*Context gathered: 2026-03-24*
