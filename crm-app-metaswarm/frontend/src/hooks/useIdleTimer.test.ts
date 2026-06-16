import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useIdleTimer } from './useIdleTimer';

describe('useIdleTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('calls onIdle after the specified timeout with no activity', () => {
    const onIdle = vi.fn();
    renderHook(() => useIdleTimer(onIdle, 5000));

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(onIdle).toHaveBeenCalledTimes(1);
  });

  it('resets timer on user activity (mousemove)', () => {
    const onIdle = vi.fn();
    renderHook(() => useIdleTimer(onIdle, 5000));

    act(() => {
      vi.advanceTimersByTime(4000);
      document.dispatchEvent(new Event('mousemove'));
      vi.advanceTimersByTime(4000);
    });

    expect(onIdle).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1001);
    });

    expect(onIdle).toHaveBeenCalledTimes(1);
  });

  it('resets timer on keydown event', () => {
    const onIdle = vi.fn();
    renderHook(() => useIdleTimer(onIdle, 3000));

    act(() => {
      vi.advanceTimersByTime(2500);
      document.dispatchEvent(new KeyboardEvent('keydown'));
      vi.advanceTimersByTime(2500);
    });

    expect(onIdle).not.toHaveBeenCalled();
  });

  it('does not call onIdle after unmount', () => {
    const onIdle = vi.fn();
    const { unmount } = renderHook(() => useIdleTimer(onIdle, 5000));

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    unmount();

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(onIdle).not.toHaveBeenCalled();
  });
});
