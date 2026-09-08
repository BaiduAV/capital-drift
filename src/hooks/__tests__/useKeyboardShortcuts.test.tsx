import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, renderHook } from '@testing-library/react';
import { useKeyboardShortcuts } from '../useKeyboardShortcuts';
afterEach(cleanup);

describe('keyboard shortcuts', () => {
  it('uses the latest callback, accepts uppercase, and removes the listener on unmount', () => {
    const first = vi.fn(), next = vi.fn();
    const hook = renderHook(({ callback }) => useKeyboardShortcuts({ n: callback }), { initialProps: { callback: first } });
    fireEvent.keyDown(window, { key: 'N' });
    expect(first).toHaveBeenCalledTimes(1);
    hook.rerender({ callback: next });
    fireEvent.keyDown(window, { key: 'n' });
    expect(next).toHaveBeenCalledTimes(1);
    hook.unmount();
    fireEvent.keyDown(window, { key: 'n' });
    expect(next).toHaveBeenCalledTimes(1);
  });
  it.each([{ repeat: true }, { isComposing: true }, { ctrlKey: true }, { metaKey: true }, { altKey: true }])('ignores repeated, composing or modified events: %j', flags => {
      const callback = vi.fn();
      renderHook(() => useKeyboardShortcuts({ n: callback }));
      fireEvent.keyDown(window, { key: 'n', ...flags });
      expect(callback).not.toHaveBeenCalled();
    });
  it('ignores typing in form controls and descendants of editable elements', () => {
    const callback = vi.fn();
    renderHook(() => useKeyboardShortcuts({ n: callback }));
    const view = render(<><input /><textarea /><select /><div contentEditable suppressContentEditableWarning><span>edit</span></div><div contentEditable="plaintext-only" suppressContentEditableWarning><span>plain</span></div></>);
    view.container.querySelectorAll('input,textarea,select,span').forEach(target => fireEvent.keyDown(target, { key: 'n' }));
    expect(callback).not.toHaveBeenCalled();
  });
  it.each(['dialog', 'alertdialog'])('blocks background commands while a %s is open', role => {
    const callback = vi.fn();
    renderHook(() => useKeyboardShortcuts({ n: callback }));
    const modal = render(<div role={role}>Confirm</div>);
    fireEvent.keyDown(window, { key: 'n' });
    expect(callback).not.toHaveBeenCalled();
    modal.unmount();
    fireEvent.keyDown(window, { key: 'n' });
    expect(callback).toHaveBeenCalledTimes(1);
  });
});
