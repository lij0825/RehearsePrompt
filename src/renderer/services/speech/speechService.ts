import type {
  ISpeechRecognitionProvider,
  SpeechEngineInfo,
  SpeechStatus,
  SentenceMatchResult,
} from './speechTypes.ts';
import { WebSpeechRecognitionProvider } from './webSpeechProvider.ts';
import { estimateCurrentSentence, type SentenceItem } from './sentenceMatcher.ts';

export class SpeechService {
  private provider: ISpeechRecognitionProvider;
  private sentenceItems: SentenceItem[] = [];
  private currentAnchorIndex = 0;
  private status: SpeechStatus = 'idle';

  constructor(customProvider?: ISpeechRecognitionProvider) {
    this.provider = customProvider || new WebSpeechRecognitionProvider();
  }

  public getEngineInfo(): SpeechEngineInfo {
    return this.provider.getEngineInfo();
  }

  public isSupported(): boolean {
    return this.provider.isSupported();
  }

  public async checkOrRequestPermission(): Promise<{ granted: boolean; error?: string }> {
    return this.provider.requestPermission();
  }

  public setScriptSentences(items: SentenceItem[]): void {
    this.sentenceItems = items;
  }

  public setAnchorSentenceIndex(index: number): void {
    this.currentAnchorIndex = Math.max(0, Math.min(this.sentenceItems.length - 1, index));
  }

  public getAudioLevel(): number {
    return this.provider.getAudioLevel();
  }

  public getStatus(): SpeechStatus {
    return this.status;
  }

  public async startListening(options: {
    language?: string;
    onSentenceMatched: (match: SentenceMatchResult) => void;
    onSpokenSnippet: (text: string) => void;
    onError: (error: string) => void;
    onStatusChange?: (status: SpeechStatus) => void;
  }): Promise<void> {
    const lang = options.language || 'ko-KR';

    await this.provider.start({
      language: lang,
      onResult: (spokenText: string) => {
        options.onSpokenSnippet(spokenText);

        // 현재 발화 텍스트와 대본 문장들을 비교하여 가장 일치하는 문장 탐색
        const match = estimateCurrentSentence(
          this.sentenceItems,
          spokenText,
          this.currentAnchorIndex,
          4 // +-4 문장 윈도우
        );

        if (match) {
          this.currentAnchorIndex = match.sentenceIndex;
          options.onSentenceMatched(match);
        }
      },
      onError: (err: string) => {
        options.onError(err);
      },
      onStatusChange: (newStatus: SpeechStatus) => {
        this.status = newStatus;
        options.onStatusChange?.(newStatus);
      },
    });
  }

  public stopListening(): void {
    this.provider.stop();
    this.status = 'idle';
  }
}
