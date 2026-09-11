import { describe, it, expect } from 'vitest';

/**
 * 투명도 및 자막 모드 관련 순수 로직 헬퍼
 */
function clampOpacity(opacity: number): number {
	return Math.max(0.2, Math.min(1.0, opacity));
}

function calculateCompactWindowBounds(screenWidth: number, compactWidth = 840, compactHeight = 180, topMargin = 32): {
	x: number;
	y: number;
	width: number;
	height: number;
} {
	const x = Math.round((screenWidth - compactWidth) / 2);
	const y = topMargin;
	return { x, y, width: compactWidth, height: compactHeight };
}

interface SubtitleDisplayData {
	currentSentence: string;
	nextSentence: string | null;
	isLast: boolean;
}

function extractSubtitleLines(sentences: string[], currentIndex: number): SubtitleDisplayData {
	const clampedIndex = Math.max(0, Math.min(sentences.length - 1, currentIndex));
	const currentSentence = sentences[clampedIndex] || '';
	const nextSentence = clampedIndex + 1 < sentences.length ? sentences[clampedIndex + 1] : null;
	const isLast = clampedIndex === sentences.length - 1;

	return {
		currentSentence,
		nextSentence,
		isLast,
	};
}

describe('PHASE 6: 텔레프롬프터 투명도 제어 및 슬림 자막 모드 로직 검증', () => {
	it('투명도 값이 유효 범위(0.2 ~ 1.0) 내로 안전하게 클램핑되어야 한다', () => {
		// Given: 다양한 입력 투명도 값
		const overLimit = 1.5;
		const underLimit = 0.05;
		const validMid = 0.65;
		const presetValues = [1.0, 0.75, 0.5, 0.35];

		// When: 클램핑 함수 적용
		const clampedOver = clampOpacity(overLimit);
		const clampedUnder = clampOpacity(underLimit);
		const clampedMid = clampOpacity(validMid);

		// Then: 상한(1.0)과 하한(0.2)을 벗어나지 않아야 함
		expect(clampedOver).toBe(1.0);
		expect(clampedUnder).toBe(0.2);
		expect(clampedMid).toBe(0.65);
		presetValues.forEach((val) => {
			expect(clampOpacity(val)).toBe(val);
		});
	});

	it('컴팩트 자막 윈도우 모드 전환 시 모니터 해상도에 맞춰 상단 중앙에 최적 배치되어야 한다', () => {
		// Given: 일반 FHD 모니터(1920px) 및 QHD 모니터(2560px)
		const fhdWidth = 1920;
		const qhdWidth = 2560;

		// When: 840x180 슬림 바 기준 위치 계산
		const fhdBounds = calculateCompactWindowBounds(fhdWidth);
		const qhdBounds = calculateCompactWindowBounds(qhdWidth);

		// Then: 가로 중앙 및 상단 32px 위치에 정확히 정렬되어야 한다
		expect(fhdBounds.width).toBe(840);
		expect(fhdBounds.height).toBe(180);
		expect(fhdBounds.y).toBe(32);
		expect(fhdBounds.x).toBe(Math.round((1920 - 840) / 2)); // 540

		expect(qhdBounds.x).toBe(Math.round((2560 - 840) / 2)); // 860
		expect(qhdBounds.y).toBe(32);
	});

	it('자막 모드에서 현재 발화 문장과 다음 문장 미리보기를 정확히 추출해야 한다', () => {
		// Given: 3개의 문장으로 구성된 대본
		const scriptSentences = [
			'안녕하십니까. 백엔드 개발자 지원자입니다.',
			'대규모 동시성 처리를 위해 Redis 분산 락을 설계했습니다.',
			'경청해 주셔서 대단히 감사합니다.',
		];

		// When 1: 첫 번째 문장 진행 중일 때
		const line0 = extractSubtitleLines(scriptSentences, 0);

		// Then 1: 현재 문장은 0번, 다음 문장은 1번이어야 함
		expect(line0.currentSentence).toBe('안녕하십니까. 백엔드 개발자 지원자입니다.');
		expect(line0.nextSentence).toBe('대규모 동시성 처리를 위해 Redis 분산 락을 설계했습니다.');
		expect(line0.isLast).toBe(false);

		// When 2: 마지막 문장 진행 중일 때
		const lineLast = extractSubtitleLines(scriptSentences, 2);

		// Then 2: 다음 문장은 null이고 isLast는 true여야 함
		expect(lineLast.currentSentence).toBe('경청해 주셔서 대단히 감사합니다.');
		expect(lineLast.nextSentence).toBeNull();
		expect(lineLast.isLast).toBe(true);
	});

	it('자막 모드에서 범위를 벗어난 인덱스가 요청되어도 안전하게 경계 문장을 반환해야 한다', () => {
		// Given: 2개 문장
		const scriptSentences = ['첫 문장입니다.', '두 번째 문장입니다.'];

		// When: 음수 인덱스 및 초과 인덱스 입력
		const negativeResult = extractSubtitleLines(scriptSentences, -5);
		const overflowResult = extractSubtitleLines(scriptSentences, 99);

		// Then: 안전하게 첫 번째 및 마지막 문장으로 한정되어야 함
		expect(negativeResult.currentSentence).toBe('첫 문장입니다.');
		expect(overflowResult.currentSentence).toBe('두 번째 문장입니다.');
		expect(overflowResult.isLast).toBe(true);
	});
});
