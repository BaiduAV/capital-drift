## 2024-05-18 - Avoid Runtime Errors on Locales
**Learning:** Do not commit lockfiles (e.g. `pnpm-lock.yaml`) during a small UI change. Keep PRs focused.
**Action:** Always verify if `locale` logic is robust.
## 2024-06-20 - Adding Accessibility to Icon Interaction Buttons
**Learning:** Icon-only interaction buttons with numerical counts (like the Like and Repost buttons in SocialFeed) need proper ARIA labels that include the count. Without this, screen readers may misinterpret the context. Moreover, it is crucial to hide the actual icons and visible counts with `aria-hidden="true"` so they aren't double-read, apply localized titles for standard tooltips, add `focus-visible` to support keyboard navigation, and track toggles with `aria-pressed`. Also, non-interactive grouped elements like reply counts need `role="group"` on the container.
**Action:** Applied comprehensive accessibility labels, keyboard focus styling, tooltips, and appropriate ARIA attributes to the engagement buttons in SocialFeed to make them fully accessible and interactive for all users.
