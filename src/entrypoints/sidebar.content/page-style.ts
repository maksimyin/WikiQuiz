const SIDEBAR_WIDTH_PX = 360;
// Use a more common breakpoint for tablets/small desktops
const MIN_VIEWPORT_WIDTH_FOR_SIDEBAR = SIDEBAR_WIDTH_PX + 768;
const STYLE_ID = 'wiki-ai-page-pusher';

const getStyleSheet = () => `
  @media (min-width: ${MIN_VIEWPORT_WIDTH_FOR_SIDEBAR}px) {
    /*
      To make this work on most websites like Liner does, we apply padding
      to the <body> element. This shifts the entire page content to the left.
    */
    body.wiki-ai-sidebar-active {
      position: relative !important;
      padding-right: ${SIDEBAR_WIDTH_PX}px !important;
      box-sizing: border-box !important;
      transition: padding-right 0.2s ease-in-out !important;
    }

    /*
      Position the <wxt-root> element, which hosts our UI. We anchor it
      to the right side of the viewport. This is the container for the sidebar.
    */
    wxt-root {
      position: fixed !important;
      top: 0 !important;
      right: 0 !important;
      height: 100vh !important;
      width: ${SIDEBAR_WIDTH_PX}px !important;
      z-index: 2147483647 !important; /* Use max z-index to appear on top */
      display: block !important;
      overflow-y: auto; /* Allow sidebar to scroll internally */
    }
  }

  @media (max-width: ${MIN_VIEWPORT_WIDTH_FOR_SIDEBAR - 1}px) {
    /* On smaller screens, hide the sidebar's container entirely. */
    wxt-root {
      display: none !important;
    }
  }
`;

export function injectPageStyles() {
  let styleEl = document.getElementById(STYLE_ID);
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = STYLE_ID;
    document.head.append(styleEl);
  }
  styleEl.textContent = getStyleSheet();
  document.body.classList.add('wiki-ai-sidebar-active');
}

export function removePageStyles() {
  document.body.classList.remove('wiki-ai-sidebar-active');
  const styleEl = document.getElementById(STYLE_ID);
  if (styleEl) {
    styleEl.remove();
  }
} 