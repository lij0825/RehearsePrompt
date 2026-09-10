#!/usr/bin/env node
/**
 * scripts/clean-build.mjs
 * 이전 빌드 산출물 및 임시 캐시 디렉터리 안전 정리기
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const dirsToClean = [
	path.join(rootDir, 'dist'),
	path.join(rootDir, 'dist-electron'),
	path.join(rootDir, 'build', 'temp'),
];

// --all 인자가 전달되면 release/ 디렉터리도 완전 삭제
if (process.argv.includes('--all')) {
	dirsToClean.push(path.join(rootDir, 'release'));
}

console.log('========================================================');
console.log(' [RehearsePrompt] Clean Build Outputs                  ');
console.log('========================================================');

for (const dir of dirsToClean) {
	if (fs.existsSync(dir)) {
		console.log(`[삭제 중] ${path.relative(rootDir, dir)}...`);
		fs.rmSync(dir, { recursive: true, force: true });
	} else {
		console.log(`[통과] 존재하지 않음: ${path.relative(rootDir, dir)}`);
	}
}

console.log('[성공] 빌드 산출물 디렉터리 정리 완료.');
console.log('========================================================\n');
