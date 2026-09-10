#!/usr/bin/env node
/**
 * scripts/generate-checksums.mjs
 * 크로스 플랫폼 SHA-256 체크섬 생성 및 매니페스트 갱신 도구
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const releaseDir = path.join(rootDir, 'release');

console.log('========================================================');
console.log(' [RehearsePrompt] Generating SHA-256 Checksums          ');
console.log('========================================================');

if (!fs.existsSync(releaseDir)) {
	console.error(`[오류] release 디렉터리를 찾을 수 없습니다: ${releaseDir}`);
	process.exit(1);
}

const targetExtensions = ['.exe', '.msi', '.dmg', '.zip'];
const files = fs.readdirSync(releaseDir).filter((file) => {
	const ext = path.extname(file).toLowerCase();
	return targetExtensions.includes(ext) && !file.includes('blockmap') && !file.includes('uninstaller');
});

if (files.length === 0) {
	console.warn('[경고] release 폴더에 체크섬을 계산할 바이너리가 없습니다.');
	process.exit(0);
}

const checksums = [];

for (const file of files) {
	const filePath = path.join(releaseDir, file);
	const fileBuffer = fs.readFileSync(filePath);
	const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex').toUpperCase();
	const sizeMB = (fileBuffer.length / (1024 * 1024)).toFixed(2);

	checksums.push({ file, hash, sizeMB });
	console.log(`[SHA-256] ${file.padEnd(46)} | ${hash} | ${sizeMB.padStart(6)} MB`);
}

// 1. release/SHA256SUMS.txt 생성 (표준 GNU 형식: HASH  FILENAME)
const checksumLines = checksums.map((item) => `${item.hash}  ${item.file}`).join('\n') + '\n';
const checksumFilePath = path.join(releaseDir, 'SHA256SUMS.txt');
fs.writeFileSync(checksumFilePath, checksumLines, 'utf8');
console.log(`\n[저장 완료] ${checksumFilePath}`);

console.log('========================================================\n');
