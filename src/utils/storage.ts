import type { 
  StorageSchema, 
  SessionStorageData, 
  LocalStorageData, 
  StorageKey, 
  WikiPageKeys
} from './types';
import { createStorageKeys } from './types';

declare const browser: any;

export const sessionStorage = {

  async get<K extends StorageKey>(keys: K[]): Promise<Pick<StorageSchema, K>> {
    const result = await browser.storage.session.get(keys);
    return result as Pick<StorageSchema, K>;
  },


  async getSingle<K extends StorageKey>(key: K): Promise<StorageSchema[K] | undefined> {
    const result = await browser.storage.session.get([key]);
    return result[key] as StorageSchema[K] | undefined;
  },

  /**
   * Get wiki page data for a specific URL
   */
  async getWikiPageData(url: string): Promise<{
    title?: string;
    summary?: Record<number, string>;
    sections?: import('./types').WikiSection[];
    metadata?: import('./types').StorageMetadata;
  }> {
    const keys = createStorageKeys(url);
    const result = await browser.storage.session.get([
      keys.title,
      keys.summary, 
      keys.sections,
      keys.metadata
    ]);
    
    return {
      title: result[keys.title],
      summary: result[keys.summary],
      sections: result[keys.sections],
      metadata: result[keys.metadata]
    };
  },

  async set(items: Partial<StorageSchema>): Promise<void> {
    await browser.storage.session.set(items);
  },


  async setWikiPageData(url: string, data: {
    title?: string;
    summary?: Record<number, string>;
    sections?: import('./types').WikiSection[];
    metadata?: import('./types').StorageMetadata;
  }): Promise<void> {
    const keys = createStorageKeys(url);
    const storageData: Partial<StorageSchema> = {};
    
    if (data.title !== undefined) storageData[keys.title] = data.title;
    if (data.summary !== undefined) storageData[keys.summary] = data.summary;
    if (data.sections !== undefined) storageData[keys.sections] = data.sections;
    if (data.metadata !== undefined) storageData[keys.metadata] = data.metadata;
    
    await browser.storage.session.set(storageData);
  },


  async remove(keys: StorageKey | StorageKey[]): Promise<void> {
    await browser.storage.session.remove(Array.isArray(keys) ? keys : [keys]);
  },

  async clear(): Promise<void> {
    await browser.storage.session.clear();
  }
};


export const localStorage = {

  async get<K extends keyof LocalStorageData>(keys: K[]): Promise<Pick<LocalStorageData, K>> {
    const result = await browser.storage.local.get(keys);
    return result as Pick<LocalStorageData, K>;
  },

  async getSingle<K extends keyof LocalStorageData>(key: K): Promise<LocalStorageData[K] | undefined> {
    const result = await browser.storage.local.get([key]);
    return result[key] as LocalStorageData[K] | undefined;
  },

  async set(items: Partial<LocalStorageData>): Promise<void> {
    await browser.storage.local.set(items);
  },


  async remove(keys: keyof LocalStorageData | (keyof LocalStorageData)[]): Promise<void> {
    await browser.storage.local.remove(Array.isArray(keys) ? keys : [keys]);
  },

  async clear(): Promise<void> {
    await browser.storage.local.clear();
  }
};

/**
 * Helper function to get user settings with defaults
 */
export const getUserSettings = async (): Promise<{
  questionDifficulty: "easy" | "medium" | "hard";
  numQuestions: 4 | 7;
  sidebarEnabled: boolean;
}> => {
  const result = await sessionStorage.get(["questionDifficulty", "numQuestions", "sidebarEnabled"]);
  
  return {
    questionDifficulty: result.questionDifficulty || "medium",
    numQuestions: result.numQuestions || 4,
    sidebarEnabled: result.sidebarEnabled || false
  };
};


export const updateUserSettings = async (settings: Partial<{
  questionDifficulty: "easy" | "medium" | "hard";
  numQuestions: 4 | 7;
  sidebarEnabled: boolean;
}>): Promise<void> => {
  await sessionStorage.set(settings);
};


export const isWikiPageKey = (key: string): key is `title_${string}` | `summary_${string}` | `sections_${string}` | `metadata_${string}` => {
  return key.startsWith('title_') || 
         key.startsWith('summary_') || 
         key.startsWith('sections_') || 
         key.startsWith('metadata_');
};


export const extractUrlFromKey = (key: string): string | null => {
  const match = key.match(/^(?:title_|summary_|sections_|metadata_)(.+)$/);
  return match ? match[1] : null;
}; 