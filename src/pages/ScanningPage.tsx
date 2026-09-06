import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import ProgressPanel from '../components/ProgressPanel';
import ScrollTopButton from '../components/ScrollTopButton';
import StepHeader from '../components/StepHeader';
import { formatCountUnit } from '../format';
import { useOverflowAction } from '../hooks/useOverflowAction';
import { useAppStore } from '../store';

/** StrictMode 이중 mount 시 검사가 두 번 도는 것 방지 */
let scanEpoch = 0;

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
  const pctFloors = useRef<Record<string, number>>({});
  const pctFloorJobId = useRef('');

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const epoch = ++scanEpoch;

    const run = async () => {
      const enabledRules = rules.filter((r) => r.enabled);
      const pages = inventory
        .filter((p) => p.included && p.status === 'ok')
        .map((p) => p.url);
      if (enabledRules.length === 0 || pages.length === 0) {
        setJob({ status: 'error', note: '검사 항목 또는 페이지가 없습니다.' });
        navigate('/results');
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

      const stopProgress = window.a11y?.onScanProgress?.((p) => {
        if (epoch !== scanEpoch) return;
        setJob({
          progressRule: p.ruleIndex,
          progressRuleTotal: p.ruleTotal,
          currentRuleId: p.ruleId,
          progressPage: p.pageIndex,
          progressPageTotal: p.pageTotal,
          currentUrl: p.currentUrl,
          note: `${p.pageIndex}/${p.pageTotal} · ${p.ruleId}`,
        });
      });

      let failed = false;
      try {
        if (window.a11y?.runRules) {
          const result = await window.a11y.runRules({
            ruleIds: enabledRules.map((r) => r.id),
            pages,
          });
          if (epoch !== scanEpoch) return;
          appendFindings(result.findings);
          setJob({
            note: result.note,
            progressRule: enabledRules.length,
            progressPage: pages.length,
          });
        } else if (window.a11y?.runRule) {
          for (let ri = 0; ri < enabledRules.length; ri++) {
            if (epoch !== scanEpoch) return;
            const rule = enabledRules[ri];
            setJob({
              progressRule: ri + 1,
              currentRuleId: rule.label || rule.id,
              progressPage: 0,
              currentUrl: `${formatCountUnit(pages.length)} 페이지 검사 중…`,
            });
            const result = await window.a11y.runRule({ ruleId: rule.id, pages });
            if (epoch !== scanEpoch) return;
            appendFindings(result.findings);
            setJob({ note: result.note, progressPage: pages.length });
          }
        } else {
          appendFindings([
            {
              id: `${enabledRules[0].id}-fallback`,
              ruleId: enabledRules[0].id,
              engine: enabledRules[0].engine,
              url: pages[0],
              selector: 'body',
              message: `${enabledRules[0].label} 확인이 필요합니다 (Electron 필요)`,
              impact: 'serious',
              htmlSnippet: '<div>…</div>',
              autoFixable: !!enabledRules[0].autoFixable,
            },
          ]);
          setJob({ progressPage: pages.length });
        }
      } catch (err) {
        failed = true;
        setJob({
          status: 'error',
          note: err instanceof Error ? err.message : String(err),
        });
      } finally {
        stopProgress?.();
      }

      if (epoch !== scanEpoch) return;
      if (!failed) setJob({ status: 'done', note: `${project.name} 검사 완료` });
      navigate('/results');
    };

    void run();
  }, [appendFindings, inventory, navigate, project.name, resetScan, rules, setJob]);

  useEffect(
    () => () => {
      scanEpoch += 1;
      if (useAppStore.getState().job.status === 'running') {
        useAppStore.getState().setJob({ status: 'cancelled', note: '중단됨' });
      }
    },
    [],
  );

  const scanPages = inventory.filter((p) => p.included && p.status === 'ok').map((p) => p.url);
  const current = Math.max(0, job.progressPage);
  const ruleTotal = Math.max(job.progressRuleTotal, 1);
  const ruleIdx = Math.max(0, job.progressRule);
  if (pctFloorJobId.current !== job.id) {
    pctFloorJobId.current = job.id;
    pctFloors.current = {};
  }
  const rows = scanPages.map((url, i) => {
    const n = i + 1;
    let raw = 0;
    if (current > 0) {
      if (n < current) raw = 100;
      else if (n === current) raw = Math.min(100, Math.round((ruleIdx / ruleTotal) * 100));
    }
    const prev = pctFloors.current[url] ?? 0;
    const pct = Math.max(prev, raw);
    pctFloors.current[url] = pct;
    return { key: url, pct };
  });
  const { bottomRef, showTop } = useOverflowAction([rows.length]);

  return (
    <div className="app-shell">
      <ScrollTopButton show={showTop} />
      <StepHeader
        active={4}
        onPrev={() => {
          scanEpoch += 1;
          setJob({ status: 'cancelled', note: '중단됨' });
          navigate('/rules');
        }}
      />
      <ProgressPanel
        title="검사하고 있어요"
        note={
          job.currentUrl
            ? `${job.currentUrl} · 잠시만 기다려 주세요. 끝나는 대로 결과 화면으로 이동합니다.`
            : '잠시만 기다려 주세요. 끝나는 대로 결과 화면으로 이동합니다.'
        }
        rows={rows}
      />
      <div ref={bottomRef} />
    </div>
  );
}
