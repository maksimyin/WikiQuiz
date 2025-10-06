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



      // Listen for messages from background script
      browser.runtime.onMessage.addListener((message) => {
        console.log("Content script received message:", message);
        window.dispatchEvent(new CustomEvent('wikiExtensionUpdate', { 
          detail: message 
        }));
        return true;
      });
    }
  });