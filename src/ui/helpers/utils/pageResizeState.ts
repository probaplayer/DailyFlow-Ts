import { PageType } from '~/enums/PageType.enum';

export interface PageResizeState {
  shouldResize: (pageType: PageType) => boolean;
  markResized: (pageType: PageType) => void;
  reset: () => void;
}

export function createPageResizeState(): PageResizeState {
  let currentPageType: PageType | null = null;

  return {
    shouldResize: (pageType) => currentPageType !== pageType,
    markResized: (pageType) => {
      currentPageType = pageType;
    },
    reset: () => {
      currentPageType = null;
    },
  };
}

export const mainWindowResizeState = createPageResizeState();
