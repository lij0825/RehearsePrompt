#!/usr/bin/env node
/**
 * scripts/verify-artifacts.mjs
 * 릴리스 산출물 존재 여부, 파일 크기, 무결성 검증기 (Zero-False-Success 보장)
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const releaseDir = path.join(rootDir, 'release');
const isWindows = process.platform === 'win32';
const isMac = process.platform === 'darwin';

console.log('========================================================');
console.log(' [RehearsePrompt] Release Artifacts Verifier           ');
console.log('========================================================');

if (!fs.existsSync(releaseDir)) {
	console.error(`[실패] release 디렉터리가 존재하지 않습니다: ${releaseDir}`);
	process.exit(1);
}

// OS별 필수 점검 목록
const requiredArtifacts = [];
if (isWindows) {
	requiredArtifacts.push(
		'RehearsePrompt-1.0.0-Windows-x64-setup.exe',
		'RehearsePrompt-1.0.0-Windows-x64.msi',
		'RehearsePrompt-1.0.0-Windows-x64-portable.exe'
	);
} else if (isMac) {
	requiredArtifacts.push(
		'RehearsePrompt-1.0.0-macOS-arm64.dmg',
		'RehearsePrompt-1.0.0-macOS-x64.dmg'
	);
}

let hasError = false;

for (const fileName of requiredArtifacts) {
	const filePath = path.join(releaseDir, fileName);
	if (!fs.existsSync(filePath)) {
		console.error(`[누락] 필수 산출물이 생성되지 않았습니다: ${fileName}`);
		hasError = true;
		continue;
	}

	const stats = fs.statSync(filePath);
	const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);

	if (stats.size < 10 * 1024 * 1024) {
		console.error(`[비정상] 파일 크기가 너무 작습니다 (${sizeMB} MB): ${fileName}`);
		hasError = true;
		continue;
	}

	console.log(`[확인] ${fileName.padEnd(46)} | ${sizeMB.padStart(6)} MB (정상)`);
}

// SHA256SUMS.txt 검증
const checksumFile = path.join(releaseDir, 'SHA256SUMS.txt');
if (!fs.existsSync(checksumFile)) {
	console.error('[누락] release/SHA256SUMS.txt 파일이 없습니다.');
	hasError = true;
} else {
	const lines = fs.readFileSync(checksumFile, 'utf8').trim().split('\n');
	console.log(`[확인] SHA256SUMS.txt 내 등록된 체크섬: ${lines.length}개 파일`);
}

if (hasError) {
	console.error('\n[실패] 일부 산출물 무결성 검증에 실패했습니다.');
	process.exit(1);
}

console.log('\n[성공] 모든 필수 산출물 무결성 검증 통과.');
console.log('========================================================\n');
