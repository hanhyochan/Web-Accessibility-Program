import { contextBridge, ipcRenderer } from 'electron';

export type CrawlPage = {
  url: string;
  depth: number;
  status: 'ok' | 'skip' | 'fail';
  discoveredFrom: string;
  included: boolean;
  failReason?: string;
};

export type Finding = {
  id: string;
  ruleId: string;
  engine: string;
  url: string;
  selector: string;
  locationLabel?: string;
  message: string;
  impact: string;
  htmlSnippet: string;
  fixedSnippet?: string;
  autoFixable: boolean;
};

const api = {
  selectFolder: (): Promise<string | null> => ipcRenderer.invoke('dialog:selectFolder'),
  crawl: (payload: {
    startUrl: string;
    maxDepth: number;
    maxPages: number;
    excludePatterns?: string;
  }): Promise<{ pages: CrawlPage[]; note: string; error?: boolean }> =>
    ipcRenderer.invoke('scan:crawl', payload),
  scanFolder: (payload: {
    sourceRoot: string;
    maxPages: number;
    startUrl?: string;
  }): Promise<{ pages: CrawlPage[]; note: string; error?: boolean }> =>
    ipcRenderer.invoke('scan:folder', payload),
  onCrawlProgress: (
    cb: (progress: { found: number; maxPages: number; currentUrl: string }) => void,
  ): (() => void) => {
    const listener = (
      _event: unknown,
      progress: { found: number; maxPages: number; currentUrl: string },
    ) => cb(progress);
    ipcRenderer.on('scan:crawl-progress', listener);
    return () => ipcRenderer.removeListener('scan:crawl-progress', listener);
  },
  runRule: (payload: {
    ruleId: string;
    pages: string[];
  }): Promise<{ findings: Finding[]; note: string; error?: boolean }> =>
    ipcRenderer.invoke('scan:runRule', payload),
  runRules: (payload: {
    ruleIds: string[];
    pages: string[];
  }): Promise<{ findings: Finding[]; note: string; error?: boolean }> =>
    ipcRenderer.invoke('scan:runRules', payload),
  onScanProgress: (
    cb: (progress: {
      ruleIndex: number;
      ruleTotal: number;
      ruleId: string;
      pageIndex: number;
      pageTotal: number;
      currentUrl: string;
    }) => void,
  ): (() => void) => {
    const listener = (
      _event: unknown,
      progress: {
        ruleIndex: number;
        ruleTotal: number;
        ruleId: string;
        pageIndex: number;
        pageTotal: number;
        currentUrl: string;
      },
    ) => cb(progress);
    ipcRenderer.on('scan:run-progress', listener);
    return () => ipcRenderer.removeListener('scan:run-progress', listener);
  },
  exportPdf: (payload: {
    projectName: string;
    fileName: string;
    findings: Finding[];
    exportedAt: string;
  }): Promise<{ ok: boolean; canceled?: boolean; path?: string; error?: string }> =>
    ipcRenderer.invoke('export:pdf', payload),
};

contextBridge.exposeInMainWorld('a11y', api);

export type A11yApi = typeof api;
