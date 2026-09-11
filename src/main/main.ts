import { app, BrowserWindow, ipcMain, dialog, globalShortcut, screen } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { StorageService } from './storage.js';
import type { IAppSettings, IScript, IPracticeSession } from '../types/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;
let storageService: StorageService;
let savedNormalBounds: { x: number; y: number; width: number; height: number } | null = null;

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
const isSmokeTestMode = process.argv.includes('--smoke-test');

class SmokeTestRunner {
  private startTime = Date.now();
  private watchdogTimer: NodeJS.Timeout | null = null;
  private isShuttingDown = false;

  constructor() {
    // 10초 전역 안전 타임아웃 (Safety Watchdog)
    this.watchdogTimer = setTimeout(() => {
      console.error('[SmokeTest] WATCHDOG TIMEOUT: Test exceeded 10 seconds. Forcing shutdown.');
      this.shutdown(1, 'force', 'Watchdog timeout exceeded');
    }, 10000);
  }

  public onWindowReady(window: BrowserWindow | null): void {
    console.log('[SmokeTest] Window ready detected. Starting stabilization & metrics capture...');
    // 1.5초 안정화 대기 후 메트릭 수집 및 정상 종료
    setTimeout(async () => {
      await this.collectMetricsAndExit(window);
    }, 1500);
  }

  private async collectMetricsAndExit(window: BrowserWindow | null): Promise<void> {
    if (this.isShuttingDown) return;

    try {
      console.log('[SmokeTest] Collecting process tree metrics...');
      const appMetrics = app.getAppMetrics();
      const memUsage = process.memoryUsage();

      const childPids: number[] = [];
      let totalWorkingSetKb = 0;
      let totalPrivateBytesKb = 0;

      const processDetails = appMetrics.map((p) => {
        if (p.pid !== process.pid) childPids.push(p.pid);
        const wsKb = p.memory.workingSetSize || 0;
        const pbKb = p.memory.privateBytes || 0;
        totalWorkingSetKb += wsKb;
        totalPrivateBytesKb += pbKb;

        return {
          pid: p.pid,
          type: p.type,
          cpuUsagePercent: Number(p.cpu.percentCPUUsage.toFixed(2)),
          workingSetMb: Number((wsKb / 1024).toFixed(2)),
          peakWorkingSetMb: Number(((p.memory.peakWorkingSetSize || 0) / 1024).toFixed(2)),
        };
      });

      const resultPayload = {
        testName: 'Electron Smoke Test & Resource Benchmark',
        testProfile: 'minimal',
        startedAt: new Date(this.startTime).toISOString(),
        endedAt: new Date().toISOString(),
        durationMs: Date.now() - this.startTime,
        platform: process.platform,
        osVersion: process.getSystemVersion?.() || 'unknown',
        architecture: process.arch,
        electronVersion: process.versions.electron,
        appVersion: app.getVersion(),
        nodeVersion: process.versions.node,
        mainPid: process.pid,
        childPids,
        warmupMs: 1500,
        mainProcessSummary: {
          workingSetMb: Number((memUsage.rss / (1024 * 1024)).toFixed(2)),
          privateBytesMb: Number((totalPrivateBytesKb / 1024).toFixed(2)),
          heapUsedMb: Number((memUsage.heapUsed / (1024 * 1024)).toFixed(2)),
        },
        processTreeSummary: {
          totalProcesses: appMetrics.length,
          totalWorkingSetMb: Number((totalWorkingSetKb / 1024).toFixed(2)),
          totalPrivateBytesMb: Number((totalPrivateBytesKb / 1024).toFixed(2)),
          processDetails,
        },
        exitMode: 'graceful',
        exitCode: 0,
        timedOut: false,
        warnings: [],
        passed: true,
      };

      const resultFilePath = path.join(process.cwd(), 'smoke-test-result.json');
      fs.writeFileSync(resultFilePath, JSON.stringify(resultPayload, null, 2), 'utf-8');
      console.log(`[SmokeTest] Result saved to: ${resultFilePath}`);
      console.log(`[SmokeTest] PASSED: Total processes: ${appMetrics.length}, Total Memory: ${(totalWorkingSetKb / 1024).toFixed(2)} MB`);

      this.shutdown(0, 'graceful', 'Completed successfully', window);
    } catch (err) {
      console.error('[SmokeTest] Error during metrics collection:', err);
      this.shutdown(1, 'force', String(err), window);
    }
  }

