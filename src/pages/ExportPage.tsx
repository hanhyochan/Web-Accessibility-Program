import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CheckboxStackRow from '../components/CheckboxStackRow';
import PageIntro from '../components/PageIntro';
import StepHeader from '../components/StepHeader';
import { buildAiFixMarkdown, downloadTextFile } from '../exportAiFixMd';
import { useOverflowAction } from '../hooks/useOverflowAction';
import { useAppStore } from '../store';

export default function ExportPage() {
  const navigate = useNavigate();
  const project = useAppStore((s) => s.project)!;
  const job = useAppStore((s) => s.job);
  const [formats, setFormats] = useState({ pdf: true, json: true, md: true });
  const [busy, setBusy] = useState(false);
  const { bottomRef, showTop } = useOverflowAction([]);

  const toggle = (key: keyof typeof formats) =>
    setFormats((f) => ({ ...f, [key]: !f[key] }));

  const exportNow = async () => {
    if (!formats.pdf && !formats.json && !formats.md) {
      alert('받을 형식을 하나 이상 선택하세요.');
      return;
    }

    const baseName = project.name || 'a11y';
    const exportedAt = new Date().toISOString();
    setBusy(true);
    try {
      if (formats.json) {
        downloadTextFile(
          `${baseName}-report.json`,
          JSON.stringify(
            {
              project: project.name,
              findings: job.findings,
              exportedAt,
            },
            null,
            2,
          ),
          'application/json',
        );
      }

      if (formats.md) {
        const md = buildAiFixMarkdown({
          projectName: project.name,
          startUrl: project.startUrl,
          exportedAt,
          findings: job.findings,
        });
        downloadTextFile(`${baseName}-ai-fix.md`, md, 'text/markdown;charset=utf-8');
      }

      if (formats.pdf) {
        if (!window.a11y?.exportPdf) {
          alert('PDF 저장은 Electron 앱에서만 가능합니다.');
          return;
        }
        const result = await window.a11y.exportPdf({
          projectName: project.name,
          fileName: `${baseName}-report.pdf`,
          findings: job.findings,
          exportedAt,
        });
        if (result.canceled) return;
        if (!result.ok) {
          alert(`PDF 저장 실패: ${result.error || '알 수 없는 오류'}`);
        }
      }
    } finally {
      setBusy(false);
    }
  };

  const options = [
    { key: 'pdf' as const, title: 'PDF', desc: '사람에게 보여 주기 좋은 요약' },
    { key: 'json' as const, title: 'JSON', desc: '나중에 다시 불러오기용' },
    {
      key: 'md' as const,
      title: 'Markdown (AI 수정용)',
      desc: 'AI에 넣어 해당 오류만 고치게 하는 지시서',
    },
  ];

  const primary = (
    <button className="btn primary" type="button" disabled={busy} onClick={() => void exportNow()}>
      {busy ? '저장 중…' : '받기'}
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
