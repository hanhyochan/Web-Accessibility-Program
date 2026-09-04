import { create } from 'zustand';
import { RULE_CATALOG } from './rules/catalog';
import type { Finding, InventoryPage, Project, RuleDef, ScanJob } from './types';

type AppState = {
  project: Project | null;
  rules: RuleDef[];
  inventory: InventoryPage[];
  job: ScanJob;

  createProject: (input: Omit<Project, 'id' | 'createdAt'>) => void;
  toggleRule: (id: string) => void;
  setPackRulesEnabled: (pack: string, enabled: boolean) => void;
  setInventory: (pages: InventoryPage[]) => void;
  togglePageIncluded: (index: number) => void;
  setAllPagesIncluded: (included: boolean) => void;
  setJob: (job: Partial<ScanJob>) => void;
  appendFindings: (findings: Finding[]) => void;
  resetScan: () => void;
};

const idleJob = (): ScanJob => ({
  id: '',
  status: 'idle',
  progressRule: 0,
  progressRuleTotal: 0,
  progressPage: 0,
  progressPageTotal: 0,
  findings: [],
});

export const useAppStore = create<AppState>((set) => ({
  project: null,
  rules: RULE_CATALOG.map((r) => ({ ...r })),
  inventory: [],
  job: idleJob(),

  createProject: (input) =>
    set({
      project: {
        ...input,
        mode: 'production',
        id: `p-${Date.now()}`,
        createdAt: new Date().toISOString(),
      },
      inventory: [],
      job: idleJob(),
      rules: RULE_CATALOG.map((r) => ({ ...r })),
    }),

  toggleRule: (id) =>
    set((s) => ({
      rules: s.rules.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r)),
    })),

  setPackRulesEnabled: (pack, enabled) =>
    set((s) => ({
      rules: s.rules.map((r) => (r.pack === pack ? { ...r, enabled } : r)),
    })),

  setInventory: (pages) => {
    const seen = new Set<string>();
    const unique: InventoryPage[] = [];
    for (const page of pages) {
      if (seen.has(page.url)) continue;
      seen.add(page.url);
      unique.push(page);
    }
    set({ inventory: unique });
  },

  togglePageIncluded: (index) =>
    set((s) => ({
      inventory: s.inventory.map((p, i) => {
        if (i !== index) return p;
        // 접속 실패한 페이지는 검사 대상에 넣지 않음
        if (p.status !== 'ok' && !p.included) return p;
        return { ...p, included: !p.included };
      }),
    })),

  setAllPagesIncluded: (included) =>
    set((s) => ({
      inventory: s.inventory.map((p) => ({
        ...p,
        included: p.status === 'ok' ? included : false,
      })),
    })),

  setJob: (job) => set((s) => ({ job: { ...s.job, ...job } })),

  appendFindings: (findings) =>
    set((s) => ({ job: { ...s.job, findings: [...s.job.findings, ...findings] } })),

  resetScan: () => set({ job: idleJob() }),
}));
