## 2024-05-18 - Avoid Runtime Errors on Locales
**Learning:** Do not commit lockfiles (e.g. `pnpm-lock.yaml`) during a small UI change. Keep PRs focused.
**Action:** Always verify if `locale` logic is robust.

## 2026-07-04 - Accessible Icon Buttons and Semantic Spans
**Learning:** When using an `aria-label` on a non-interactive semantic element like a `span` (e.g. to combine an icon and a text counter into a single readout), it will often be ignored by screen readers unless given a structural role like `role="group"`. Additionally, raw numerical counts and icons inside interactive buttons should be hidden with `aria-hidden="true"` to prevent redundant or confusing double-announcements when the button already has a comprehensive `aria-label`.
**Action:** Always apply `role="group"` to non-interactive `span`s when overriding their accessible name with `aria-label`. Hide interior visible text/icons with `aria-hidden="true"` when a parent element provides the full accessible name.
