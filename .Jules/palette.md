## 2024-05-18 - Avoid Runtime Errors on Locales
**Learning:** Do not commit lockfiles (e.g. `pnpm-lock.yaml`) during a small UI change. Keep PRs focused.
**Action:** Always verify if `locale` logic is robust.
## 2026-05-23 - Adding ARIA labels to icon-only buttons
**Learning:** Icon-only buttons lacking accessible names are entirely unreadable to screen readers. This repository uses the `locale` context to handle i18n, so `aria-label` attributes should be localized correctly (e.g., using `locale === 'pt-BR' ? '...' : '...'`).
**Action:** Always ensure that icon-only interactive elements (like ) are provided with localized `aria-label` attributes to maintain full screen reader support without breaking the interface visual design.
## 2026-05-23 - Adding ARIA labels to icon-only buttons
**Learning:** Icon-only buttons lacking accessible names are entirely unreadable to screen readers. This repository uses the `locale` context to handle i18n, so `aria-label` attributes should be localized correctly (e.g., using `locale === 'pt-BR' ? '...' : '...'`).
**Action:** Always ensure that icon-only interactive elements (like Button size="icon") are provided with localized `aria-label` attributes to maintain full screen reader support without breaking the interface visual design.
