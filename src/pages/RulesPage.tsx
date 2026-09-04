import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageIntro from '../components/PageIntro';
import SelectAllRow from '../components/SelectAllRow';
import StatDash from '../components/StatDash';
import StepHeader from '../components/StepHeader';
import { useIndeterminate } from '../hooks/useIndeterminate';
import { useOverflowAction } from '../hooks/useOverflowAction';
import { GUIDE_ONLY_RULE_IDS } from '../findingsUi';
import { MANUAL_GUIDES } from '../manualGuides';
import { useAppStore } from '../store';
import type { RuleDef } from '../types';

/** 표시용 — 없으면 catalog label 사용 */
const COPY: Record<string, { title: string; desc: string }> = {
  'image-alt': {
    title: 'WA 1. 적절한 대체 텍스트 제공',
    desc: '텍스트 아닌 콘텐츠는 의미·용도를 알 수 있게 대체 텍스트 제공 · 자동(axe)',
  },
  'video-caption': {
    title: 'WA 2. 자막 제공',
    desc: '멀티미디어에 자막·대본·수어 제공 · 자동(axe)',
  },
  'th-has-data-cells': {
    title: 'WA 3. 표의 구성',
    desc: '표는 이해하기 쉽게 구성 · 자동(axe)',
  },
  'wa-04-linear': {
    title: 'WA 4. 콘텐츠의 선형화',
    desc: '콘텐츠는 논리적인 순서로 제공 · 수동',
  },
  'wa-05-instructions': {
    title: 'WA 5. 명확한 지시 사항 제공',
    desc: '지시사항은 모양·크기·위치·방향·색만으로 전달하지 않음 · 수동',
  },
  'wa-06-color-alone': {
    title: 'WA 6. 색에 무관한 콘텐츠 인식',
    desc: '색에 관계없이 인식 가능 · 수동',
  },
  'no-autoplay-audio': {
    title: 'WA 7. 자동 재생 금지',
    desc: '자동으로 소리가 재생되지 않아야 함 · 자동(axe)',
  },
  'color-contrast': {
    title: 'WA 8. 텍스트 콘텐츠의 명도 대비',
    desc: '텍스트와 배경 명도 대비 · 자동(axe)',
  },
  'wa-09-adjacent': {
    title: 'WA 9. 콘텐츠 간의 구분',
    desc: '이웃한 콘텐츠는 구별될 수 있어야 함 · 수동',
  },
  'wa-10-keyboard': {
    title: 'WA 10. 키보드 사용 보장',
    desc: '초점 불가 role·탭 제외 링크 등 확정 가능한 문제 · 커스텀 자동',
  },
  'wa-11-focus': {
    title: 'WA 11. 초점 이동과 표시',
    desc: '양수 tabindex·outline 제거 등 · 커스텀 자동',
  },
  'wa-12-target-size': {
    title: 'WA 12. 조작 가능',
    desc: '클릭 영역 24×24(필수)·44×44(권장) CSS px · 커스텀 자동',
  },
  'wa-13-char-key': {
    title: 'WA 13. 문자단축키',
    desc: '문자 단축키 오동작 방지 · 수동',
  },
  'meta-refresh': {
    title: 'WA 14. 응답시간 조절',
    desc: '시간제한 콘텐츠 응답시간 조절 · 자동(axe meta-refresh)',
  },
  'wa-15-pause': {
    title: 'WA 15. 정지 기능 제공',
    desc: '자동 변경 콘텐츠 움직임 제어 · 수동',
  },
  blink: {
    title: 'WA 16. 깜빡임과 번쩍임 사용 제한',
    desc: '초당 3~50회 깜빡임·번쩍임 제한 · 자동(axe)',
  },
  bypass: {
    title: 'WA 17. 반복 영역 건너뛰기',
    desc: '반복 영역 건너뛰기 수단 · 자동(axe)',
  },
  'document-title': {
    title: 'WA 18. 제목 제공',
    desc: '페이지·프레임·블록에 적절한 제목 · 자동(axe)',
  },
  'page-has-heading-one': {
    title: 'WA 18. 제목 제공 (h1)',
    desc: '페이지 h1 존재 · 자동(axe)',
  },
  'link-name': {
    title: 'WA 19. 적절한 링크 텍스트',
    desc: '링크 텍스트로 용도·목적 이해 · 자동(axe)',
  },
  'wa-20-fixed-ref': {
    title: 'WA 20. 고정된 참조 위치 정보',
    desc: '전자출판 형식 등 고정 참조 위치 · 수동',
  },
  'wa-21-pointer': {
    title: 'WA 21. 단일 포인터 입력 지원',
    desc: '다중·경로 기반 동작은 단일 포인터로도 조작 · 수동',
  },
  'wa-22-pointer-cancel': {
    title: 'WA 22. 포인터 입력 취소',
    desc: '단일 포인터 실행 기능 취소 가능 · 수동',
  },
  'label-content-name-mismatch': {
    title: 'WA 23. 레이블과 네임',
    desc: '보이는 레이블과 접근성 이름 일치 · 자동(axe)',
  },
  'wa-24-motion': {
    title: 'WA 24. 동작기반 작동',
    desc: '동작 기반 작동 대체 수단 · 수동',
  },
  'html-has-lang': {
    title: 'WA 25. 기본 언어 표시',
    desc: '주로 사용하는 언어 명시 · 자동(axe)',
  },
  'wa-26-user-control': {
    title: 'WA 26. 사용자 요구에 따른 실행',
    desc: '의도하지 않은 기능(새 창 등) 방지·제어 · 수동',
  },
  'wa-27-help': {
    title: 'WA 27. 찾기 쉬운 도움 정보',
    desc: '도움 정보가 있으면 찾기 쉽게 · 수동',
  },
  'wa-28-error': {
    title: 'WA 28. 오류 정정',
    desc: '입력 오류 정정 방법 제공 · 수동',
  },
  label: {
    title: 'WA 29. 레이블 제공',
    desc: '사용자 입력에 대응하는 레이블 · 자동(axe)',
  },
  'button-name': {
    title: 'WA 29. 레이블 제공 (button)',
    desc: '버튼 인식 가능 이름 · 자동(axe)',
  },
  'wa-30-auth': {
    title: 'WA 30. 접근 가능한 인증',
    desc: '접근 가능한 인증(검증) · 수동',
  },
  'wa-31-redundant-entry': {
    title: 'WA 31. 반복 입력 정보',
    desc: '반복 입력 정보 자동·선택 입력 · 수동',
  },
  'html-validate-recommended': {
    title: 'WA 32. 마크업 오류 방지',
    desc: '마크업 열고 닫음·중첩·속성 · html-validate 예정',
  },
  'wa-33-webapp': {
    title: 'WA 33. 웹 애플리케이션 접근성 준수',
    desc: '포함 웹앱도 각 항목에서 점검 · 수동',
  },
  'compat-html': {
    title: '호환 1.1 (X)HTML 표준 준수',
    desc: 'W3C Markup · HTML5 문법·중첩·속성 · 수동',
  },
  'compat-css': {
    title: '호환 1.2 CSS 표준 준수',
    desc: 'W3C CSS · 시각 속성 기술표준 · 수동',
  },
  'compat-utf8': {
    title: '호환 1.3 문자(한글) 부호화 준수',
    desc: 'UTF-8 적용 · 수동',
  },
  'compat-js': {
    title: '호환 1.4 제어 기능의 표준 준수',
    desc: 'JS 오류·DOM 경고·의도 동작 · 수동',
  },
  'compat-plugin': {
    title: '호환 1.5 비표준 기술 제거',
    desc: '공공 웹 플러그인 제거 가이드라인 · 수동',
  },
  'compat-func': {
    title: '호환 2.1 기능 호환성 확보',
    desc: 'Chrome·Edge·Whale 등 동등 동작 · 수동',
  },
  'compat-display': {
    title: '호환 2.2 화면표시 호환성 확보',
    desc: '브라우저 간 동등 표현 · 수동',
  },
  'compat-m-func': {
    title: '호환 3.1 모바일 기능 호환성 확보',
    desc: 'iOS·Android 동등 동작(반응형/전용) · 수동',
  },
  'compat-m-display': {
    title: '호환 3.2 모바일 화면표시 호환성 확보',
    desc: '모바일용 화면(PC만이면 감점) · 수동',
  },
  'ko-blank-link-title': {
    title: '새 창 열림 안내',
    desc: 'target=_blank → title·aria-label·숨김 텍스트로 새창열림 · 커스텀 자동',
  },
  'ko-linked-img-empty-alt': {
    title: '컨트롤 이미지 대체 텍스트',
    desc: 'a·button 등 컨트롤에 이미지만 있으면 비어 있지 않은 alt 필수 · 커스텀 자동',
  },
};

