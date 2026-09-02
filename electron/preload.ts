import { contextBridge, ipcRenderer } from 'electron';

export type CrawlPage = {
  url: string;
  depth: number;
  status: 'ok' | 'skip' | 'fail';
  discoveredFrom: string;
  included: boolean;
};

export type Finding = {
  id: string;
  ruleId: string;
  engine: string;
  url: string;
  selector: string;
  message: string;
  impact: string;
  htmlSnippet: string;
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
  runRule: (payload: {
    ruleId: string;
    pages: string[];
  }): Promise<{ findings: Finding[]; note: string; error?: boolean }> =>
    ipcRenderer.invoke('scan:runRule', payload),
};

contextBridge.exposeInMainWorld('a11y', api);

export type A11yApi = typeof api;
