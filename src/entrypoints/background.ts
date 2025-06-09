
export default defineBackground(() => {

  type PayloadMap =  {
    initialization: undefined
  } // add more when we shape more payloads

  type ResponseData = Record<string, string | number | boolean>;
  type SendResponse = (response: ResponseData) => void;

  type Handler<T> = (payload: T, sendResponse: SendResponse) => void;

  const handlers: {
    [K in keyof PayloadMap]: Handler<PayloadMap[K]>
  } = {
    initialization: (payload, sendResponse) => {
      sendResponse({"success": true})
    }
  }

  type Message = {
    [K in keyof PayloadMap]: {
      type: K;
      payload: PayloadMap[K];
    }
  }[keyof PayloadMap]

  browser.runtime.onMessage.addListener((
    message: Message,
    sender: Browser.runtime.MessageSender,
    sendResponse: (response?: ResponseData) => void
  ) => {
    const handler = handlers[message.type]
    if (handler) {
      const typedHandler = handler as Handler<PayloadMap[typeof message.type]>
      return typedHandler(message.payload, sendResponse)
    } else {
      sendResponse({"reply": "This isn't a valid command"})
      return false
    }
  });

  browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
   if (changeInfo.status === "complete") {
    handlePageUpdate(tab);
   }
  });

  browser.tabs.onActivated.addListener(async (activeInfo) => {
    const tab = await browser.tabs.get(activeInfo.tabId);
    handlePageUpdate(tab);
  })

  // helper functions to handle new tab and fetch data from Wikipedia REST and ACTION API

  let lastProcessedUrl = "";
  const handlePageUpdate = async (tab: Browser.tabs.Tab) => {
    if (!tab.url || tab.status !== "complete") {
      return;
    }

    if (!tab.url.includes("wikipedia.org/wiki/")) {
      return;
    }

    if (tab.url === lastProcessedUrl) {
      return;
    }

    lastProcessedUrl = tab.url;
    const title = decodeURIComponent(new URL(tab.url).pathname.replace("/wiki/", ""));
    await fetchAllData(title, tab);
  }

  const fetchAllData = async (title: string, tab: Browser.tabs.Tab) => {
    try {
      const currentUrl = tab.url;
      const storageKeys = [`title_${currentUrl}`, `description_${currentUrl}`, `extract_${currentUrl}`, `sections_${currentUrl}`, `metadata_${currentUrl}`];
      const existingData = await browser.storage.session.get(storageKeys);
      
      if (existingData[`title_${currentUrl}`] && existingData[`sections_${currentUrl}`]) {
        return;
      }

      const [summaryResponse, sectionsResponse] = await Promise.all([
        fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`),
        fetch(`https://en.wikipedia.org/w/api.php?origin=*&format=json&action=parse&page=${encodeURIComponent(title)}&prop=sections`)
      ]);
      
      const [summaryData, sectionsData] = await Promise.all([
        summaryResponse.json(),
        sectionsResponse.json()
      ]);

      const timeStamp = Date.now();
      console.log(currentUrl, timeStamp)

  
      await browser.storage.session.set({
        [`title_${currentUrl}`]: summaryData.title,
        [`description_${currentUrl}`]: summaryData.description,
        [`extract_${currentUrl}`]: summaryData.extract,
        [`sections_${currentUrl}`]: sectionsData.parse?.sections,
        [`metadata_${currentUrl}`]: {
          timestamp: timeStamp,
          url: currentUrl,
          title: summaryData.title
        }
      });
  
    } catch (error) {
      console.error('Error fetching wiki data:', error);
    }
  };
});
