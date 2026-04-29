## 2024-05-18 - Avoid Runtime Errors on Locales
**Learning:** Do not commit lockfiles (e.g. `pnpm-lock.yaml`) during a small UI change. Keep PRs focused.
**Action:** Always verify if `locale` logic is robust.

## 2024-05-18 - Localized Dynamic ARIA Labels on Buttons
**Learning:** For interactive buttons that contain dynamic visible counts (e.g., "1.2K" next to a heart icon), screen readers won't give context if there's no `aria-label`. We must provide an `aria-label` that includes both the action ("Like" or "Curtir") AND the dynamic data explicitly (`${likeCount} likes`) so the context is fully understandable, keeping `locale` prop handling in mind.
**Action:** Always add dynamic localized text to `aria-label` when the visual information of the button relies on adjacent numbers/data.
