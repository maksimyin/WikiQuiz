import { convert } from 'html-to-text';
import * as prompts from '../utils/prompts';
import { generateQuizGemini } from '../utils/ai-helper';
import * as types from '../utils/types';
import { SELECTORS, isMetaSection, schema } from '../utils/constants';
import type { WikiSection, StorageMetadata, StorageSchema } from '../utils/types';
import { createStorageKeys } from '../utils/types';
import { sessionStorage, getUserSettings, updateUserSettings } from '../utils/storage';
import {jsonrepair} from 'jsonrepair'
//Ajv for json validation
// need to switch to zod for json validation


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
    getSidebarState: "local" | "session",
    toggleSettings: {
      questionDifficulty: "easy" | "medium" | "hard",
      numQuestions: 4 | 7
    },
    getSettings: {
      questionDifficulty: "easy" | "medium" | "hard",
      numQuestions: 4 | 7
    }
  } // add more when we shape more payloads

  type ResponseData = Record<string, any>;
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
      
      // Use typed storage to get wiki page data
      let data = await sessionStorage.getWikiPageData(url);

      // If no data or data is outdated, fetch it
      if (!data.title || 
          !data.sections || 
          !data.metadata?.timestamp ||
          Date.now() - data.metadata.timestamp >= 1000 * 60 * 60) {
        
        const title = decodeURIComponent(new URL(url).pathname.replace("/wiki/", ""));
        const fetched = await fetchAllData(title, url);
        if (fetched) {
          // Get the fresh data
          data = await sessionStorage.getWikiPageData(url);
        }
      }

      // Format the response data (ensure all fields are defined)
      const formattedData: ResponseData = {
        title: data.title || "",
        summary: data.summary || {},
        sections: data.sections || [],
        metadata: data.metadata || { timestamp: 0, url: "", title: "" }
      };
      
      sendResponse(formattedData);
    },
    getQuizContent: async (payload, sendResponse): Promise<boolean> => {
      // error handling for LLM mistakes; if adding token system for users refund their tokens in case of error
      function checkQuizContent(quizContent: types.QuizContent, expectedQuestions: number): boolean {
        if (!quizContent || !Array.isArray((quizContent as any).questions)) {
          sendResponse({
            reply: `Model returned no questions. Expected ${expectedQuestions}. Try again or adjust settings.`
          });
          return false;
        }
        const received = (quizContent as any).questions.length;
        if (received !== expectedQuestions) {
          sendResponse({
            reply: `Expected ${expectedQuestions} questions but received ${received}. Please try again.`
          });
          return false;
        }
        for (let idx = 0; idx < (quizContent as any).questions.length; idx++) {
          const question = (quizContent as any).questions[idx];
          const issues: string[] = [];
          const validQuestion = typeof question?.question === "string" && question.question.trim().length > 0;
          if (!validQuestion) issues.push("missing or empty question text");
          const validOptionsArray = Array.isArray(question?.options);
          const validOptionsCount = validOptionsArray && question.options.length === 4;
          const validOptionsValues = validOptionsArray && question.options.every((o: any) => typeof o === "string" && o.trim().length > 0);
          if (!validOptionsArray) issues.push("options is not an array");
          else if (!validOptionsCount) issues.push(`options must contain 4 choices (got ${question.options?.length ?? 0})`);
          else if (!validOptionsValues) issues.push("one or more options are not non-empty strings");
          const validExplanation = typeof question?.explanation === "string" && question.explanation.trim().length > 0;
          if (!validExplanation) issues.push("missing or empty explanation");
          const validAnswer = Number.isInteger(question?.answer) && question.answer >= 0 && question.answer <= 3;
          if (!validAnswer) issues.push("answer must be an integer index 0-3 corresponding to options A-D");
          if (issues.length > 0) {
            console.log("Invalid question detected", { index: idx, question });
            sendResponse({
              reply: `Invalid question at #${idx + 1}: ${issues.join(", ")}. Please try again.`
            });
            return false;
          }
        }
        return true;
      }
      const { topic, bucket_a, url } = payload;
      
      // Get settings from storage using typed storage
      const settings = await getUserSettings();
      const numQuestions = settings.numQuestions;
      
      console.log("bucket_a", bucket_a);
      if (typeof(bucket_a) === "number") {
        let sectionContent = await getSectionContent(topic, bucket_a, url);
        if (typeof(sectionContent) === "string") {
          sendResponse({"reply": sectionContent})
          return false
        }
        let sectionTitle = sectionContent?.[1] || "";
        sectionContent = sectionContent?.[0] || "";
        
        let section_chopped: Record<number, string> = {};
        const sentences = sectionContent.match(
          /(?=[^])(?:\P{Sentence_Terminal}|\p{Sentence_Terminal}(?!['"`\p{Close_Punctuation}\p{Final_Punctuation}\s]))*(?:\p{Sentence_Terminal}+['"`\p{Close_Punctuation}\p{Final_Punctuation}]*|$)/gu
        ) || [sectionContent];
        sentences.forEach((sentence, idx) => {
          section_chopped[idx + 1] = sentence.trim();
        });
        console.log("section_chopped", section_chopped);
        if (Object.keys(section_chopped).length < 7) {
          sendResponse({"reply": `Not enough content in section "${sectionTitle}" to generate a quiz`})
          return false;
        }
        let quizContent: types.QuizContent | null = null;
        try {
          quizContent = await sendAIChat(section_chopped, "section", topic, sectionTitle);
        } catch (err: any) {
          console.error("Quiz generation error (section)", err);
          sendResponse({ reply: `Quiz generation failed: ${err?.message || String(err)}` });
          return false;
        }
        console.log("quizContent", quizContent);
        if (!quizContent) {
          sendResponse({ reply: "Quiz generation returned empty result. Please retry." })
          return false;
        }
        if (!checkQuizContent(quizContent, numQuestions)) {
          return false;
        }
        try {
          console.log("sent quizContent", quizContent);
          sendResponse({"reply": quizContent})
          return true;
        } catch (error) {
          console.error("Error sending quiz content:", error);
          sendResponse({"reply": "Error generating quiz content"})
          return false;
        }

      } else if (typeof(bucket_a) === "object") {
        const summaryContent = bucket_a
        console.log("summaryContent", summaryContent);
        if (summaryContent) {
          const summaryCount = Object.keys(summaryContent).length;
          if (summaryCount < 7) {
            sendResponse({"reply": `Not enough content in Introduction (found ${summaryCount} sentences; need at least 7).`})
            return false;
          }
          let quizContent: types.QuizContent | null = null;
          try {
            quizContent = await sendAIChat(summaryContent, "summary", topic);
          } catch (err: any) {
            console.error("Quiz generation error (summary)", err);
            sendResponse({ reply: `Quiz generation failed: ${err?.message || String(err)}` });
            return false;
          }
          if (!quizContent) {
            sendResponse({"reply": "Quiz generation returned empty result. Please retry."})
            return false;
          }
          if (!checkQuizContent(quizContent, numQuestions)) {
            return false;
          }
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
    },
    toggleSettings: async (payload, sendResponse): Promise<void> => {
      const { questionDifficulty, numQuestions } = payload;
      console.log("toggleSettings", questionDifficulty, numQuestions);
      
      // Use typed storage for settings
      await updateUserSettings({
        questionDifficulty: questionDifficulty,
        numQuestions: numQuestions
      });
      
      sendResponse({"success": true})
    },
    getSettings: async (payload, sendResponse): Promise<void> => {
      const settings = await getUserSettings();
      sendResponse({
        "questionDifficulty": settings.questionDifficulty, 
        "numQuestions": settings.numQuestions
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


  interface RequestQueue {
    [key: string]: {
      timestamp: number;
    };
  }


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
  const sendAIChat = async (content: Record<number, string>, type: "section" | "summary", topic: string, sectionTitle?: string): Promise<types.QuizContent | null> => {
    function formatBucket(sentences: Record<number, string>) {
      return Object.entries(sentences)
        .map(([n, line]) => `${n}. ${line}`)
        .join('\n');
    }

    // Get settings from storage using typed storage
    const settings = await getUserSettings();
    const questionDifficulty = settings.questionDifficulty;
    const numQuestions = settings.numQuestions;

    // consider using: https://docs.boundaryml.com/guide/installation-language/typescript for json verification for gemini
    // use generateQuiz for general testing
    // Add settings (question variabvility and difficulty)
    const prompt = type === "section" 
      ? (questionDifficulty === "easy" ? prompts.USER_SECTION : questionDifficulty === "medium" ? prompts.USER_SECTION_COMPLEX : prompts.USER_SECTION_EXTREME)
      : (questionDifficulty === "easy" ? prompts.USER_SUMMARY : questionDifficulty === "medium" ? prompts.USER_SUMMARY_COMPLEX : prompts.USER_SUMMARY_EXTREME);
    
    const quizContent: any = type === "section" ? 
    await generateQuizGemini(prompts.fillPrompt(prompts.SYSTEM_PROMPT_ARTICLE_SPECIFIC, {
      TOPIC: topic,
      BUCKET_A: formatBucket(content)
            }), prompts.fillPrompt(prompt, {
        NUM_QUESTIONS: numQuestions.toString(),
        TOPIC: topic,
        SECTION_TITLE: sectionTitle || ""}))
       :
      await generateQuizGemini(prompts.fillPrompt(prompts.SYSTEM_PROMPT_ARTICLE_SPECIFIC, {
        TOPIC: topic,
        BUCKET_A: formatBucket(content)
      }), prompts.fillPrompt(prompt, {
        NUM_QUESTIONS: numQuestions.toString(),
        TOPIC: topic}))

    if (!quizContent || !quizContent.candidates || !quizContent.candidates[0] || !quizContent.candidates[0].content) {
      console.error("Invalid quiz content structure:", quizContent);
      throw new Error("Model returned an empty response. Please try again or lower difficulty.");
    }

    const responseText = quizContent.candidates[0].content.parts[0].text;
    console.log("Raw response text:", responseText);
    
    // jsonrepair | consider switcing to gpt for better json return
    let response: types.QuizContent;
    try {
      response = JSON.parse(jsonrepair(responseText)) as types.QuizContent;
      console.log("Repaired response:", response);
    } catch (error: any) {
      console.error("Error in jsonrepair:", error);
      throw new Error(`Failed to parse model JSON output: ${error?.message || String(error)}`);
    }

    if (!response || !response.questions || !Array.isArray(response.questions)) {
      console.error("Invalid response structure or too few tokens");
      throw new Error("Model returned invalid quiz structure. Please retry.");
    }
    
    // sanitize fields and coerce answer safely
    response.questions = response.questions.map((q: any) => {
      const coercedAnswer = typeof q?.answer === "number" ? q.answer : parseInt(String(q?.answer ?? ""), 10);
      return {
        ...q,
        question: typeof q?.question === "string" ? q.question.trim() : q?.question,
        explanation: typeof q?.explanation === "string" ? q.explanation.trim() : q?.explanation,
        options: Array.isArray(q?.options) ? q.options.map((o: any) => typeof o === "string" ? o.trim() : o) : q?.options,
        answer: Number.isFinite(coercedAnswer) ? coercedAnswer : NaN,
      };
    }) as any;

    return response;
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

  
  

  // create a general function to convert html to text and then text to sentences for summary change from extract to section=0; then clean up frontend
  const getSectionContent = async (topic: string, section_index: number, pageUrl: string): Promise<[string, string] | string> => {
    try {
      pageUrl = pageUrl.match(idRegex)?.[0] || pageUrl;
      console.log("pageUrl", pageUrl);
      const storageKeys = [`sections_${pageUrl}`];
      const sectionsData = await browser.storage.session.get(storageKeys);
      const sections: WikiSection[] = sectionsData[`sections_${pageUrl}`] || [];
      console.log("sections", sections);
      
      const currentSection = sections.find((s: WikiSection) => Number(s.index) === Number(section_index));
      if (!currentSection) {
        const available = sections.map((s: WikiSection) => s.index).slice(0, 20).join(", ");
        return `Section ${section_index} not found in stored sections. Available indices (first 20): ${available}`;
      }

      const api_url = `https://en.wikipedia.org/w/api.php?origin=*&format=json&action=parse&page=${encodeURIComponent(topic)}&prop=text&section=${section_index}`;
      
      const sectionHTML = await makeWikipediaRequest(api_url);
      if (!sectionHTML.ok) {
        return `Wikipedia API request failed with status ${sectionHTML.status} for section ${section_index}.`;
      }

      const sectionHTMLData: Section_Api_Response = await sectionHTML.json();
      if (!sectionHTMLData.parse?.text["*"]) {
        return `Invalid response from Wikipedia API: missing section html.`;
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
          console.log(firstSubsection, subsectionTitle)
          if (subsectionTitle) {
            // Use regex without word boundaries since subsection titles may not have clear boundaries
            const escapedTitle = subsectionTitle.replace(/[()]/g, '\\$&').replace(/[–—-]/g, '[–—-]').replace(/\s+/g, '\\s+');
            const regex = new RegExp(escapedTitle, 'mi');
            console.log('Searching for subsection:', subsectionTitle);
            console.log('Using regex:', regex);
            
            const match = cleanText.search(regex);
            console.log('Match found at position:', match);
            if (match !== -1) {
              // Cut text right before the subsection title
              cleanText = cleanText.substring(0, match).trim();
              console.log('Text cut to length:', cleanText.length);
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

      return [cleanText, currentSection.line];
    } catch (fetchError: any) {
      if (fetchError.name === 'AbortError') {
        return `Wikipedia API request timed out`;
      } else {
        return `Error fetching from Wikipedia API: ${fetchError?.message || String(fetchError)}`;
      }
    }
  };

  const handlePageUpdate = async (url: string) => {
    const baseUrl = url.match(idRegex)?.[0] || url;

    if (!baseUrl || baseUrl === lastProcessedUrl || isProcessing || url.includes("wikipedia.org/wiki/Main_Page")) {
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
    // helper to check if section is meta section case insensitive
    
    if (currentUrl.includes("wikipedia.org/wiki/Main_Page")) {
      return false;
    }
    currentUrl = currentUrl.match(idRegex)?.[0] || currentUrl;
    try {
      // Check existing data using typed storage
      const existingData = await sessionStorage.getWikiPageData(currentUrl);
      

      if (existingData.title && 
          existingData.sections && 
          existingData.metadata?.timestamp && 
          Date.now() - existingData.metadata.timestamp < 1000 * 60 * 60) {
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
        // make sure there are at least 7 sentences

      }
      let sections = sectionsData.parse?.sections || [];

      // remove tags from section lines
      sections.forEach((section: WikiSection) => {
        section.line = section.line.replace(/<[^>]*>?/g, '').trim();
      });

      // Remove sections that are meta sections and remove 2nd+ instance of a duplicate section.line
      const seenSectionLines = new Set<string>();
      sections = sections.filter((section: WikiSection) => {
        if (isMetaSection(section.line)) return false;
        if (seenSectionLines.has(section.line)) return false;
        seenSectionLines.add(section.line);
        return true;
      });
      
      const parsedTitle = summaryData?.parse?.title ?? title;
      
      const timeStamp = Date.now();
      // Use typed storage to set wiki page data
      await sessionStorage.setWikiPageData(currentUrl, {
        title: parsedTitle,
        summary: summarySentences,
        sections: sections,
        metadata: {
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

