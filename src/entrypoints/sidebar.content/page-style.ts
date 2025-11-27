const SIDEBAR_WIDTH_PX = 320;
const SIDEBAR_WIDTH_SMALL_PX = 250;
const BREAKPOINT_PX = 780;
const STYLE_ID = 'wiki-ai-page-styles';

const getStyleSheet = () => {
  return `
    wxt-root {
      position: fixed !important;
      top: 0 !important;
      right: 0 !important;
      height: 100vh !important;
      width: 100vw !important;
      z-index: 2147483647 !important;
      pointer-events: none !important;
      isolation: isolate !important;
    }

    wxt-root * {
      pointer-events: auto !important;
    }

    body.wiki-ai-sidebar-open {
      padding-right: ${SIDEBAR_WIDTH_PX}px !important;
      transition: padding-right 0.3s ease !important;
      box-sizing: border-box !important;
      margin-right: 0 !important;
    }

    @media (max-width: ${BREAKPOINT_PX}px) {
      body.wiki-ai-sidebar-open {
        padding-right: ${SIDEBAR_WIDTH_SMALL_PX}px !important;
      }
    }
  `;
};

let globalUpdateStyles: (() => void) | null = null;

export function injectPageStyles() {
  let styleEl = document.getElementById(STYLE_ID);
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = STYLE_ID;
    document.head.append(styleEl);
  }
  styleEl.textContent = getStyleSheet();
  
  if (globalUpdateStyles) {
    window.removeEventListener('resize', globalUpdateStyles);
  }
  
  globalUpdateStyles = () => {
    styleEl!.textContent = getStyleSheet();
  };
  
  window.addEventListener('resize', globalUpdateStyles);
}

export function removePageStyles() {
  const styleEl = document.getElementById(STYLE_ID);
  if (styleEl) {
    styleEl.remove();
  }
  
  if (globalUpdateStyles) {
    window.removeEventListener('resize', globalUpdateStyles);
    globalUpdateStyles = null;
  }
} 