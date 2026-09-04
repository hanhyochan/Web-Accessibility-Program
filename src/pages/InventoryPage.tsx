import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageIntro from '../components/PageIntro';
import ProgressPanel from '../components/ProgressPanel';
import SelectAllRow from '../components/SelectAllRow';
import StepHeader from '../components/StepHeader';
import { formatCountUnit } from '../format';
import { useIndeterminate } from '../hooks/useIndeterminate';
import { useOverflowAction } from '../hooks/useOverflowAction';
import { useAppStore } from '../store';

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
  });
  const selectAllRef = useRef<HTMLInputElement>(null);
  const { bottomRef, showTop } = useOverflowAction([inventory.length, busy]);


  const collect = async () => {
    setBusy(true);
    setProgress({ found: 0, maxPages: project.maxPages, currentUrl: '' });
    const stopProgress = window.a11y?.onCrawlProgress?.((p) => setProgress(p));
    try {
      if (!window.a11y?.crawl) {
        const base = (project.startUrl || 'https://example.com').replace(/\/$/, '');
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
      setInventory(result.pages);
      if (result.error) alert(result.note);
    } finally {
      stopProgress?.();
      setBusy(false);
    }
  };

  useEffect(() => {
    if (inventory.length === 0) void collect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const included = inventory.filter((p) => p.included && p.status === 'ok').length;
  const scannable = inventory.filter((p) => p.status === 'ok').length;
  const allIncluded = scannable > 0 && included === scannable;
  const pct = Math.min(
    100,
    Math.round((progress.found / Math.max(progress.maxPages, 1)) * 100),
  );
  useIndeterminate(selectAllRef, included, scannable);

  const scopeHint =
    project.scanScope === 'single'
      ? '시작 주소 한 페이지만 검사합니다.'
      : '시작 주소에서 연결된 페이지를 모았습니다. 검사 불가 항목은 이유가 표시됩니다.';

  return (
    <div className="app-shell">
      <StepHeader
        active={2}
        onPrev={() => navigate('/')}
        onNext={() => navigate('/rules')}
        nextDisabled={included === 0 || busy}
      />
      {busy ? (
        <ProgressPanel
          title="페이지를 찾는 중"
          note="사이트에서 주소를 모으고 있습니다."
          pct={pct}
        />
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
                          : `${p.failReason}으로 검사 불가`}
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
