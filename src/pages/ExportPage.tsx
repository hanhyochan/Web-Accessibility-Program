import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CheckboxStackRow from '../components/CheckboxStackRow';
import PageIntro from '../components/PageIntro';
import StepHeader from '../components/StepHeader';
import { useOverflowAction } from '../hooks/useOverflowAction';
import { useAppStore } from '../store';

export default function ExportPage() {
  const navigate = useNavigate();
  const project = useAppStore((s) => s.project)!;
  const job = useAppStore((s) => s.job);
  const [formats, setFormats] = useState({ pdf: false, csv: false, json: true });
  const { bottomRef, showTop } = useOverflowAction([]);

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

  const options = [
    { key: 'pdf' as const, title: 'PDF', desc: '사람에게 보여 주기 좋은 요약' },
    { key: 'csv' as const, title: '표(CSV)', desc: '엑셀에서 열어 보기' },
    { key: 'json' as const, title: 'JSON', desc: '나중에 다시 불러오기용' },
  ];

  const primary = (
    <button className="btn primary" type="button" onClick={exportNow}>
      받기
    </button>
  );

  return (
    <div className="app-shell">
      <StepHeader active={5} onPrev={() => navigate('/results')} />
      <main className="content mid stack lg">
        <PageIntro
          title="보고서를 받아요"
          description="원하는 형식만 고른 뒤 받아 가세요."
          topAction={showTop ? primary : undefined}
        />
        <div className="list">
          {options.map((opt) => (
            <CheckboxStackRow
              key={opt.key}
              title={opt.title}
              desc={opt.desc}
              checked={formats[opt.key]}
              onChange={() => toggle(opt.key)}
            />
          ))}
        </div>
        <div ref={bottomRef}>{primary}</div>
      </main>
    </div>
  );
}
