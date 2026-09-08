import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import BottomNav from '../BottomNav';

const actions = vi.hoisted(() => ({ advanceDay: vi.fn(), fastForward: vi.fn() }));

vi.mock('@/context/game-context', () => ({
  useGame: () => ({ locale: 'pt-BR', t: (key: string) => key, ...actions }),
}));
vi.mock('@/engine/audio', () => ({ playRegimeSound: vi.fn() }));
vi.mock('sonner', () => ({ toast: { info: vi.fn(), warning: vi.fn(), success: vi.fn() } }));

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  actions.advanceDay.mockReturnValue({ previousRegime: 'CALM', regime: 'CALM', dividendsPaid: 0 });
  actions.fastForward.mockReturnValue({ totalReturn: 0 });
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) =>
    setTimeout(() => callback(Date.now()), 16));
  vi.stubGlobal('cancelAnimationFrame', (id: ReturnType<typeof setTimeout>) => clearTimeout(id));
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function setup() {
  const view = render(<MemoryRouter><BottomNav /></MemoryRouter>);
  return { ...view, button: view.getByRole('button', { name: /Toque: avançar dia/ }) };
}

describe('BottomNav advance controls', () => {
  it('advances once for a short keyboard press', () => {
    const { button } = setup();
    fireEvent.keyDown(button, { key: 'Enter' });
    fireEvent.keyDown(button, { key: 'Enter', repeat: true });
    fireEvent.keyUp(button, { key: 'Enter' });
    expect(actions.advanceDay).toHaveBeenCalledTimes(1);
    expect(actions.fastForward).not.toHaveBeenCalled();
  });

  it('advances seven days only once when a key remains held', () => {
    const { button } = setup();
    fireEvent.keyDown(button, { key: ' ' });
    act(() => vi.advanceTimersByTime(650));
    fireEvent.keyDown(button, { key: ' ', repeat: true });
    act(() => vi.advanceTimersByTime(650));
    fireEvent.keyUp(button, { key: ' ' });
    expect(actions.fastForward).toHaveBeenCalledExactlyOnceWith(7);
    expect(actions.advanceDay).not.toHaveBeenCalled();
  });

  it('cancels on lost focus and ignores the subsequent key release', () => {
    const { button } = setup();
    fireEvent.keyDown(button, { key: 'Enter' });
    fireEvent.blur(button);
    act(() => vi.advanceTimersByTime(650));
    fireEvent.keyUp(button, { key: 'Enter' });
    expect(actions.fastForward).not.toHaveBeenCalled();
    expect(actions.advanceDay).not.toHaveBeenCalled();
  });

  it('cancels when the browser window loses focus', () => {
    const { button } = setup();
    fireEvent.keyDown(button, { key: 'Enter' });
    fireEvent.blur(window);
    act(() => vi.advanceTimersByTime(650));
    expect(actions.fastForward).not.toHaveBeenCalled();
    expect(actions.advanceDay).not.toHaveBeenCalled();
  });

  it('cancels an unfinished gesture when unmounted', () => {
    const { button, unmount } = setup();
    fireEvent.keyDown(button, { key: 'Enter' });
    unmount();
    act(() => vi.advanceTimersByTime(650));
    expect(actions.fastForward).not.toHaveBeenCalled();
    expect(actions.advanceDay).not.toHaveBeenCalled();
  });

  it('preserves pointer taps and ignores a cancelled pointer release', () => {
    const { button } = setup();
    fireEvent.pointerDown(button);
    fireEvent.pointerUp(button);
    expect(actions.advanceDay).toHaveBeenCalledTimes(1);
    fireEvent.pointerDown(button);
    fireEvent.pointerCancel(button);
    fireEvent.pointerUp(button);
    act(() => vi.advanceTimersByTime(650));
    expect(actions.advanceDay).toHaveBeenCalledTimes(1);
    expect(actions.fastForward).not.toHaveBeenCalled();
  });
});
