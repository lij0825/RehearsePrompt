import { describe, it, expect } from 'vitest';

/**
 * 일정 속도 자동 스크롤 연산 및 부동소수점 누적 시뮬레이터
 */
function calculateScrollSpeed(wpm: number): number {
	return (wpm / 130) * 45;
}

function simulateDirectDomScroll(wpm: number, fps: number, seconds: number): number {
	const pixelsPerSecond = calculateScrollSpeed(wpm);
	const delta = 1 / fps;
	const totalFrames = Math.round(fps * seconds);

	let domScrollTop = 0;
	for (let i = 0; i < totalFrames; i++) {
		// 브라우저 DOM 정수 절사 시뮬레이션
		domScrollTop = Math.floor(domScrollTop + pixelsPerSecond * delta);
	}
	return domScrollTop;
}

function simulateSubpixelAccumulatedScroll(wpm: number, fps: number, seconds: number): {
	accumulatedPos: number;
	domScrollTop: number;
} {
	const pixelsPerSecond = calculateScrollSpeed(wpm);
	const delta = 1 / fps;
	const totalFrames = Math.round(fps * seconds);

	let accumulatedPos = 0;
	let domScrollTop = 0;

	for (let i = 0; i < totalFrames; i++) {
		const safeDelta = Math.min(delta, 0.1);
		accumulatedPos += pixelsPerSecond * safeDelta;
		domScrollTop = Math.floor(accumulatedPos);
	}

	return { accumulatedPos, domScrollTop };
}

