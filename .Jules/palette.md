## 2024-05-18 - Avoid Runtime Errors on Locales
**Learning:** Do not commit lockfiles (e.g. `pnpm-lock.yaml`) during a small UI change. Keep PRs focused.
**Action:** Always verify if `locale` logic is robust.

## 2025-02-28 - Add localized aria-labels to Drawer Close and Table Actions
**Learning:** Shadcn component drawer/dialog close buttons (e.g., `<DrawerClose asChild><Button size="icon"><X/></Button></DrawerClose>`) and table action buttons (e.g., icon-only Trade buttons with `<ShoppingCart/>`) frequently omit explicit `aria-label` attributes out of the box. Screen readers may simply read "button" without context.
**Action:** When adding or auditing icon-only action buttons and modal close buttons, always provide a localized `aria-label` attribute (e.g., `aria-label={locale === 'pt-BR' ? 'Fechar' : 'Close'}`) to improve screen reader accessibility.
