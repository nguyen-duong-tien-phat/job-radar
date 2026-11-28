---
name: Job Radar
description: Local, explainable IT job matching against your own CV, read like an evening departures board.
colors:
  ink: "#0f1215"
  slate: "#171b20"
  seam: "#2a3038"
  seam-strong: "#3a424d"
  paper: "#ecebe6"
  steel: "#8a929c"
  signal: "#f2c230"
  signal-bright: "#ffd24d"
  signal-dim: "#3a3116"
  alert: "#ff8a7a"
typography:
  display:
    fontFamily: "Be Vietnam Pro, system-ui, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 600
    lineHeight: 1.11
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "Be Vietnam Pro, system-ui, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Be Vietnam Pro, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 500
    lineHeight: 1.55
  body:
    fontFamily: "Be Vietnam Pro, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.55
  body-sm:
    fontFamily: "Be Vietnam Pro, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.43
  label:
    fontFamily: "Be Vietnam Pro, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 500
    letterSpacing: "0.12em"
  figure-lg:
    fontFamily: "JetBrains Mono, ui-monospace, monospace"
    fontSize: "2.25rem"
    fontWeight: 500
    lineHeight: 1
    fontFeature: "tnum"
  figure:
    fontFamily: "JetBrains Mono, ui-monospace, monospace"
    fontSize: "13px"
    fontWeight: 400
    fontFeature: "tnum"
rounded:
  md: "6px"
spacing:
  xs: "8px"
  sm: "16px"
  md: "24px"
  lg: "40px"
  xl: "64px"
components:
  button-primary:
    backgroundColor: "{colors.signal}"
    textColor: "{colors.ink}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.md}"
    padding: "0 20px"
    height: "40px"
  button-primary-hover:
    backgroundColor: "{colors.signal-bright}"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.paper}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.md}"
    padding: "0 20px"
    height: "40px"
  button-secondary-hover:
    backgroundColor: "{colors.seam}"
  pass:
    backgroundColor: "{colors.slate}"
    rounded: "{rounded.md}"
  pass-segment:
    padding: "20px 24px"
  chip:
    textColor: "{colors.paper}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.md}"
    padding: "0 12px"
    height: "32px"
  chip-changed:
    textColor: "{colors.signal}"
  input-text:
    backgroundColor: "transparent"
    textColor: "{colors.paper}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.md}"
    padding: "0 12px"
    height: "36px"
  status-saved:
    backgroundColor: "{colors.signal-dim}"
    textColor: "{colors.signal}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.md}"
    padding: "6px 12px"
---

# Design System: Job Radar

## Overview

**Creative North Star: "The Evening Gate Board"**

Jobs are departures and the profile is a boarding pass. The whole app sits on one dark ink ground, the way a gate board glows in a terminal at night: rows divided by hairlines, information grouped into segmented documents rather than floating cards, and a single signal yellow that marks what you can act on or what has just changed. It is read in the evening, on a laptop, carefully; the surface is calm and finite, never a dashboard.

Density is moderate and deliberate. Words are set in Be Vietnam Pro (full Vietnamese coverage); every figure (counts, times, years, salary, file size, step numbers) is set in JetBrains Mono with tabular numerals, so numbers read like printed fields on a ticket. Small tracked uppercase captions sit above values, exactly as segment captions sit on a pass. Corners are square-ish, there are no shadows and no gradients; depth comes from one raised slate panel and hairline seams.

The signature behavior: a value that differs from what is saved, or that just got saved, is lit signal yellow and stays lit until it has been seen.

**Key Characteristics:**
- One dark ground (ink), one raised plane (slate), hairline seams for all structure.
- One accent, signal yellow, reserved for the primary action, changed/new state, and focus.
- Words in Be Vietnam Pro; figures in JetBrains Mono, tabular.
- Tracked uppercase captions over values, pass-segment style.
- 6px corners everywhere; dashed borders mark tear-off stubs (drop zones, the replace-CV section).
- Flat: no shadows, no gradients, no decorative motion.

## Colors

A near-black evening palette of cool neutrals with a single warm signal.

