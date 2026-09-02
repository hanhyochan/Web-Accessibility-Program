export type AppMode = 'production' | 'local';

export type RuleEngine = 'axe' | 'axe-custom' | 'html-validate' | 'playwright-template';

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
  sourceRoot?: string;
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
      runRule: (payload: {
        ruleId: string;
        pages: string[];
      }) => Promise<{ findings: Finding[]; note: string; error?: boolean }>;
    };
  }
}
