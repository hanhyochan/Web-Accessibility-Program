import { useNavigate } from 'react-router-dom';
import DetailArrowIcon from '../components/DetailArrowIcon';
import PageIntro from '../components/PageIntro';
import StepHeader from '../components/StepHeader';
import StatDash from '../components/StatDash';
import { findingTitle, impactChip, impactTone } from '../findingsUi';
import { formatCountUnit } from '../format';
import { useAppStore } from '../store';
import type { Finding } from '../types';

function groupByUrl(findings: Finding[]) {
  const map = new Map<string, Finding[]>();
  for (const f of findings) {
    const list = map.get(f.url);
    if (list) list.push(f);
    else map.set(f.url, [f]);
  }
  return Array.from(map.entries()).map(([url, items]) => ({ url, items }));
}

/** 목록용: 같은 규칙 오류는 한 번만 (가장 높은 심각도 유지) */
function uniqueFindingsByRule(items: Finding[]): Finding[] {
  const rank = (impact: string) =>
    impact === 'critical' ? 3 : impact === 'serious' ? 2 : impact === 'moderate' ? 1 : 0;
  const best = new Map<string, Finding>();
  for (const f of items) {
    const prev = best.get(f.ruleId);
    if (!prev || rank(f.impact) > rank(prev.impact)) best.set(f.ruleId, f);
  }
  return Array.from(best.values());
}

export default function ResultsPage() {
  const navigate = useNavigate();
  const job = useAppStore((s) => s.job);

  const critical = job.findings.filter((f) => f.impact === 'critical').length;
  const serious = job.findings.filter((f) => f.impact === 'serious').length;
  const other = Math.max(0, job.findings.length - critical - serious);
  const pages = groupByUrl(job.findings);

  return (
    <div className="app-shell">
      <StepHeader active={5} onPrev={() => navigate('/rules')} />
      <main className="content stack lg">
        <PageIntro
          title="검사 결과"
          description={
            job.findings.length === 0
              ? '지금은 표시할 문제가 없습니다.'
              : `페이지 ${formatCountUnit(pages.length)} · 오류 ${formatCountUnit(job.findings.length)}. 페이지를 눌러 자세히 보세요.`
          }
        />
        <StatDash
          items={[
            { label: '필수확인 오류', count: critical, tone: 'critical' },
            { label: '권장', count: serious, tone: 'warn' },
            { label: '참고', count: other, tone: 'note' },
          ]}
        />
        <div className="result-page-list">
          {pages.map(({ url, items }) => (
            <button
              key={url}
              type="button"
              className="result-page-card"
              onClick={() => navigate(`/results/page/${encodeURIComponent(url)}`)}
            >
              <div className="result-page-head">
                <span className="list-primary result-url-title">{url}</span>
                <span className="result-page-count">{formatCountUnit(items.length)}</span>
              </div>
              <span className="result-page-arrow list-chevron" aria-hidden>
                <DetailArrowIcon />
              </span>
              <div className="result-error-rows">
                {uniqueFindingsByRule(items).map((f) => (
                  <div key={f.ruleId} className="result-error-pill">
                    <span className={`result-chip tone-${impactTone(f.impact)}`}>
                      {impactChip(f.impact)}
                    </span>
                    <span className="result-error-title">{findingTitle(f.ruleId, f.message)}</span>
                  </div>
                ))}
              </div>
            </button>
          ))}
        </div>
        <div className="row">
          <button className="btn" type="button" onClick={() => navigate('/export')}>
            보고서 받기
          </button>
        </div>
      </main>
    </div>
  );
}
