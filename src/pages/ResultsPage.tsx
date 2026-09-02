import { useNavigate } from 'react-router-dom';
import StepHeader from '../components/StepHeader';
import { useAppStore } from '../store';

const TITLE: Record<string, string> = {
  'image-alt': '이미지에 대체 텍스트 없음',
  'ko-blank-link-title': '새 창 링크에 안내 없음',
  label: '입력칸 이름 없음',
  'link-name': '링크 이름이 모호함',
  'button-name': '버튼 이름 없음',
};

function shortPath(url: string) {
  try {
    const p = new URL(url).pathname;
    return p === '/' ? '홈' : p;
  } catch {
    return url;
  }
}

export default function ResultsPage() {
  const navigate = useNavigate();
  const project = useAppStore((s) => s.project)!;
  const job = useAppStore((s) => s.job);
  const setSelectedFindingId = useAppStore((s) => s.setSelectedFindingId);

  const critical = job.findings.filter((f) => f.impact === 'critical').length;
  const serious = job.findings.filter((f) => f.impact === 'serious').length;
  const other = job.findings.length - critical - serious;

  return (
    <div className="app-shell">
      <StepHeader
        active={5}
        onPrev={() => navigate('/rules')}
        nextDisabled
      />
      <main className="content stack lg">
        <div>
          <h2 className="title-xl">검사 결과</h2>
          <p className="muted">
            {job.findings.length === 0
              ? '지금은 표시할 문제가 없습니다.'
              : `고치면 좋은 항목이 ${job.findings.length}개 있습니다. 아래부터 보면 됩니다.`}
          </p>
        </div>
        <div className="cards">
          <div className="card">
            <div className="muted">꼭 확인</div>
            <div style={{ fontSize: 32, fontWeight: 700 }}>{critical}</div>
          </div>
          <div className="card">
            <div className="muted">권장</div>
            <div style={{ fontSize: 32, fontWeight: 700 }}>{serious}</div>
          </div>
          <div className="card">
            <div className="muted">참고</div>
            <div style={{ fontSize: 32, fontWeight: 700 }}>{Math.max(0, other)}</div>
          </div>
        </div>
        <div className="list">
          {job.findings.map((f) => (
            <button
              key={f.id}
              type="button"
              className="list-row clickable"
              style={{ width: '100%', textAlign: 'left', border: 'none' }}
              onClick={() => {
                setSelectedFindingId(f.id);
                navigate(`/findings/${encodeURIComponent(f.id)}`);
              }}
            >
              <span className="grow">
                <strong>{TITLE[f.ruleId] || f.message}</strong>
                <span className="muted"> · {shortPath(f.url)}</span>
              </span>
              <span className="muted">자세히 →</span>
            </button>
          ))}
        </div>
        <div className="row">
          {project.mode === 'local' && (
            <button className="btn primary" type="button" onClick={() => navigate('/fix')}>
              문제 있는 코드 고치기
            </button>
          )}
          <button className="btn" type="button" onClick={() => navigate('/export')}>
            보고서 받기
          </button>
        </div>
      </main>
    </div>
  );
}
