import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import type { IAppSettings, IScript, IScriptVersion, IPracticeSession, IWindowState } from '../types/index.js';

export const DEFAULT_SHORTCUTS = {
  togglePlay: 'CommandOrControl+Shift+Space',
  nextParagraph: 'CommandOrControl+Shift+Down',
  prevParagraph: 'CommandOrControl+Shift+Up',
  speedUp: 'CommandOrControl+Shift+]',
  speedDown: 'CommandOrControl+Shift+[',
  resetTop: 'CommandOrControl+Shift+Home',
};

export const DEFAULT_WINDOW_STATE: IWindowState = {
  width: 1080,
  height: 720,
  isMaximized: false,
  isAlwaysOnTop: false,
  opacity: 1.0,
  lastMode: 'editor',
};

export const DEFAULT_SETTINGS: IAppSettings = {
  theme: 'light',
  language: 'ko',
  autoSaveIntervalMs: 800,
  openLastScriptOnStartup: true,
  restoreWindowMode: true,
  confirmOnQuit: true,
  defaultWpm: 130,
  defaultScrollMode: 'constant',
  fontSize: 28,
  lineHeight: 1.8,
  paragraphSpacing: 32,
  maxWidth: 800,
  highlightSentence: true,
  highlightParagraph: true,
  showProgress: true,
  showRemainingTime: true,
  countdownSeconds: 3,
  eyeContactGuide: true,
  shortcuts: DEFAULT_SHORTCUTS,
  windowState: DEFAULT_WINDOW_STATE,
  speech: {
    enabled: true,
    recognitionLanguage: 'ko-KR',
    micGain: 1.0,
    silenceThresholdMs: 1500,
  },
  privacy: {
    telemetryEnabled: false,
    crashReportsEnabled: false,
  },
  onboardingCompleted: false,
};

export class StorageService {
  private dataDir: string;
  private scriptsFile: string;
  private versionsDir: string;
  private sessionsFile: string;
  private settingsFile: string;

  constructor(userDataPath: string) {
    this.dataDir = path.join(userDataPath, 'data');
    this.scriptsFile = path.join(this.dataDir, 'scripts.json');
    this.versionsDir = path.join(this.dataDir, 'versions');
    this.sessionsFile = path.join(this.dataDir, 'sessions.json');
    this.settingsFile = path.join(this.dataDir, 'settings.json');

    this.ensureDirectories();
  }

  private ensureDirectories(): void {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
    if (!fs.existsSync(this.versionsDir)) {
      fs.mkdirSync(this.versionsDir, { recursive: true });
    }
  }

  // Atomic write helper using temporary file and rename
  private atomicWriteJson(filePath: string, data: unknown): void {
    this.ensureDirectories();
    const tempFile = `${filePath}.${Date.now()}.${crypto.randomBytes(4).toString('hex')}.tmp`;
    const jsonString = JSON.stringify(data, null, 2);
    fs.writeFileSync(tempFile, jsonString, 'utf-8');
    fs.renameSync(tempFile, filePath);
  }

  private readJson<T>(filePath: string, fallback: T): T {
    try {
      if (!fs.existsSync(filePath)) {
        return fallback;
      }
      const raw = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(raw) as T;
    } catch (err) {
      console.error(`[StorageService] Failed to read ${filePath}, returning fallback`, err);
      return fallback;
    }
  }

  // --- Settings ---
  public getSettings(): IAppSettings {
    const loaded = this.readJson<Partial<IAppSettings>>(this.settingsFile, {});
    return { ...DEFAULT_SETTINGS, ...loaded };
  }

  public saveSettings(patch: Partial<IAppSettings>): IAppSettings {
    const current = this.getSettings();
    const updated = { ...current, ...patch };
    this.atomicWriteJson(this.settingsFile, updated);
    return updated;
  }

  // --- Scripts ---
  public getAllScripts(): IScript[] {
    return this.readJson<IScript[]>(this.scriptsFile, []);
  }

