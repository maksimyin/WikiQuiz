export default defineContentScript({
  matches: ["https://*.wikipedia.org/*"],
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
  }
});
