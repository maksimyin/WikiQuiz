export default defineBackground(() => {

  type PayloadMap =  {
    initialization: undefined,
    storePageContent: {
      title: string,
      //list more when we finish functionality
    },
    fetchPageData: {
      title?: boolean,
      description?: boolean,
      extract?: boolean,
      sections?: boolean
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
    storePageContent: (payload, sendResponse) => {
      const fetchAllData = async () => {
        try {
          const [summaryResponse, sectionsResponse] = await Promise.all([
            fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(payload.title)}`),
            fetch(`https://en.wikipedia.org/w/api.php?origin=*&format=json&action=parse&page=${encodeURIComponent(payload.title)}&prop=sections`)
          ]);
          
          const [summaryData, sectionsData] = await Promise.all([
            summaryResponse.json(),
            sectionsResponse.json()
          ]);

          await browser.storage.session.set({
            title: summaryData.title,
            description: summaryData.description,
            extract: summaryData.extract,
            sections: sectionsData.parse?.sections
          });
          console.log(sectionsData)

          sendResponse({"success": true, "received": payload.title});
        } catch (error) {
          console.error('Error fetching wiki data:', error);
          sendResponse({"success": false, "error": "Failed to fetch wiki data"});
        }
      };

      fetchAllData();
      return true;
    },
    fetchPageData: (payload, sendResponse) => {
      const fetchSectionData = async () => {
        let response: Record<string, any[] | string> = {};
        for (const k of Object.keys(payload)) {
          const data = await browser.storage.session.get(k);
          response[k] = data[k];
        }
        sendResponse({"success": true, ...response});
      }
      fetchSectionData();
      return true;
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
});

