import { contextBridge, ipcRenderer } from 'electron';
import type { ElectronAPI, IAppSettings, IScript, IPracticeSession } from '../types/index.js';

const api: ElectronAPI = {
  getAppInfo: () => ipcRenderer.invoke('app:get-info'),
  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveSettings: (settings: Partial<IAppSettings>) => ipcRenderer.invoke('settings:save', settings),
  getAllScripts: () => ipcRenderer.invoke('script:get-all'),
  getScriptById: (id: string) => ipcRenderer.invoke('script:get-by-id', id),
  saveScript: (script: Partial<IScript> & { id?: string }) => ipcRenderer.invoke('script:save', script),
  duplicateScript: (id: string) => ipcRenderer.invoke('script:duplicate', id),
  deleteScript: (id: string, permanent?: boolean) => ipcRenderer.invoke('script:delete', id, permanent),
  restoreScript: (id: string) => ipcRenderer.invoke('script:restore', id),
  getScriptVersions: (scriptId: string) => ipcRenderer.invoke('script:get-versions', scriptId),
  exportScript: (scriptId: string, format: 'txt' | 'md' | 'json') => ipcRenderer.invoke('script:export-file', scriptId, format),
  importScript: () => ipcRenderer.invoke('script:import-file'),
  saveSession: (session: Omit<IPracticeSession, 'id'>) => ipcRenderer.invoke('session:save', session),
  getSessionHistory: (scriptId?: string) => ipcRenderer.invoke('session:get-history', scriptId),
  setAlwaysOnTop: (alwaysOnTop: boolean) => ipcRenderer.invoke('window:set-always-on-top', alwaysOnTop),
  setOpacity: (opacity: number) => ipcRenderer.invoke('window:set-opacity', opacity),
  exportBackup: () => ipcRenderer.invoke('dialog:export-backup'),
  importBackup: () => ipcRenderer.invoke('dialog:import-backup'),
  onShortcutTriggered: (callback: (action: string) => void) => {
    const subscription = (_event: Electron.IpcRendererEvent, action: string) => {
      callback(action);
    };
    ipcRenderer.on('shortcut:triggered', subscription);
    return () => {
      ipcRenderer.removeListener('shortcut:triggered', subscription);
    };
  },
};

contextBridge.exposeInMainWorld('electronAPI', api);
