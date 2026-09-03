import { useNavigate } from 'react-router-dom';
import DetailArrowIcon from '../components/DetailArrowIcon';
import PageIntro from '../components/PageIntro';
import StepHeader from '../components/StepHeader';
import StatDash from '../components/StatDash';
import { formatCountUnit } from '../format';
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

  const critical = job.findings.filter((f) => f.impact === 'critical').length;
  const serious = job.findings.filter((f) => f.impact === 'serious').length;
  const other = Math.max(0, job.findings.length - critical - serious);

  return (
    <div className="app-shell">
      <StepHeader active={5} onPrev={() => navigate('/rules')} />
      <main className="content stack lg">
        <PageIntro
          title="검사 결과"
          description={
            job.findings.length === 0
              ? '지금은 표시할 문제가 없습니다.'
              : `고치면 좋은 항목이 ${formatCountUnit(job.findings.length)} 있습니다. 아래부터 보면 됩니다.`
          }
        />
        <StatDash
          items={[
            { label: '필수확인 오류', count: critical, tone: 'critical' },
            { label: '권장', count: serious, tone: 'warn' },
            { label: '참고', count: other, tone: 'note' },
          ]}
        />
        <div className="list">
          {job.findings.map((f) => (
            <button
              key={f.id}
              type="button"
              className="list-row clickable"
              onClick={() => navigate(`/findings/${encodeURIComponent(f.id)}`)}
            >
              <span className="grow list-stack">
                <span className="list-primary">{TITLE[f.ruleId] || f.message}</span>
                <span className="muted">{shortPath(f.url)}</span>
              </span>
              <span className="list-chevron" aria-hidden>
                <DetailArrowIcon />
              </span>
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
