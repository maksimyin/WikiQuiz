import {browser} from 'wxt/browser';

export default defineContentScript({
    matches: ['*://*.wikipedia.org/wiki/*'],
    main: async (ctx) => {
      if (!window.location.hostname.endsWith('wikipedia.org')) {
        return;
      }
      
      const response = await browser.runtime.sendMessage({
        type: 'initialization'
      });
      if (!response.success) {
        console.error("Failed to initialize connection with background script");
        return;
      }



      browser.runtime.onMessage.addListener((message) => {
        window.dispatchEvent(new CustomEvent('wikiExtensionUpdate', { 
          detail: message 
        }));
        return true;
      });

      window.addEventListener('error', (e) => {
        console.error('[Content] Uncaught error:', e.error ?? e.message);
        e.preventDefault(); 
      });
      window.addEventListener('unhandledrejection', (e) => {
        console.error('[Content] Unhandled promise rejection:', e.reason);
        e.preventDefault(); 
      });
    }
  });