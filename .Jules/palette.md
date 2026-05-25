## 2024-05-18 - Avoid Runtime Errors on Locales
**Learning:** Do not commit lockfiles (e.g. `pnpm-lock.yaml`) during a small UI change. Keep PRs focused.
**Action:** Always verify if `locale` logic is robust.

## 2024-05-18 - Multi-step interactive indicator accessibility
**Learning:** For multi-step progress indicators like tutorial dots that double as navigation buttons, standard accessibility practices require grouping them logically. Using `role="tablist"` on the container and `role="tab"` along with `aria-selected` on the individual buttons correctly informs screen readers about the number of steps and the current step, overcoming the limitations of visual-only `bg-primary` styling. Furthermore, applying consistent `focus-visible` ring styling using Tailwind (`focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:ring-offset-background`) ensures the active tab state is discernible via keyboard navigation.
**Action:** Always ensure progress step indicators are navigable via keyboard and communicate both their position and the current active step (e.g. using `aria-selected`) when read by a screen reader.
