import { describe, it, expect } from 'vitest';

/**
 * 투명도 및 자막 모드 관련 순수 로직 헬퍼
 */
function clampOpacity(opacity: number): number {
	return Math.max(0.2, Math.min(1.0, opacity));
}

function calculateSentenceDurationSec(sentence: string, wpm: number): number {
	const trimmed = sentence.trim();
	if (!trimmed) return 2.0;
	const words = trimmed.split(/\s+/).length;
	const chars = trimmed.length;
	const effectiveWords = Math.max(words, Math.ceil(chars / 4), 2);
	const safeWpm = Math.max(60, Math.min(240, wpm));
	return Math.max(1.8, (effectiveWords / safeWpm) * 60);
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

	it('WPM 속도 및 문장 길이에 따라 자막 모드 문장 지속 시간이 비례하여 산출되어야 한다', () => {
		// Given: 단문, 중문, 장문 문장
		const shortSentence = '안녕하세요.';
		const mediumSentence = '대규모 분산 시스템 환경에서 고가용성 아키텍처를 설계한 경험이 있습니다.';
		const longSentence = '첫째로 분산 캐시 계층을 도입하여 데이터베이스의 직접적인 부하를 70% 이상 경감시켰으며, 메시지 큐를 통한 비동기 이벤트 발행으로 시스템 간 결합도를 최소화했습니다.';

		// When: 130 WPM 기준 소요 시간 계산
		const shortDuration = calculateSentenceDurationSec(shortSentence, 130);
		const mediumDuration = calculateSentenceDurationSec(mediumSentence, 130);
		const longDuration = calculateSentenceDurationSec(longSentence, 130);

		// Then: 최소 1.8초가 보장되며, 글자/어절 수가 많을수록 지속 시간이 길어져야 함
		expect(shortDuration).toBeGreaterThanOrEqual(1.8);
		expect(mediumDuration).toBeGreaterThan(shortDuration);
		expect(longDuration).toBeGreaterThan(mediumDuration);

		// 속도(WPM)가 빨라지면(180 WPM) 소요 시간은 단축되어야 함
		const fastMediumDuration = calculateSentenceDurationSec(mediumSentence, 180);
		expect(fastMediumDuration).toBeLessThan(mediumDuration);
	});

	it('자막 모드 + 일정 속도 모드에서 프레임 경과에 따라 문장이 자동으로 다음으로 전진해야 한다', () => {
		// Given: 3개 문장으로 구성된 자막 대본 및 130 WPM
		const sentences = ['문장 1', '문장 2', '문장 3'];
		const wpm = 130;
		let currentIdx = 0;
		let elapsed = 0;
		let isPlaying = true;
		const fps = 60;
		const delta = 1 / fps;

		// When: 15초 동안 60fps rAF 시뮬레이션
		for (let frame = 0; frame < 15 * fps; frame++) {
			if (!isPlaying) break;

			const targetDuration = calculateSentenceDurationSec(sentences[currentIdx], wpm);
			elapsed += delta;

			if (elapsed >= targetDuration) {
				elapsed = 0;
				if (currentIdx + 1 < sentences.length) {
					currentIdx++;
				} else {
					isPlaying = false;
				}
			}
		}

		// Then: 15초 후 3개 문장을 모두 정상 순회하고 재생이 완료(false)되어야 한다
		expect(currentIdx).toBe(2);
		expect(isPlaying).toBe(false);
	});

	it('일정 속도 모드 선택 시 대기 없이 즉시 재생 상태로 활성화되어야 한다', () => {
		// Given: 정지 상태 및 카운트다운 잔여 상태
		let scrollMode: 'voice' | 'constant' = 'voice';
		let isPlaying = false;
		let countdown: number | null = 3;

		// When: 사용자가 '일정 속도' 버튼 클릭
		if (scrollMode === 'constant') {
			isPlaying = !isPlaying;
		} else {
			scrollMode = 'constant';
			countdown = null;
			isPlaying = true;
		}

		// Then: 모드가 constant로 변경되고 카운트다운 없이 즉시 isPlaying이 true가 되어야 한다
		expect(scrollMode).toBe('constant');
		expect(countdown).toBeNull();
		expect(isPlaying).toBe(true);

		// When 2: 이미 constant 상태에서 다시 클릭 시 일시정지 토글
		if (scrollMode === 'constant') {
			isPlaying = !isPlaying;
		}

		// Then 2: 정지 상태로 전환되어야 함
		expect(isPlaying).toBe(false);
	});
});