### Primary
- **Signal Yellow** (#f2c230): the only accent. Primary button fill, focus outlines, text caret, selection, and every "changed / new / just saved" state (lit captions, new skill chips, edited figures, newly toggled options).
- **Signal Bright** (#ffd24d): hover fill of the primary button only.
- **Signal Dim** (#3a3116): background of the saved-status note, behind Signal Yellow text.

### Neutral
- **Board Ink** (#0f1215): page ground and the text color on the yellow button.
- **Raised Slate** (#171b20): the pass panel and the large first-run drop zone; the only raised plane.
- **Hairline Seam** (#2a3038): header rule, pass segment dividers, list row rules; hover fill on secondary controls.
- **Strong Seam** (#3a424d): resting borders of chips, inputs, secondary buttons and dashed stubs; scrollbar thumb.
- **Paper** (#ecebe6): primary text and selected toggle borders.
- **Steel** (#8a929c): secondary text, captions, units, unselected options, hover border on neutral controls.

### Alert
- **Alert Coral** (#ff8a7a): upload errors only (error text and the drop zone border on error).

### Named Rules
**The One Signal Rule.** Signal yellow means exactly three things: the primary action, something new or changed, and focus. If a yellow element is none of these, it is wrong.

**The Lit Until Seen Rule.** A changed value turns signal yellow (border and text) as soon as it differs from the saved state, and a just-saved field lights its caption with a short "vừa cập nhật" note. Removed items stay visible in steel with a line-through and signal border until saved.

## Typography

**Display Font:** Be Vietnam Pro (with system-ui, sans-serif), weights 400 / 500 / 600
**Label/Mono Font:** JetBrains Mono (with ui-monospace, monospace), weights 400 / 500, figures only

**Character:** A clear humanist sans that handles Vietnamese diacritics cleanly, paired with a mono used strictly as the ticket's printed numerals.

### Hierarchy
- **Display** (600, 1.875rem mobile to 2.25rem from sm, tight tracking, balanced): one page heading per screen.
- **Headline** (600, 1.875rem, tight tracking): page titles such as "Profile".
- **Title** (500, 1.125rem): section headings inside a page ("Đổi CV").
- **Body** (400, 15px, 1.55): base text; descriptions capped near 28 to 36rem.
- **Body small** (400, 0.875rem): controls, chips, buttons, helper and status text.
- **Label** (500, 11px, 0.12em tracking, uppercase, steel): pass-segment captions above a value.
- **Figure** (JetBrains Mono, tabular): inline counts and timestamps at 13px; editable pass values at 1.875rem to 2.25rem, weight 500, leading 1.

### Named Rules
**The Printed Figures Rule.** Any number the user reads as data (time, count, years, salary, size, step index) is set in the mono with tabular numerals. Words never are.

**The Caption Labels a Value Rule.** The uppercase caption names the field or value directly beneath it, as on a pass. It is never a decorative eyebrow above a heading.

## Layout

With a profile, the app is one screen: max 90rem, a 22rem profile pass on the left and the job board on the right, each scrolling on its own inside the viewport (lg and up). Below lg they stack, board first, profile after; the board switches its row layout by its own width (container query at 48rem). Before a CV exists, the upload page is a two-column 1:1.15 split, max 72rem. Gutters: 16px on mobile, 32px from sm up. No header: the screen is the profile and the board. A settings button (sliders icon, 36px, seam border) sits at the right end of the board's title row and opens a native dialog: slate panel, seam border, fieldset sections with captions, one primary Save. Two themes share the token names: dark (the evening board) and light (ground #f4f3ef, pass #ffffff, seams #e2e0d9/#c9c6bd, text #16191d, secondary #5c636c, accent #c2410c orange). Both themes add role colours that carry data, never decoration: good (scores 75+, matched skills, official sources), warm (scores 55–74), rose (missing skills), cool (remote, profile skill chips); each has a -dim tint for pill backgrounds, chosen in Settings and set as data-theme on <html>.

Two-column split on large screens uses a 1 : 1.15 ratio with an 80px column gap (first-run hero and the replace-CV section); it stacks below lg. Vertical rhythm steps through 8 / 16 / 24 / 40 / 64px: 40px between heading block and the pass, 64px before the replace-CV section. Lists are rows separated by hairlines, with a fixed 2.5rem mono index column.

The pass panel divides into segments: a full-width header strip, a full-width Skills segment, then two-up rows (Roles | Locations from md, Years | Salary always two-up), split by hairline dividers rather than gaps.

## Elevation & Depth

Flat. There are no shadows anywhere. Depth is tonal: the ink ground, one raised slate plane for the pass and the first-run drop zone, and hairline seams for every division. Hover never lifts; it changes border or fill color.

### Named Rules
**The No-Lift Rule.** No box-shadow, no gradient, no blur. Structure is drawn with 1px seams; emphasis is drawn with signal color.

## Shapes

One radius: 6px on panels, buttons, chips, inputs, the status note and drop zones. Borders are 1px solid seams; dashed 1px Strong Seam borders mark a tear-off stub (CV drop zones and the rule above the replace-CV section). Editable figures use a bottom border only, like a filled-in field on a form. Small inline SVG strokes (1.5px, round caps) are used for check and remove marks.

## Components

### Buttons
Compact and solid; one yellow per screen.
- **Shape:** gently squared (6px), 40px tall, 20px horizontal padding, 14px text.
- **Primary:** Signal Yellow fill with ink text, semibold. One per screen: the screen's commit action.
- **Hover / Focus:** fill brightens to Signal Bright; focus is a 2px signal outline offset 2px. Disabled shows a wait cursor at 60% opacity.
- **Secondary:** transparent with a Strong Seam border and paper text, medium weight; hover adds a Seam fill and a Steel border.

### Chips (skills)
- **Style:** 32px tall, Strong Seam border, paper text, with an attached 32px remove button (steel x, Seam fill on hover).
- **State:** a chip added but not yet saved has a signal border and signal text.

### Toggles (roles, locations)
- **Style:** chip-shaped checkbox labels with a small check mark shown only when selected.
- **State:** selected is paper border and paper text; unselected is Strong Seam border and steel text. Turning one on unsaved lights signal; turning a saved one off shows steel, line-through, signal border.

### Cards / Containers (the Pass)
- **Corner Style:** 6px.
- **Background:** Raised Slate on ink.
- **Shadow Strategy:** none (see Elevation).
- **Border:** 1px Seam outline; internal segments divided by 1px Seam rules.
- **Internal Padding:** 20px vertical, 20px to 24px horizontal per segment; a header strip with a caption left and mono meta right.

### Inputs / Fields
- **Text input:** 36px, transparent, Strong Seam border, 6px radius, steel placeholder; hover border Steel; focus border Signal with no outline.
- **Pass figure:** large mono numeral on a bottom border only, unit in small steel text beside it; turns signal (border and text) while it differs from the saved value.
- **Drop zone (stub):** dashed Strong Seam border, caption plus prompt plus steel hint; the large first-run version sits on slate with a dashed three-cell footer of facts. Chosen file turns the border and filename signal; error turns the border Alert Coral.

### Navigation
- **Style:** none. Profile and jobs share one screen; settings open from the board's title row.

### Saved Status
A small Signal Dim note with Signal Yellow text, top right of the page heading, naming what was saved.

## Do's and Don'ts

### Do:
- **Do** keep a single yellow primary button per screen; everything else is secondary or plain text.
- **Do** light any changed or new value in signal yellow (border and text) until it is saved or seen.
- **Do** set every data number in JetBrains Mono with tabular numerals.
- **Do** group related fields into one slate pass divided by hairline seams.
- **Do** use the 11px tracked uppercase steel caption directly above the value it labels.
- **Do** use 6px corners and 1px seams on every bordered element.

### Don't:
- **Don't** use shadows, gradients or blur; depth is ink, slate and seams.
- **Don't** use signal yellow for decoration, headings or icons; it is action, change and focus only.
- **Don't** float separate cards in a grid; segment one document instead.
- **Don't** put an uppercase caption above a heading as an eyebrow or kicker.
- **Don't** set prose words in the mono face.
- **Don't** add motion beyond color transitions; reduced-motion users get none.
