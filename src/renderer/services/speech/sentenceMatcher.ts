import type { SentenceMatchResult } from './speechTypes.ts';

export function normalizeText(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[.,/#!$%^&*;:{}=\-_`~()?"'…·]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Levenshtein 거리 계산
export function levenshteinDistance(s1: string, s2: string): number {
  const m = s1.length;
  const n = s2.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (s1[i - 1] === s2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,     // deletion
          dp[i][j - 1] + 1,     // insertion
          dp[i - 1][j - 1] + 1  // substitution
        );
      }
    }
  }
  return dp[m][n];
}

// 문자열 유사도 (0.0 ~ 1.0)
export function stringSimilarity(s1: string, s2: string): number {
  const n1 = normalizeText(s1);
  const n2 = normalizeText(s2);
  if (!n1 && !n2) return 1.0;
  if (!n1 || !n2) return 0.0;
  if (n1 === n2) return 1.0;

  const maxLen = Math.max(n1.length, n2.length);
  if (maxLen === 0) return 1.0;

  const dist = levenshteinDistance(n1, n2);
  return Math.max(0, 1.0 - dist / maxLen);
}

// 어절(Token) 기반 일치율 및 부분 일치율 계산
export function tokenMatchScore(sentence: string, spoken: string): number {
  const normSent = normalizeText(sentence);
  const normSpoken = normalizeText(spoken);

  if (!normSent || !normSpoken) return 0;
  if (normSent.includes(normSpoken)) return 0.95; // 발화 내용이 문장에 완전히 포함되는 경우
  if (normSpoken.includes(normSent)) return 0.90; // 문장 내용이 발화에 완전히 포함되는 경우

  const sentTokens = normSent.split(' ').filter(Boolean);
  const spokenTokens = normSpoken.split(' ').filter(Boolean);

  if (sentTokens.length === 0 || spokenTokens.length === 0) return 0;

  let matchedTokenCount = 0;
  for (const token of spokenTokens) {
    // 완전 어절 일치 또는 유사 어절(0.75 이상) 일치 검사
    const found = sentTokens.some((sToken) => {
      if (sToken === token) return true;
      if (sToken.includes(token) || token.includes(sToken)) return true;
      return stringSimilarity(sToken, token) >= 0.75;
    });
    if (found) {
      matchedTokenCount++;
    }
  }

  // 발화된 토큰 중 문장에 부합한 비율
  const spokenPrecision = matchedTokenCount / spokenTokens.length;
  // 전체 문자열 유사도와 토큰 일치율의 가중 결합
  const strSim = stringSimilarity(normSent, normSpoken);

  return spokenPrecision * 0.7 + strSim * 0.3;
}

export interface SentenceItem {
  sentence: string;
  sentenceIndex: number;
  paragraphIndex: number;
}

/**
 * 주어진 발화 텍스트와 대본의 전체 문장 배열을 비교하여 최적의 현재 문장을 추정합니다.
 * @param sentenceItems 문장 리스트 (각 문장의 paragraphIndex 포함)
 * @param spokenText 사용자의 실시간 발화 텍스트
 * @param currentAnchorIndex 현재 읽고 있는 기준 문장 인덱스
 * @param searchWindow 앵커 기준 우선 탐색 범위 (기본 +-3 문장)
 */
export function estimateCurrentSentence(
  sentenceItems: SentenceItem[],
  spokenText: string,
  currentAnchorIndex = 0,
  searchWindow = 4
): SentenceMatchResult | null {
  const normSpoken = normalizeText(spokenText);
  if (!normSpoken || sentenceItems.length === 0) {
    return null;
  }

  let bestMatchIndex = -1;
  let highestScore = -1;

  for (let i = 0; i < sentenceItems.length; i++) {
    const item = sentenceItems[i];
    const baseScore = tokenMatchScore(item.sentence, normSpoken);

    // 거리 패널티 및 근접 가중치: 현재 위치 근처에 있을수록 약간의 보너스 점수 부여
    const distance = Math.abs(i - currentAnchorIndex);
    let proximityMultiplier = 1.0;

    if (distance <= searchWindow) {
      // 앞으로 진행하는 방향에 약한 가중치
      proximityMultiplier = i >= currentAnchorIndex ? 1.15 : 1.05;
    } else {
      proximityMultiplier = 0.9;
    }

    const finalScore = baseScore * proximityMultiplier;

    if (finalScore > highestScore) {
      highestScore = finalScore;
      bestMatchIndex = i;
    }
  }

  // 매칭 임계값 (최소 0.38 이상이어야 유의미한 일치로 간주)
  if (highestScore >= 0.38 && bestMatchIndex >= 0) {
    const matchedItem = sentenceItems[bestMatchIndex];
    return {
      sentenceIndex: matchedItem.sentenceIndex,
      paragraphIndex: matchedItem.paragraphIndex,
      confidence: Math.min(1.0, highestScore),
      matchedSentence: matchedItem.sentence,
      spokenSnippet: spokenText.trim(),
    };
  }

  return null;
}
