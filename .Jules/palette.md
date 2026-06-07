## 2024-05-18 - Avoid Runtime Errors on Locales
**Learning:** Do not commit lockfiles (e.g. `pnpm-lock.yaml`) during a small UI change. Keep PRs focused.
**Action:** Always verify if `locale` logic is robust.
## 2024-06-07 - Screen Reader announcements on list rows
**Learning:** When making a complex interactive list row (like in DividendCalendar) accessible, adding an outer `aria-label` is the cleaner approach in this codebase compared to injecting a visually hidden `.sr-only` span, as it avoids repetitive and confusing double-announcements from screen readers reading both the hidden text and the visible child contents.
**Action:** Use `aria-label` on the wrapper element for interactive rows with localized helper text instead of adding a `.sr-only` span inside.