  public shutdown(exitCode: number, mode: 'graceful' | 'force', reason: string, window?: BrowserWindow | null): void {
    if (this.isShuttingDown) return;
    this.isShuttingDown = true;

    if (this.watchdogTimer) {
      clearTimeout(this.watchdogTimer);
      this.watchdogTimer = null;
    }

    console.log(`[SmokeTest] Initiating shutdown: mode=${mode}, exitCode=${exitCode}, reason=${reason}`);

    try {
      if (window && !window.isDestroyed()) {
        window.destroy();
      }
    } catch (e) {
      console.warn('[SmokeTest] Error closing window during shutdown:', e);
    }

    if (mode === 'graceful') {
      app.quit();
      // 1.5초 후에도 프로세스가 살아있다면 app.exit으로 즉시 강제 종료 보장
      setTimeout(() => {
        console.log('[SmokeTest] Fallback exit triggered.');
        app.exit(exitCode);
      }, 1500);
    } else {
      app.exit(exitCode);
    }
  }
}

let smokeRunner: SmokeTestRunner | null = null;
if (isSmokeTestMode) {
  smokeRunner = new SmokeTestRunner();
}

function registerGlobalShortcuts(window: BrowserWindow, settings: IAppSettings): void {
  globalShortcut.unregisterAll();

  const shortcuts = settings.shortcuts;
  const actions: Record<string, string> = {
    [shortcuts.togglePlay]: 'togglePlay',
    [shortcuts.nextParagraph]: 'nextParagraph',
    [shortcuts.prevParagraph]: 'prevParagraph',
    [shortcuts.speedUp]: 'speedUp',
    [shortcuts.speedDown]: 'speedDown',
    [shortcuts.resetTop]: 'resetTop',
  };

  for (const [accelerator, action] of Object.entries(actions)) {
    if (!accelerator) continue;
    try {
      const success = globalShortcut.register(accelerator, () => {
        if (!window.isDestroyed()) {
          window.webContents.send('shortcut:triggered', action);
        }
      });
      if (!success) {
        console.warn(`[Shortcuts] Failed to register global shortcut: ${accelerator}`);
      }
    } catch (err) {
      console.error(`[Shortcuts] Error registering shortcut ${accelerator}:`, err);
    }
  }
}

