## 2024-05-18 - Avoid Runtime Errors on Locales
**Learning:** Do not commit lockfiles (e.g. `pnpm-lock.yaml`) during a small UI change. Keep PRs focused.
**Action:** Always verify if `locale` logic is robust.

## 2024-05-18 - Pointer Events vs Keyboard Equivalency for 'Hold' Interactions
**Learning:** When a component implements custom pointer events (`onPointerDown`, `onPointerUp`) to create a "hold to trigger" action, keyboard users are often completely excluded because standard click handlers aren't sufficient. Implementing keyboard equivalency requires handling `onKeyDown` and `onKeyUp` (specifically for 'Enter' or 'Space'). Additionally, unlike pointer events, holding a key down natively fires repeated keydown events which can cause unintended double-triggers of the start logic if not guarded against (e.g. `if (!isHolding)`).
**Action:** Whenever introducing custom pointer events for interactive elements, always ensure standard keyboard handlers (`onKeyDown`/`onKeyUp`) are implemented to maintain accessibility. Protect against key repetition in hold-style interactions.