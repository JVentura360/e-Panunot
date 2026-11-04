# Ledger Edit Mode Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans for inline implementation. Do not commit or push unless requested.

**Goal:** Hide withdrawal actions until the user enters Edit mode, with confirmation and repeated edits.

**Architecture:** Add two local states to JoinBlock: editing and the subject awaiting confirmation. Reuse ConfirmDialog and the existing enrollment DELETE/cache behavior. Keep Edit state independent from requests and refreshed enrollment data.

**Tech Stack:** React 19, existing CSS modules and native dialog component, existing Laravel API.

**Spec:** `docs/superpowers/specs/2026-11-04-ledger-edit-mode-design.md`

## Global constraints

- Existing regular/irregular/mayor withdrawal permissions apply.
- No backend or dependency changes.
- Successful withdrawal and Refresh preserve Edit mode. Done exits.

## Review focus

- Normal view hides withdrawal actions.
- Cancel performs no deletion; failed DELETE stays retryable.
- Final withdrawal does not remove Done or reset mode.
- Controls wrap on narrow screens and retain clear labels.

### Task 1: Edit controls and confirmation

- [x] Modify `frontend/epanunot-app/src/features/block/JoinBlock.jsx` to add Edit/Done and selected-subject state, gate withdrawal buttons, and replace window.confirm with ConfirmDialog.
- [x] Modify `frontend/epanunot-app/src/features/block/JoinBlock.module.css` to group/wrap header controls.
- [x] Verify request success/error/cancellation paths and ensure Edit is reset only by Done or page remount.
- [x] Run existing frontend tests, lint, production phone build, and whitespace checks. No new tests that merely duplicate this simple reversible UI toggle.

Validation: 82 frontend tests passed; ESLint, phone production build, and git diff --check passed.

