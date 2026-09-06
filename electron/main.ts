import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import { crawlSite } from './scan/crawl';
import { scanSourceFolder } from './scan/folderScan';
import { runRuleOnPages, runRulesOnPages } from './scan/axeScan';
import { zipStore } from './zipStore';

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

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildReportHtml(payload: {
  projectName: string;
  findings: Array<{
    message: string;
    impact: string;
    url: string;
    ruleId: string;
    htmlSnippet: string;
  }>;
  exportedAt: string;
}) {
  const rows = payload.findings
    .map((f, i) => {
      const impact =
        f.impact === 'critical' ? '필수확인 오류' : f.impact === 'serious' ? '권장' : '참고';
      return `<tr>
        <td>${i + 1}</td>
        <td>${escapeHtml(impact)}</td>
        <td>${escapeHtml(f.message)}</td>
        <td>${escapeHtml(f.url)}</td>
        <td>${escapeHtml(f.ruleId)}</td>
      </tr>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(payload.projectName)} 검사 보고서</title>
<style>
  body { font-family: "Malgun Gothic", sans-serif; color: #111; padding: 24px; }
  h1 { font-size: 20px; margin: 0 0 8px; }
  .meta { color: #555; font-size: 12px; margin-bottom: 20px; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; vertical-align: top; }
  th { background: #f3f3f3; }
</style>
</head>
<body>
  <h1>${escapeHtml(payload.projectName)} 웹접근성 검사 보고서</h1>
  <p class="meta">내보낸 시각: ${escapeHtml(payload.exportedAt)} · 항목 ${payload.findings.length}건</p>
  <table>
    <thead>
      <tr><th>#</th><th>중요도</th><th>내용</th><th>페이지</th><th>규칙</th></tr>
    </thead>
    <tbody>
      ${rows || '<tr><td colspan="5">표시할 항목이 없습니다.</td></tr>'}
    </tbody>
  </table>
</body>
</html>`;
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
    'export:files',
    async (
      _event,
      payload: {
        projectName: string;
        baseName: string;
        findings: Array<{
          message: string;
          impact: string;
          url: string;
          ruleId: string;
          htmlSnippet: string;
        }>;
        exportedAt: string;
        json?: string;
        md?: string;
        pdf?: boolean;
      },
    ) => {
      const planned: { name: string; ext: string }[] = [];
      if (payload.pdf) planned.push({ name: `${payload.baseName}-report.pdf`, ext: 'pdf' });
      if (payload.json != null) planned.push({ name: `${payload.baseName}-report.json`, ext: 'json' });
      if (payload.md != null) planned.push({ name: `${payload.baseName}-ai-fix.md`, ext: 'md' });
      if (planned.length === 0) return { ok: false, error: '받을 파일이 없습니다.' };

      const multi = planned.length > 1;
      const save = await dialog.showSaveDialog({
        title: '파일 저장',
        defaultPath: multi ? `${payload.baseName}.zip` : planned[0].name,
        filters: multi
          ? [{ name: 'ZIP', extensions: ['zip'] }]
          : [{ name: planned[0].ext.toUpperCase(), extensions: [planned[0].ext] }],
      });
      if (save.canceled || !save.filePath) {
        return { ok: false, canceled: true };
      }

      try {
        const files: { name: string; data: Buffer }[] = [];
        if (payload.pdf) {
          const html = buildReportHtml(payload);
          const pdfWin = new BrowserWindow({
            show: false,
            width: 800,
            height: 1100,
            webPreferences: { sandbox: true },
          });
          try {
            await pdfWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
            files.push({
              name: `${payload.baseName}-report.pdf`,
              data: await pdfWin.webContents.printToPDF({
                printBackground: true,
                pageSize: 'A4',
                margins: { marginType: 'default' },
              }),
            });
          } finally {
            pdfWin.destroy();
          }
        }
        if (payload.json != null) {
          files.push({
            name: `${payload.baseName}-report.json`,
            data: Buffer.from(payload.json, 'utf8'),
          });
        }
        if (payload.md != null) {
          files.push({
            name: `${payload.baseName}-ai-fix.md`,
            data: Buffer.from(payload.md, 'utf8'),
          });
        }
        const out = multi ? zipStore(files) : files[0].data;
        fs.writeFileSync(save.filePath, out);
        return { ok: true, path: save.filePath };
      } catch (err) {
        return {
          ok: false,
          error: err instanceof Error ? err.message : String(err),
        };
      }
    },
  );

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