function createWindow(): void {
  storageService = new StorageService(app.getPath('userData'));
  const settings = storageService.getSettings();
  const winState = settings.windowState;

  mainWindow = new BrowserWindow({
    width: isSmokeTestMode ? 600 : (winState.width || 1080),
    height: isSmokeTestMode ? 400 : (winState.height || 720),
    x: isSmokeTestMode ? 100 : winState.x,
    y: isSmokeTestMode ? 100 : winState.y,
    minWidth: 420,
    minHeight: 140,
    alwaysOnTop: isSmokeTestMode ? false : winState.isAlwaysOnTop,
    opacity: 1.0,
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    title: 'RehearsePrompt',
    icon: path.join(__dirname, '../../build/icon.ico'),
    backgroundColor: '#FFFFFF',
    transparent: false,
    resizable: true,
    show: !isSmokeTestMode, // smoke test 모드에서는 화면 표시 생략
  });

  // 중요: 화면 캡처 방지 API(setContentProtection)는 절대 호출하지 않으며 false 상태를 유지합니다.
  mainWindow.setContentProtection(false);

  if (!isSmokeTestMode && winState.isMaximized) {
    mainWindow.maximize();
  }

  // 일반 모드에서만 창 위치 저장 리스너 등록
  if (!isSmokeTestMode) {
    const saveCurrentWindowState = () => {
      if (!mainWindow || mainWindow.isDestroyed()) return;
      const isMaximized = mainWindow.isMaximized();
      if (!isMaximized) {
        const bounds = mainWindow.getBounds();
        storageService.saveSettings({
          windowState: {
            ...storageService.getSettings().windowState,
            x: bounds.x,
            y: bounds.y,
            width: bounds.width,
            height: bounds.height,
            isMaximized: false,
          },
        });
      } else {
        storageService.saveSettings({
          windowState: {
            ...storageService.getSettings().windowState,
            isMaximized: true,
          },
        });
      }
    };

    mainWindow.on('resize', saveCurrentWindowState);
    mainWindow.on('move', saveCurrentWindowState);
  }

  mainWindow.once('ready-to-show', () => {
    console.log('[Main] Electron window ready-to-show event fired successfully');
    if (!isSmokeTestMode) {
      mainWindow?.show();
    } else {
      smokeRunner?.onWindowReady(mainWindow);
    }
  });

  // 렌더러 콘솔 메시지를 터미널로 출력하여 오류 감지
  mainWindow.webContents.on('console-message', (_event, level, message, line, sourceId) => {
    const levels = ['DEBUG', 'INFO', 'WARN', 'ERROR'];
    console.log(`[Renderer ${levels[level] || 'LOG'}] ${message} (${sourceId}:${line})`);
  });

  // 일반 모드에서만 글로벌 단축키 등록
  if (!isSmokeTestMode) {
    registerGlobalShortcuts(mainWindow, settings);
  }

  if (isDev && process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    const indexPath = path.join(__dirname, '../../dist/index.html');
    if (fs.existsSync(indexPath)) {
      mainWindow.loadFile(indexPath);
    } else {
      mainWindow.loadURL('http://localhost:5173');
    }
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function setupIpcHandlers(): void {
  // App Info
  ipcMain.handle('app:get-info', () => {
    return {
      version: app.getVersion(),
      name: 'RehearsePrompt',
      platform: process.platform,
      arch: process.arch,
      userDataPath: app.getPath('userData'),
    };
  });

  // Settings
  ipcMain.handle('settings:get', () => {
    return storageService.getSettings();
  });

  ipcMain.handle('settings:save', (_event, patch: Partial<IAppSettings>) => {
    const updated = storageService.saveSettings(patch);
    if (mainWindow && patch.shortcuts && !isSmokeTestMode) {
      registerGlobalShortcuts(mainWindow, updated);
    }
    return updated;
  });

  // Scripts
  ipcMain.handle('script:get-all', () => {
    return storageService.getAllScripts();
  });

  ipcMain.handle('script:get-by-id', (_event, id: string) => {
    return storageService.getScriptById(id);
  });

  ipcMain.handle('script:save', (_event, scriptData: Partial<IScript> & { id?: string }) => {
    return storageService.saveScript(scriptData);
  });

  ipcMain.handle('script:duplicate', (_event, id: string) => {
    return storageService.duplicateScript(id);
  });

  ipcMain.handle('script:delete', (_event, id: string, permanent?: boolean) => {
    return storageService.deleteScript(id, permanent);
  });

  ipcMain.handle('script:restore', (_event, id: string) => {
    return storageService.restoreScript(id);
  });

  ipcMain.handle('script:get-versions', (_event, scriptId: string) => {
    return storageService.getScriptVersions(scriptId);
  });

  ipcMain.handle('script:export-file', async (_event, scriptId: string, format: 'txt' | 'md' | 'json') => {
    if (!mainWindow) return null;
    const script = storageService.getScriptById(scriptId);
    if (!script) return null;

    const ext = format === 'md' ? 'md' : format === 'json' ? 'json' : 'txt';
    const safeTitle = script.title.replace(/[\\/:*?"<>|]/g, '_');
    const { filePath } = await dialog.showSaveDialog(mainWindow, {
      title: '대본 파일 내보내기',
      defaultPath: `${safeTitle}.${ext}`,
      filters: [
        { name: format.toUpperCase(), extensions: [ext] },
        { name: '모든 파일', extensions: ['*'] },
      ],
    });

    if (!filePath) return null;
    storageService.exportScript(scriptId, format, filePath);
    return filePath;
  });

  ipcMain.handle('script:import-file', async () => {
    if (!mainWindow) return null;
    const { filePaths } = await dialog.showOpenDialog(mainWindow, {
      title: '대본 파일 가져오기',
      filters: [
        { name: '대본 파일 (TXT, Markdown, JSON)', extensions: ['txt', 'md', 'markdown', 'json'] },
        { name: '모든 파일', extensions: ['*'] },
      ],
      properties: ['openFile'],
    });

    if (!filePaths || filePaths.length === 0) return null;
    return storageService.importScript(filePaths[0]);
  });

  // Sessions
  ipcMain.handle('session:save', (_event, session: Omit<IPracticeSession, 'id'>) => {
    return storageService.saveSession(session);
  });

  ipcMain.handle('session:get-history', (_event, scriptId?: string) => {
    const all = storageService.getAllSessions();
    if (scriptId) {
      return all.filter((s) => s.scriptId === scriptId);
    }
    return all;
  });

  // Window Controls
  ipcMain.handle('window:set-always-on-top', (_event, alwaysOnTop: boolean) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.setAlwaysOnTop(alwaysOnTop);
      storageService.saveSettings({
        windowState: {
          ...storageService.getSettings().windowState,
          isAlwaysOnTop: alwaysOnTop,
        },
      });
      return true;
    }
    return false;
  });

  ipcMain.handle('window:set-opacity', (_event, _opacity: number) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      // OS 레벨의 전체 창 투명화는 글자까지 흐려지므로 창 자체는 1.0 유지 (배경 투명화는 렌더러 CSS에서 전담)
      mainWindow.setOpacity(1.0);
      storageService.saveSettings({
        windowState: {
          ...storageService.getSettings().windowState,
          opacity: 1.0,
        },
      });
      return true;
    }
    return false;
  });

  ipcMain.handle('window:set-compact-mode', (_event, isCompact: boolean) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (isCompact) {
        // 기존 창 크기 및 위치 보존
        savedNormalBounds = mainWindow.getBounds();

        // 주 모니터 상단 중앙 배치 (웹캠 아래 시선 유도 최적화)
        const primaryDisplay = screen.getPrimaryDisplay();
        const { width: screenWidth } = primaryDisplay.workAreaSize;
        const compactWidth = 840;
        const compactHeight = 180;
        const x = Math.round((screenWidth - compactWidth) / 2);
        const y = 32;

        mainWindow.setMinimumSize(420, 140);
        mainWindow.setBounds({ x, y, width: compactWidth, height: compactHeight });
        mainWindow.setAlwaysOnTop(true);
      } else {
        // 이전 일반 창 크기 및 위치 복원
        mainWindow.setMinimumSize(420, 380);
        if (savedNormalBounds) {
          mainWindow.setBounds(savedNormalBounds);
        } else {
          mainWindow.setSize(1080, 720);
          mainWindow.center();
        }
      }
      return true;
    }
    return false;
  });

  // Backup / Export
  ipcMain.handle('dialog:export-backup', async () => {
    if (!mainWindow) return null;
    const { filePath } = await dialog.showSaveDialog(mainWindow, {
      title: 'RehearsePrompt 전체 백업 내보내기',
      defaultPath: `RehearsePrompt_backup_${new Date().toISOString().slice(0, 10)}.json`,
      filters: [{ name: 'JSON Backup', extensions: ['json'] }],
    });

    if (!filePath) return null;
    const payload = storageService.createBackupPayload();
    fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf-8');
    return filePath;
  });

  ipcMain.handle('dialog:import-backup', async () => {
    if (!mainWindow) return { success: false, message: '창이 활성화되지 않았어요.' };
    const { filePaths } = await dialog.showOpenDialog(mainWindow, {
      title: 'RehearsePrompt 백업 파일 가져오기',
      filters: [{ name: 'JSON Backup', extensions: ['json'] }],
      properties: ['openFile'],
    });

    if (!filePaths || filePaths.length === 0) {
      return { success: false, message: '선택된 파일이 없어요.' };
    }

    try {
      const content = fs.readFileSync(filePaths[0], 'utf-8');
      const parsed = JSON.parse(content);
      const result = storageService.restoreFromBackup(parsed);
      return { success: true, count: result.count };
    } catch (err) {
      console.error('[ImportBackup] Failed to parse backup file', err);
      return { success: false, message: '파일 형식이 올바르지 않거나 손상되었어요.' };
    }
  });
}

app.whenReady().then(() => {
  setupIpcHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('will-quit', () => {
  if (!isSmokeTestMode) {
    globalShortcut.unregisterAll();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin' || isSmokeTestMode) {
    app.quit();
  }
});
