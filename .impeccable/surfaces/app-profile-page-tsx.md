---
version: 1
slug: "app-profile-page-tsx"
primary_target: "app/profile/page.tsx"
related_targets: ["app/page.tsx","app/layout.tsx"]
---

# Surface: app shell, CV upload (first run), profile

Mode: Operate. Audience: the owner, a developer in Vietnam, on a laptop in the evening at home. Job: upload CV once, check and correct the profile the app read from it. Later surfaces (job board, tracker, sources) inherit this world.

## Direction contract

THESIS: Jobs are departures and the profile is your boarding pass. The app refuses the SaaS card dashboard: one dark board ground, rows divided by hairlines, segmented documents instead of cards.

OWN-WORLD: Evening board palette: ink ground #0f1215, raised slate panel #171b20, hairline #2a3038, paper text #ecebe6, steel secondary #8a929c, one signal yellow #f2c230 used only for the primary action, "new/changed" state and focus. Be Vietnam Pro for all words; JetBrains Mono only for figures (scores, times, counts, years, salary). Small tracked uppercase labels above values, like pass segment captions. Square-ish 6px radii, no shadows, no gradients.

STORY: The visitor understands the app reads the CV locally, sees what it read laid out as a pass, corrects it in place, and trusts it is saved.

FIRST VIEWPORT: Top bar (brand left, mono status line right: job count and last update). First run: left column heading + one line of purpose; right, a large dashed "pass stub" drop zone for the PDF with the primary yellow button. Profile: a segmented pass across the content width (Skills | Roles | Locations | Years | Min salary) with captions, editable in place, Save as the single yellow action.

FORM: Challenger "boarding pass and gate board" (catalog vernacular-ephemera-boarding-pass-and-gate-board), chosen by the user over the assigned direction; seed:2562e4614041e9c5. Signature move: a changed or new value is lit signal yellow and stays lit until seen (saved state on the profile; new jobs on the future board).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
