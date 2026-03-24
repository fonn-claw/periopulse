# Feature Landscape

**Domain:** Dental hygiene charting and periodontal treatment tracking
**Researched:** 2026-03-24

## Table Stakes

Features users expect from any dental charting product. Missing = product feels incomplete or unprofessional.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Interactive tooth chart (32 teeth, numbered) | Every dental PMS has one. Hygienists will not use software without visual tooth selection. | High | SVG-based, must render all 32 teeth with click targets. This is the hero feature. |
| 6-point probing depths per tooth | Standard periodontal exam records mesiobuccal, buccal, distobuccal, mesiolingual, lingual, distolingual. 192 total points. | Medium | Data entry speed is critical -- auto-advance between fields like CareStack/Curve. |
| Bleeding on probing (BOP) | Binary per-site indicator. Every perio chart records this. Industry standard measurement. | Low | Toggle on/off per probing site. Show as red dot or marker. |
| Recession / gingival margin | Recorded alongside probing to calculate Clinical Attachment Loss (CAL). Standard perio metric. | Medium | CAL = probing depth + recession. Auto-calculate and display. |
| Mobility scoring | Per-tooth mobility (0-3 scale). Standard clinical finding. | Low | Single value per tooth, not per-site. |
| Furcation involvement | Multi-rooted teeth only (molars). Scale 0-3. Standard for perio assessment. | Low | Only applies to ~12 teeth. Must know which teeth are multi-rooted. |
| Color-coded severity visualization | CareStack, Curve, Open Dental all use color coding. Users expect instant visual assessment. | Medium | Green/yellow/orange/red mapping to pocket depth ranges (1-3mm, 4mm, 5-6mm, 7+mm). |
| Clinical notes per visit | SOAP-style or narrative notes. Every PMS has this. The dental record is a legal document per ADA guidelines. | Medium | Must support structured note types: prophy, perio maintenance, SRP, etc. |
| Patient list / search | Basic patient management. Cannot chart without selecting a patient. | Low | Name search, DOB, patient ID. |
| Role-based access control | Hygienists, dentists, admins, patients all need different views and permissions. Standard in every dental PMS. | Medium | Four roles as specified in brief. |
| Treatment plan with status workflow | Proposed, accepted, in-progress, completed. Every PMS tracks treatment plans. | Medium | Link to specific teeth. Track CDT codes. |
| Visit history / charting history | Clinicians need to compare current exam to previous. Open Dental shows up to 5 prior exams grayed out alongside current. | Medium | Time-series view of perio data is essential for tracking disease progression. |
| Responsive / tablet-friendly | Hygienists chart at chair-side on tablets. Non-negotiable for modern dental software. | Medium | Touch targets must be large enough for tap entry of probing values. |

## Differentiators

Features that set PerioPulse apart. Not expected in every product, but highly valued when present.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Immutable note audit trail | Solves the #1 hygienist complaint: "my notes get overwritten by someone else." Edits create versions, not overwrites. Full history of who changed what. This is rare -- most PMS systems allow destructive edits. | Medium | Open Dental has an audit trail but it is a log table, not versioned documents. PerioPulse makes this a first-class UX feature with visual diffs. |
| Role-based note protection | Only the note author can edit same-day; after that, append-only. Prevents the specific "assistant overwrites hygienist notes" problem from Reddit complaints. | Low | Business rule on top of the audit trail. Low code complexity but high perceived value. |
| Patient-owned portal with trend visualization | Most patient portals are practice-locked (Dentrix portal only works with Dentrix). A patient-owned view showing perio trends over time is genuinely novel. | High | Line charts showing pocket depth trends, BOP percentage over visits. Patients see "am I getting better?" |
| PDF record download for patients | Patients can export their own records. Supports portability between practices. Most portals do not offer self-service download. | Medium | Generate PDF with tooth chart, perio data, notes, treatment history. |
| Full-mouth perio chart view (192 points) | Displaying all probing data in a single grid view like a traditional paper perio chart. Curve and CareStack offer this but many simpler tools do not. | High | Classic 6-column-per-tooth grid layout. Must be readable and fast to fill in. |
| Practice analytics dashboard | Treatment plan acceptance rate, perio trends across population, hygienist productivity. CareStack and Adit offer this but smaller tools do not. | Medium | Aggregated metrics. Not real-time -- daily/weekly summaries are fine. |
| CDT code association with procedures | Link billing codes to treatment plan items. Bridges clinical and billing workflows. | Low | Reference data (CDT codes are a known list). Display code + description on treatment plans. |
| Patient treatment plan acceptance | Patients can view and accept/decline treatment plans from their portal. Reduces front-desk phone calls. | Low | Simple accept/decline buttons in patient portal. Notification to practice. |
| Fast click/tap cycling entry | Instead of typing pocket depths, tap to cycle 1-2-3-4-5-6-7+. Curve claims 3.5x faster charting with optimized entry. | Medium | Critical UX differentiator. Must feel faster than typing numbers. Touch-optimized. |

## Anti-Features

