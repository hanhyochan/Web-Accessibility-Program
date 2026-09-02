import { create } from 'zustand';
import { RULE_CATALOG } from './rules/catalog';
import type { AppMode, Finding, InventoryPage, Project, RuleDef, ScanJob } from './types';

type AppState = {
  modeDraft: AppMode | null;
  project: Project | null;
  rules: RuleDef[];
  inventory: InventoryPage[];
  job: ScanJob;
  selectedFindingId: string | null;
  rulePanelOpen: boolean;

  setModeDraft: (mode: AppMode) => void;
  createProject: (input: Omit<Project, 'id' | 'createdAt'>) => void;
  updateProject: (patch: Partial<Project>) => void;
  setRules: (rules: RuleDef[]) => void;
  toggleRule: (id: string) => void;
  setInventory: (pages: InventoryPage[]) => void;
  togglePageIncluded: (url: string) => void;
  setJob: (job: Partial<ScanJob>) => void;
  appendFindings: (findings: Finding[]) => void;
  setSelectedFindingId: (id: string | null) => void;
  setRulePanelOpen: (open: boolean) => void;
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
  modeDraft: null,
  project: null,
  rules: RULE_CATALOG.map((r) => ({ ...r })),
  inventory: [],
  job: idleJob(),
  selectedFindingId: null,
  rulePanelOpen: false,

  setModeDraft: (mode) => set({ modeDraft: mode }),

  createProject: (input) =>
    set({
      project: {
        ...input,
        id: `p-${Date.now()}`,
        createdAt: new Date().toISOString(),
      },
      inventory: [],
      job: idleJob(),
      selectedFindingId: null,
    }),

  updateProject: (patch) =>
    set((s) => (s.project ? { project: { ...s.project, ...patch } } : s)),

  setRules: (rules) => set({ rules }),

  toggleRule: (id) =>
    set((s) => ({
      rules: s.rules.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r)),
    })),

  setInventory: (pages) => set({ inventory: pages }),

  togglePageIncluded: (url) =>
    set((s) => ({
      inventory: s.inventory.map((p) =>
        p.url === url ? { ...p, included: !p.included } : p,
      ),
    })),

  setJob: (job) => set((s) => ({ job: { ...s.job, ...job } })),

  appendFindings: (findings) =>
    set((s) => ({ job: { ...s.job, findings: [...s.job.findings, ...findings] } })),

  setSelectedFindingId: (id) => set({ selectedFindingId: id }),

  setRulePanelOpen: (open) => set({ rulePanelOpen: open }),

  resetScan: () => set({ job: idleJob(), selectedFindingId: null }),
}));
