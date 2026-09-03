import { Link, useNavigate, useParams } from 'react-router-dom';
import PageIntro from '../components/PageIntro';
import StatDash from '../components/StatDash';
import StepHeader from '../components/StepHeader';
import { useOverflowAction } from '../hooks/useOverflowAction';
import { useAppStore } from '../store';

export default function FindingDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const project = useAppStore((s) => s.project)!;
  const finding = useAppStore((s) => s.job.findings.find((f) => f.id === id));
  const showFix = project.mode === 'local' && !!finding?.autoFixable;
  const { bottomRef, showTop } = useOverflowAction([finding?.id, showFix]);

  if (!finding) {
    return (
      <div className="app-shell">
        <StepHeader active={5} onPrev={() => navigate('/results')} />
        <main className="content">
          <p>항목을 찾을 수 없습니다.</p>
        </main>
      </div>
    );
  }

  const isCritical = finding.impact === 'critical';
  const fixAction = (
    <Link className="btn primary" to="/fix">
      이 문제 고치기
    </Link>
  );

  return (
    <div className="app-shell">
      <StepHeader active={5} onPrev={() => navigate('/results')} />
      <main className="content stack lg">
        <PageIntro
          title={finding.message}
          topAction={showFix && showTop ? fixAction : undefined}
        />
        <StatDash
          items={[
            {
              label: '중요도',
              value: isCritical ? '필수확인 오류' : '권장',
              tone: isCritical ? 'critical' : 'warn',
            },
          ]}
        />
        {finding.selector && <p className="muted">{finding.selector}</p>}
        <div className="card stack">
          <strong className="list-primary">코드 일부</strong>
          <pre className="diff-box">{finding.htmlSnippet}</pre>
        </div>
        {showFix && <div ref={bottomRef}>{fixAction}</div>}
      </main>
    </div>
  );
}
