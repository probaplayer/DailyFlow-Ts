import { useEffect } from 'react';
import { PageType } from '~/enums/PageType.enum';
import { getPageSize } from '~/shared/util.page';
import { mainWindowResizeState } from '~/ui/helpers/utils/pageResizeState';
import { getOnLeftInScreen, getOnMiddleInScreen } from '~/ui/helpers/utils/utils';

type ResizeAnchor = 'center' | 'left';

export function useResizePage(pageType: PageType, anchor: ResizeAnchor = 'center', duration = 60) {
  useEffect(() => {
    const resizePage = async () => {
      if (!mainWindowResizeState.shouldResize(pageType)) {
        return;
      }

      const { width, height } = getPageSize(pageType);
      const { width: screenWidth, height: screenHeight } = await window.electronAPI.getUserScreenSize();
      const position =
        anchor === 'left'
          ? getOnLeftInScreen(screenWidth, screenHeight, width, height)
          : getOnMiddleInScreen(screenWidth, screenHeight, width, height);

      await window.electronAPI.smoothResizeAndMove('main', width, height, duration, position);
      mainWindowResizeState.markResized(pageType);
    };

    resizePage();
  }, [anchor, duration, pageType]);
}