function packRules(rules: RuleDef[], pack: string) {
  return rules
    .filter((r) => r.pack === pack)
    .slice()
    .sort((a, b) => Number(a.engine === 'manual') - Number(b.engine === 'manual'));
}

function ruleTitle(r: RuleDef) {
  const copy = COPY[r.id] ?? { title: r.label, desc: r.description || r.id };
  return copy.title.replace(/^WA\s*\d+\.\s*/i, '').replace(/^호환\s*[\d.]+\s*/, '');
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

export default function RulesPage() {
  const navigate = useNavigate();
  const rules = useAppStore((s) => s.rules);
  const toggleRule = useAppStore((s) => s.toggleRule);
  const setPackRulesEnabled = useAppStore((s) => s.setPackRulesEnabled);
  const inventory = useAppStore((s) => s.inventory);
  const a11ySelectAllRef = useRef<HTMLInputElement>(null);
  const compatSelectAllRef = useRef<HTMLInputElement>(null);
  const [openManualId, setOpenManualId] = useState<string | null>(null);
  const enabled = rules.filter((r) => r.enabled && !GUIDE_ONLY_RULE_IDS.has(r.id)).length;
  const pages = inventory.filter((p) => p.included && p.status === 'ok').length;
  const a11yRules = packRules(rules, 'wa-a11y').filter((r) => !GUIDE_ONLY_RULE_IDS.has(r.id));
  const compatRules = packRules(rules, 'wa-compat').filter((r) => !GUIDE_ONLY_RULE_IDS.has(r.id));
  const guideOnlyRules = rules.filter((r) => GUIDE_ONLY_RULE_IDS.has(r.id));
  const a11yEnabled = a11yRules.filter((r) => r.enabled).length;
  const compatEnabled = compatRules.filter((r) => r.enabled).length;
  const a11yAll = a11yRules.length > 0 && a11yEnabled === a11yRules.length;
  const compatAll = compatRules.length > 0 && compatEnabled === compatRules.length;
  const { bottomRef, showTop } = useOverflowAction([
    a11yRules.length,
    compatRules.length,
    guideOnlyRules.length,
    enabled,
  ]);
  useIndeterminate(a11ySelectAllRef, a11yEnabled, a11yRules.length);
  useIndeterminate(compatSelectAllRef, compatEnabled, compatRules.length);

  const renderRule = (r: RuleDef, index: number) => {
    const copy = COPY[r.id] ?? { title: r.label, desc: r.description || r.id };
    const title = ruleTitle(r);
    return (
      <label key={r.id} className="list-row">
        <input type="checkbox" checked={r.enabled} onChange={() => toggleRule(r.id)} />
        <span className="grow">
          <span className="rules-title-row">
            <span className="list-primary">
              {index + 1}. {title}
            </span>
          </span>
          <span className="muted">{copy.desc}</span>
        </span>
      </label>
    );
  };

  const startScan = () => navigate('/scanning');
  const canStart = enabled > 0 && pages > 0;
  const primary = (
    <button className="btn primary" type="button" disabled={!canStart} onClick={startScan}>
      검사 시작
    </button>
  );

  return (
    <div className="app-shell">
      <StepHeader
        active={3}
        onPrev={() => navigate('/inventory')}
        onNext={startScan}
        nextDisabled={!canStart}
      />
      <main className="content stack lg">
        <PageIntro
          title="무엇을 검사할까요?"
          description="한국정보접근성인증평가원 전문가 심사 기준(한국형 웹 콘텐츠 접근성 지침 2.2)과 한국문화정보원 문화정보서비스 통합모니터링 웹호환성 진단 기준(전자정부 웹사이트 품질관리 지침)을 기준으로 검사합니다."
          topAction={showTop ? primary : undefined}
        />
        <StatDash
          items={[
            { label: '웹접근성', count: a11yEnabled },
            { label: '웹호환성', count: compatEnabled },
          ]}
        />
        <div className="rules-columns">
          {(
            [
              {
                title: '웹접근성',
                pack: 'wa-a11y',
                list: a11yRules,
                all: a11yAll,
                ref: a11ySelectAllRef,
              },
              {
                title: '웹호환성',
                pack: 'wa-compat',
                list: compatRules,
                all: compatAll,
                ref: compatSelectAllRef,
              },
            ] as const
          ).map((col) => (
            <div key={col.pack} className="rules-col stack">
              <div className="section-title">{col.title}</div>
              <SelectAllRow
                inputRef={col.ref}
                checked={col.all}
                onChange={(v) => setPackRulesEnabled(col.pack, v)}
                label="전체 선택"
              />
              <div className="list">{col.list.map(renderRule)}</div>
            </div>
          ))}
        </div>

        {guideOnlyRules.length > 0 ? (
          <div className="stack rules-manual-section">
            <div className="section-title">수동 체크 기준</div>
            <p className="muted">
              프로그램이 위반을 자동으로 확정하기 어려운 항목입니다. 펼쳐 확인 방법과 수정·해결
              방안을 보세요. (자동 스캔 오류로는 잡히지 않습니다)
            </p>
            <div className="stack manual-acc-list">
              {guideOnlyRules.map((r) => {
                const open = openManualId === r.id;
                const guide = MANUAL_GUIDES[r.id];
                const title = ruleTitle(r);
                return (
                  <div
                    key={r.id}
                    className={`manual-acc-card${open ? ' is-open' : ''}`}
                  >
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
                            {fix.text ? (
                              <p className="manual-acc-text">{fix.text}</p>
                            ) : null}
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
              })}
            </div>
          </div>
        ) : null}

        <div ref={bottomRef}>{primary}</div>
      </main>
    </div>
  );
}
