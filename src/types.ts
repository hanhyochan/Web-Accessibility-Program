export type AppMode = 'production';

/** crawl: 시작 URL에서 연결 페이지 수집 / single: 시작 URL만 */
export type ScanScope = 'crawl' | 'single';

export type RuleEngine = 'axe' | 'axe-custom' | 'html-validate' | 'playwright-template' | 'manual';

export type RuleDef = {
  id: string;
  label: string;
  engine: RuleEngine;
  pack: string;
  enabled: boolean;
  autoFixable?: boolean;
  description?: string;
};

export type Project = {
  id: string;
  name: string;
  mode: AppMode;
  startUrl: string;
  scanScope: ScanScope;
  maxDepth: number;
  maxPages: number;
  excludePatterns: string;
  rulePackId: string;
  createdAt: string;
};

export type InventoryPage = {
  url: string;
  depth: number;
  status: 'ok' | 'skip' | 'fail';
  discoveredFrom: string;
  included: boolean;
  /** 검사 불가·제외 사유 (있으면 기본 체크 해제) */
  failReason?: string;
};

export type Finding = {
  id: string;
  ruleId: string;
  engine: string;
  url: string;
  selector: string;
  /** 사람이 읽기 쉬운 위치 설명 (부모 영역·몇 번째·클래스) */
  locationLabel?: string;
  message: string;
  impact: string;
  htmlSnippet: string;
  /** 접근성에 맞게 고친 예시 코드 */
  fixedSnippet?: string;
  autoFixable: boolean;
};

export type ScanJob = {
  id: string;
  status: 'idle' | 'running' | 'done' | 'cancelled' | 'error';
  progressRule: number;
  progressRuleTotal: number;
  progressPage: number;
  progressPageTotal: number;
  currentRuleId?: string;
  currentUrl?: string;
  findings: Finding[];
  note?: string;
};

declare global {
  interface Window {
    a11y?: {
      selectFolder: () => Promise<string | null>;
      crawl: (payload: {
        startUrl: string;
        maxDepth: number;
        maxPages: number;
        excludePatterns?: string;
      }) => Promise<{ pages: InventoryPage[]; note: string; error?: boolean }>;
      onCrawlProgress?: (
        cb: (progress: { found: number; maxPages: number; currentUrl: string }) => void,
      ) => () => void;
      runRule: (payload: {
        ruleId: string;
        pages: string[];
      }) => Promise<{ findings: Finding[]; note: string; error?: boolean }>;
      runRules?: (payload: {
        ruleIds: string[];
        pages: string[];
      }) => Promise<{ findings: Finding[]; note: string; error?: boolean }>;
      onScanProgress?: (
        cb: (progress: {
          ruleIndex: number;
          ruleTotal: number;
          ruleId: string;
          pageIndex: number;
          pageTotal: number;
          currentUrl: string;
        }) => void,
      ) => () => void;
      exportPdf?: (payload: {
        projectName: string;
        fileName: string;
        findings: Finding[];
        exportedAt: string;
      }) => Promise<{ ok: boolean; canceled?: boolean; path?: string; error?: string }>;
    };
  }
}
