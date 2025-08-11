import { convert } from 'html-to-text';
import * as prompts from '../utils/prompts';
import { generateQuiz } from '../utils/ai-helper';
import * as types from '../utils/types';

export default defineBackground(() => {

  type PayloadMap =  {
    initialization: undefined,
    getData: {
      url: string
    },
    getQuizContent: {
      topic: string,
      bucket_a: Record<number, string> | number,
      quizType: "general_knowledge" | "text_specific",
      url: string
    },
    toggleSidebar: "local" | "session",
    getSidebarState: "local" | "session"
  } // add more when we shape more payloads

  type ResponseData = Record<string, string | number | boolean | types.QuizContent>;
  type SendResponse = (response: ResponseData) => void;

  type Handler<T> = (payload: T, sendResponse: SendResponse) => void;


  const handlers: {
    [K in keyof PayloadMap]: Handler<PayloadMap[K]>
  } = {
    initialization: (payload, sendResponse) => {
      sendResponse({"success": true})
    },
    getData: async (payload, sendResponse) => {
      let { url } = payload;
      url = url.match(idRegex)?.[0] || url;
      const storageKeys = [`title_${url}`, `description_${url}`, `summary_${url}`, `sections_${url}`, `metadata_${url}`];
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
    // fix return type when ai thing finished
    getQuizContent: async (payload, sendResponse): Promise<boolean> => {
      const { topic, bucket_a, url } = payload;
      console.log("bucket_a", bucket_a);
      if (typeof(bucket_a) === "number") {
        let sectionContent = await getSectionContent(topic, bucket_a, url);
        let sectionTitle = sectionContent?.[1] || "";
        sectionContent = sectionContent?.[0] || "";
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
          const quizContent: types.QuizContent = await sendAIChat(section_chopped, "section", topic, sectionTitle);
          try {
            console.log("sent quizContent", quizContent);
            sendResponse({"reply": quizContent})
            return true;
          } catch (error) {
            console.error("Error sending quiz content:", error);
            sendResponse({"reply": "Error generating quiz content"})
            return false;
          }
        }
      } else if (typeof(bucket_a) === "object") {
        const summaryContent = bucket_a
        console.log("summaryContent", summaryContent);
        if (summaryContent) {
          const quizContent = await sendAIChat(summaryContent, "summary", topic);
          try {
            console.log("sent quizContent", quizContent);
            sendResponse({"reply": quizContent})
            return true;
          } catch (error) {
            console.error("Error sending quiz content:", error);
            sendResponse({"reply": "Error generating quiz content"})
            return false;
          }
        } else {
          sendResponse({"reply": "No content available"})
          return false
        }
      }
      return false;
    },
    toggleSidebar: (payload, sendResponse): void => {
      toggleSidebar(payload).then((enabled) => {
        console.log("enabled", enabled);
        sendResponse({"sidebarEnabled": enabled})
      })
    },
    getSidebarState: (payload, sendResponse): void => {
      getSidebarState(payload).then((enabled) => {
        sendResponse({"sidebarEnabled": enabled})
      })
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

  interface Action_Api_Response {
    parse: {
      text: {
        "*": string
      },
      title: string,
    }
  }
  interface WikiSection {
    anchor: string,
    fromtitle: string,
    index: number,
    level: number,
    line: string,
    number: number,
    toclevel: number,
  }

  interface StorageMetadata {
    timestamp: number;
    url: string;
    title: string;
  }

  interface RequestQueue {
    [key: string]: {
      timestamp: number;
    };
  }

  type SummaryData = {
    title: string;
    description?: string;
    extract?: string;
    [key: string]: any;
  };

  type SectionsData = {
    parse?: {
      sections?: WikiSection[];
      title?: string;
      pageid?: number;
    };
  };

  interface Section_Api_Response extends Action_Api_Response {
    parse: {
      pageid: number,
      text: { "*": string },
      title: string
    }
  }

  let lastProcessedUrl = "";
  let isProcessing = false;
  const idRegex = /^(https:\/\/en\.wikipedia\.org\/wiki\/[^#]+)/;


  const requestQueue: RequestQueue = {};
  const MIN_REQUEST_INTERVAL = 1000; 

  // TODO: Use utils functions to send section/summary to Cohere
  const sendAIChat = async (content: Record<number, string>, type: "section" | "summary", topic: string, sectionTitle?: string): Promise<types.QuizContent> => {
    function formatBucket(sentences: Record<number, string>) {
      return Object.entries(sentences)
        .map(([n, line]) => `${n}. ${line}`)
        .join('\n');
    }


    const quizContent: any = type === "section" ? 
    await generateQuiz(prompts.fillPrompt(prompts.SYSTEM_PROMPT_ARTICLE_SPECIFIC, {
      TOPIC: topic,
      BUCKET_A: formatBucket(content)
    }), prompts.fillPrompt(prompts.SECTION_PROMPT_USER, {
      TOPIC: topic,
      SECTION_TITLE: sectionTitle || ""}))
     :
    await generateQuiz(prompts.fillPrompt(prompts.SYSTEM_PROMPT_ARTICLE_SPECIFIC, {
      TOPIC: topic,
      BUCKET_A: formatBucket(content)
    }), prompts.fillPrompt(prompts.SUMMARY_PROMPT_USER, {TOPIC: topic}))
    return JSON.parse(quizContent.message.content[0].text); // subject to change based on different LLMs
  }

  const toggleSidebar = async (payload: "local" | "session") => {
    const result = await browser.storage[payload].get("sidebarEnabled");
    const currentState: boolean = result.sidebarEnabled ?? false; // Default to false if undefined
    const newState = !currentState;
    await browser.storage[payload].set({sidebarEnabled: newState});
    console.log(`Sidebar toggled: ${currentState} -> ${newState}`);
    return newState;
  }

  const getSidebarState = async (payload: "local" | "session") => {
    const result = await browser.storage[payload].get("sidebarEnabled");
    const currentState: boolean = result.sidebarEnabled ?? false; // Default to false if undefined
    console.log(`Sidebar state retrieved: ${currentState}`);
    return currentState;
  }

  const makeWikipediaRequest = async (url: string) => {
    const now = Date.now();
    
    Object.keys(requestQueue).forEach(key => {
      if (now - requestQueue[key].timestamp > 60000) { 
        delete requestQueue[key];
      }
    });

    const lastRequest = Object.values(requestQueue).reduce((latest, current) => 
      current.timestamp > latest ? current.timestamp : latest, 0);
    
    if (now - lastRequest < MIN_REQUEST_INTERVAL) {
      await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_INTERVAL - (now - lastRequest)));
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      const requestId = `${url}_${now}`;
      requestQueue[requestId] = {
        timestamp: now
      };

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'WikiChromeAI/1.0 (https://github.com/BostonCelticFanCoder/WikiChromeAI; yinmaksim@gmail.com) Chrome Extension',
          'Api-User-Agent': 'WikiChromeAI/1.0 (https://github.com/BostonCelticFanCoder/WikiChromeAI; yinmaksim@gmail.com)'
        }
      });
      clearTimeout(timeoutId);
      return response;
    } finally {
      clearTimeout(timeoutId);
    }
  };

  const SELECTORS = [
    // Skip infoboxes, sidebars, navboxes, and ToC
    { selector: 'table.infobox', format: 'skip' },
    { selector: '.infobox', format: 'skip' },
    { selector: 'table.vertical-navbox', format: 'skip' },
    { selector: '.vertical-navbox', format: 'skip' },
    { selector: 'table.sidebar', format: 'skip' },
    { selector: '.sidebar', format: 'skip' },
    { selector: 'table.navbox', format: 'skip' },
    { selector: '.navbox', format: 'skip' },
    { selector: '#toc', format: 'skip' },
    { selector: '.toc', format: 'skip' },
    // General cleanups and misc templates
    { selector: '.mw-editsection', format: 'skip' },
    { selector: '.reference', format: 'skip' },
    { selector: '.error', format: 'skip' },
    { selector: '.mw-empty-elt', format: 'skip' },
    { selector: '.reflist', format: 'skip' },
    { selector: '.navbox', format: 'skip' },
    { selector: '.infobox', format: 'skip' },
    { selector: '.hatnote', format: 'skip' },
    { selector: '.citation', format: 'skip' },
    { selector: 'sup', format: 'skip' },
    { selector: '.printfooter', format: 'skip' },
    { selector: '.catlinks', format: 'skip' },
    { selector: '.thumbinner', format: 'skip' },
    { selector: '.thumb', format: 'skip' },
    { selector: '.thumbcaption', format: 'skip' },
    { selector: '.caption', format: 'skip' },
    { selector: '.gallery', format: 'skip' },
    { selector: 'img', format: 'skip' },
    { selector: '.mw-references-wrap', format: 'skip' },
    { selector: 'figcaption', format: 'skip' },
    { selector: '.magnify', format: 'skip' },
    { selector: '.internal', format: 'skip' },
    { selector: '.image-caption', format: 'skip' },
    { selector: '.gallerytext', format: 'skip' },
    { selector: '.shortdescription', format: 'skip' },
    { selector: '.metadata', format: 'skip' },
    { selector: '.sistersitebox', format: 'skip' },
    { selector: '.rellink', format: 'skip' },
    { selector: '.ambox', format: 'skip' },
    { selector: '.mbox', format: 'skip' },
    { selector: 'a', format: 'inline', options: { ignoreHref: true } }
  ]
  

  // create a general function to convert html to text and then text to sentences for summary change from extract to section=0; then clean up frontend
  const getSectionContent = async (topic: string, section_index: number, pageUrl: string): Promise<[string, string] | string | null> => {
    try {
      pageUrl = pageUrl.match(idRegex)?.[0] || pageUrl;
      console.log("pageUrl", pageUrl);
      const storageKeys = [`sections_${pageUrl}`];
      const sectionsData = await browser.storage.session.get(storageKeys);
      const sections: WikiSection[] = sectionsData[`sections_${pageUrl}`] || [];
      console.log("sections", sections);
      
      const currentSection = sections.find((s: WikiSection) => Number(s.index) === Number(section_index));
      if (!currentSection) {
        console.error("Section not found in stored sections");
        return null;
      }

      const api_url = `https://en.wikipedia.org/w/api.php?origin=*&format=json&action=parse&page=${encodeURIComponent(topic)}&prop=text&section=${section_index}`;
      
      const sectionHTML = await makeWikipediaRequest(api_url);
      if (!sectionHTML.ok) {
        console.error("Wikipedia API request failed:", sectionHTML.status);
        return null;
      }

      const sectionHTMLData: Section_Api_Response = await sectionHTML.json();
      if (!sectionHTMLData.parse?.text["*"]) {
        console.error("Invalid response from Wikipedia API");
        return null;
      }

      const sectionText = convert(sectionHTMLData.parse.text["*"], {
        wordwrap: false,
        preserveNewlines: true,
        selectors: SELECTORS
      });
      
      let cleanText = sectionText
        .replace(/\[edit.*?\]/g, '')
        .replace(/\[\d+\]/g, '')
        .replace(/\[a\]/g, '')
        .replace(/\[\/wiki\/.*?\]/g, '')
        .replace(/\[\/\/upload\.wikimedia\.org\/.*?\]/g, '')
        .replace(/\[https?:\/\/.*?\]/g, '')
        .replace(/\d+\.\s*\^.*?(?=\d+\.\s*\^|$)/gs, '')
        .replace(/\s+/g, ' ')
        .trim();

      if (currentSection && Array.isArray(sections)) {
        let subsections: {index: number, line: string}[] = [];
        let i = section_index;

        while (i < sections.length && sections[i] && sections[i-1] && 
               sections[i].toclevel > currentSection.toclevel && 
               sections[i].index > section_index && 
               sections[i - 1].toclevel < sections[i].toclevel) {
          subsections.push(sections[i]);
          i++;
        }

        if (subsections.length > 0) {
          const firstSubsection = subsections[0];
          const subsectionTitle = firstSubsection.line;
          if (subsectionTitle) {
            const regex = new RegExp(`\\ ${subsectionTitle.toUpperCase()}\\b`, 'm');
            const match = cleanText.search(regex);
            if (match !== -1) {
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
        console.log("No content available for section", currentSection.line);
        return `No content available for section "${currentSection.line}"`;
      }

      return [cleanText, currentSection.line];
    } catch (fetchError: any) {
      if (fetchError.name === 'AbortError') {
        console.error("Wikipedia API request timed out");
      } else {
        console.error("Error fetching from Wikipedia API:", fetchError);
      }
      return null;
    }
  };

  const handlePageUpdate = async (url: string) => {
    const baseUrl = url.match(idRegex)?.[0] || url;

    if (!baseUrl || baseUrl === lastProcessedUrl || isProcessing || !url.includes("wikipedia.org/wiki/Main_Page")) {
      return;
    }

    isProcessing = true;
    try {
      lastProcessedUrl = baseUrl;
      
      const title = decodeURIComponent(new URL(baseUrl).pathname.replace("/wiki/", ""));
      await fetchAllData(title, baseUrl);
    } finally {
      isProcessing = false;
    }
  }

  const fetchAllData = async (title: string, currentUrl: string) => {
    if (currentUrl.includes("wikipedia.org/wiki/Main_Page")) {
      return false;
    }
    currentUrl = currentUrl.match(idRegex)?.[0] || currentUrl;
    try {
      const storageKeys = [`title_${currentUrl}`, `description_${currentUrl}`, `extract_${currentUrl}`, `sections_${currentUrl}`, `metadata_${currentUrl}`];
      const existingData = await browser.storage.session.get(storageKeys);
      

      if (existingData[`title_${currentUrl}`] && 
          existingData[`sections_${currentUrl}`] && 
          existingData[`metadata_${currentUrl}`]?.timestamp && 
          Date.now() - existingData[`metadata_${currentUrl}`].timestamp < 1000 * 60 * 60) {
          console.log("data = fresh");
        return true;
      }

      const summaryUrl = `https://en.wikipedia.org/w/api.php?origin=*&format=json&action=parse&page=${encodeURIComponent(title)}&prop=text&section=0`;
      const sectionsUrl = `https://en.wikipedia.org/w/api.php?origin=*&format=json&action=parse&page=${encodeURIComponent(title)}&prop=sections`;

      const [summaryResponse, sectionsResponse] = await Promise.all([
        makeWikipediaRequest(summaryUrl),
        makeWikipediaRequest(sectionsUrl)
      ]);

      if (!summaryResponse.ok || !sectionsResponse.ok) {
        console.error("API request failed:", {
          summary: summaryResponse.status,
          sections: sectionsResponse.status
        });
        return false;
      }


      const [summaryData, sectionsData]: [any, SectionsData] = await Promise.all([
        summaryResponse.json(),
        sectionsResponse.json()
      ]);

      // Convert section=0 HTML to plain text and sentences object
      const summaryHtml: string | undefined = summaryData?.parse?.text?.["*"];
      let summaryPlainText = "";
      let summarySentences: Record<number, string> = {};
      if (summaryHtml) {
        const converted = convert(summaryHtml, {
          wordwrap: false,
          preserveNewlines: true,
          selectors: SELECTORS
        });
        summaryPlainText = converted
          .replace(/\[edit.*?\]/g, '')
          .replace(/\[\d+\]/g, '')
          .replace(/\[a\]/g, '')
          .replace(/\[\/wiki\/.*?\]/g, '')
          .replace(/\[\/\/upload\.wikimedia\.org\/.*?\]/g, '')
          .replace(/\[https?:\/\/.*?\]/g, '')
          .replace(/\d+\.\s*\^.*?(?=\d+\.\s*\^|$)/gs, '')
          .replace(/\s+/g, ' ')
          .trim();

        const sentences = summaryPlainText.match(
          /(?=[^])(?:\P{Sentence_Terminal}|\p{Sentence_Terminal}(?!['"`\p{Close_Punctuation}\p{Final_Punctuation}\s]))*(?:\p{Sentence_Terminal}+['"`\p{Close_Punctuation}\p{Final_Punctuation}]*|$)/gu
        ) || (summaryPlainText ? [summaryPlainText] : []);
        sentences.forEach((sentence: string, idx: number) => {
          const trimmed = sentence.trim();
          if (trimmed) {
            summarySentences[idx + 1] = trimmed;
          }
        });
      }

      const parsedTitle = summaryData?.parse?.title ?? title;
      console.log("summarySentences", summarySentences);
      console.log("parsedTitle", parsedTitle);
      const timeStamp = Date.now();
      await browser.storage.session.set({
        [`title_${currentUrl}`]: parsedTitle,
        [`summary_${currentUrl}`]: summarySentences,
        [`sections_${currentUrl}`]: sectionsData.parse?.sections,
        [`metadata_${currentUrl}`]: {
          timestamp: timeStamp,
          url: currentUrl,
          title: parsedTitle
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
      const url = tab.url.match(idRegex)?.[0] || tab.url;
      console.log("onUpdated", url);
      handlePageUpdate(url);
    }
  });

  browser.tabs.onActivated.addListener(async (activeInfo) => {  
    const tab = await browser.tabs.get(activeInfo.tabId);
    if (tab.url?.includes("wikipedia.org/wiki/")) {
      const url = tab.url.match(idRegex)?.[0] || tab.url;
      console.log("onActivated", url);
      handlePageUpdate(url);
    }
  });

});
