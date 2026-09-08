import { useEffect } from 'react';

interface ShortcutMap {
  [key: string]: () => void;
}

export function useKeyboardShortcuts(shortcuts: ShortcutMap) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ignore when typing in inputs
      if (e.repeat || e.isComposing) return;
      const target = e.target;
      if (target instanceof Element) {
        if (target.closest('input, textarea, select')) return;
        const editable = target.closest('[contenteditable]');
        if (editable && editable.getAttribute('contenteditable') !== 'false') return;
      }
      if (document.querySelector('[role="dialog"], [role="alertdialog"]')) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      const key = e.key.toLowerCase();
      if (shortcuts[key]) {
        e.preventDefault();
        shortcuts[key]();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [shortcuts]);
}
