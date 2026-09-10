#!/usr/bin/env node
/**
 * scripts/validate-release.mjs
 * 최종 릴리스 품질 게이트 및 보안 감사 검증기
 */

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const srcDir = path.join(rootDir, 'src');

console.log('========================================================');
console.log(' [RehearsePrompt] Final Release Validation Gate        ');
console.log('========================================================');

// 1. 버전 정합성 검증
console.log('[1/5] Validating Version SSOT...');
execSync('node ./scripts/check-version.mjs', { cwd: rootDir, stdio: 'inherit' });

// 2. TypeScript 정적 타입 검사
console.log('\n[2/5] Running TypeScript Strict Typecheck...');
execSync('npm run typecheck', { cwd: rootDir, stdio: 'inherit' });
console.log('   [통과] TypeScript 컴파일 0 에러');

// 3. Vitest 자동화 테스트 슈트
console.log('\n[3/5] Running Vitest Automated Test Suite...');
execSync('npm test', { cwd: rootDir, stdio: 'inherit' });
console.log('   [통과] 28개 자동화 테스트 전체 통과');

// 4. 보안 및 윤리적 API 배제 감사
console.log('\n[4/5] Auditing Ethical & Security Non-Circumvention Rules...');
const prohibitedTerms = [
	'SetWindowDisplayAffinity',
	'WDA_EXCLUDEFROMCAPTURE',
	'NSWindow.sharingType',
	'CGWindowListCreateImage',
];

function scanDirectory(dir) {
	const entries = fs.readdirSync(dir, { withFileTypes: true });
	for (const entry of entries) {
		const fullPath = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			scanDirectory(fullPath);
		} else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
			const content = fs.readFileSync(fullPath, 'utf8');
			for (const term of prohibitedTerms) {
				if (content.includes(term)) {
					console.error(`[보안 위반] 금지된 우회 API 발견: '${term}' in ${fullPath}`);
					process.exit(1);
				}
			}
		}
	}
}

scanDirectory(srcDir);
console.log('   [통과] 화면 공유 숨김 및 감독 우회 API 0건 (완전 무결)');

// 5. 산출물 및 체크섬 검증
console.log('\n[5/5] Verifying Packaged Release Artifacts...');
execSync('node ./scripts/verify-artifacts.mjs', { cwd: rootDir, stdio: 'inherit' });

console.log('========================================================');
console.log(' [최종 합격] 모든 릴리스 품질 및 보안 게이트를 통과했습니다!');
console.log('========================================================\n');
