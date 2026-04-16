## 2024-05-18 - Avoid Runtime Errors on Locales
**Learning:** Do not commit lockfiles (e.g. `pnpm-lock.yaml`) during a small UI change. Keep PRs focused.
**Action:** Always verify if `locale` logic is robust.
## 2024-05-18 - Localized DrawerClose Buttons
**Learning:** Drawer components in `src/pages/Trade.tsx` (and potentially elsewhere) have native `DrawerClose` wrappers that contain generic Shadcn `Button size="icon"` elements (e.g., the `X` close icon). These do not have `aria-label`s by default, rendering them inaccessible to screen readers.
**Action:** When inspecting modals or drawers, always verify the `DrawerClose` inner `<Button>` has a localized `aria-label` referencing the `locale` context.
