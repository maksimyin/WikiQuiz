import { convert } from 'html-to-text';

export default defineBackground(() => {
  let currentUrl = '';  

  type PayloadMap =  {
    initialization: undefined,
    getData: {
      url: string
    },
    getQuizContent: {
      topic: string,
      bucket_a: Record<number, string> | number,
      quizType: "general_knowledge" | "text_specific"
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
    },
    getQuizContent: async (payload, sendResponse) => {
      const { topic, bucket_a, quizType } = payload;
      if (typeof(bucket_a) === "number") {
        const sectionContent = await getSectionContent(topic, bucket_a);
        if (sectionContent && sectionContent.includes("No content available")) {
          sendResponse({"reply": sectionContent})
          return false
        } else if (sectionContent) {
          let section_chopped: Record<number, string> = {};
          const sentences = sectionContent.match(
            /(?=[^])(?:\P{Sentence_Terminal}|\p{Sentence_Terminal}(?!['"`\p{Close_Punctuation}\p{Final_Punctuation}\s]))*(?:\p{Sentence_Terminal}+['"`\p{Close_Punctuation}\p{Final_Punctuation}]*|$)/gu
          ) || [sectionContent];
          sentences.forEach((sentence, idx) => {
            section_chopped[idx + 1] = sentence.trim();
          });
          console.log("section_chopped", section_chopped);
          // sendAIChat(section_chopped, quizType);
        }
      }
      // case for summary 
      // Return as sendResponse to Sidebar and implement quiz generation there
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

  // TODO: Use utils functions to send section/summary to Cohere
  const sendAIChat = async () => {
    return null;
  }

  const getSectionContent = async (topic: string, section_index: number) => {
    console.log("getting section content", topic, section_index);

    try {
      // Get sections data to find subsection titles
      const storageKeys = [`sections_${currentUrl}`];
      const sectionsData = await browser.storage.session.get(storageKeys);
      const sections = sectionsData[`sections_${currentUrl}`] || [];

      const sectionHTML = await fetch(`https://en.wikipedia.org/w/api.php?origin=*&format=json&action=parse&page=${encodeURIComponent(topic)}&prop=text&section=${section_index}`)
      const sectionHTMLData = await sectionHTML.json();
      // fix text problems
      const sectionText = convert(sectionHTMLData.parse?.text["*"], {
        wordwrap: false,
        preserveNewlines: true,
        selectors: [
          // Remove edit links, references, citations, and other unwanted elements
          { selector: '.mw-editsection', format: 'skip' },
          { selector: '.reference', format: 'skip' },
          { selector: '.error', format: 'skip' },
          { selector: '.mw-empty-elt', format: 'skip' },
          { selector: '.reflist', format: 'skip' },
          { selector: '.navbox', format: 'skip' },
          { selector: '.infobox', format: 'skip' },
          { selector: '.hatnote', format: 'skip' },
          { selector: '.citation', format: 'skip' },
          { selector: 'sup', format: 'skip' }, // Remove superscript citation numbers
          { selector: '.printfooter', format: 'skip' },
          { selector: '.catlinks', format: 'skip' },
          { selector: '.thumbinner', format: 'skip' }, // Remove image containers
          { selector: '.thumb', format: 'skip' }, // Remove thumbnails
          { selector: '.thumbcaption', format: 'skip' }, // Remove image captions
          { selector: '.caption', format: 'skip' }, // Remove captions
          { selector: '.gallery', format: 'skip' }, // Remove galleries
          { selector: 'img', format: 'skip' }, // Remove images
          { selector: '.mw-references-wrap', format: 'skip' }, // Remove reference sections
          // Additional selectors for image captions
          { selector: 'figcaption', format: 'skip' }, // Remove figure captions
          { selector: '.magnify', format: 'skip' }, // Remove magnify links in image captions
          { selector: '.internal', format: 'skip' }, // Remove internal image links
          { selector: '.image-caption', format: 'skip' }, // Remove explicit image captions
          { selector: '.gallerytext', format: 'skip' }, // Remove gallery text/captions
          // Handle links - keep text but remove the link
          { selector: 'a', format: 'inline', options: { ignoreHref: true } }
        ]
      });
      
      // Additional cleanup for citations and brackets
      let cleanText = sectionText
        .replace(/\[edit.*?\]/g, '') // Remove [edit] links
        .replace(/\[\d+\]/g, '') // Remove citation numbers like [1], [2]
        .replace(/\[a\]/g, '') // Remove letter citations like [a], [b]
        .replace(/\[\/wiki\/.*?\]/g, '') // Remove wiki links like [/wiki/Something]
        .replace(/\[\/\/upload\.wikimedia\.org\/.*?\]/g, '') // Remove image URLs
        .replace(/\[https?:\/\/.*?\]/g, '') // Remove external URLs
        // Remove numbered citation lists (pattern: number followed by ^ and citation text)
        .replace(/\d+\.\s*\^.*?(?=\d+\.\s*\^|$)/gs, '')
        .replace(/\s+/g, ' ') // Replace multiple spaces with single space
        .trim();

      const currentSection = sections.find((s: any) => s.index == section_index);
      if (currentSection && Array.isArray(sections)) {
        let subsections: {index: number, line: string}[] = []
        let i = section_index;

        while (sections[i].toclevel > currentSection.toclevel && sections[i].index > section_index && sections[i - 1].toclevel < sections[i].toclevel) {
          subsections.push(sections[i]);
          i++;
        }

        
        if (subsections.length > 0) {
          // Find the first subsection title in the text
          const firstSubsection = subsections[0];
          const subsectionTitle = firstSubsection.line;
          console.log("subsectionTitle", subsectionTitle);
          if (subsectionTitle) {
            const regex = new RegExp(`\\ ${subsectionTitle.toUpperCase()}\\b`, 'm');
            const match = cleanText.search(regex);

            
            if (match !== -1) {
              console.log(`Found subsection "${subsectionTitle}" at position ${match}`);
              // Include everything before the period that precedes the title
              cleanText = cleanText.substring(0, match + 1).trim();
            }
          }

         

        }
      }
      if (currentSection.line) {
        const sectionTitleRegex = new RegExp(`${currentSection.line.toUpperCase()}\\b`, 'g');
        cleanText = cleanText.replace(sectionTitleRegex, '').trim();
      }

      if (!cleanText || cleanText.length === 0) {
        return `No content available for section "${currentSection.line}"`;
      }

      return cleanText;
    } catch (error) {
      console.error('Error fetching section content:', error);
      return null;
    }
  }

  const handlePageUpdate = async (url: string) => {
    if (!url || !url.includes("wikipedia.org/wiki/") || url === lastProcessedUrl || isProcessing) {
      return;
    }

    isProcessing = true;
    try {
      lastProcessedUrl = url;
      const title = decodeURIComponent(new URL(url).pathname.replace("/wiki/", ""));
      const fetched = await fetchAllData(title, url);
    } finally {
      isProcessing = false;
    }
  }

  const fetchAllData = async (title: string, currentUrl: string) => {
    try {
      const storageKeys = [`title_${currentUrl}`, `description_${currentUrl}`, `extract_${currentUrl}`, `sections_${currentUrl}`, `metadata_${currentUrl}`];
      const existingData = await browser.storage.session.get(storageKeys);
      
      // If data exists and is fresh (less than 1 hour old)
      if (existingData[`title_${currentUrl}`] && 
          existingData[`sections_${currentUrl}`] && 
          existingData[`metadata_${currentUrl}`]?.timestamp && 
          Date.now() - existingData[`metadata_${currentUrl}`].timestamp < 1000 * 60 * 60) {
        return true;
      }

      const [summaryResponse, sectionsResponse, ] = await Promise.all([
        fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`),
        fetch(`https://en.wikipedia.org/w/api.php?origin=*&format=json&action=parse&page=${encodeURIComponent(title)}&prop=sections`),
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
    if (tab.url) {  
      currentUrl = tab.url;
    }
  });

  browser.tabs.onActivated.addListener(async (activeInfo) => {  
    const tab = await browser.tabs.get(activeInfo.tabId);
    if (tab.url?.includes("wikipedia.org/wiki/")) {
      console.log("onActivated", tab.url);
      handlePageUpdate(tab.url);
    }
    if (tab.url) {  
      currentUrl = tab.url;
    }
  });

});