Features to explicitly NOT build. Either out of scope, too complex for a showcase, or actively harmful.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Voice-activated charting | Bola AI and Denti.AI are building entire companies around this with 99.9% accuracy claims. Requires speech recognition, dental terminology models, and extensive testing. Way too complex for a showcase app. | Optimize click/tap entry instead. Fast manual entry is the right scope. |
| Real-time scheduling / calendar | Adds massive complexity (time slots, conflicts, recurring appointments, reminders). Not core to the charting value proposition. Every major PMS already does this. | Show "upcoming appointments" as static data in dashboard. Do not build a scheduler. |
| Insurance claims submission | Requires EDI integration, clearinghouse connections, ERA processing. This is an entire product category (DentalXChange, Tesia). | Track CDT codes on treatment plans. Display them. Do not submit claims. |
| HIPAA compliance infrastructure | Encryption at rest, BAA agreements, audit logging to compliance standards, breach notification. This is a demo/showcase app. | Note in UI that this is a demo. Do not claim HIPAA compliance. |
| AI-powered diagnostics | AI periodontal assessment (ai.dentist) requires radiograph analysis, ML models, FDA clearance considerations. | Use simple threshold-based color coding (pocket depth > 4mm = yellow, etc.). |
| Multi-practice federation | Allowing patients to link records across multiple practices requires identity verification, data sharing agreements, complex auth. | Single practice with patient portal. Patient sees their history within that practice. |
| Patient messaging / chat | Real-time messaging requires WebSocket infrastructure, notification systems, read receipts. Not core to charting. | No in-app messaging. Treatment plan acceptance is the only patient-to-practice interaction. |
| Mobile native app | React Native or native iOS/Android adds build complexity, app store deployment, platform-specific bugs. | Responsive web design works on tablets and phones. Progressive enhancement sufficient for showcase. |
| Radiograph / X-ray integration | DICOM image handling, viewer integration, storage requirements. Entire specialty (Dexis, Schick). | Out of scope entirely. Perio charting does not require images for the demo. |
| E-prescriptions | DEA registration, state pharmacy board integration, drug interaction databases. | Out of scope. Not relevant to hygiene charting. |

## Feature Dependencies

```
Auth & Roles (foundation)
  --> Patient List / Search
    --> Interactive Tooth Chart
      --> 6-Point Probing Entry
        --> BOP, Recession, Mobility, Furcation (extend probing model)
      --> Color-Coded Severity (requires probing data)
      --> Full-Mouth Perio Chart View (requires probing data)
    --> Clinical Notes
      --> Immutable Audit Trail (extends notes)
      --> Role-Based Note Protection (extends audit trail)
    --> Visit History (requires charting + notes data)
    --> Treatment Plans
      --> CDT Code Association (extends treatment plans)
      --> Patient Treatment Plan Acceptance (extends treatment plans + patient portal)
  --> Patient Portal
    --> Trend Visualization (requires historical charting data)
    --> PDF Record Download (requires charting + notes data)
  --> Practice Dashboard & Analytics (requires all clinical data)
```

## MVP Recommendation

Build in this priority order, based on dependencies and demo impact:

### Phase 1: Foundation
1. **Auth & Roles** -- everything depends on this
2. **Patient list/search** -- cannot chart without patients

### Phase 2: Hero Feature (Charting)
3. **Interactive tooth chart** -- the visual centerpiece, highest demo impact
4. **6-point probing entry with fast tap cycling** -- the core clinical workflow
5. **BOP, recession, mobility, furcation** -- complete the clinical data model
6. **Color-coded severity** -- makes the chart visually impressive
7. **Full-mouth perio chart view** -- the "wow" view for LinkedIn showcase

### Phase 3: Clinical Workflow
8. **Clinical notes with audit trail** -- the key differentiator
9. **Role-based note protection** -- completes the audit story
10. **Visit history** -- compare exams over time
11. **Treatment plans with CDT codes** -- standard clinical workflow

### Phase 4: Patient Experience & Analytics
12. **Patient portal with trend visualization** -- the "patient-owned" story
13. **PDF record download** -- portability proof
14. **Patient treatment plan acceptance** -- interactive patient engagement
15. **Practice dashboard & analytics** -- polished overview for admin role

**Defer entirely:** Voice charting, scheduling, insurance, HIPAA, AI diagnostics, multi-practice, messaging, native mobile, imaging, e-prescriptions.

## Sources

- [CareStack Periodontal Charting](https://carestack.com/dental-software/features/periodontal-charting) -- Feature reference for probing templates, auto-advance, color customization
- [Curve Dental Perio Charting](https://www.curvedental.com/perio-charting) -- 6 charting pathways, voice integration, 3.5x speed claim
- [Open Dental Perio Chart](https://opendental.com/manual/perio.html) -- Industry standard perio chart layout, 5-exam history display
- [Open Dental Graphical Perio Chart](https://opendental.com/manual/graphicalperiochart.html) -- 3D visualization, export/print
- [Open Dental Audit Trail](https://www.opendental.com/manual/audittrail.html) -- Existing audit trail capabilities (log-based, not versioned)
- [ADA: Writing in the Dental Record](https://www.ada.org/resources/practice/practice-management/writing-in-the-dental-record) -- Legal requirements for dental documentation, no-alteration rules
- [ADA CDT Codes](https://www.ada.org/publications/cdt) -- Official CDT code structure and annual update cycle
- [Bola AI Voice Perio](https://bola.ai/solutions/voice-perio/) -- Voice charting complexity reference (why to avoid building this)
- [Denti.AI Voice Perio](https://www.denti.ai/voice) -- Solo charting in under 5 minutes, AI-driven accuracy
- [Adit Top Dental Software 2026](https://adit.com/top-10-dental-software-in-2026) -- Market landscape, feature expectations
- [CareStack Patient Portal](https://carestack.com/dental-software/features/patient-portal) -- Patient portal feature baseline
