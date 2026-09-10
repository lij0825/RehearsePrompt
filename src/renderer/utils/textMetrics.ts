export interface TextMetrics {
  wordCount: number;
  charCountWithSpaces: number;
  charCountWithoutSpaces: number;
  estimatedDurationSeconds: number; // 초 단위
  formattedDuration: string; // "01분 30초"
  paragraphCount: number;
  sentenceCount: number;
}

export function sanitizeTitle(rawTitle: string | undefined | null): string {
  if (!rawTitle || rawTitle.trim().length === 0) {
    return '제목 없는 스크립트';
  }
  return rawTitle.trim();
}

export function countWords(text: string): number {
  if (!text || text.trim().length === 0) {
    return 0;
  }
  // 공백 및 줄바꿈 문자로 분리한 비어있지 않은 토큰 개수
  const tokens = text.trim().split(/\s+/);
  return tokens.filter((t) => t.length > 0).length;
}

export function countCharacters(text: string): { withSpaces: number; withoutSpaces: number } {
  if (!text) {
    return { withSpaces: 0, withoutSpaces: 0 };
  }
  // Intl.Segmenter 또는 Array.from을 활용하여 복합 이모지(UTF-16 서러게이트 페어)도 글자 수 1개로 정확히 계산
  const codePoints = Array.from(text);
  const withoutSpaces = codePoints.filter((ch) => !/\s/.test(ch)).length;
  return {
    withSpaces: codePoints.length,
    withoutSpaces,
  };
}

export function calculateReadingTime(wordCount: number, wpm = 130): number {
  if (wordCount <= 0 || wpm <= 0) {
    return 0;
  }
  // (단어수 / 분당 단어수) * 60초
  return Math.ceil((wordCount / wpm) * 60);
}

export function formatDuration(seconds: number): string {
  if (seconds <= 0) {
    return '00분 00초';
  }
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const mm = String(mins).padStart(2, '0');
  const ss = String(secs).padStart(2, '0');
  return `${mm}분 ${ss}초`;
}

export function splitParagraphs(text: string): string[] {
  if (!text || text.trim().length === 0) {
    return [];
  }
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

export function splitSentences(text: string): string[] {
  if (!text || text.trim().length === 0) {
    return [];
  }

  // 문장 종결 구두점(. ! ?) 뒤의 공백 또는 개행을 기준으로 정밀 분리
  const rawSegments = text.split(/(?<=[.!?])\s+|\n+/);
  return rawSegments.map((s) => s.trim()).filter((s) => s.length > 0);
}

export function computeTextMetrics(text: string, wpm = 130): TextMetrics {
  const words = countWords(text);
  const chars = countCharacters(text);
  const duration = calculateReadingTime(words, wpm);
  const paragraphs = splitParagraphs(text);
  const sentences = splitSentences(text);

  return {
    wordCount: words,
    charCountWithSpaces: chars.withSpaces,
    charCountWithoutSpaces: chars.withoutSpaces,
    estimatedDurationSeconds: duration,
    formattedDuration: formatDuration(duration),
    paragraphCount: paragraphs.length,
    sentenceCount: sentences.length,
  };
}
