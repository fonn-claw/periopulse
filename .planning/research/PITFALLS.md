# Domain Pitfalls

**Domain:** Dental hygiene charting & treatment tracking web application
**Researched:** 2026-03-24

## Critical Pitfalls

Mistakes that cause rewrites or major issues.

### Pitfall 1: SVG Tooth Chart Performance Death by Re-renders

**What goes wrong:** Rendering 32 interactive teeth with 192 probing points as individual React-managed SVG elements causes severe performance issues. Each tooth click triggers state updates that re-render the entire chart. On tablets (the target chair-side device), this manifests as 200-500ms lag per interaction -- unacceptable for hygienists who need to chart rapidly.

**Why it happens:** Developers treat each SVG element as a controlled React component with its own onClick handler and state-driven fill colors. React's reconciliation of hundreds of SVG elements on every state change is expensive, especially on mid-range tablets.

**Consequences:** The hero feature feels sluggish. Hygienists abandon the tool because it is slower than their current PMS. The entire value proposition collapses.

**Prevention:**
- Separate the SVG into two layers: a static rendering layer (teeth outlines, labels) and a transparent interactive overlay layer (click targets). Only the overlay and the specific tooth being edited re-render.
- Use React.memo aggressively on individual tooth components with primitive prop comparison.
- Store chart data in a flat object keyed by tooth number and site position (e.g., `{ "1-MB": 3, "1-B": 2 }`) rather than nested objects that break memoization.
- Batch state updates: when entering probing depths for a tooth, collect all 6 values before triggering a single state update, not 6 individual renders.
- Test on a real tablet early -- not just Chrome DevTools device emulation.

**Detection:** Profile with React DevTools. If more than 10 components re-render per click, you have a problem. If click-to-visual-feedback exceeds 100ms, optimize immediately.

**Phase relevance:** Phase 1 (tooth chart) -- must be addressed in initial architecture, extremely expensive to retrofit.

### Pitfall 2: Tooth Numbering System Confusion

**What goes wrong:** The US uses the Universal Numbering System (1-32), but the FDI World Dental Federation system (two-digit quadrant notation like 11-48) is used internationally. Number overlap causes catastrophic confusion: tooth "11" in Universal is the upper-left canine, but "11" in FDI is the upper-right central incisor. If the database stores raw numbers without system context, data becomes ambiguous or wrong.

**Why it happens:** Developers pick one system without realizing the numbering overlaps. Or they assume US-only usage and hard-code Universal, then later discover imported data or international users expect FDI.

**Consequences:** Charting data is recorded against wrong teeth. In a real clinical context this would be a patient safety issue. For a demo, it just looks wrong to any dentist who notices.

**Prevention:**
- Use Universal Numbering (1-32) since this is a US-targeted demo app. Hard-code it and label it clearly in the UI.
- Store tooth numbers as integers 1-32 in the database with a clear schema comment documenting Universal system.
- In the SVG chart, number teeth correctly: 1 = upper-right third molar, numbering goes left across the upper arch to 16, then 17 = lower-left third molar, numbering goes right across the lower arch to 32.
- Do NOT try to support multiple numbering systems in v1. It adds complexity with zero demo value.

**Detection:** Have the tooth chart reviewed against an actual dental numbering diagram before demo. Verify tooth 1 is upper-right (patient's right, viewer's left).

**Phase relevance:** Phase 1 (tooth chart) -- must be correct from the start, renumbering later affects all seeded data.

### Pitfall 3: Session Auth Breaks in Serverless Functions

**What goes wrong:** Traditional server-side sessions (stored in memory or filesystem) do not work in Vercel serverless functions. Each function invocation is stateless with a read-only filesystem. Session data set in one function invocation is gone in the next. Users appear logged out randomly.

**Why it happens:** Developers set up Flask/FastAPI session middleware that defaults to filesystem or memory-backed session storage, test locally where it works fine (single process), then deploy to Vercel where every request potentially hits a different cold-started function instance.

**Consequences:** Auth is completely broken in production. Users cannot stay logged in. Every API call fails with 401.

**Prevention:**
- Use JWT tokens or signed cookies that encode session data client-side. The session data travels with every request in the cookie, requiring no server-side storage.
- If using a session store, it must be external: store sessions in Neon Postgres (a `sessions` table with token, user_id, expires_at).
- For a demo app, signed/encrypted cookie sessions (using something like `itsdangerous` or `python-jose`) are the simplest approach -- no extra DB queries per request.
- Set `Secure`, `HttpOnly`, `SameSite=Lax` cookie attributes.
- Test auth flow on the deployed Vercel URL, not just localhost.

