import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageIntro from '../components/PageIntro';
import ScrollTopButton from '../components/ScrollTopButton';
import ProgressPanel from '../components/ProgressPanel';
import SelectAllRow from '../components/SelectAllRow';
import StepHeader from '../components/StepHeader';
import { formatCountUnit } from '../format';
import { useIndeterminate } from '../hooks/useIndeterminate';
import { useOverflowAction } from '../hooks/useOverflowAction';
import { useAppStore } from '../store';

let crawlEpoch = 0;

export default function InventoryPage() {
  const navigate = useNavigate();
  const project = useAppStore((s) => s.project)!;
  const inventory = useAppStore((s) => s.inventory);
  const setInventory = useAppStore((s) => s.setInventory);
  const togglePageIncluded = useAppStore((s) => s.togglePageIncluded);
  const setAllPagesIncluded = useAppStore((s) => s.setAllPagesIncluded);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState({
    found: 0,
    maxPages: project.maxPages,
    currentUrl: '',
    pages: [] as { url: string; pct: number }[],
  });
  const pctFloors = useRef<Record<string, number>>({});
  const selectAllRef = useRef<HTMLInputElement>(null);
  const { bottomRef, showTop } = useOverflowAction([
    inventory.length,
    busy,
    progress.pages.length,
  ]);


  const collect = async () => {
    const epoch = ++crawlEpoch;
    setBusy(true);
    pctFloors.current = {};
    setProgress({
      found: 0,
      maxPages: project.maxPages,
      currentUrl: project.startUrl,
      pages: [{ url: project.startUrl, pct: 0 }],
    });
    const stopProgress = window.a11y?.onCrawlProgress?.((p) =>
      setProgress({ ...p, pages: p.pages ?? [] }),
    );
    try {
      if (!window.a11y?.crawl) {
        const base = (project.startUrl || 'https://example.com').replace(/\/$/, '');
        if (epoch !== crawlEpoch) return;
        setInventory([
          {
            url: `${base}/`,
            depth: 0,
            status: 'ok',
            discoveredFrom: '(시작)',
            included: true,
          },
        ]);
        return;
      }

      const result = await window.a11y.crawl({
        startUrl: project.startUrl,
        maxDepth: project.scanScope === 'single' ? 0 : project.maxDepth,
        maxPages: project.scanScope === 'single' ? 1 : project.maxPages,
        excludePatterns: project.excludePatterns,
      });
      if (epoch !== crawlEpoch) return;
      setInventory(result.pages);
      if (result.error) alert(result.note);
    } finally {
      stopProgress?.();
      if (epoch === crawlEpoch) setBusy(false);
    }
  };

  useEffect(() => {
    if (inventory.length === 0) void collect();
    return () => {
      crawlEpoch += 1;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const included = inventory.filter((p) => p.included && p.status === 'ok').length;
  const scannable = inventory.filter((p) => p.status === 'ok').length;
  const allIncluded = scannable > 0 && included === scannable;
  const rows = progress.pages.map((p) => {
    const prev = pctFloors.current[p.url] ?? 0;
    const pct = Math.max(0, prev, Math.round(p.pct));
    pctFloors.current[p.url] = pct;
    return { key: p.url, pct };
  });
  useIndeterminate(selectAllRef, included, scannable);

  const scopeHint =
    project.scanScope === 'single'
      ? '시작 주소 한 페이지만 검사합니다.'
      : '시작 주소에서 연결된 페이지를 모았습니다. 검사 불가 항목은 이유가 표시됩니다.';

  return (
    <div className="app-shell">
      <ScrollTopButton show={showTop} />
      <StepHeader
        active={2}
        onPrev={() => navigate('/')}
        onNext={() => navigate('/rules')}
        nextDisabled={included === 0 || busy}
      />
      {busy ? (
        <>
          <ProgressPanel
            title="페이지를 찾는 중"
            note={progress.currentUrl || '사이트에서 주소를 모으고 있습니다.'}
            rows={rows}
          />
          <div ref={bottomRef} />
        </>
      ) : inventory.length === 0 ? (
        <main className="content empty-center stack">
          <p className="muted">검사 가능한 페이지가 없습니다</p>
          <button className="btn solid" type="button" disabled={busy} onClick={() => void collect()}>
            다시 찾기
          </button>
        </main>
      ) : (
        <main className="content stack lg">
          <PageIntro
            className="stack"
            title="이 주소들에서 검사합니다"
            description={scopeHint}
            topAction={
              showTop ? (
                <button
                  className="btn primary"
                  type="button"
                  disabled={included === 0}
                  onClick={() => navigate('/rules')}
                >
                  검사 항목 정하기
                </button>
              ) : undefined
            }
          />
          <div className="stack">
            <SelectAllRow
              inputRef={selectAllRef}
              checked={allIncluded}
              onChange={setAllPagesIncluded}
              label="전체 체크"
              trailing={
                <span className="section-title">페이지 {formatCountUnit(included)}</span>
              }
            />
            <div className="list">
              {inventory.map((p, index) => (
                <label
                  key={`${p.url}#${index}`}
                  className={`list-row${p.status !== 'ok' ? ' is-disabled' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={p.included}
                    disabled={p.status !== 'ok'}
                    onChange={() => togglePageIncluded(index)}
                  />
                  <span className="grow list-primary">
                    {p.url}
                    {p.failReason && (
                      <span className="page-fail-reason">
                        {' '}
                        (
                        {p.failReason === '검사 제외 페이지'
                          ? p.failReason
                          : `검사 불가 · ${p.failReason}`}
                        )
                      </span>
                    )}
                  </span>
                </label>
              ))}
            </div>
          </div>
          <div ref={bottomRef}>
            <button
              className="btn primary"
              type="button"
              disabled={included === 0}
              onClick={() => navigate('/rules')}
            >
              검사 항목 정하기
            </button>
          </div>
        </main>
      )}
    </div>
  );
}
