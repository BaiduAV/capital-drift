## 2024-05-18 - Avoid Runtime Errors on Locales
**Learning:** Do not commit lockfiles (e.g. `pnpm-lock.yaml`) during a small UI change. Keep PRs focused.
**Action:** Always verify if `locale` logic is robust.

## 2024-05-18 - Localized Dynamic ARIA Labels
**Learning:** When using dynamic data (like `seed #{state.seed}`) in an element's text content, adding a static or partially static `aria-label` completely overrides the content. If the dynamic data isn't explicitly included in the `aria-label` itself, screen reader users will lose access to it.
**Action:** Always interpolate dynamic content into the `aria-label` string when overriding the accessible name of elements containing data.
