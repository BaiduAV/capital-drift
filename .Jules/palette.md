## 2024-05-18 - Avoid Runtime Errors on Locales
**Learning:** Do not commit lockfiles (e.g. `pnpm-lock.yaml`) during a small UI change. Keep PRs focused.
**Action:** Always verify if `locale` logic is robust.
## 2026-05-13 - [Accessibility] Dynamic State in ARIA Labels
**Learning:** When interactive elements (like icon buttons or seed copy buttons) display dynamic text content (like like/repost counts or seed numbers) alongside an icon, providing a static `aria-label` (e.g. "Like") completely overrides the element's text content in the Accessibility Tree. This hides the dynamic vital UI content (the count/seed) from screen readers.
**Action:** When adding `aria-label`s to interactive elements containing dynamic text, ensure that the `aria-label` string dynamically interpolates those values (e.g., `aria-label={`Like. ${likeCount} likes.`}`).
