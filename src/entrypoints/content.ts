export default defineContentScript({
  matches: ["https://*.wikipedia.org/*"],
  main: async (ctx) => {
    if (!window.location.hostname.endsWith('wikipedia.org')) {
      return;
    }
    
    const response = await browser.runtime.sendMessage({
      type: 'initialization'
    });
    if (response.success && decodeURIComponent(location.pathname.replace('/wiki/', '')) !== "/") {
      const storePageContent = await browser.runtime.sendMessage({
        type: 'storePageContent',
        payload: {
          "title": decodeURIComponent(location.pathname.replace('/wiki/', ''))
        }
      });
      //highlight -> Page Section
    }
  }
});