  public getScriptById(id: string): IScript | null {
    const scripts = this.getAllScripts();
    return scripts.find((s) => s.id === id) || null;
  }

  public saveScript(scriptData: Partial<IScript> & { id?: string }): IScript {
    const scripts = this.getAllScripts();
    const now = new Date().toISOString();

    let targetScript: IScript;
    const existingIndex = scriptData.id ? scripts.findIndex((s) => s.id === scriptData.id) : -1;

    if (existingIndex >= 0) {
      const existing = scripts[existingIndex];
      // Save version snapshot if content changed significantly
      if (scriptData.content !== undefined && scriptData.content !== existing.content) {
        this.addVersionSnapshot(existing, 'auto');
      }

      targetScript = {
        ...existing,
        ...scriptData,
        updatedAt: now,
        version: existing.version + 1,
      };
      scripts[existingIndex] = targetScript;
    } else {
      const newId = scriptData.id || crypto.randomUUID();
      targetScript = {
        id: newId,
        title: (scriptData.title && scriptData.title.trim().length > 0) ? scriptData.title.trim() : '제목 없는 스크립트',
        description: scriptData.description || '',
        content: scriptData.content || '',
        tags: scriptData.tags || [],
        isFavorite: scriptData.isFavorite ?? false,
        createdAt: now,
        updatedAt: now,
        lastOpenedAt: now,
        estimatedDuration: scriptData.estimatedDuration || 0,
        wordCount: scriptData.wordCount || 0,
        charCount: scriptData.charCount || 0,
        language: scriptData.language || 'ko-KR',
        version: 1,
        deletedAt: null,
      };
      scripts.unshift(targetScript);
    }

    this.atomicWriteJson(this.scriptsFile, scripts);
    return targetScript;
  }

  public duplicateScript(id: string): IScript | null {
    const original = this.getScriptById(id);
    if (!original) return null;

    const duplicated = this.saveScript({
      title: `${original.title} (사본)`,
      description: original.description,
      content: original.content,
      tags: [...original.tags],
      isFavorite: false,
      estimatedDuration: original.estimatedDuration,
      wordCount: original.wordCount,
      charCount: original.charCount,
      language: original.language,
    });

    return duplicated;
  }

  public deleteScript(id: string, permanent = false): boolean {
    const scripts = this.getAllScripts();
    const index = scripts.findIndex((s) => s.id === id);
    if (index === -1) {
      return false;
    }

    if (permanent) {
      scripts.splice(index, 1);
    } else {
      scripts[index].deletedAt = new Date().toISOString();
    }

    this.atomicWriteJson(this.scriptsFile, scripts);
    return true;
  }

  public restoreScript(id: string): boolean {
    const scripts = this.getAllScripts();
    const target = scripts.find((s) => s.id === id);
    if (!target) {
      return false;
    }
    target.deletedAt = null;
    this.atomicWriteJson(this.scriptsFile, scripts);
    return true;
  }

  // --- Versions (Max 10 per script) ---
  private addVersionSnapshot(script: IScript, trigger: 'auto' | 'manual' | 'backup'): void {
    const versionFile = path.join(this.versionsDir, `${script.id}.json`);
    const versions = this.readJson<IScriptVersion[]>(versionFile, []);

    const newSnapshot: IScriptVersion = {
      versionId: crypto.randomUUID(),
      scriptId: script.id,
      versionNumber: versions.length + 1,
      title: script.title,
      content: script.content,
      savedAt: new Date().toISOString(),
      trigger,
    };

    versions.unshift(newSnapshot);
    // Keep max 10
    if (versions.length > 10) {
      versions.length = 10;
    }

    this.atomicWriteJson(versionFile, versions);
  }

  public getScriptVersions(scriptId: string): IScriptVersion[] {
    const versionFile = path.join(this.versionsDir, `${scriptId}.json`);
    return this.readJson<IScriptVersion[]>(versionFile, []);
  }