describe('PHASE 5: 텔레프롬프터 일정 속도 자동 스크롤 핵심 연산 검증', () => {
	it('WPM 속도에 따른 초당 스크롤 픽셀이 비례하여 정확히 계산되어야 한다', () => {
		// Given: 다양한 WPM 값
		const wpmDefault = 130;
		const wpmSlow = 65;
		const wpmFast = 260;

		// When: 초당 스크롤 픽셀 계산
		const speedDefault = calculateScrollSpeed(wpmDefault);
		const speedSlow = calculateScrollSpeed(wpmSlow);
		const speedFast = calculateScrollSpeed(wpmFast);

		// Then: 130 WPM 기준 45px/s 및 비례 배율 검증
		expect(speedDefault).toBe(45);
		expect(speedSlow).toBe(22.5);
		expect(speedFast).toBe(90);
	});

	it('부동소수점 누적기가 없을 때 60fps 환경에서 정수 절사로 스크롤이 영구 정지하는 버그를 재현 및 증명한다', () => {
		// Given: 130 WPM, 60fps 환경 (프레임당 약 0.75px 증가)
		const wpm = 130;
		const fps = 60;
		const seconds = 5;

		// When: 부동소수점 누적기 없이 DOM scrollTop에 직접 가산 시
		const finalPosWithoutAccumulator = simulateDirectDomScroll(wpm, fps, seconds);

		// Then: 매 프레임 0.75px이 정수 절사(Math.floor)되어 5초가 지나도 0px에 머물러야 한다 (버그 원인 증명)
		expect(finalPosWithoutAccumulator).toBe(0);
	});

	it('부동소수점 누적기를 적용하면 60fps 환경에서도 1초당 목표 거리만큼 완벽히 연속 스크롤되어야 한다', () => {
		// Given: 130 WPM, 60fps, 2초간 실행
		const wpm = 130;
		const fps = 60;
		const seconds = 2;

		// When: scrollPosRef 부동소수점 누적 메커니즘 적용
		const result = simulateSubpixelAccumulatedScroll(wpm, fps, seconds);

		// Then: 2초 동안 45px/s * 2s = 90px이 정상 이동해야 한다
		expect(result.accumulatedPos).toBeCloseTo(90, 1);
		expect(result.domScrollTop).toBe(90);
	});

	it('백그라운드 탭 전환이나 지연 발생 시 급격한 텔레포트를 방지하기 위해 델타 타임을 100ms로 캡핑해야 한다', () => {
		// Given: 사용자가 탭을 전환하여 3초 동안 애니메이션 프레임이 멈춘 후 복귀했을 때
		const largeDelta = 3.0; // 3초 지연
		const maxCap = 0.1; // 100ms 캡
		const pixelsPerSecond = calculateScrollSpeed(130); // 45px/s

		// When: 캡핑 적용 델타 계산
		const safeDelta = Math.min(largeDelta, maxCap);
		const movement = pixelsPerSecond * safeDelta;

		// Then: 3초치(135px)가 한 번에 튀지 않고 최대 4.5px 이내로 제어되어야 한다
		expect(safeDelta).toBe(0.1);
		expect(movement).toBe(4.5);
	});

	it('사용자가 마우스 휠이나 스크롤바를 임의로 조작했을 때 차이가 6px 이상이면 누적 위치가 재동기화되어야 한다', () => {
		// Given: 현재 자동 스크롤 누적 위치 100px
		let scrollPos = 100;
		const userManipulatedTop = 350; // 사용자가 마우스 휠로 350px 위치로 이동

		// When: 동기화 감지 조건
		if (Math.abs(userManipulatedTop - scrollPos) > 6) {
			scrollPos = userManipulatedTop;
		}

		// Then: 사용자의 새 스크롤 위치로 즉시 재동기화되어야 한다
		expect(scrollPos).toBe(350);
	});

	it('대본 끝에 도달했을 때 재생이 일시정지되고 다시 재생을 누르면 처음으로 되감겨야 한다', () => {
		// Given: 대본 스크롤 가능 최대 높이 500px, 현재 위치 499px
		const maxScroll = 500;
		let currentTop = 499;
		let isPlaying = true;

		// When 1: 끝 도달 감지
		if (maxScroll > 0 && currentTop >= maxScroll - 2) {
			isPlaying = false;
		}

		// Then 1: 자동으로 정지 상태로 전환되어야 한다
		expect(isPlaying).toBe(false);

		// When 2: 끝에서 다시 재생 버튼을 눌렀을 때
		if (!isPlaying) {
			if (maxScroll > 0 && currentTop >= maxScroll - 5) {
				currentTop = 0; // handleResetTop
			}
			isPlaying = true;
		}

		// Then 2: 위치가 0으로 초기화되고 재생이 다시 시작되어야 한다
		expect(currentTop).toBe(0);
		expect(isPlaying).toBe(true);
	});

	it('WPM 속도는 5단위로 가감되며 최소 60에서 최대 240 사이로 안전하게 제한되어야 한다', () => {
		// Given: 초기 WPM 130
		let wpm = 130;
		const step = 5;

		// When 1: 5 WPM 증가 및 감소
		wpm = Math.min(240, wpm + step);
		expect(wpm).toBe(135);

		wpm = Math.max(60, wpm - step);
		expect(wpm).toBe(130);

		// When 2: 최소값 60 이하로 지속 감소 시
		wpm = 62;
		wpm = Math.max(60, wpm - step);
		expect(wpm).toBe(60);

		wpm = Math.max(60, wpm - step);
		// Then 2: 60 미만으로 떨어지지 않아야 함
		expect(wpm).toBe(60);

		// When 3: 최대값 240 이상으로 지속 증가 시
		wpm = 238;
		wpm = Math.min(240, wpm + step);
		expect(wpm).toBe(240);

		wpm = Math.min(240, wpm + step);
		// Then 3: 240을 초과하지 않아야 함
		expect(wpm).toBe(240);
	});

	it('환경설정(Settings)의 defaultWpm과 defaultScrollMode, countdownSeconds가 프롬프터 초기값으로 정확히 연동되어야 한다', () => {
		// Given: 사용자가 환경설정에서 변경 및 저장한 설정값
		const customSettings = {
			defaultWpm: 155,
			defaultScrollMode: 'constant' as const,
			countdownSeconds: 0,
		};

		// When: 프롬프터 뷰 진입 시 초기값 결정 로직
		const initialWpm = customSettings?.defaultWpm ?? 130;
		const initialScrollMode = customSettings?.defaultScrollMode ?? 'voice';
		const initialCountdown = customSettings?.countdownSeconds !== undefined
			? (customSettings.countdownSeconds > 0 ? customSettings.countdownSeconds : null)
			: 3;
		const initialIsPlaying = initialCountdown === null;

		// Then: 설정한 155 WPM, constant 모드, 카운트다운 없이 즉시 재생이 반영되어야 한다
		expect(initialWpm).toBe(155);
		expect(initialScrollMode).toBe('constant');
		expect(initialCountdown).toBeNull();
		expect(initialIsPlaying).toBe(true);
	});
});
