const SIDEBAR_WIDTH_PX = 320;
const SIDEBAR_WIDTH_SMALL_PX = 250;
const BREAKPOINT_PX = 780;
const STYLE_ID = 'wiki-ai-page-styles';

const getStyleSheet = () => {
  console.log('Current viewport width:', window.innerWidth);
  
  return `
    /* Minimal styles for the floating sidebar container */
    wxt-root {
      position: fixed !important;
      top: 0 !important;
      right: 0 !important;
      height: 100vh !important;
      width: 100vw !important;
      z-index: 2147483647 !important;
      pointer-events: none !important; /* Allow clicks to pass through */
      isolation: isolate !important;
    }

    /* Only allow pointer events on our actual UI elements */
    wxt-root * {
      pointer-events: auto !important;
    }

    /* Default: shift page content when sidebar is open (larger screens) */
    body.wiki-ai-sidebar-open {
      padding-right: ${SIDEBAR_WIDTH_PX}px !important;
      transition: padding-right 0.3s ease !important;
      box-sizing: border-box !important;
      margin-right: 0 !important;
    }

    /* Smaller screens: reduce sidebar width and page shift */
    @media (max-width: ${BREAKPOINT_PX}px) {
      body.wiki-ai-sidebar-open {
        padding-right: ${SIDEBAR_WIDTH_SMALL_PX}px !important;
      }
    }
  `;
};

// Store the update function globally for cleanup
let globalUpdateStyles: (() => void) | null = null;

export function injectPageStyles() {
  let styleEl = document.getElementById(STYLE_ID);
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = STYLE_ID;
    document.head.append(styleEl);
  }
  styleEl.textContent = getStyleSheet();
  
  // Clean up any existing listener
  if (globalUpdateStyles) {
    window.removeEventListener('resize', globalUpdateStyles);
  }
  
  // Create new update function
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
  
  // Remove resize listener
  if (globalUpdateStyles) {
    window.removeEventListener('resize', globalUpdateStyles);
    globalUpdateStyles = null;
  }
} 