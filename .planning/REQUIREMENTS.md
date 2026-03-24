# Requirements: PerioPulse

**Defined:** 2026-03-24
**Core Value:** Hygienists can chart periodontal findings fast and accurately through an interactive tooth chart, with immutable audit trails that prevent note overwrites.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Authentication & Roles

- [ ] **AUTH-01**: User can log in with email and password
- [ ] **AUTH-02**: User session persists across browser refresh
- [ ] **AUTH-03**: User can log out from any page
- [ ] **AUTH-04**: Role-based access control enforced (hygienist, dentist, admin, patient)
- [ ] **AUTH-05**: Multi-provider practice support (users belong to a practice)

### Patient Management

- [ ] **PAT-01**: Staff can view patient list with search by name
- [ ] **PAT-02**: Staff can create new patient records
- [ ] **PAT-03**: Staff can view patient details and visit history

### Tooth Chart

- [ ] **CHART-01**: Interactive SVG rendering of full adult dentition (32 teeth, Universal numbering)
- [ ] **CHART-02**: Click a tooth to select it and record findings
- [ ] **CHART-03**: Record 6-point probing depths per tooth (MB, B, DB, ML, L, DL)
- [ ] **CHART-04**: Record bleeding on probing (BOP) per site as toggle
- [ ] **CHART-05**: Record recession/gingival margin per site
- [ ] **CHART-06**: Record tooth mobility (0-3 scale per tooth)
- [ ] **CHART-07**: Record furcation involvement (0-3 scale, multi-rooted teeth only)
- [ ] **CHART-08**: Color-coded severity visualization (green/yellow/orange/red based on pocket depth)
- [ ] **CHART-09**: Fast click/tap cycling entry for probing values (not typing)
- [ ] **CHART-10**: Full-mouth perio chart view showing all 192 probing points in grid layout

### Clinical Notes

- [ ] **NOTE-01**: Hygienist can create visit notes (perio maintenance, prophy, SRP, etc.)
- [ ] **NOTE-02**: Notes are immutable after creation — edits create new versions
- [ ] **NOTE-03**: Full version history visible: who changed what, when
- [ ] **NOTE-04**: Role-based editing: only author can edit same-day, then append-only
- [ ] **NOTE-05**: Visual diff between note versions

### Treatment Plans

- [ ] **TREAT-01**: Create treatment plans linked to specific teeth
- [ ] **TREAT-02**: Status workflow: proposed → accepted → in-progress → completed
- [ ] **TREAT-03**: Associate CDT billing codes with procedures
- [ ] **TREAT-04**: Patient can view and accept/decline treatment plans from portal

### Patient Portal

- [ ] **PORTAL-01**: Patient can log in and see their dental history across all visits
- [ ] **PORTAL-02**: Patient can download records as PDF
- [ ] **PORTAL-03**: Patient can view upcoming treatment plans
- [ ] **PORTAL-04**: Patient can see perio trends over time (pocket depth improvement/decline charts)

### Dashboard & Analytics

- [ ] **DASH-01**: Practice overview showing patients seen today and upcoming appointments
- [ ] **DASH-02**: Perio trends: average pocket depths across patient population
- [ ] **DASH-03**: Hygienist productivity: patients per day, charting completion rate
- [ ] **DASH-04**: Treatment plan acceptance rate

### Demo Data

- [ ] **DEMO-01**: Seed practice "Bright Smile Dental" with 4 staff and 20 patients
- [ ] **DEMO-02**: Historical charting data going back 6 months with improvement/decline trends
- [ ] **DEMO-03**: Treatment plans in various states (proposed, accepted, in-progress, completed)
- [ ] **DEMO-04**: Audit trail examples showing note edit history
- [ ] **DEMO-05**: Four demo login accounts (hygienist, dentist, admin, patient)

## v2 Requirements

### Notifications

- **NOTF-01**: In-app notifications for note edits on shared patients
- **NOTF-02**: Email notification when treatment plan status changes

### Advanced Charting

- **ACHART-01**: Overlay previous exam data (grayed out) for comparison
- **ACHART-02**: Configurable pocket depth thresholds for color coding
- **ACHART-03**: Print-friendly perio chart layout

## Out of Scope

| Feature | Reason |
|---------|--------|
| Voice-activated charting | Entire companies (Bola AI, Denti.AI) dedicated to this — too complex for showcase |
| Real-time scheduling/calendar | Massive complexity, not core to charting value |
| Insurance claims submission | Requires EDI integration and clearinghouse connections |
| HIPAA compliance infrastructure | Demo/showcase app, not production medical software |
| AI-powered diagnostics | Requires ML models, radiograph analysis, FDA considerations |
| Multi-practice federation | Complex identity/data sharing — single practice for v1 |
| Patient messaging/chat | WebSocket infrastructure not core to charting |
| Mobile native app | Responsive web sufficient for showcase |
| Radiograph/X-ray integration | DICOM handling is a separate specialty |
| E-prescriptions | DEA registration requirements, not relevant to hygiene |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| (Populated during roadmap creation) | | |

**Coverage:**
- v1 requirements: 34 total
- Mapped to phases: 0
- Unmapped: 34 ⚠️

---
*Requirements defined: 2026-03-24*
*Last updated: 2026-03-24 after initial definition*