  // --- Sessions ---
  public getAllSessions(): IPracticeSession[] {
    return this.readJson<IPracticeSession[]>(this.sessionsFile, []);
  }

  public saveSession(sessionData: Omit<IPracticeSession, 'id'>): IPracticeSession {
    const sessions = this.getAllSessions();
    const newSession: IPracticeSession = {
      ...sessionData,
      id: crypto.randomUUID(),
    };
    sessions.unshift(newSession);
    this.atomicWriteJson(this.sessionsFile, sessions);
    return newSession;
  }

  // --- Backup & Restore ---
  public exportScript(scriptId: string, format: 'txt' | 'md' | 'json', targetPath: string): boolean {
    const script = this.getScriptById(scriptId);
    if (!script) {
      throw new Error(`스크립트를 찾을 수 없어요. (ID: ${scriptId})`);
    }

    let fileContent = '';
    if (format === 'txt') {
      fileContent = `${script.title}\n\n${script.content}`;
    } else if (format === 'md') {
      fileContent = `# ${script.title}\n\n> 예상 시간: ${Math.ceil(script.estimatedDuration / 60)}분 | 단어 수: ${script.wordCount}단어\n\n${script.content}`;
    } else {
      fileContent = JSON.stringify(script, null, 2);
    }

    try {
      fs.writeFileSync(targetPath, fileContent, 'utf-8');
      return true;
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      throw new Error(`파일을 저장하지 못했어요: ${errorMsg}`);
    }
  }

  public importScript(filePath: string): IScript {
    if (!fs.existsSync(filePath)) {
      throw new Error('선택한 파일이 존재하지 않아요.');
    }

    const ext = path.extname(filePath).toLowerCase();
    let rawContent: string;
    try {
      rawContent = fs.readFileSync(filePath, 'utf-8');
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      throw new Error(`파일을 읽지 못했어요: ${errorMsg}`);
    }

    if (ext === '.json') {
      try {
        const parsed = JSON.parse(rawContent);
        if (!parsed || typeof parsed !== 'object') {
          throw new Error('올바른 JSON 데이터가 아니에요.');
        }

        // 스크립트 객체 검증 및 정제
        const scriptObj = parsed as Partial<IScript>;
        const title = (scriptObj.title && typeof scriptObj.title === 'string') ? scriptObj.title.trim() : path.basename(filePath, ext);
        const content = (scriptObj.content && typeof scriptObj.content === 'string') ? scriptObj.content : '';

        return this.saveScript({
          title,
          content,
          description: scriptObj.description || '가져온 스크립트',
          tags: Array.isArray(scriptObj.tags) ? scriptObj.tags : ['가져옴'],
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        throw new Error(`JSON 파일을 가져오지 못했어요: ${msg}`);
      }
    } else {
      // TXT or Markdown
      const title = path.basename(filePath, ext);
      return this.saveScript({
        title,
        content: rawContent,
        description: `${ext.toUpperCase().replace('.', '')} 파일에서 가져온 대본`,
        tags: ['가져옴'],
      });
    }
  }

  public createBackupPayload(): { scripts: IScript[]; settings: IAppSettings; sessions: IPracticeSession[] } {
    return {
      scripts: this.getAllScripts(),
      settings: this.getSettings(),
      sessions: this.getAllSessions(),
    };
  }

  public restoreFromBackup(payload: { scripts?: IScript[]; settings?: Partial<IAppSettings>; sessions?: IPracticeSession[] }): { count: number } {
    let restoredCount = 0;
    if (Array.isArray(payload.scripts)) {
      this.atomicWriteJson(this.scriptsFile, payload.scripts);
      restoredCount += payload.scripts.length;
    }
    if (payload.settings) {
      this.saveSettings(payload.settings);
    }
    if (Array.isArray(payload.sessions)) {
      this.atomicWriteJson(this.sessionsFile, payload.sessions);
    }
    return { count: restoredCount };
  }
}
