#!/usr/bin/env node
/**
 * scripts/prepare-release.mjs
 * RehearsePrompt 릴리스 통합 준비 및 표준화 오케스트레이터
 */

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const releaseDir = path.join(rootDir, 'release');

console.log('########################################################');
console.log(' [RehearsePrompt] Preparing Official Release Package    ');
console.log('########################################################');

// 1. 버전 일치 확인
console.log('\n[1/5] Verifying Version SSOT...');
execSync('node ./scripts/check-version.mjs', { cwd: rootDir, stdio: 'inherit' });

// 2. 멀티 플랫폼 아이콘 확인 및 생성
console.log('\n[2/5] Ensuring Multi-Platform Icons Exist...');
if (process.platform === 'win32') {
	execSync('powershell -ExecutionPolicy Bypass -File ./scripts/generate-icons.ps1', {
		cwd: rootDir,
		stdio: 'inherit',
	});
}

// 3. 빌드 클린업
console.log('\n[3/5] Cleaning Temporary Build Artifacts...');
execSync('node ./scripts/clean-build.mjs', { cwd: rootDir, stdio: 'inherit' });

// 4. 플랫폼별 배포 바이너리 패키징
console.log('\n[4/5] Executing OS-Specific Package Builders...');
if (process.platform === 'win32') {
	execSync('powershell -ExecutionPolicy Bypass -File ./scripts/build-windows.ps1', {
		cwd: rootDir,
		stdio: 'inherit',
	});
} else if (process.platform === 'darwin') {
	execSync('bash ./scripts/build-macos.sh', { cwd: rootDir, stdio: 'inherit' });
}

// 5. 체크섬 및 산출물 유효성 검증
console.log('\n[5/5] Final Verification of Artifacts & Hashes...');
execSync('node ./scripts/generate-checksums.mjs', { cwd: rootDir, stdio: 'inherit' });
execSync('node ./scripts/verify-artifacts.mjs', { cwd: rootDir, stdio: 'inherit' });

console.log('\n########################################################');
console.log(' [성공] 릴리스 패키지 준비가 완벽하게 완료되었습니다!    ');
console.log('########################################################\n');
