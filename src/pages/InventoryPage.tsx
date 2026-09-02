import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import StepHeader from '../components/StepHeader';
import { useAppStore } from '../store';

export default function InventoryPage() {
  const navigate = useNavigate();
  const project = useAppStore((s) => s.project)!;
  const inventory = useAppStore((s) => s.inventory);
  const setInventory = useAppStore((s) => s.setInventory);
  const togglePageIncluded = useAppStore((s) => s.togglePageIncluded);
  const [busy, setBusy] = useState(false);

  const crawl = async () => {
    setBusy(true);
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
      setBusy(false);
    }
  };

  useEffect(() => {
    if (inventory.length === 0) void crawl();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const included = inventory.filter((p) => p.included).length;

  const labelFor = (url: string, depth: number) => {
    try {
      const path = new URL(url).pathname || '/';
      if (path === '/' || path === '') return '홈';
      if (path.includes('about')) return '회사소개';
      if (path.includes('product')) return depth >= 2 ? '제품상세' : '제품';
      if (path.includes('login')) return '로그인';
      if (path.includes('contact')) return '문의';
      return path;
    } catch {
      return url;
    }
  };

  return (
    <div className="app-shell">
      <StepHeader active={3} />
      <main className="content stack lg">
        <div>
          <h2 className="title-xl">이 주소들에서 검사합니다</h2>
          <p className="muted">
            자동으로 찾은 페이지입니다. 빼려면 체크를 해제하세요. 잘 모르겠으면 그대로 두셔도
            됩니다.
          </p>
        </div>
        {busy && <p className="muted">페이지를 찾는 중…</p>}
        <div className="list">
          {inventory.map((p) => (
            <label key={p.url} className="list-row">
              <input
                type="checkbox"
                checked={p.included}
                onChange={() => togglePageIncluded(p.url)}
              />
              <span className="grow">
                <strong>{labelFor(p.url, p.depth)}</strong>
                <span className="muted"> · {p.url}</span>
                {!p.included && <span className="muted"> · 제외됨</span>}
              </span>
            </label>
          ))}
        </div>
        <div className="footer-nav">
          <button className="btn" type="button" onClick={() => navigate('/project/new')}>
            ← 이전
          </button>
          <div className="row">
            <button className="btn" type="button" onClick={() => void crawl()} disabled={busy}>
              다시 찾기
            </button>
            <button
              className="btn primary"
              type="button"
              disabled={included === 0}
              onClick={() => navigate('/rules')}
            >
              다음: 무엇을 검사할지 고르기
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
