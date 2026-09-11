import React, { useState, useEffect } from 'react';
import type { IAppInfo, IAppSettings, ScrollMode } from '../../../types/index.ts';
import { TButton } from '../common/TButton.tsx';
import {
	X,
	Sliders,
	Mic,
	Download,
	Upload,
	CheckCircle2,
} from 'lucide-react';

interface SettingsModalProps {
	isOpen: boolean;
	onClose: () => void;
	settings: IAppSettings | null;
	onUpdateSettings: (updated: Partial<IAppSettings>) => Promise<void>;
	appInfo: IAppInfo | null;
	onNotify: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
	isOpen,
	onClose,
	settings,
	onUpdateSettings,
	appInfo,
	onNotify,
}) => {
	const [activeSection, setActiveSection] = useState<'prompter' | 'speech' | 'backup' | 'about'>('prompter');
	const [wpm, setWpm] = useState<number>(settings?.defaultWpm ?? 130);
	const [scrollMode, setScrollMode] = useState<ScrollMode>(settings?.defaultScrollMode ?? 'voice');
	const [countdown, setCountdown] = useState<number>(settings?.countdownSeconds ?? 3);
	const [lang, setLang] = useState<string>(settings?.speech?.recognitionLanguage ?? 'ko-KR');

	// 모달이 열리거나 외부 설정이 업데이트되었을 때 상태 동기화
	useEffect(() => {
		if (isOpen && settings) {
			setWpm(settings.defaultWpm ?? 130);
			setScrollMode(settings.defaultScrollMode ?? 'voice');
			setCountdown(settings.countdownSeconds ?? 3);
			setLang(settings.speech?.recognitionLanguage ?? 'ko-KR');
		}
	}, [isOpen, settings]);

	if (!isOpen) {
		return null;
	}

	const handleSavePrompterSettings = async () => {
		try {
			await onUpdateSettings({
				defaultWpm: wpm,
				defaultScrollMode: scrollMode,
				countdownSeconds: countdown,
				speech: {
					...(settings?.speech ?? {
						enabled: true,
						micGain: 1.0,
						silenceThresholdMs: 1200,
						recognitionLanguage: 'ko-KR',
					}),
					recognitionLanguage: lang,
				},
			});
			onNotify('설정을 저장했어요.', 'success');
			onClose();
		} catch (_err) {
			onNotify('설정 저장 중 문제가 발생했어요.', 'error');
		}
	};

	const handleExportBackup = async () => {
		try {
			const success = await window.electronAPI?.exportBackup();
			if (success) {
				onNotify('대본 전체 백업 파일을 성공적으로 내보냈어요.', 'success');
			}
		} catch (_err) {
			onNotify('백업 내보내기에 실패했어요.', 'error');
		}
	};

	const handleImportBackup = async () => {
		try {
			const success = await window.electronAPI?.importBackup();
			if (success) {
				onNotify('백업 파일로부터 대본을 복원했어요.', 'success');
				onClose();
			}
		} catch (_err) {
			onNotify('백업 가져오기에 실패했어요.', 'error');
		}
	};

	return (
		<div style={{
			position: 'fixed',
			top: 0,
			left: 0,
			right: 0,
			bottom: 0,
			backgroundColor: 'rgba(0, 0, 0, 0.45)',
			display: 'flex',
			alignItems: 'center',
			justifyContent: 'center',
			zIndex: 2000,
			backdropFilter: 'blur(4px)',
		}}>
			<div style={{
				width: '640px',
				maxHeight: '85vh',
				backgroundColor: 'var(--tds-bg-primary, #FFFFFF)',
				borderRadius: 'var(--tds-radius-l, 16px)',
				boxShadow: 'var(--tds-shadow-3, 0 12px 32px rgba(0,0,0,0.18))',
				display: 'flex',
				flexDirection: 'column',
				overflow: 'hidden',
			}}>
				{/* 모달 헤더 */}
				<div style={{
					padding: '20px 24px',
					borderBottom: '1px solid var(--tds-line-default)',
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'space-between',
				}}>
					<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
						<Sliders size={20} style={{ color: 'var(--tds-blue-500)' }} />
						<span style={{ fontSize: '18px', fontWeight: 700 }}>환경설정</span>
					</div>
					<button
						onClick={onClose}
						style={{
							border: 'none',
							background: 'none',
							cursor: 'pointer',
							color: 'var(--tds-grey-600)',
							padding: '4px',
						}}
					>
						<X size={20} />
					</button>
				</div>

				{/* 탭 네비게이션 */}
				<div style={{
					display: 'flex',
					padding: '0 24px',
					borderBottom: '1px solid var(--tds-line-default)',
					backgroundColor: 'var(--tds-bg-secondary)',
				}}>
					{[
						{ id: 'prompter', label: '프롬프터 & 속도' },
						{ id: 'speech', label: '음성 인식' },
						{ id: 'backup', label: '데이터 백업' },
						{ id: 'about', label: '앱 정보' },
					].map((tab) => (
						<button
							key={tab.id}
							onClick={() => setActiveSection(tab.id as typeof activeSection)}
							style={{
								padding: '12px 16px',
								border: 'none',
								background: 'none',
								fontSize: '14px',
								fontWeight: activeSection === tab.id ? 700 : 500,
								color: activeSection === tab.id ? 'var(--tds-blue-600)' : 'var(--tds-grey-600)',
								borderBottom: activeSection === tab.id ? '2px solid var(--tds-blue-500)' : '2px solid transparent',
								cursor: 'pointer',
							}}
						>
							{tab.label}
						</button>
					))}
				</div>

				{/* 모달 본문 */}
				<div style={{ padding: '24px', flex: 1, overflowY: 'auto' }}>
					{activeSection === 'prompter' && (
						<div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
							<div>
								<label style={{ fontSize: '14px', fontWeight: 700, display: 'block', marginBottom: '8px' }}>
									기본 스크롤 방식
								</label>
								<div style={{ display: 'flex', gap: '10px' }}>
									<button
										onClick={() => setScrollMode('voice')}
										style={{
											flex: 1,
											padding: '12px',
											borderRadius: 'var(--tds-radius-m)',
											border: scrollMode === 'voice'
												? '2px solid var(--tds-blue-500)'
												: '1px solid var(--tds-line-default)',
											backgroundColor: scrollMode === 'voice' ? 'var(--tds-blue-50)' : '#FFFFFF',
											cursor: 'pointer',
											textAlign: 'left',
										}}
									>
										<div style={{ fontWeight: 700, fontSize: '14px', color: scrollMode === 'voice' ? 'var(--tds-blue-600)' : 'inherit' }}>
											🎙️ 음성 인식 스크롤
										</div>
										<div style={{ fontSize: '12px', color: 'var(--tds-grey-600)', marginTop: '4px' }}>
											발화 속도에 맞춰 대본이 자동으로 추적됩니다.
										</div>
									</button>

									<button
										onClick={() => setScrollMode('constant')}
										style={{
											flex: 1,
											padding: '12px',
											borderRadius: 'var(--tds-radius-m)',
											border: scrollMode === 'constant'
												? '2px solid var(--tds-blue-500)'
												: '1px solid var(--tds-line-default)',
											backgroundColor: scrollMode === 'constant' ? 'var(--tds-blue-50)' : '#FFFFFF',
											cursor: 'pointer',
											textAlign: 'left',
										}}
									>
										<div style={{ fontWeight: 700, fontSize: '14px', color: scrollMode === 'constant' ? 'var(--tds-blue-600)' : 'inherit' }}>
											⏱️ 일정 속도 자동 스크롤
										</div>
										<div style={{ fontSize: '12px', color: 'var(--tds-grey-600)', marginTop: '4px' }}>
											설정한 WPM 속도에 맞춰 균일하게 진행됩니다.
										</div>
									</button>
								</div>
							</div>

							<div>
								<label style={{ fontSize: '14px', fontWeight: 700, display: 'block', marginBottom: '8px' }}>
									기본 낭독 속도 (WPM)
								</label>
								<div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
									<button
										onClick={() => setWpm((prev) => Math.max(60, prev - 5))}
										style={{
											width: '36px',
											height: '36px',
											borderRadius: 'var(--tds-radius-m)',
											border: '1px solid var(--tds-line-default)',
											background: '#FFFFFF',
											cursor: 'pointer',
											fontWeight: 700,
											fontSize: '16px',
										}}
									>
										-
									</button>
									<span style={{ fontSize: '18px', fontWeight: 800, width: '90px', textAlign: 'center' }}>
										{wpm} WPM
									</span>
									<button
										onClick={() => setWpm((prev) => Math.min(240, prev + 5))}
										style={{
											width: '36px',
											height: '36px',
											borderRadius: 'var(--tds-radius-m)',
											border: '1px solid var(--tds-line-default)',
											background: '#FFFFFF',
											cursor: 'pointer',
											fontWeight: 700,
											fontSize: '16px',
										}}
									>
										+
									</button>
									<span style={{ fontSize: '12px', color: 'var(--tds-grey-600)', marginLeft: '8px' }}>
										(일반 한국어 발표 권장: 120 ~ 140 WPM)
									</span>
								</div>
							</div>

							<div>
								<label style={{ fontSize: '14px', fontWeight: 700, display: 'block', marginBottom: '8px' }}>
									시작 카운트다운
								</label>
								<div style={{ display: 'flex', gap: '8px' }}>
									{[3, 2, 1, 0].map((sec) => (
										<button
											key={sec}
											onClick={() => setCountdown(sec)}
											style={{
												padding: '8px 16px',
												borderRadius: 'var(--tds-radius-m)',
												border: countdown === sec
													? '2px solid var(--tds-blue-500)'
													: '1px solid var(--tds-line-default)',
												backgroundColor: countdown === sec ? 'var(--tds-blue-50)' : '#FFFFFF',
												color: countdown === sec ? 'var(--tds-blue-600)' : 'inherit',
												fontWeight: 600,
												cursor: 'pointer',
											}}
										>
											{sec === 0 ? '즉시 시작' : `${sec}초`}
										</button>
									))}
								</div>
							</div>
						</div>
					)}

					{activeSection === 'speech' && (
						<div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
							<div>
								<label style={{ fontSize: '14px', fontWeight: 700, display: 'block', marginBottom: '8px' }}>
									음성 인식 기본 언어
								</label>
								<div style={{ display: 'flex', gap: '10px' }}>
									{[
										{ code: 'ko-KR', name: '한국어 (Korean)' },
										{ code: 'en-US', name: 'English (US)' },
									].map((item) => (
										<button
											key={item.code}
											onClick={() => setLang(item.code)}
											style={{
												flex: 1,
												padding: '12px',
												borderRadius: 'var(--tds-radius-m)',
												border: lang === item.code
													? '2px solid var(--tds-blue-500)'
													: '1px solid var(--tds-line-default)',
												backgroundColor: lang === item.code ? 'var(--tds-blue-50)' : '#FFFFFF',
												color: lang === item.code ? 'var(--tds-blue-600)' : 'inherit',
												fontWeight: 700,
												cursor: 'pointer',
											}}
										>
											{item.name}
										</button>
									))}
								</div>
							</div>

							<div style={{
								padding: '16px',
								backgroundColor: 'var(--tds-bg-secondary)',
								borderRadius: 'var(--tds-radius-m)',
								display: 'flex',
								gap: '12px',
								alignItems: 'flex-start',
							}}>
								<Mic size={20} style={{ color: 'var(--tds-blue-500)', marginTop: '2px' }} />
								<div>
									<div style={{ fontSize: '14px', fontWeight: 700 }}>100% 온디바이스 로컬 처리</div>
									<div style={{ fontSize: '12px', color: 'var(--tds-grey-600)', marginTop: '4px', lineHeight: 1.5 }}>
										RehearsePrompt는 사용자의 마이크 음성 신호를 외부 서버로 절대 전송하지 않으며, PC 내부 웹 스피치 API 엔진에서만 실시간 처리됩니다.
									</div>
								</div>
							</div>
						</div>
					)}

					{activeSection === 'backup' && (
						<div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
							<div>
								<div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '4px' }}>대본 전체 데이터 백업</div>
								<div style={{ fontSize: '12px', color: 'var(--tds-grey-600)', marginBottom: '12px' }}>
									작성한 모든 대본과 태그, 설정 데이터를 단일 JSON 파일로 안전하게 내보냅니다.
								</div>
								<TButton
									variant="secondary"
									size="m"
									onClick={handleExportBackup}
									icon={<Download size={16} />}
								>
									대본 전체 백업 파일 내보내기 (JSON)
								</TButton>
							</div>

							<div style={{ borderTop: '1px solid var(--tds-line-default)', paddingTop: '16px' }}>
								<div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '4px' }}>백업 파일로부터 복원</div>
								<div style={{ fontSize: '12px', color: 'var(--tds-grey-600)', marginBottom: '12px' }}>
									이전에 내보낸 JSON 백업 파일을 불러와 대본을 복원합니다.
								</div>
								<TButton
									variant="secondary"
									size="m"
									onClick={handleImportBackup}
									icon={<Upload size={16} />}
								>
									백업 파일 불러오기
								</TButton>
							</div>
						</div>
					)}

					{activeSection === 'about' && (
						<div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
							<div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
								<div style={{
									width: '44px',
									height: '44px',
									borderRadius: '12px',
									backgroundColor: 'var(--tds-blue-500)',
									color: '#FFFFFF',
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'center',
									fontWeight: 800,
									fontSize: '20px',
								}}>
									R
								</div>
								<div>
									<div style={{ fontSize: '16px', fontWeight: 800 }}>RehearsePrompt</div>
									<div style={{ fontSize: '12px', color: 'var(--tds-grey-600)' }}>
										스피치 및 모의 면접을 위한 데스크톱 텔레프롬프터
									</div>
								</div>
							</div>

							<div style={{
								backgroundColor: 'var(--tds-bg-secondary)',
								padding: '16px',
								borderRadius: 'var(--tds-radius-m)',
								display: 'flex',
								flexDirection: 'column',
								gap: '8px',
								fontSize: '13px',
							}}>
								<div style={{ display: 'flex', justifyContent: 'space-between' }}>
									<span style={{ color: 'var(--tds-grey-600)' }}>앱 버전</span>
									<span style={{ fontWeight: 700 }}>v{appInfo?.version ?? '1.0.0'}</span>
								</div>
								<div style={{ display: 'flex', justifyContent: 'space-between' }}>
									<span style={{ color: 'var(--tds-grey-600)' }}>플랫폼 아키텍처</span>
									<span style={{ fontWeight: 600 }}>{appInfo?.platform ?? 'win32'} ({appInfo?.arch ?? 'x64'})</span>
								</div>
								<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
									<span style={{ color: 'var(--tds-grey-600)', whiteSpace: 'nowrap' }}>로컬 데이터 경로</span>
									<span style={{ fontSize: '11px', wordBreak: 'break-all', textAlign: 'right' }}>
										{appInfo?.userDataPath ?? 'C:\\Users\\...'}
									</span>
								</div>
							</div>

							<div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--tds-blue-600)', fontSize: '12px' }}>
								<CheckCircle2 size={16} />
								<span>최신 릴리스 v1.0.0 공식 빌드가 적용되어 있습니다.</span>
							</div>
						</div>
					)}
				</div>

				{/* 모달 푸터 */}
				<div style={{
					padding: '16px 24px',
					borderTop: '1px solid var(--tds-line-default)',
					backgroundColor: 'var(--tds-bg-secondary)',
					display: 'flex',
					justifyContent: 'flex-end',
					gap: '8px',
				}}>
					<TButton
						variant="secondary"
						size="m"
						onClick={onClose}
					>
						닫기
					</TButton>
					{activeSection === 'prompter' && (
						<TButton
							variant="primary"
							size="m"
							onClick={handleSavePrompterSettings}
						>
							저장하기
						</TButton>
					)}
				</div>
			</div>
		</div>
	);
};
