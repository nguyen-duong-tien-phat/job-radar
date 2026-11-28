# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
One person: the owner, an IT developer in Vietnam looking for a job. Opens the app on a laptop in the evening after work, reads matches carefully, and applies from there.

## Product Purpose
Upload a CV once; get a ranked list of IT jobs that fit it, for Vietnam and remote work. Success: the evening session surfaces the few jobs worth applying to, with enough reason to trust the ranking, without opening dozens of tabs.

## Positioning
Jobs are taken from companies' own career pages (public applicant-tracking boards) as well as IT job boards, and every job carries a local, explainable match score against the user's own CV. A daily web search (Claude Code on the owner's existing plan) finds new official career pages.

## Operating Context
- Single user, runs locally on a Mac (`localhost`), no accounts.
- Data refreshes once a day; the owner reviews in the evening.
- Flow: upload CV → review/edit profile → read ranked jobs → save / mark applied → track applications.

## Capabilities and Constraints
- Next.js + SQLite, local only, no paid services.
- Profile: skills, wanted roles, locations (HCM, Hà Nội, Đà Nẵng, remote), years of experience, minimum salary (USD/month).
- Built so far: CV upload (PDF, ≤5 MB, text PDFs only) and profile editing. Job feed, scoring, sources and tracker are planned.
- UI language: Vietnamese.

## Brand Commitments
- Name: Job Radar.
- Owner's brief: minimalism, but beautiful and finished; not bare.
- Must not feel like: a SaaS dashboard (cards, sidebars, icon tiles, big numbers everywhere), an ad-driven job board (banners, logo walls, "Apply now" everywhere), a default unstyled form, or a decorated/colourful page (gradients, effects, extra animation).

## Evidence on Hand
No real job data yet. A sample CV exists only locally. Any demo jobs must be labelled as samples.

## Product Principles
1. Show why: every job shows its match score with the reason (matched and missing skills).
2. Most important first: match and reason, company and source (official vs board), freshness.
3. Calm and finite: a short list to act on, not an endless feed.
4. Private by default: the CV and data never leave the machine.
