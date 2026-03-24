# PerioPulse — Dental Hygiene & Treatment Tracking

## What This Is

A web application for dental practices to do fast hygiene charting, track periodontal findings, and give patients ownership of their dental history across practices. Built as a FonnIT daily showcase featuring a React + Python stack on Vercel with Neon Postgres.

## Core Value

Hygienists can chart periodontal findings fast and accurately through an interactive tooth chart, with immutable audit trails that prevent note overwrites — the #1 complaint in existing dental PMS systems.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Interactive SVG tooth chart with 32 teeth, 6 probing points each, color-coded severity
- [ ] Fast click/tap entry for pocket depths, bleeding, recession, mobility, furcation
- [ ] Full-mouth perio chart view showing all 192 probing points
- [ ] Note system with immutable audit trail (edits create versions, not overwrites)
- [ ] Role-based note editing (author same-day edit, then append-only)
- [ ] Treatment plans linked to teeth with status workflow (proposed → accepted → in-progress → completed)
- [ ] CDT billing codes associated with procedures
- [ ] Patient portal showing dental history, treatment plans, and perio trends
- [ ] PDF record download for patients
- [ ] Practice dashboard with analytics (patients seen, perio trends, productivity, acceptance rates)
- [ ] Role-based auth (hygienist, dentist, admin, patient)
- [ ] Multi-provider practice support
- [ ] Demo data seeded: practice, 4 staff, 20 patients, 6 months of charting history
- [ ] Responsive design for tablet chair-side use

### Out of Scope

- Real-time scheduling/calendar — not core to charting value, adds complexity
- Insurance/billing integration — CDT codes tracked but no claims submission
- HIPAA compliance infrastructure — demo/showcase app, not production medical software
- Mobile native app — responsive web sufficient for showcase
- Multi-practice federation — single practice focus for v1
- Patient messaging/chat — not core to charting workflow

## Context

- Dental PMS systems (Dentrix, EagleSoft, Open Dental) cost $300-500/month per provider but are bloated and slow
- Hygienists spend 20%+ of time fighting charting software
- Critical pain point: assistant notes overwrite hygienist notes without audit trails, creating liability
- Patient dental history is fragmented across practices — no patient-owned portal exists
- Target: LinkedIn showcase for dental practice owners

## Constraints

- **Tech Stack**: React (Vite) frontend + Python serverless functions (FastAPI-style) in `/api/` + Neon Postgres — prescribed stack
- **Deployment**: Vercel (Python runtime for API, static for React)
- **Auth**: Session-based via Python backend (no third-party auth service)
- **Database**: Neon Postgres via DATABASE_URL env var — NOT SQLite
- **Design**: Medical/clinical palette (clean whites, calm blues, professional greens), professional LinkedIn-showcase quality
- **Demo**: Must include realistic seeded data with 4 demo accounts

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| React + Python on Vercel | Prescribed in brief — showcase stack | — Pending |
| Neon Postgres (serverless) | Prescribed — serverless DB matches serverless functions | — Pending |
| SVG tooth chart (custom) | Hero feature needs pixel-perfect control, no off-the-shelf dental chart libs | — Pending |
| Session-based auth | Simpler than JWT for demo, prescribed in brief | — Pending |
| Immutable notes with versions | Core differentiator — solves the "overwrite" problem | — Pending |

---
*Last updated: 2026-03-24 after initialization*
