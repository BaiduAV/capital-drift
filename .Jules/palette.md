## 2024-05-18 - Avoid Runtime Errors on Locales
**Learning:** Do not commit lockfiles (e.g. `pnpm-lock.yaml`) during a small UI change. Keep PRs focused.
**Action:** Always verify if `locale` logic is robust.
## 2026-04-12 - Adding Accessible Text to Icon Buttons
**Learning:** Icon-only Shadcn UI `<Button>` components (such as those using lucide-react icons for 'close' or 'trade' actions) do not inherently provide screen-reader accessibility and must be manually provided with localized `aria-label` attributes.
**Action:** When creating or modifying generic UI elements, always inspect if they contain text visually hidden to screen readers and apply `aria-label` utilizing the `locale` context (e.g., `locale === 'pt-BR' ? '...' : '...'`) where appropriate.
