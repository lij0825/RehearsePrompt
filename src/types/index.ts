export type ScrollMode = 'constant' | 'voice' | 'manual';
export type AppTheme = 'light' | 'dark' | 'system';
export type AppLanguage = 'ko' | 'en';

export interface IScript {
  id: string;
  title: string;
  description: string;
  content: string;
  tags: string[];
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
  lastOpenedAt: string;
  estimatedDuration: number; // 초 단위
  wordCount: number;
  charCount: number;
  language: 'ko-KR' | 'en-US';
  version: number;
  deletedAt: string | null;
}

export interface IScriptVersion {
  versionId: string;
  scriptId: string;
  versionNumber: number;
  title: string;
  content: string;
  savedAt: string;
  trigger: 'auto' | 'manual' | 'backup';
}

export interface IPracticeSession {
  id: string;
  scriptId: string;
  startedAt: string;
  endedAt: string;
  duration: number; // 초
  scrollMode: ScrollMode;
  averageWpm: number;
  completionRate: number; // 0 ~ 100
  pauseCount: number;
  microphoneUsed: boolean;
  notes: string;
  completed: boolean;
}

export interface IShortcutConfig {
  togglePlay: string;
  nextParagraph: string;
  prevParagraph: string;
  speedUp: string;
  speedDown: string;
  resetTop: string;
}

export interface IWindowState {
  x?: number;
  y?: number;
  width: number;
  height: number;
  isMaximized: boolean;
  isAlwaysOnTop: boolean;
  opacity: number;
  lastMode: 'editor' | 'prompter' | 'compact';
}

export interface IAppSettings {
  theme: AppTheme;
  language: AppLanguage;
  autoSaveIntervalMs: number;
  openLastScriptOnStartup: boolean;
  restoreWindowMode: boolean;
  confirmOnQuit: boolean;
  defaultWpm: number;
  defaultScrollMode: ScrollMode;
  fontSize: number;
  lineHeight: number;
  paragraphSpacing: number;
  maxWidth: number;
  highlightSentence: boolean;
  highlightParagraph: boolean;
  showProgress: boolean;
  showRemainingTime: boolean;
  countdownSeconds: number;
  eyeContactGuide: boolean;
  shortcuts: IShortcutConfig;
  windowState: IWindowState;
  speech: {
    enabled: boolean;
    recognitionLanguage: string;
    micGain: number;
    silenceThresholdMs: number;
  };
  privacy: {
    telemetryEnabled: boolean;
    crashReportsEnabled: boolean;
  };
  onboardingCompleted: boolean;
}

export interface IAppInfo {
  version: string;
  name: string;
  platform: string;
  arch: string;
  userDataPath: string;
}

export interface ElectronAPI {
  getAppInfo: () => Promise<IAppInfo>;
  getSettings: () => Promise<IAppSettings>;
  saveSettings: (settings: Partial<IAppSettings>) => Promise<IAppSettings>;
  getAllScripts: () => Promise<IScript[]>;
  getScriptById: (id: string) => Promise<IScript | null>;
  saveScript: (script: Partial<IScript> & { id?: string }) => Promise<IScript>;
  duplicateScript: (id: string) => Promise<IScript | null>;
  deleteScript: (id: string, permanent?: boolean) => Promise<boolean>;
  restoreScript: (id: string) => Promise<boolean>;
  getScriptVersions: (scriptId: string) => Promise<IScriptVersion[]>;
  exportScript: (scriptId: string, format: 'txt' | 'md' | 'json') => Promise<string | null>;
  importScript: () => Promise<IScript | null>;
  saveSession: (session: Omit<IPracticeSession, 'id'>) => Promise<IPracticeSession>;
  getSessionHistory: (scriptId?: string) => Promise<IPracticeSession[]>;
  setAlwaysOnTop: (alwaysOnTop: boolean) => Promise<boolean>;
  setOpacity: (opacity: number) => Promise<boolean>;
  setCompactMode: (isCompact: boolean) => Promise<boolean>;
  exportBackup: () => Promise<string | null>;
  importBackup: () => Promise<{ success: boolean; count?: number; message?: string }>;
  onShortcutTriggered: (callback: (action: string) => void) => () => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
