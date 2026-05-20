## 2024-05-18 - Avoid Runtime Errors on Locales
**Learning:** Do not commit lockfiles (e.g. `pnpm-lock.yaml`) during a small UI change. Keep PRs focused.
**Action:** Always verify if `locale` logic is robust.

## 2024-05-18 - Provide Keyboard Events for Custom Pointer Interactions
**Learning:** Custom components using `onPointerDown`/`onPointerUp` for "tap and hold" functionality are entirely inaccessible to keyboard users navigating with Tab/Enter/Space by default. A mouse user could perform a long press, but a keyboard user couldn't.
**Action:** When creating custom interactions with pointer events, always bind `onKeyDown`/`onKeyUp` for 'Enter' and 'Space' to ensure keyboard accessibility. Make sure to guard against key repeat events (`!e.repeat`) to avoid unintended rapid triggering during the hold.
