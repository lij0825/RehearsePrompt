#!/usr/bin/env node
/**
 * scripts/check-version.mjs
 * RehearsePrompt 버전 단일 진실 공급원(SSOT) 무결성 검증기
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const pkgPath = path.join(rootDir, 'package.json');

console.log('========================================================');
console.log(' [RehearsePrompt] Version Consistency Checker          ');
console.log('========================================================');

if (!fs.existsSync(pkgPath)) {
	console.error(`[오류] package.json 파일을 찾을 수 없습니다: ${pkgPath}`);
	process.exit(1);
}

const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const version = pkg.version;

if (!version) {
	console.error('[오류] package.json에 version 필드가 정의되어 있지 않습니다.');
	process.exit(1);
}

// SemVer 정규식 검사 (예: 1.0.0, 1.0.0-beta.1)
const semverRegex = /^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?(\+[0-9A-Za-z.-]+)?$/;
if (!semverRegex.test(version)) {
	console.error(`[오류] package.json 버전 '${version}'은 유효한 SemVer 형식이 아닙니다.`);
	process.exit(1);
}

console.log(`[확인] package.json 버전: ${version}`);

// 인자 또는 환경변수로 전달된 타깃 버전/태그 검증
const rawTarget = process.argv[2] || process.env.EXPECTED_VERSION;

let targetVersion = rawTarget;
if (!targetVersion && process.env.GITHUB_REF_TYPE === 'tag' && process.env.GITHUB_REF_NAME) {
	targetVersion = process.env.GITHUB_REF_NAME;
}

if (targetVersion) {
	// 버전 태그 형식(예: v1.0.0, 1.0.0)인지 확인. 브랜치명(main, develop 등)인 경우 버전 비교 생략
	if (/^v?\d+/.test(targetVersion)) {
		const cleanExpected = targetVersion.replace(/^v/, '');
		console.log(`[비교] 대상 기준 버전: ${cleanExpected}`);

		if (version !== cleanExpected) {
			console.error(`[실패] 버전 불일치 감지! package.json (${version}) !== 타깃 버전 (${cleanExpected})`);
			process.exit(1);
		}
		console.log('[성공] 버전 일치 확인 완료.');
	} else {
		console.log(`[안내] 대상 '${targetVersion}'은(는) 브랜치명이므로 버전 일치 비교를 생략하고 SemVer 유효성만 확인합니다.`);
		console.log('[성공] 유효한 SemVer 버전 확인 완료.');
	}
} else {
	console.log('[성공] 유효한 SemVer 버전 확인 완료.');
}
console.log('========================================================\n');
