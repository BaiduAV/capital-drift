## 2024-05-18 - Avoid Runtime Errors on Locales
**Learning:** Do not commit lockfiles (e.g. `pnpm-lock.yaml`) during a small UI change. Keep PRs focused.
**Action:** Always verify if `locale` logic is robust.

## 2024-05-18 - Playwright Strict Mode on Reused Labels
**Learning:** Playwright's `get_by_role` can fail with strict mode violations if a common label like "Next" matches multiple elements in the DOM (e.g. "Next Day" button vs the tutorial's "Next" button).
**Action:** When writing Playwright scripts, prevent strict mode violations for overlapping or reused elements by using `.first`, `.nth()`, or `exact=True` in locators (e.g., `page.get_by_role('button', name='Next', exact=True)`).

## 2024-05-18 - Step Indicator Accessibility Pattern
**Learning:** Carousel or wizard step indicators are often implemented as unlabeled dots or buttons, making them completely opaque to screen readers.
**Action:** When building multi-step interactive indicators (e.g., tutorial steps), wrap the steps in a container with `role="group"` (or `role="tablist"` depending on context) and use `aria-current="step"` (or `role="tab"` and `aria-selected`) to denote the active step element, and explicitly label each step (e.g. "Step 1 of 5").
