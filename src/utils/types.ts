export type QuizContent = {
    questions: {
      question: string,
      citation: string,
      answer: number,
      options: [string, string, string, string],
      difficulty: string,
      explanation: string
    }[]
  }

// Browser Storage Types
export interface WikiSection {
  anchor: string;
  fromtitle: string;
  index: number;
  level: number;
  line: string;
  number: number;
  toclevel: number;
}

export interface StorageMetadata {
  timestamp: number;
  url: string;
  title: string;
}

export interface UserSettings {
  questionDifficulty: "recall" | "stimulating" | "synthesis";
  numQuestions: 4 | 7;
  sidebarEnabled: boolean;
}



// Complete storage schema
export interface StorageSchema {
  // User settings (persistent across sessions)
  questionDifficulty: "recall" | "stimulating" | "synthesis";
  numQuestions: 4 | 7;
  sidebarEnabled: boolean;
  
  // Dynamic keys for wiki pages (URL-based)
  [key: `title_${string}`]: string;
  [key: `summary_${string}`]: Record<number, string>;
  [key: `sections_${string}`]: WikiSection[];
  [key: `metadata_${string}`]: StorageMetadata;
}

// Utility types for storage operations
export type StorageKey = keyof StorageSchema;
export type StorageValue<K extends StorageKey> = StorageSchema[K];

// Helper types for specific storage areas
export interface SessionStorageData extends Partial<StorageSchema> {}
export interface LocalStorageData extends Partial<Pick<StorageSchema, 'sidebarEnabled'>> {}

// Type-safe storage wrapper interface
export interface TypedBrowserStorage {
  session: {
    get<K extends StorageKey>(keys: K[]): Promise<Pick<StorageSchema, K>>;
    get<K extends StorageKey>(key: K): Promise<{ [P in K]?: StorageSchema[P] }>;
    get(keys: string[]): Promise<Record<string, any>>;
    set(items: Partial<StorageSchema>): Promise<void>;
    remove(keys: StorageKey | StorageKey[]): Promise<void>;
    clear(): Promise<void>;
  };
  local: {
    get<K extends keyof LocalStorageData>(keys: K[]): Promise<Pick<LocalStorageData, K>>;
    get<K extends keyof LocalStorageData>(key: K): Promise<{ [P in K]?: LocalStorageData[P] }>;
    get(keys: string[]): Promise<Record<string, any>>;
    set(items: Partial<LocalStorageData>): Promise<void>;
    remove(keys: keyof LocalStorageData | (keyof LocalStorageData)[]): Promise<void>;
    clear(): Promise<void>;
  };
}

// Utility functions for generating storage keys
export const createStorageKeys = (url: string) => ({
  title: `title_${url}` as const,
  summary: `summary_${url}` as const,
  sections: `sections_${url}` as const,
  metadata: `metadata_${url}` as const,
});

export type WikiPageKeys = ReturnType<typeof createStorageKeys>;