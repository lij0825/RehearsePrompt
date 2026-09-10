export interface SpeechEngineInfo {
  name: string;
  isLocal: boolean;
  requiresNetwork: boolean;
  privacyNotice: string;
}

export interface SentenceMatchResult {
  sentenceIndex: number;
  paragraphIndex: number;
  confidence: number; // 0.0 ~ 1.0
  matchedSentence: string;
  spokenSnippet: string;
}

export type SpeechStatus = 'idle' | 'listening' | 'paused' | 'error';

export interface ISpeechRecognitionProvider {
  getEngineInfo(): SpeechEngineInfo;
  isSupported(): boolean;
  requestPermission(): Promise<{ granted: boolean; error?: string }>;
  start(options: {
    language: string;
    onResult: (spokenText: string, isFinal: boolean) => void;
    onError: (error: string) => void;
    onStatusChange: (status: SpeechStatus) => void;
  }): Promise<void>;
  stop(): void;
  getAudioLevel(): number; // 0 ~ 100
}
