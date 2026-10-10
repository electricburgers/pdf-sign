import { describe, it, expect, vi } from 'vitest';
import { debounce, rafThrottle } from '../src/lib/schedule.js';

function fakeRaf() {
  let queue = [];
  let next = 1;
  return {
    raf: (cb) => {
      const id = next++;
      queue.push({ id, cb });
      return id;
    },
    caf: (id) => {
      queue = queue.filter((q) => q.id !== id);
    },
    flush: () => {
      const q = queue;
      queue = [];
      q.forEach(({ cb }) => cb(0));
    },
  };
}

describe('schedule', () => {
  it('debounce runs once with the last arguments after the wait', () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    const d = debounce(fn, 100);
    d(1);
    d(2);
    d(3);
    vi.advanceTimersByTime(99);
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith(3);
    vi.useRealTimers();
  });
  it('rafThrottle runs at most once per frame with the latest arguments', () => {
    const f = fakeRaf();
    const fn = vi.fn();
    const t = rafThrottle(fn, f);
    t('a');
    t('b');
    t('c');
    expect(fn).not.toHaveBeenCalled();
    f.flush();
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith('c');
    t('d');
    f.flush();
    expect(fn).toHaveBeenCalledTimes(2);
  });
  it('cancel drops a pending frame', () => {
    const f = fakeRaf();
    const fn = vi.fn();
    const t = rafThrottle(fn, f);
    t('a');
    t.cancel();
    f.flush();
    expect(fn).not.toHaveBeenCalled();
  });
});
