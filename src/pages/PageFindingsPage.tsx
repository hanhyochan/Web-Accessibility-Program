import { useNavigate, useParams } from 'react-router-dom';
import PageIntro from '../components/PageIntro';
import StepHeader from '../components/StepHeader';
import {
  alternativeFixes,
  findingTitle,
  groupFindingsByObject,
  highlightErrorCode,
  impactChip,
  impactTone,
  isMethodOnlyFix,
  manualCheckTip,
  primaryFixLabel,
  suggestFixedHtmlAll,
  worstImpact,
} from '../findingsUi';
import { formatCountUnit } from '../format';
import { useAppStore } from '../store';

export default function PageFindingsPage() {
  const { pageKey } = useParams();
  const navigate = useNavigate();
  const allFindings = useAppStore((s) => s.job.findings);
  const url = pageKey ? decodeURIComponent(pageKey) : '';
  const findings = allFindings.filter((f) => f.url === url);
  const groups = groupFindingsByObject(findings);

  if (!url || findings.length === 0) {
    return (
      <div className="app-shell">
        <StepHeader active={5} onPrev={() => navigate('/results')} />
        <main className="content">
          <p>이 페이지의 검사 항목을 찾을 수 없습니다.</p>
        </main>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <StepHeader active={5} onPrev={() => navigate('/results')} />
      <main className="content stack lg">
        <PageIntro
          title={<span className="result-url-title">{url}</span>}
          description={`${formatCountUnit(findings.length)}의 오류 · 대상 ${formatCountUnit(groups.length)}. 오브젝트별로 위치와 수정 예시를 확인하세요.`}
        />
        <div className="stack result-finding-list">
          {groups.map((g) => {
            const methodOnly = g.ruleIds.every(isMethodOnlyFix);
            const fixed = suggestFixedHtmlAll(g.ruleIds, g.htmlSnippet);
            const fixLabel = primaryFixLabel(g.ruleIds);
            const alts = alternativeFixes(g.ruleIds, g.htmlSnippet);
            const tip = manualCheckTip(g.ruleIds);
            const chipImpact = worstImpact(g.findings.map((f) => f.impact));
            return (
              <article key={g.key} className="result-finding-card stack">
                <span className={`result-chip tone-${impactTone(chipImpact)}`}>
                  {impactChip(chipImpact)}
                </span>

                {g.locationLabel ? (
                  <p className="result-finding-location">위치: {g.locationLabel}</p>
                ) : null}

                {g.htmlSnippet ? (
                  <div
                    className="result-error-pill result-code-box"
                    dangerouslySetInnerHTML={{
                      __html: highlightErrorCode(g.ruleIds, g.htmlSnippet),
                    }}
                  />
                ) : g.findings.some((f) => f.message.startsWith('페이지 검사 실패')) ? (
                  <p className="muted">페이지를 여는 중 검사가 중단된 기록입니다.</p>
                ) : null}

                <div className="result-object-errors">
                  {g.findings.map((f, i) => (
                    <div key={f.id} className="result-object-error">
                      <span className="result-object-error-title">
                        {i + 1}. {findingTitle(f.ruleId, f.message)}
                      </span>
                    </div>
                  ))}
                </div>

                {(g.htmlSnippet || methodOnly) && (
                  <div className="result-finding-meta">
                    <strong>수정 예시</strong>
                    <div className="result-alt-item">
                      <p className="result-alt-label">{fixLabel}</p>
                      {!methodOnly && fixed ? (
                        <div className="result-error-pill result-code-box result-code-fix">
                          {fixed}
                        </div>
                      ) : null}
                    </div>
                  </div>
                )}

                {alts.length > 0 ? (
                  <div className="result-finding-meta">
                    <strong>다른 해결 방법</strong>
                    <div className="result-alt-list">
                      {alts.map((alt) => (
                        <div key={alt.label} className="result-alt-item">
                          <p className="result-alt-label">{alt.label}</p>
                          <div className="result-error-pill result-code-box result-code-fix">
                            {alt.code}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {tip ? <p className="result-manual-tip">{tip}</p> : null}
              </article>
            );
          })}
        </div>
      </main>
    </div>
  );
}
