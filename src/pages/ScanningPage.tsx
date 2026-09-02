import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import StepHeader from '../components/StepHeader';
import { useAppStore } from '../store';

export default function ScanningPage() {
  const navigate = useNavigate();
  const project = useAppStore((s) => s.project)!;
  const inventory = useAppStore((s) => s.inventory);
  const rules = useAppStore((s) => s.rules);
  const job = useAppStore((s) => s.job);
  const setJob = useAppStore((s) => s.setJob);
  const appendFindings = useAppStore((s) => s.appendFindings);
  const resetScan = useAppStore((s) => s.resetScan);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const run = async () => {
      const enabledRules = rules.filter((r) => r.enabled);
      const pages = inventory.filter((p) => p.included).map((p) => p.url);
      if (enabledRules.length === 0 || pages.length === 0) {
        setJob({ status: 'error', note: '검사 항목 또는 페이지가 없습니다.' });
        return;
      }

      resetScan();
      setJob({
        id: `job-${Date.now()}`,
        status: 'running',
        progressRule: 0,
        progressRuleTotal: enabledRules.length,
        progressPage: 0,
        progressPageTotal: pages.length,
        findings: [],
        note: '검사 시작',
      });

      for (let ri = 0; ri < enabledRules.length; ri++) {
        const rule = enabledRules[ri];
        setJob({
          progressRule: ri + 1,
          currentRuleId: rule.label || rule.id,
          progressPage: 0,
          currentUrl: `${pages.length}개 페이지 검사 중…`,
        });

        if (window.a11y?.runRule) {
          const result = await window.a11y.runRule({ ruleId: rule.id, pages });
          appendFindings(result.findings);
          setJob({
            note: result.note,
            progressPage: pages.length,
          });
        } else {
          appendFindings([
            {
              id: `${rule.id}-fallback`,
              ruleId: rule.id,
              engine: rule.engine,
              url: pages[0],
              selector: 'body',
              message: `${rule.label} 확인이 필요합니다 (Electron 필요)`,
              impact: 'serious',
              htmlSnippet: '<div>…</div>',
              autoFixable: !!rule.autoFixable,
            },
          ]);
          setJob({ progressPage: pages.length });
        }
      }

      setJob({ status: 'done', note: `${project.name} 검사 완료` });
      navigate('/results');
    };

    void run();
  }, [appendFindings, inventory, navigate, project.name, resetScan, rules, setJob]);

  const total = job.progressRuleTotal * Math.max(job.progressPageTotal, 1) || 1;
  const done =
    (job.progressRule - 1) * Math.max(job.progressPageTotal, 1) + job.progressPage;
  const pct = Math.min(100, Math.round((done / total) * 100));

  return (
    <div className="app-shell">
      <StepHeader
        active={5}
        rightSlot={
          <button
            className="btn"
            type="button"
            onClick={() => {
              setJob({ status: 'cancelled', note: '중단됨' });
              navigate('/rules');
            }}
          >
            중단하기
          </button>
        }
      />
      <main className="content center-col">
        <h2 className="title-xl">검사하고 있어요</h2>
        <p className="muted">잠시만 기다려 주세요. 끝나는 대로 결과 화면으로 이동합니다.</p>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${pct}%` }} />
        </div>
        <p className="muted">
          지금: {job.currentRuleId || '준비 중'} · {job.progressPage} / {job.progressPageTotal}{' '}
          페이지
        </p>
      </main>
    </div>
  );
}
