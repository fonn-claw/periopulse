# Roadmap: PerioPulse

## Overview

PerioPulse delivers a dental charting web application in four phases: foundation infrastructure (auth, database, patient management), the hero interactive tooth chart, clinical workflow features (notes with audit trails, treatment plans), and finally the patient portal, practice dashboard, and polished demo data. Each phase builds on the previous, with the tooth chart as the architectural centerpiece.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Foundation** - Database schema, auth system with 4 roles, patient CRUD, Vercel deployment pipeline
- [ ] **Phase 2: Interactive Tooth Chart** - SVG tooth chart with 6-point probing, color-coded severity, fast tap entry, full-mouth view
- [ ] **Phase 3: Clinical Workflow** - Immutable note system with audit trail, treatment plans with CDT codes and status workflow
- [ ] **Phase 4: Portal, Dashboard & Demo Data** - Patient portal with trends, practice analytics dashboard, PDF export, seeded demo data

## Phase Details

### Phase 1: Foundation
**Goal**: Staff can log in with role-appropriate access, manage patients, and the full tech stack is deployed and working end-to-end on Vercel
**Depends on**: Nothing (first phase)
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, PAT-01, PAT-02, PAT-03
**Success Criteria** (what must be TRUE):
  1. User can log in with email/password and is redirected to a role-appropriate view
  2. User session persists across browser refresh without re-login
  3. Staff can search patients by name and view a patient list
  4. Staff can create a new patient and view that patient's detail page
  5. Unauthorized routes redirect to login; role-restricted pages are inaccessible to wrong roles
**Plans**: TBD

Plans:
- [ ] 01-01: TBD
- [ ] 01-02: TBD

### Phase 2: Interactive Tooth Chart
**Goal**: Hygienists can perform fast, accurate periodontal charting on a visually stunning interactive tooth chart that is the application's centerpiece
**Depends on**: Phase 1
**Requirements**: CHART-01, CHART-02, CHART-03, CHART-04, CHART-05, CHART-06, CHART-07, CHART-08, CHART-09, CHART-10
**Success Criteria** (what must be TRUE):
  1. All 32 teeth render as an interactive SVG with Universal Numbering, and clicking a tooth opens a findings panel
  2. Hygienist can record 6-point probing depths, BOP, recession, mobility, and furcation for any tooth using tap-cycling (no keyboard required)
  3. Teeth are color-coded by severity (green/yellow/orange/red) and update in real-time as values are entered
  4. Full-mouth perio chart view displays all 192 probing points in a readable grid layout
  5. Charting data persists to the database and is visible on subsequent patient visits
**Plans**: TBD

Plans:
- [ ] 02-01: TBD
- [ ] 02-02: TBD

### Phase 3: Clinical Workflow
**Goal**: Clinical staff can create immutable visit notes with full audit history and manage treatment plans through their complete lifecycle
**Depends on**: Phase 2
**Requirements**: NOTE-01, NOTE-02, NOTE-03, NOTE-04, NOTE-05, TREAT-01, TREAT-02, TREAT-03, TREAT-04
**Success Criteria** (what must be TRUE):
  1. Hygienist can create a visit note and see it locked after creation; editing produces a new version while the original remains intact
  2. Full version history is visible showing who changed what and when, with visual diff between versions
  3. Only the note author can edit within the same day; after that, anyone with access can only append
  4. Treatment plans can be created linked to specific teeth, with CDT codes and status transitions (proposed through completed)
  5. Patient can view treatment plans from the portal and accept or decline them
**Plans**: TBD

Plans:
- [ ] 03-01: TBD
- [ ] 03-02: TBD

### Phase 4: Portal, Dashboard & Demo Data
**Goal**: Patients own their dental history through a self-service portal, the practice has actionable analytics, and the application is fully seeded with realistic demo data for showcase
**Depends on**: Phase 3
**Requirements**: PORTAL-01, PORTAL-02, PORTAL-03, PORTAL-04, DASH-01, DASH-02, DASH-03, DASH-04, DEMO-01, DEMO-02, DEMO-03, DEMO-04, DEMO-05
**Success Criteria** (what must be TRUE):
  1. Patient can log in and see their complete dental history across all visits, including perio trend charts showing improvement or decline
  2. Patient can download their records as a PDF document
  3. Practice dashboard shows today's patients, perio population trends, hygienist productivity metrics, and treatment plan acceptance rates
  4. Demo data includes "Bright Smile Dental" with 4 staff, 20 patients, 6 months of charting history, treatment plans in various states, and audit trail examples
  5. All four demo accounts (hygienist, dentist, admin, patient) work and show role-appropriate views
**Plans**: TBD

Plans:
- [ ] 04-01: TBD
- [ ] 04-02: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 0/? | Not started | - |
| 2. Interactive Tooth Chart | 0/? | Not started | - |
| 3. Clinical Workflow | 0/? | Not started | - |
| 4. Portal, Dashboard & Demo Data | 0/? | Not started | - |
