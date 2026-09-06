import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DetailArrowIcon from '../components/DetailArrowIcon';
import PageIntro from '../components/PageIntro';
import ScrollTopButton from '../components/ScrollTopButton';
import StepHeader from '../components/StepHeader';
import StatDash from '../components/StatDash';
import { findingTitle, GUIDE_ONLY_RULE_IDS, impactChip, impactTone } from '../findingsUi';
import { formatCountUnit } from '../format';
import { useOverflowAction } from '../hooks/useOverflowAction';
import { MANUAL_GUIDES } from '../manualGuides';
import { useAppStore } from '../store';
import type { Finding, RuleDef } from '../types';

function ruleTitle(r: RuleDef) {
  return r.label.replace(/^WA\s*\d+\.\s*/i, '').replace(/^호환\s*[\d.]+\s*/, '');
}

function AccordionChevron({ open }: { open: boolean }) {
  return (
    <svg
      className={`manual-acc-chevron${open ? ' is-open' : ''}`}
      width="20"
      height="20"
      viewBox="0 0 20 20"
      aria-hidden
    >
      <path
        d="M5 7.5 L10 12.5 L15 7.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

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
  const rules = useAppStore((s) => s.rules);
  const completedManualRuleIds = useAppStore((s) => s.completedManualRuleIds);
  const completeManualCheck = useAppStore((s) => s.completeManualCheck);
  const [openManualId, setOpenManualId] = useState<string | null>(null);

  const critical = job.findings.filter((f) => f.impact === 'critical').length;
  const serious = job.findings.filter((f) => f.impact === 'serious').length;
  const other = Math.max(0, job.findings.length - critical - serious);
  const pages = groupByUrl(job.findings);
  const doneManual = new Set(completedManualRuleIds);
  const guideOnlyRules = rules.filter((r) => GUIDE_ONLY_RULE_IDS.has(r.id));
  const pendingManual = guideOnlyRules.filter((r) => !doneManual.has(r.id));
  const completedManual = completedManualRuleIds
    .map((id) => guideOnlyRules.find((r) => r.id === id))
    .filter((r): r is RuleDef => !!r);
  const { bottomRef, showTop } = useOverflowAction([
    pages.length,
    pendingManual.length,
    completedManual.length,
    openManualId,
  ]);

  const renderManualCard = (r: RuleDef, done: boolean) => {
    const open = openManualId === r.id;
    const guide = MANUAL_GUIDES[r.id];
    const title = ruleTitle(r);
    return (
      <div
        key={r.id}
        className={`manual-acc-card${open ? ' is-open' : ''}${done ? ' is-done' : ''}`}
      >
        <div className="manual-acc-row">
          <input
            type="checkbox"
            checked={done}
            disabled={done}
            aria-label={`${title} 수동 검사 완료`}
            onChange={(e) => {
              if (e.target.checked) {
                if (open) setOpenManualId(null);
                completeManualCheck(r.id);
              }
            }}
          />
          <button
            type="button"
            className="manual-acc-head"
            aria-expanded={open}
            onClick={() => setOpenManualId(open ? null : r.id)}
          >
            <span className="list-primary manual-acc-title">{title}</span>
            <span className="manual-acc-arrow" aria-hidden>
              <AccordionChevron open={open} />
            </span>
          </button>
        </div>
        {open && guide ? (
          <div className="manual-acc-body stack">
            <div className="result-finding-meta">
              <strong>확인 방법</strong>
              <ul className="manual-acc-bullets">
                {guide.check.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
            {guide.fixes.map((fix) => (
              <div key={fix.label} className="result-finding-meta">
                <strong>{fix.label}</strong>
                {fix.text ? <p className="manual-acc-text">{fix.text}</p> : null}
                {fix.code ? (
                  <div className="result-error-pill result-code-box result-code-fix">
                    {fix.code}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        ) : open ? (
          <div className="manual-acc-body">
            <p className="muted">가이드 내용이 아직 없습니다.</p>
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <div className="app-shell">
      {showTop && guideOnlyRules.length > 0 ? (
        <div className="scroll-top-layer">
          <button
            type="button"
            className="scroll-top scroll-top-manual"
            aria-label="수동 체크 구간으로"
            onClick={() =>
              document
                .getElementById('manual-check')
                ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }
          >
            수동
            <br />
            체크
          </button>
        </div>
      ) : null}
      <ScrollTopButton show={showTop} />
      <StepHeader active={5} onPrev={() => navigate('/rules')} />
      <main className="content stack lg">
        <PageIntro
          title="검사 결과"
          description={
            job.status === 'error' && job.note
              ? job.note
              : job.findings.length === 0
                ? '지금은 표시할 문제가 없습니다.'
                : `페이지 ${formatCountUnit(pages.length)} · 오류 ${formatCountUnit(job.findings.length)}. 화살표를 눌러 자세히 보세요.`
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
            <div key={url} className="result-page-card">
              <div className="result-page-head">
                <span className="list-primary result-url-title">{url}</span>
                <span className="result-page-count">{formatCountUnit(items.length)}</span>
              </div>
              <button
                type="button"
                className="result-page-arrow list-chevron"
                aria-label="자세히 보기"
                onClick={() => navigate(`/results/page/${encodeURIComponent(url)}`)}
              >
                <DetailArrowIcon />
              </button>
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
            </div>
          ))}
        </div>
        {guideOnlyRules.length > 0 ? (
          <div id="manual-check" className="stack rules-manual-section">
            {pendingManual.length > 0 ? (
              <>
                <div className="section-title">수동 체크 기준</div>
                <p className="muted">
                  프로그램이 위반을 자동으로 확정하기 어려운 항목입니다. 펼쳐 확인 방법과 수정·해결
                  방안을 보세요. 검사를 마치면 체크하세요.
                </p>
                {(
                  [
                    { title: '웹접근성', list: pendingManual.filter((r) => r.pack === 'wa-a11y') },
                    { title: '웹호환성', list: pendingManual.filter((r) => r.pack === 'wa-compat') },
                  ] as const
                ).map((group) =>
                  group.list.length === 0 ? null : (
                    <div key={group.title} className="stack">
                      <div className="section-title">{group.title}</div>
                      <div className="stack manual-acc-list">
                        {group.list.map((r) => renderManualCard(r, false))}
                      </div>
                    </div>
                  ),
                )}
              </>
            ) : null}
            {completedManual.length > 0 ? (
              <div className="stack">
                <div className="section-title">수동 체크 완료</div>
                <div className="stack manual-acc-list">
                  {completedManual.map((r) => renderManualCard(r, true))}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
        <div className="row" ref={bottomRef}>
          <button className="btn" type="button" onClick={() => navigate('/export')}>
            파일 받기
          </button>
        </div>
      </main>
    </div>
  );
}
