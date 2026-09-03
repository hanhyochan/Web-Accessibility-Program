import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'node:path';
import { crawlSite } from './scan/crawl';
import { scanSourceFolder } from './scan/folderScan';
import { runRuleOnPages, runRulesOnPages } from './scan/axeScan';

process.env.DIST = path.join(__dirname, '../dist');
process.env.VITE_PUBLIC = app.isPackaged
  ? process.env.DIST
  : path.join(process.env.DIST, '../public');

let win: BrowserWindow | null = null;
const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL;

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 1024,
    minHeight: 700,
    title: '웹접근성 검사기',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(process.env.DIST!, 'index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();

  ipcMain.handle('dialog:selectFolder', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
  });

  ipcMain.handle(
    'scan:crawl',
    async (
      event,
      payload: {
        startUrl: string;
        maxDepth: number;
        maxPages: number;
        excludePatterns?: string;
      },
    ) => {
      try {
        return await crawlSite({
          ...payload,
          onProgress: (progress) => {
            event.sender.send('scan:crawl-progress', progress);
          },
        });
      } catch (err) {
        return {
          pages: [],
          note: `크롤 실패: ${err instanceof Error ? err.message : String(err)}`,
          error: true,
        };
      }
    },
  );

  ipcMain.handle(
    'scan:folder',
    async (
      _event,
      payload: {
        sourceRoot: string;
        maxPages: number;
        startUrl?: string;
      },
    ) => {
      try {
        return scanSourceFolder(payload);
      } catch (err) {
        return {
          pages: [],
          note: `폴더 스캔 실패: ${err instanceof Error ? err.message : String(err)}`,
          error: true,
        };
      }
    },
  );

  ipcMain.handle(
    'scan:runRule',
    async (_event, payload: { ruleId: string; pages: string[] }) => {
      try {
        return await runRuleOnPages(payload);
      } catch (err) {
        return {
          findings: [],
          note: `검사 실패: ${err instanceof Error ? err.message : String(err)}`,
          error: true,
        };
      }
    },
  );

  ipcMain.handle(
    'scan:runRules',
    async (
      event,
      payload: { ruleIds: string[]; pages: string[] },
    ) => {
      try {
        return await runRulesOnPages({
          ...payload,
          onProgress: (progress) => {
            event.sender.send('scan:run-progress', progress);
          },
        });
      } catch (err) {
        return {
          findings: [],
          note: `검사 실패: ${err instanceof Error ? err.message : String(err)}`,
          error: true,
        };
      }
    },
  );

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
