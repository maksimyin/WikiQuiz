export default defineBackground(() => {

  type PayloadMap =  {
    initialization: undefined,
    getData: {
      url: string
    }
  } // add more when we shape more payloads

  type ResponseData = Record<string, string | number | boolean>;
  type SendResponse = (response: ResponseData) => void;

  type Handler<T> = (payload: T, sendResponse: SendResponse) => void;

  const handlers: {
    [K in keyof PayloadMap]: Handler<PayloadMap[K]>
  } = {
    initialization: (payload, sendResponse) => {
      sendResponse({"success": true})
    },
    getData: async (payload, sendResponse) => {
      const { url } = payload;
      const storageKeys = [`title_${url}`, `description_${url}`, `extract_${url}`, `sections_${url}`, `metadata_${url}`];
      let data = await browser.storage.session.get(storageKeys);
      console.log(url, storageKeys, data);

      // If no data or data is outdated, fetch it
      if (!data[`title_${url}`] || 
          !data[`sections_${url}`] || 
          !data[`metadata_${url}`]?.timestamp ||
          Date.now() - data[`metadata_${url}`].timestamp >= 1000 * 60 * 60) {
        
        const title = decodeURIComponent(new URL(url).pathname.replace("/wiki/", ""));
        const fetched = await fetchAllData(title, url);
        if (fetched) {
          // Get the fresh data
          data = await browser.storage.session.get(storageKeys);
        }
      }

      // Format the response data
      const formattedData: any = {};
      for (const key in data) {
        // remove _${url} from key
        const newKey = key.replace(`_${url}`, "");
        formattedData[newKey] = data[key];
      }
      
      sendResponse(formattedData);
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
      typedHandler(message.payload, sendResponse)
      return true;
    } else {
      sendResponse({"reply": "This isn't a valid command"})
      return false
    }
  });


  let lastProcessedUrl = "";
  let isProcessing = false;  

  const handlePageUpdate = async (url: string) => {
    if (!url || !url.includes("wikipedia.org/wiki/") || url === lastProcessedUrl || isProcessing) {
      return;
    }

    isProcessing = true;
    try {
      lastProcessedUrl = url;
      const title = decodeURIComponent(new URL(url).pathname.replace("/wiki/", ""));
      console.log("fetching data", title, url);
      const fetched = await fetchAllData(title, url);
      console.log("fetched", fetched);
    } finally {
      isProcessing = false;
    }
  }

  const fetchAllData = async (title: string, currentUrl: string) => {
    try {
      console.log("fetching data", title);
      const storageKeys = [`title_${currentUrl}`, `description_${currentUrl}`, `extract_${currentUrl}`, `sections_${currentUrl}`, `metadata_${currentUrl}`];
      const existingData = await browser.storage.session.get(storageKeys);
      
      // If data exists and is fresh (less than 1 hour old)
      if (existingData[`title_${currentUrl}`] && 
          existingData[`sections_${currentUrl}`] && 
          existingData[`metadata_${currentUrl}`]?.timestamp && 
          Date.now() - existingData[`metadata_${currentUrl}`].timestamp < 1000 * 60 * 60) {
        console.log("using existing data", currentUrl);
        return true;
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
      console.log("data saved", currentUrl);
      return true;

    } catch (error) {
      console.error('Error fetching wiki data:', error);
      return false;
    }
  };

  browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    // Only process when the page is fully loaded and has a URL
    if (changeInfo.status === "complete" && tab.url?.includes("wikipedia.org/wiki/")) {
      console.log("onUpdated", tab.url);
      handlePageUpdate(tab.url);
    }
  });

  browser.tabs.onActivated.addListener(async (activeInfo) => {  
    const tab = await browser.tabs.get(activeInfo.tabId);
    if (tab.url?.includes("wikipedia.org/wiki/")) {
      console.log("onActivated", tab.url);
      handlePageUpdate(tab.url);
    }
  });

});
