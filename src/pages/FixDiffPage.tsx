import { useNavigate } from 'react-router-dom';
import StepHeader from '../components/StepHeader';
import { useAppStore } from '../store';

export default function FixDiffPage() {
  const navigate = useNavigate();
  const project = useAppStore((s) => s.project)!;
  const findings = useAppStore((s) => s.job.findings.filter((f) => f.autoFixable));

  if (project.mode !== 'local') {
    return (
      <div className="app-shell">
        <StepHeader active={5} onPrev={() => navigate('/results')} nextDisabled />
        <main className="content">
          <p className="muted">운영 사이트 모드에서는 코드를 고칠 수 없습니다.</p>
        </main>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <StepHeader active={5} onPrev={() => navigate('/results')} nextDisabled />
      <main className="content stack lg">
        <div>
          <h2 className="title-xl">이렇게 고칠까요?</h2>
          <p className="muted">적용 전에 내용을 확인하세요. 원본은 백업됩니다. (백업 연동은 다음 단계)</p>
        </div>
        <div className="list">
          {findings.length === 0 ? (
            <div className="note">자동으로 고칠 수 있는 항목이 없습니다.</div>
          ) : (
            findings.map((f) => (
              <label key={f.id} className="list-row">
                <input type="checkbox" defaultChecked />
                <span className="grow">
                  <strong>{f.message}</strong>
                  <br />
                  <span className="muted">{f.url}</span>
                </span>
              </label>
            ))
          )}
        </div>
        <div className="diff-box">
          {`- <img class="hero" src="/img/phone.png">
+ <img class="hero" src="/img/phone.png" alt="">`}
        </div>
        <button
          className="btn primary"
          type="button"
          onClick={() => alert('다음 단계에서 실제 파일 수정을 연결합니다.')}
        >
          백업 후 적용
        </button>
      </main>
    </div>
  );
}
