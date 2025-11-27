export type QuizContent = {
    questions: Array<{
      question: string;
      options: [string, string, string, string];
      answer: 0 | 1 | 2 | 3;
      citation: string;
      difficulty: "easy" | "medium" | "hard" | "extreme";
      explanation: string;
    }>
  }

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
  questionDifficulty: "easy" | "medium" | "hard";
  numQuestions: 4 | 7;
  sidebarEnabled: boolean;
}



export interface StorageSchema {
  questionDifficulty: "easy" | "medium" | "hard";
  numQuestions: 4 | 7;
  sidebarEnabled: boolean;
  
  [key: `title_${string}`]: string;
  [key: `summary_${string}`]: Record<number, string>;
  [key: `sections_${string}`]: WikiSection[];
  [key: `metadata_${string}`]: StorageMetadata;
}

export type StorageKey = keyof StorageSchema;
export type StorageValue<K extends StorageKey> = StorageSchema[K];

export interface SessionStorageData extends Partial<StorageSchema> {}
export interface LocalStorageData extends Partial<Pick<StorageSchema, 'sidebarEnabled' | 'questionDifficulty' | 'numQuestions'>> {}

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

export const createStorageKeys = (url: string) => ({
  title: `title_${url}` as const,
  summary: `summary_${url}` as const,
  sections: `sections_${url}` as const,
  metadata: `metadata_${url}` as const,
});



export type WikiPageKeys = ReturnType<typeof createStorageKeys>;