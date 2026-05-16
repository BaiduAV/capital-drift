## 2024-05-18 - Avoid Runtime Errors on Locales
**Learning:** Do not commit lockfiles (e.g. `pnpm-lock.yaml`) during a small UI change. Keep PRs focused.
**Action:** Always verify if `locale` logic is robust.

## 2025-02-12 - Pointer Event Components Need Keyboard Equivalents
**Learning:** Interactive elements using custom pointer events (like `onPointerDown`/`onPointerUp` for long-press actions) completely bypass native keyboard click interactions. This leaves keyboard/screen-reader users unable to trigger them.
**Action:** Always add an `onKeyDown` handler (intercepting 'Enter' and 'Space' with `e.preventDefault()`) and standard `focus-visible` outline classes to restore full accessibility to custom pointer-driven components.