**Detection:** If login works locally but fails on Vercel, this is almost certainly the cause. Check whether session middleware is using in-memory or filesystem storage.

**Phase relevance:** Phase 2 (auth) -- foundational, blocks all subsequent features.

### Pitfall 4: Neon Postgres Connection Exhaustion in Serverless

**What goes wrong:** Each Vercel serverless function invocation opens a new database connection. Under moderate load, this quickly exceeds Neon's connection limits. Users see "sorry, too many connections" errors. The app becomes unusable during demo traffic spikes.

**Why it happens:** Python's psycopg2 opens a new TCP connection per function invocation. Unlike a long-running server with a connection pool, serverless functions are ephemeral. Neon's free tier has limited connection slots. Developers test with one user locally and never hit the limit.

**Consequences:** App crashes under concurrent usage. Demo fails when multiple people try it simultaneously (e.g., after a LinkedIn post).

**Prevention:**
- Use Neon's built-in PgBouncer connection pooling: connect to the `-pooler` hostname, not the direct hostname. This is a one-character change in the connection string but critical.
- Use `psycopg2` with connection parameters that work well with PgBouncer transaction mode: avoid `SET` statements outside transactions, avoid prepared statements (use `prepare_threshold=0` if using psycopg).
- Keep database connections short-lived: open, query, close within each function invocation. Do not try to maintain persistent connections.
- Consider using `httpx` + Neon's HTTP query endpoint for ultra-simple cases (no connection overhead at all).

**Detection:** Monitor connection count in Neon dashboard. If it approaches the limit during testing with just 2-3 concurrent users, pooling is not configured correctly.

**Phase relevance:** Phase 2 (database setup) -- must use pooler endpoint from day one.

### Pitfall 5: Audit Trail That Can Be Circumvented

**What goes wrong:** The immutable audit trail -- the app's core differentiator solving the "assistant overwrites hygienist notes" problem -- is implemented with application-level logic only. A direct database UPDATE bypasses it entirely. Or the version history is stored in the same table as the current note, making it trivially mutable.

**Why it happens:** Developers implement "append-only" logic in the API layer but the database schema itself allows updates and deletes on audit records. For a demo this seems fine, but it undermines the entire pitch.

**Consequences:** The core value proposition ("immutable audit trail") is technically false. A savvy dental professional reviewing the app would notice.

**Prevention:**
- Store note versions in a separate `note_versions` table. The `notes` table holds only the current version pointer.
- Use a database trigger or a CHECK constraint to prevent UPDATE/DELETE on the `note_versions` table. Even a simple `CREATE RULE` that prevents deletes is better than nothing.
- Each version gets: `version_id`, `note_id`, `content`, `author_id`, `created_at`, `change_reason`. No `updated_at` column -- versions are never updated.
- The API never exposes an UPDATE endpoint for versions. Only INSERT.
- Display version diffs in the UI to make the audit trail visible and tangible.

**Detection:** Try to UPDATE a row in `note_versions` directly via SQL. If it succeeds, the audit trail is not truly immutable.

**Phase relevance:** Phase 3 (notes system) -- schema design must enforce immutability from the start.

## Moderate Pitfalls

### Pitfall 6: Vercel SPA Routing Conflicts with Python API Routes

**What goes wrong:** React Router handles client-side routing, but on page refresh or direct URL access, Vercel tries to find a matching file or function. Without proper configuration, `/patients/123` returns a 404 instead of loading the SPA. Worse, if the rewrite rule catches everything including `/api/*` paths, API calls return the React HTML instead of JSON.

**Prevention:**
- Configure `vercel.json` with ordered rewrites: API routes first, then SPA fallback:
  ```json
  {
    "rewrites": [
      { "source": "/api/:path*", "destination": "/api/:path*" },
      { "source": "/(.*)", "destination": "/index.html" }
    ]
  }
  ```
- Order matters: specific routes before wildcards.
- Test by directly navigating to a deep React route on the deployed URL. If you see a 404 or a blank page, the rewrite is wrong.

**Phase relevance:** Phase 1 (project setup/deployment) -- configure before any routing is built.

### Pitfall 7: Perio Data Model Too Normalized or Too Denormalized

**What goes wrong:** Over-normalizing the perio data (separate tables for each measurement type per site per tooth) creates an explosion of JOINs that makes queries for a full-mouth chart painfully slow. Under-normalizing (storing all 192 measurements as a JSON blob) makes trend queries across visits impossible without parsing JSON in every query.

