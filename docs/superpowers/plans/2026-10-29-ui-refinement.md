# UI refinement implementation plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Improve scanability and interaction quality while preserving e-Panunot's palette and existing workflows.
**Architecture:** Retain React, routing and CSS modules. Improve shared styles and dialog behavior, then feature layouts.
**Tech Stack:** React 19, Vite, CSS modules; no new dependencies.
**Spec:** ../specs/2026-10-29-ui-refinement-design.md

## Global constraints
Preserve forest #2D6A4F, sage #8EBBA7, mist #B9CDCB, sand #F2DDCC, peach #FCAC89, clay #D97745, ink #17362f and paper #fffdf5. Preserve fonts. No backend changes. Keep prototype status honest.

## Review focus
Mobile widths must not overflow; dialogs must retain keyboard focus and restore it; empty/complete lists remain usable; overdue tasks must not say due today; all demo roles and secondary routes remain accessible.

## Tasks
- [x] Improve global controls, readable surfaces, navigation and mobile safe areas.
- [x] Refine dashboard hierarchy, task filtering and deadline labels; remove broken unused branches.
- [x] Improve login copy and presentation; retain demo account access.
- [x] Add labeled, validated, keyboard-accessible shared modal forms.
- [x] Align secondary page spacing and fix existing undefined concern-back symbol and unused prop.
- [x] Run lint/build and browser checks. Record results and any verification limits.

Execution: inline in the existing user workspace; no dependency or backend changes. Visual changes use build/lint and browser checks rather than implementation-mirroring tests.

Verification: npm run build and npm run lint passed. Deadline checks passed for overdue/today/tomorrow/future dates. Browser review covered student dashboard, task creation/completion, modal required fields/Escape/focus restoration, mayor announcements, admin, mobile calendar/concerns and tablet concerns. No browser console errors were captured. Original palette values retained. Review found and resolved the 761–900px concern-pane regression. Backend remains a prototype and is outside this change.
