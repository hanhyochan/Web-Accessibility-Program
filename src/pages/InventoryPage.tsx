import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import StepHeader from '../components/StepHeader';
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

  const crawl = async () => {
    setBusy(true);
    setProgress({ found: 0, maxPages: project.maxPages, currentUrl: '' });
    const stopProgress = window.a11y?.onCrawlProgress?.((p) => setProgress(p));
    try {
      if (!window.a11y?.crawl) {
        const base = project.startUrl.replace(/\/$/, '');
        setInventory([
          { url: `${base}/`, depth: 0, status: 'ok', discoveredFrom: '(시작)', included: true },
        ]);
        return;
      }
      const result = await window.a11y.crawl({
        startUrl: project.startUrl,
        maxDepth: project.maxDepth,
        maxPages: project.maxPages,
        excludePatterns: project.excludePatterns,
      });
      setInventory(result.pages);
      if (result.error) {
        alert(result.note);
      }
    } finally {
      stopProgress?.();
      setBusy(false);
    }
  };

  useEffect(() => {
    if (inventory.length === 0) void crawl();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const included = inventory.filter((p) => p.included).length;
  const allIncluded = inventory.length > 0 && included === inventory.length;
  const pct = Math.min(
    100,
    Math.round((progress.found / Math.max(progress.maxPages, 1)) * 100),
  );

  useEffect(() => {
    if (!selectAllRef.current) return;
    selectAllRef.current.indeterminate = included > 0 && included < inventory.length;
  }, [included, inventory.length]);

  return (
    <div className="app-shell">
      <StepHeader
        active={2}
        onPrev={() => navigate('/project/new')}
        onNext={() => navigate('/rules')}
        nextDisabled={included === 0 || busy}
      />
      {busy ? (
        <main className="content center-col">
          <h2 className="title-xl">페이지를 찾는 중</h2>
          <p className="muted">사이트에서 주소를 모으고 있습니다.</p>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${pct}%` }} />
          </div>
          <p className="muted">{pct}%</p>
        </main>
      ) : (
        <main className="content stack lg">
          <div>
            <h2 className="title-xl">이 주소들에서 검사합니다</h2>
            <p className="muted">자동으로 찾은 페이지입니다. 빼려면 체크를 해제하세요.</p>
          </div>
          <div className="list">
            <label className="list-row list-select-all">
              <input
                ref={selectAllRef}
                type="checkbox"
                checked={allIncluded}
                onChange={(e) => setAllPagesIncluded(e.target.checked)}
              />
              <span className="inventory-url">전체 체크</span>
            </label>
            {inventory.map((p, index) => (
              <label key={`${p.url}#${index}`} className="list-row">
                <input
                  type="checkbox"
                  checked={p.included}
                  onChange={() => togglePageIncluded(index)}
                />
                <span className="grow inventory-url">{p.url}</span>
              </label>
            ))}
          </div>
          <div>
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