**Prevention:**
- Use a `perio_measurements` table with one row per tooth per exam: `exam_id`, `tooth_number`, `site_mb`, `site_b`, `site_db`, `site_ml`, `site_l`, `site_dl` (6 integer columns for pocket depths). Add columns for `bleeding_mb` through `bleeding_dl` (6 booleans).
- This gives you 32 rows per exam (one per tooth), fast full-mouth queries with a single `WHERE exam_id = ?`, and easy trend queries with `GROUP BY tooth_number`.
- Store recession, mobility, and furcation as additional columns on the same row -- they are per-tooth, not per-site.
- Do NOT use EAV (Entity-Attribute-Value) patterns for clinical measurements. They are query nightmares.

**Phase relevance:** Phase 1 (tooth chart + database schema) -- schema affects every subsequent feature.

### Pitfall 8: Probing Depth Color Coding Uses Wrong Clinical Thresholds

**What goes wrong:** Developers pick arbitrary color thresholds (e.g., green < 3mm, red > 5mm) that do not match clinical standards. Dental professionals immediately notice wrong severity classifications and lose trust in the app.

**Prevention:**
- Use standard clinical thresholds:
  - 1-3mm: Green (healthy)
  - 4mm: Yellow (watch/gingivitis)
  - 5-6mm: Orange (moderate periodontitis)
  - 7mm+: Red (severe periodontitis)
- Bleeding on probing (BOP) should be indicated independently (red dot or highlight) -- it is the most important single indicator of active disease, even at shallow depths.
- A 4mm pocket WITH bleeding is clinically more concerning than a 5mm pocket without bleeding. Consider combining depth + BOP in the severity display.

**Phase relevance:** Phase 1 (tooth chart rendering) -- baked into the visual design.

### Pitfall 9: Demo Seed Data Looks Fake

**What goes wrong:** Seed data uses uniform pocket depths (all 3s, or random noise), no realistic clinical patterns. A dentist looking at the demo immediately sees it is fake data because real periodontal disease follows anatomical patterns: deeper pockets on molars, interproximal sites worse than facial/lingual, bilateral symmetry in disease progression.

**Prevention:**
- Create clinically plausible patient profiles:
  - Healthy patient: mostly 2-3mm, occasional 4mm on molars
  - Gingivitis patient: 3-4mm with high BOP percentage, no attachment loss
  - Localized periodontitis: 5-7mm pockets on specific teeth (first molars and incisors are common), healthy elsewhere
  - Generalized periodontitis: 4-7mm across most teeth, worse interproximally
- Show progression across visits: a patient in treatment should show improvement (e.g., 6mm dropping to 4mm after SRP)
- Include realistic CDT codes: D1110 (prophy), D4341 (SRP per quadrant), D4910 (perio maintenance)
- Use realistic patient demographics: mix of ages, with periodontitis patients trending older

**Phase relevance:** Final phase (seed data) -- but plan the data profiles early so the schema supports them.

### Pitfall 10: PDF Export Is an Afterthought

**What goes wrong:** PDF generation for the patient portal is left to the last phase, then discovered to be surprisingly hard in a serverless Python environment. Libraries like `weasyprint` or `reportlab` have heavy native dependencies that may exceed Vercel's 250MB package size limit or fail to install in the Python runtime.

**Prevention:**
- Use a lightweight PDF approach: generate HTML server-side, then convert with a minimal library. `fpdf2` (pure Python, no C dependencies) is the safest choice for Vercel serverless.
- Alternatively, generate PDFs client-side using `jspdf` + `html2canvas` in the React app, bypassing serverless limitations entirely. This is simpler for a demo.
- Do NOT try to install `weasyprint` or `wkhtmltopdf` on Vercel -- they require system libraries that are not available.
- Test PDF generation on Vercel early, not just locally.

**Phase relevance:** Phase 4 (patient portal) -- choose the approach before building the export feature.

## Minor Pitfalls

### Pitfall 11: Touch Targets Too Small on Tablet

**What goes wrong:** The 192 probing point inputs on the full-mouth chart are too small for finger taps on a tablet. Hygienists wearing gloves have even less touch precision. They hit the wrong site constantly and charting becomes frustrating.

**Prevention:**
- Minimum touch target: 44x44px (Apple HIG) for individual tap targets.
- For the full-mouth view, use a tap-to-select-tooth then show enlarged site inputs pattern, rather than trying to make all 192 points directly tappable.
- The tooth-level detail view (6 probing sites) should have generously sized tap targets that cycle through values 1-10 on each tap.
- Test with actual finger taps, not mouse clicks.

**Phase relevance:** Phase 1 (tooth chart UX design).

### Pitfall 12: CDT Code Data Is Not Freely Available

**What goes wrong:** Developers assume CDT (Current Dental Terminology) codes are freely available like ICD-10 codes. They are not -- CDT codes are copyrighted by the ADA and require a license to distribute the full set. Embedding the full CDT code list in a public demo app could be a copyright issue.

