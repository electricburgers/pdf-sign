import { describe, it, expect } from 'vitest';
import { keyToAction, STEP } from '../src/lib/keyboard.js';

describe('keyToAction', () => {
  it('moves by a small step with the arrow keys', () => {
    expect(keyToAction({ key: 'ArrowLeft' })).toEqual({ type: 'move', dx: -STEP.small, dy: 0 });
    expect(keyToAction({ key: 'ArrowDown' })).toEqual({ type: 'move', dx: 0, dy: STEP.small });
  });
  it('moves by a large step with Shift + arrow', () => {
    expect(keyToAction({ key: 'ArrowUp', shiftKey: true })).toEqual({ type: 'move', dx: 0, dy: -STEP.large });
  });
  it('resizes with + and -, larger with Shift', () => {
    expect(keyToAction({ key: '+' })).toEqual({ type: 'resize', delta: STEP.resize });
    expect(keyToAction({ key: '=' })).toEqual({ type: 'resize', delta: STEP.resize });
    expect(keyToAction({ key: '-' })).toEqual({ type: 'resize', delta: -STEP.resize });
    expect(keyToAction({ key: '_', shiftKey: true })).toEqual({ type: 'resize', delta: -STEP.resizeLarge });
  });
  it('removes with Delete/Backspace, deselects with Escape, ignores other keys', () => {
    expect(keyToAction({ key: 'Delete' })).toEqual({ type: 'remove' });
    expect(keyToAction({ key: 'Backspace' })).toEqual({ type: 'remove' });
    expect(keyToAction({ key: 'Escape' })).toEqual({ type: 'deselect' });
    expect(keyToAction({ key: 'a' })).toBeNull();
  });
});
