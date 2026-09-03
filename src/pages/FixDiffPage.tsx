import { useNavigate } from 'react-router-dom';
import CheckboxStackRow from '../components/CheckboxStackRow';
import PageIntro from '../components/PageIntro';
import StepHeader from '../components/StepHeader';
import { useOverflowAction } from '../hooks/useOverflowAction';
import { useAppStore } from '../store';

export default function FixDiffPage() {
  const navigate = useNavigate();
  const project = useAppStore((s) => s.project)!;
  const allFindings = useAppStore((s) => s.job.findings);
  const findings = allFindings.filter((f) => f.autoFixable);
  const { bottomRef, showTop } = useOverflowAction([findings.length]);

  if (project.mode !== 'local') {
    return (
      <div className="app-shell">
        <StepHeader active={5} onPrev={() => navigate('/results')} />
        <main className="content">
          <p className="muted">운영 사이트 모드에서는 코드를 고칠 수 없습니다.</p>
        </main>
      </div>
    );
  }

  const apply = () => alert('다음 단계에서 실제 파일 수정을 연결합니다.');
  const primary = (
    <button className="btn primary" type="button" onClick={apply}>
      백업 후 적용
    </button>
  );

  return (
    <div className="app-shell">
      <StepHeader active={5} onPrev={() => navigate('/results')} />
      <main className="content stack lg">
        <PageIntro
          title="이렇게 고칠까요?"
          description="적용 전에 내용을 확인하세요. 원본은 백업됩니다. (백업 연동은 다음 단계)"
          topAction={showTop ? primary : undefined}
        />
        <div className="list">
          {findings.length === 0 ? (
            <div className="note">자동으로 고칠 수 있는 항목이 없습니다.</div>
          ) : (
            findings.map((f) => (
              <CheckboxStackRow
                key={f.id}
                title={f.message}
                desc={f.url}
                defaultChecked
              />
            ))
          )}
        </div>
        <div className="diff-box">
          {`- <img class="hero" src="/img/phone.png">
+ <img class="hero" src="/img/phone.png" alt="">`}
        </div>
        <div ref={bottomRef}>{primary}</div>
      </main>
    </div>
  );
}
