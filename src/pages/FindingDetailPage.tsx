import { Link, useParams } from 'react-router-dom';
import StepHeader from '../components/StepHeader';
import { useAppStore } from '../store';

export default function FindingDetailPage() {
  const { id } = useParams();
  const project = useAppStore((s) => s.project)!;
  const finding = useAppStore((s) => s.job.findings.find((f) => f.id === id));

  if (!finding) {
    return (
      <div className="app-shell">
        <StepHeader active={6} />
        <main className="content">
          <p>항목을 찾을 수 없습니다.</p>
          <Link className="btn" to="/results">
            ← 결과로
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <StepHeader active={6} />
      <main className="content stack lg">
        <div className="footer-nav">
          <Link className="btn" to="/results">
            ← 결과 목록
          </Link>
        </div>
        <h2 className="title-xl">{finding.message}</h2>
        <div className="cards">
          <div className="card stack">
            <div className="muted">어디</div>
            <div>{finding.url}</div>
            <div className="muted">{finding.selector}</div>
          </div>
          <div className="card stack">
            <div className="muted">중요도</div>
            <div>{finding.impact === 'critical' ? '꼭 확인' : '권장'}</div>
          </div>
        </div>
        <div className="card stack">
          <strong>코드 일부</strong>
          <pre className="diff-box" style={{ margin: 0 }}>
            {finding.htmlSnippet}
          </pre>
        </div>
        {project.mode === 'local' && finding.autoFixable && (
          <Link className="btn primary" to="/fix">
            이 문제 고치기
          </Link>
        )}
      </main>
    </div>
  );
}
