## 2024-05-18 - Avoid Runtime Errors on Locales
**Learning:** Do not commit lockfiles (e.g. `pnpm-lock.yaml`) during a small UI change. Keep PRs focused.
**Action:** Always verify if `locale` logic is robust.
## 2024-03-30 - Icon-Only Buttons Missing ARIA Labels in Responsive Layouts
**Learning:** Found that icon-only `Button` components acting as close/action toggles (specifically in `DrawerClose` components on mobile layouts and quick-action icon buttons inside data tables) frequently omit `aria-label` attributes in custom Shadcn UI implementations, degrading screen-reader accessibility.
**Action:** When adding or reviewing layout components with icon-only buttons (like `variant="ghost" size="icon"`), proactively add a bilingual `aria-label` attribute (using `locale === 'pt-BR'`) to provide proper context for assistive technologies.
