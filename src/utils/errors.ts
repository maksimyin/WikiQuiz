import type { ExtensionError } from "./types";

// Centralized UI messages for error codes
export const ERROR_MESSAGES = {
  MSG_TIMEOUT: "The extension is busy. Please try again.",
  MSG_NO_HANDLER: "This action isn’t available.",
  MSG_INIT_FAILED: "Couldn’t connect to the extension. Please reload the page.",

  WIKI_HTTP_4XX: "Wikipedia couldn’t find this content.",
  WIKI_HTTP_5XX: "Wikipedia is temporarily unavailable. Try again.",
  WIKI_TIMEOUT: "Wikipedia request timed out. Please retry.",
  WIKI_SECTION_NOT_FOUND: "That section isn’t available on this page.",
  WIKI_INVALID_HTML: "Wikipedia returned unexpected data.",

  LLM_CONNECT_FAIL: "Couldn’t reach the AI service. Please try again.",
  LLM_EMPTY: "AI returned an empty response. Please try again or lower difficulty.",
  LLM_JSON_PARSE: "AI response couldn’t be parsed. Please try again.",
  LLM_BAD_STRUCTURE: "AI returned an invalid quiz structure.",
  LLM_BAD_COUNT: "Generated quiz has the wrong number of questions.",
  LLM_INVALID_QUESTION: "One or more questions are invalid. Please try again.",
  LLM_INSUFFICIENT_SOURCE: "Not enough content to generate a quiz. Pick a longer section.",

  SETTINGS_READ_FAIL: "Couldn’t load settings. Using defaults.",
  SETTINGS_WRITE_FAIL: "Couldn’t save settings. Please try again.",
  STORAGE_READ_FAIL: "Couldn’t read stored data.",
  STORAGE_WRITE_FAIL: "Couldn’t save data.",

  UI_SIDEBAR_RENDER_FAIL: "Sidebar failed to load. Please try again.",
  UI_POPUP_RENDER_FAIL: "Popup failed to load. Please try again.",

  EVENT_DUPLICATE_LISTENER: "Internal event issue detected. Please reload the page.",

  UNKNOWN: "Something in the extension went wrong. Please try again."
} as const;

export type ErrorCode = keyof typeof ERROR_MESSAGES;

export function messageFor(code: ErrorCode): string {
  return ERROR_MESSAGES[code];
}

export function toUiMessage(err: unknown): string {
  if (!err) return ERROR_MESSAGES.UNKNOWN;
  if (typeof err === "string") return err;
  const e = err as Partial<ExtensionError> & { code?: string; message?: string };
  if (e.code && (e.code as string) in ERROR_MESSAGES) {
    return ERROR_MESSAGES[e.code as ErrorCode];
  }
  return e.message || ERROR_MESSAGES.UNKNOWN;
}

// usage: Either throw error in Extension error typing format
// OR Pass through a sendResponse and create Sidebar.tsx error UI using toUiMessage() and messageFor()

/* 
import { ERROR_MESSAGES } from '../utils/errors';
import type { ExtensionError } from '../utils/types';

// Example 1: Wikipedia API failure
const makeWikipediaRequest = async (url: string) => {
  try {
    const response = await fetch(url);
    
    if (response.status >= 400 && response.status < 500) {
      // Return structured error
      const error: ExtensionError = {
        code: "WIKI_HTTP_4XX",
        message: ERROR_MESSAGES.WIKI_HTTP_4XX,
        httpStatus: response.status,
        retryable: false
      };
      throw error;
    }
    
    if (!response.ok) {
      const error: ExtensionError = {
        code: "WIKI_HTTP_5XX",
        message: ERROR_MESSAGES.WIKI_HTTP_5XX,
        httpStatus: response.status,
        retryable: true
      };
      throw error;
    }
    
    return response;
  } catch (error) {
    // Re-throw as structured error if needed
    if (error.name === 'AbortError') {
      const timeoutError: ExtensionError = {
        code: "WIKI_TIMEOUT",
        message: ERROR_MESSAGES.WIKI_TIMEOUT,
        retryable: true
      };
      throw timeoutError;
    }
    throw error;
  }
};

// Example 2: In message handlers
handlers: {
  getData: async (payload, sendResponse) => {
    try {
      const data = await fetchData();
      sendResponse(data);
    } catch (error) {
      sendResponse({ 
        error: {
          code: "STORAGE_READ_FAIL",
          message: ERROR_MESSAGES.STORAGE_READ_FAIL,
          retryable: true
        }
      });
    }
  },
  
  getQuizContent: async (payload, sendResponse) => {
    try {
      const quiz = await generateQuiz();
      if (!quiz.questions || quiz.questions.length !== expectedCount) {
        sendResponse({
          error: {
            code: "LLM_BAD_COUNT",
            message: ERROR_MESSAGES.LLM_BAD_COUNT,
            retryable: true
          }
        });
        return;
      }
      sendResponse({ reply: quiz });
    } catch (err) {
      sendResponse({
        error: {
          code: "LLM_CONNECT_FAIL",
          message: ERROR_MESSAGES.LLM_CONNECT_FAIL,
          details: err?.message,
          retryable: true
        }
      });
    }
  }
}
*/

/* sidebar usage

import { toUiMessage } from '../utils/errors';

const Sidebar = () => {
  const [error, setError] = useState<string | null>(null);
  
  // Example 1: When receiving message responses
  const loadData = async () => {
    try {
      const response = await browser.runtime.sendMessage({
        type: 'getData',
        payload: { url: window.location.href }
      });
      
      if (response.error) {
        // toUiMessage handles the ExtensionError object
        setError(toUiMessage(response.error));
        return;
      }
      
      setData(response);
    } catch (err) {
      // toUiMessage handles unknown errors
      setError(toUiMessage(err));
    }
  };
  
  // Example 2: With sendMessageWithRetry
  const getQuiz = async () => {
    try {
      const response = await sendMessageWithRetry({
        type: 'getQuizContent',
        payload: { topic, bucket_a, url }
      });
      
      if (typeof response.reply === "string") {
        // Legacy string error - toUiMessage passes it through
        setError(toUiMessage(response.reply));
      } else if (response.error) {
        setError(toUiMessage(response.error));
      } else {
        setQuizContent(response.reply);
      }
    } catch (err) {
      // Catches MSG_TIMEOUT from messaging.ts or network errors
      setError(toUiMessage(err));
    }
  };
  
  // In your error UI
  return (
    <>
      {error && (
        <div className="quiz-error">
          <div className="sidebar-section">
            <h3 className="section-title">Error</h3>
            <p className="section-content error-message">{error}</p>
            <button onClick={() => {
              setError(null);
              // Retry logic if needed
            }}>
              Try Again
            </button>
          </div>
        </div>
      )}
    </>
  );
};

*/

/* messaging 

import { ERROR_MESSAGES } from './errors';
import type { ExtensionError } from './types';

export async function sendMessageWithRetry<TResp>(message: unknown, opts = {}) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const timed = new Promise<TResp>((_, rej) =>
        setTimeout(() => {
          const timeoutError: ExtensionError = {
            code: 'MSG_TIMEOUT',
            message: ERROR_MESSAGES.MSG_TIMEOUT,
            retryable: true
          };
          rej(timeoutError);
        }, timeoutMs)
      );
      const resp = browser.runtime.sendMessage(message) as Promise<TResp>;
      return await Promise.race([resp, timed]);
    } catch (err) {
      if (attempt === retries) throw err;
      await delay(baseDelayMs * Math.pow(2, attempt));
    }
  }
}

*/
