import type { ISpeechRecognitionProvider, SpeechEngineInfo, SpeechStatus } from './speechTypes.ts';

// Web Speech API 타입 확장 선언
interface IWebkitSpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onresult: ((event: {
    resultIndex: number;
    results: {
      length: number;
      item(index: number): {
        isFinal: boolean;
        item(index: number): { transcript: string; confidence: number };
      };
      [index: number]: {
        isFinal: boolean;
        0: { transcript: string; confidence: number };
      };
    };
  }) => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => IWebkitSpeechRecognition;
    webkitSpeechRecognition?: new () => IWebkitSpeechRecognition;
  }
}

export class WebSpeechRecognitionProvider implements ISpeechRecognitionProvider {
  private recognition: IWebkitSpeechRecognition | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private micStream: MediaStream | null = null;
  private audioLevel = 0;
  private isListening = false;
  private animFrameId: number | null = null;

  public getEngineInfo(): SpeechEngineInfo {
    return {
      name: 'Chromium Web Speech API',
      isLocal: false,
      requiresNetwork: true,
      privacyNotice: '음성 원본은 기기에 저장되거나 외부로 유출되지 않으며, 대본 위치 추적에만 일시적으로 사용돼요. 브라우저 엔진 특성상 네트워크 연결이 필요할 수 있어요.',
    };
  }

  public isSupported(): boolean {
    if (typeof window === 'undefined') return false;
    return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
  }

  public async requestPermission(): Promise<{ granted: boolean; error?: string }> {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      return { granted: false, error: '마이크 API를 지원하지 않는 환경이에요.' };
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // 권한 확인 즉시 스트림 정지 (불필요한 지속 백그라운드 녹음 방지)
      stream.getTracks().forEach((track) => track.stop());
      return { granted: true };
    } catch (err: unknown) {
      const error = err as { name?: string; message?: string };
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        return {
          granted: false,
          error: '마이크 권한이 꺼져 있어서 음성 인식을 시작할 수 없어요. 시스템 설정에서 권한을 허용해 주세요.',
        };
      }
      if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        return {
          granted: false,
          error: '연결된 마이크 입력 장치를 찾을 수 없어요. 마이크 연결을 확인해 주세요.',
        };
      }
      return {
        granted: false,
        error: `마이크 연결 중 오류가 발생했어요: ${error.message || '알 수 없는 오류'}`,
      };
    }
  }

  public async start(options: {
    language: string;
    onResult: (spokenText: string, isFinal: boolean) => void;
    onError: (error: string) => void;
    onStatusChange: (status: SpeechStatus) => void;
  }): Promise<void> {
    if (this.isListening) {
      return;
    }

    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) {
      options.onError('현재 환경에서는 Web Speech API를 지원하지 않아요. 일정 속도 모드로 전환할 수 있어요.');
      return;
    }

    try {
      // 1. 마이크 레벨 미터용 AudioContext 연결
      this.micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioContext = new AudioCtx();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;

      const source = this.audioContext.createMediaStreamSource(this.micStream);
      source.connect(this.analyser);

      this.startAudioLevelPolling();

      // 2. SpeechRecognition 설정
      this.recognition = new SpeechRec();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = options.language || 'ko-KR';
      this.recognition.maxAlternatives = 1;

      this.recognition.onstart = () => {
        this.isListening = true;
        options.onStatusChange('listening');
      };

      this.recognition.onresult = (event) => {
        let currentTranscript = '';
        let isFinal = false;

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const item = event.results[i];
          const transcript = item[0]?.transcript || '';
          currentTranscript += transcript;
          if (item.isFinal) {
            isFinal = true;
          }
        }

        if (currentTranscript.trim().length > 0) {
          options.onResult(currentTranscript, isFinal);
        }
      };

      this.recognition.onerror = (event) => {
        // 음성이 잠깐 없는 'no-speech' 에러는 정상 대기 상황이므로 크래시하지 않음
        if (event.error === 'no-speech') {
          return;
        }
        if (event.error === 'audio-capture') {
          options.onError('마이크에서 소리를 가져오지 못했어요. 마이크 연결을 점검해 주세요.');
          return;
        }
        if (event.error === 'not-allowed') {
          options.onError('마이크 접근 권한이 차단되었어요.');
          return;
        }
        options.onError(`음성 인식 오류: ${event.error}`);
      };

      this.recognition.onend = () => {
        // 리스닝 중인데 의도치 않게 끝난 경우 재시작
        if (this.isListening) {
          try {
            this.recognition?.start();
          } catch {
            // ignore
          }
        } else {
          options.onStatusChange('idle');
        }
      };

      this.recognition.start();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      options.onError(`음성 인식 시작 실패: ${errorMsg}`);
      options.onStatusChange('error');
      this.stop();
    }
  }

  public stop(): void {
    this.isListening = false;

    if (this.recognition) {
      try {
        this.recognition.abort();
      } catch {
        // ignore
      }
      this.recognition = null;
    }

    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    if (this.micStream) {
      this.micStream.getTracks().forEach((track) => track.stop());
      this.micStream = null;
    }

    if (this.audioContext && this.audioContext.state !== 'closed') {
      try {
        this.audioContext.close();
      } catch {
        // ignore
      }
      this.audioContext = null;
    }

    this.analyser = null;
    this.audioLevel = 0;
  }

  public getAudioLevel(): number {
    return this.audioLevel;
  }

  private startAudioLevelPolling(): void {
    if (!this.analyser) return;

    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);

    const update = () => {
      if (!this.analyser) return;
      this.analyser.getByteFrequencyData(dataArray);

      // RMS 음량 계산
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i] * dataArray[i];
      }
      const rms = Math.sqrt(sum / dataArray.length);
      // 0 ~ 100 범위로 정규화
      this.audioLevel = Math.min(100, Math.round((rms / 128) * 100));

      if (this.isListening) {
        this.animFrameId = requestAnimationFrame(update);
      }
    };

    update();
  }
}
