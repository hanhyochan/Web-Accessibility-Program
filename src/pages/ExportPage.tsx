import { useState } from 'react';
import { Link } from 'react-router-dom';
import StepHeader from '../components/StepHeader';
import { useAppStore } from '../store';

export default function ExportPage() {
  const project = useAppStore((s) => s.project)!;
  const job = useAppStore((s) => s.job);
  const [formats, setFormats] = useState({ pdf: false, csv: false, json: true });

  const toggle = (key: keyof typeof formats) =>
    setFormats((f) => ({ ...f, [key]: !f[key] }));

  const exportNow = () => {
    const payload = {
      project: project.name,
      findings: job.findings,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name || 'a11y'}-report.json`;
    a.click();
    URL.revokeObjectURL(url);
    if (formats.pdf || formats.csv) {
      alert('PDF/CSV는 다음 단계에서 추가합니다. 지금은 JSON을 저장했습니다.');
    }
  };

  return (
    <div className="app-shell">
      <StepHeader active={6} />
      <main className="content stack lg" style={{ maxWidth: 800 }}>
        <div>
          <h2 className="title-xl">보고서를 받아요</h2>
          <p className="muted">원하는 형식만 고른 뒤 받아 가세요.</p>
        </div>
        <div className="list">
          <label className="list-row">
            <input type="checkbox" checked={formats.pdf} onChange={() => toggle('pdf')} />
            <span>
              <strong>PDF</strong>
              <br />
              <span className="muted">사람에게 보여 주기 좋은 요약</span>
            </span>
          </label>
          <label className="list-row">
            <input type="checkbox" checked={formats.csv} onChange={() => toggle('csv')} />
            <span>
              <strong>표(CSV)</strong>
              <br />
              <span className="muted">엑셀에서 열어 보기</span>
            </span>
          </label>
          <label className="list-row">
            <input type="checkbox" checked={formats.json} onChange={() => toggle('json')} />
            <span>
              <strong>JSON</strong>
              <br />
              <span className="muted">나중에 다시 불러오기용</span>
            </span>
          </label>
        </div>
        <div className="footer-nav">
          <Link className="btn" to="/results">
            ← 결과로
          </Link>
          <button className="btn primary" type="button" onClick={exportNow}>
            받기
          </button>
        </div>
      </main>
    </div>
  );
}