**Prevention:**
- Include only the 10-15 most common hygiene-related CDT codes in the demo, presented as example data:
  - D0120 (periodic oral evaluation), D0150 (comprehensive oral evaluation)
  - D1110 (prophylaxis - adult), D1120 (prophylaxis - child)
  - D4341 (periodontal scaling/root planing, per quadrant)
  - D4342 (periodontal scaling/root planing, 1-3 teeth per quadrant)
  - D4910 (periodontal maintenance)
  - D4355 (full mouth debridement)
- Label them as "common codes for demonstration" not "complete CDT database."

**Phase relevance:** Phase 3 (treatment plans) -- know the limitation before designing the code lookup UI.

### Pitfall 13: Role-Based Access Checked Only in the Frontend

**What goes wrong:** Role checks (hygienist vs. dentist vs. patient) are implemented only in the React UI (hiding buttons, conditional rendering). The API endpoints accept any authenticated request regardless of role. A patient could call `/api/patients` and see all patients, or modify another patient's records.

**Prevention:**
- Enforce roles in EVERY API endpoint with a decorator or middleware: `@require_role("hygienist", "dentist")`.
- The frontend role checks are for UX only (showing/hiding UI elements). The backend is the source of truth.
- Patients should only access their own data. Every patient-facing endpoint must filter by the authenticated user's patient ID.
- Write a simple test: call a dentist-only endpoint with a patient session token. If it returns 200, you have a bug.

**Phase relevance:** Phase 2 (auth + roles) -- bake role enforcement into the API middleware from the start.

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Project setup + Vercel config | SPA routing conflicts with API routes (#6) | Configure `vercel.json` rewrites before writing any routes |
| SVG tooth chart | Performance death by re-renders (#1) | Separate static/interactive SVG layers, memo aggressively |
| SVG tooth chart | Wrong tooth numbering (#2) | Verify Universal Numbering against reference diagram |
| SVG tooth chart | Wrong clinical color thresholds (#8) | Use standard clinical thresholds, not arbitrary values |
| SVG tooth chart | Touch targets too small (#11) | Design for 44px minimum, test on real tablet |
| Database schema | Perio data model wrong (#7) | One row per tooth per exam, 6 columns per measurement type |
| Database schema | Connection exhaustion (#4) | Use Neon pooler endpoint from day one |
| Auth system | Sessions break in serverless (#3) | Use signed cookies or DB-backed sessions, not memory/filesystem |
| Auth system | Frontend-only role checks (#13) | Enforce roles in API middleware |
| Notes system | Audit trail circumventable (#5) | Separate versions table, DB-level immutability constraints |
| Treatment plans | CDT code licensing (#12) | Include only common codes, label as demo data |
| Patient portal | PDF generation fails on Vercel (#10) | Use fpdf2 or client-side jspdf, not weasyprint |
| Seed data | Fake-looking clinical data (#9) | Create clinically plausible patient profiles |

## Sources

- [Felt: From SVG to Canvas - performance analysis](https://www.felt.com/blog/from-svg-to-canvas-part-1-making-felt-faster)
- [Dental notation systems - Wikipedia](https://en.wikipedia.org/wiki/Dental_notation)
- [Open Dental - Perio Chart documentation](https://opendental.com/manual/perio.html)
- [Vercel: How to improve cold start performance](https://vercel.com/kb/guide/how-can-i-improve-serverless-function-lambda-cold-start-performance-on-vercel)
- [Vercel: Understanding cookies](https://vercel.com/blog/understanding-cookies)
- [Neon: Connection pooling documentation](https://neon.com/docs/connect/connection-pooling)
- [DEV Community: Immutable audit logs for health SaaS](https://dev.to/beck_moulton/immutable-by-design-building-tamper-proof-audit-logs-for-health-saas-22dc)
- [Colgate Professional: Periodontal Probing Back to Basics](https://www.colgateprofessional.com/hygienist-resources/tools-resources/periodontal-probing-back-to-basics)
- [Fixing React Router issues on Vercel](https://medium.com/@simonsruggi/fixing-react-router-issues-on-vercel-how-to-handle-client-side-routing-and-404-errors-f607aa0c9bfe)
- [Vercel Python serverless functions: reducing size of dependencies](https://community.vercel.com/t/python-serverless-functions-reducing-size-of-dependencies/1765)
- [jacobwalkr/dental-chart: SVG dental charting on GitHub](https://github.com/jacobwalkr/dental-chart)
- [RDH Magazine: Standard of care for periodontal charting](https://www.rdhmag.com/patient-care/article/14074016/standard-of-care-for-periodontal-charting)
