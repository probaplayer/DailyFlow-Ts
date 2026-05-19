import { describe, expect, it } from 'vitest';
import { PageType } from '~/enums/PageType.enum';
import { createPageResizeState } from './pageResizeState';

describe('pageResizeState', () => {
  it('allows the first resize for a page type', () => {
    const state = createPageResizeState();

    expect(state.shouldResize(PageType.MAIN)).toBe(true);
  });

  it('skips resize when the next page type is the same as the current page type', () => {
    const state = createPageResizeState();
    state.markResized(PageType.MAIN);

    expect(state.shouldResize(PageType.MAIN)).toBe(false);
  });

  it('allows resize when the next page type is different', () => {
    const state = createPageResizeState();
    state.markResized(PageType.MAIN);

    expect(state.shouldResize(PageType.TODOFLOW)).toBe(true);
  });
});
