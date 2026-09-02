import { useNavigate } from 'react-router-dom';
import StepHeader from '../components/StepHeader';
import { useAppStore } from '../store';

/** 사용자용 쉬운 설명 — 기술 ID는 보조로만 */
const COPY: Record<string, { title: string; desc: string }> = {
  'image-alt': {
    title: '이미지에 대체 텍스트가 있나요',
    desc: '그림·사진을 눈으로 못 보는 분도 내용을 알 수 있게',
  },
  'link-name': {
    title: '링크 이름만 들어도 어디인지 알 수 있나요',
    desc: '"여기 클릭"처럼 모호한 링크 찾기',
  },
  'ko-blank-link-title': {
    title: '새 창으로 열리는 링크에 안내가 있나요',
    desc: '새 창이 뜬다는 안내가 있는지',
  },
  label: {
    title: '입력칸에 이름이 붙어 있나요',
    desc: '폼 입력란과 설명 연결',
  },
  'button-name': {
    title: '버튼에 이름이 있나요',
    desc: '빈 버튼·아이콘만 있는 버튼 찾기',
  },
  'html-has-lang': {
    title: '페이지 언어가 표시되어 있나요',
    desc: 'html lang 속성',
  },
  'document-title': {
    title: '브라우저 탭 제목이 있나요',
    desc: '문서 title',
  },
  'color-contrast': {
    title: '글자와 배경 색 대비가 충분한가요',
    desc: '선택 항목',
  },
  'heading-order': {
    title: '제목 순서가 자연스러운가요',
    desc: '선택 항목',
  },
  'html-validate-recommended': {
    title: 'HTML 문법이 올바른가요',
    desc: '웹호환성(문법) 검사',
  },
};

export default function RulesPage() {
  const navigate = useNavigate();
  const rules = useAppStore((s) => s.rules);
  const toggleRule = useAppStore((s) => s.toggleRule);
  const inventory = useAppStore((s) => s.inventory);
  const enabled = rules.filter((r) => r.enabled).length;
  const pages = inventory.filter((p) => p.included).length;

  return (
    <div className="app-shell">
      <StepHeader active={4} />
      <main className="content stack lg">
        <div>
          <h2 className="title-xl">무엇을 검사할까요?</h2>
          <p className="muted">
            추천 항목은 이미 켜져 있습니다. 잘 모르겠으면 그대로 두고 검사를 시작하세요.
          </p>
        </div>
        <div className="note">
          추천 세트: 기본 {enabled}개 선택됨 · 검사 페이지 {pages}개
        </div>
        <div className="list">
          {rules.map((r) => {
            const copy = COPY[r.id] ?? { title: r.label, desc: r.description || r.id };
            return (
              <label key={r.id} className="list-row">
                <input
                  type="checkbox"
                  checked={r.enabled}
                  onChange={() => toggleRule(r.id)}
                />
                <span className="grow">
                  <strong>{copy.title}</strong>
                  <br />
                  <span className="muted">{copy.desc}</span>
                </span>
              </label>
            );
          })}
        </div>
        <div className="footer-nav">
          <div className="row">
            <button className="btn" type="button" onClick={() => navigate('/inventory')}>
              ← 이전
            </button>
            <button
              className="btn"
              type="button"
              onClick={() =>
                alert('추가 항목·커스텀은 다음 버전에서 이어갑니다. 지금은 목록에서 골라 주세요.')
              }
            >
              항목 더 보기
            </button>
          </div>
          <button
            className="btn primary"
            type="button"
            disabled={enabled === 0 || pages === 0}
            onClick={() => navigate('/scanning')}
          >
            검사 시작
          </button>
        </div>
      </main>
    </div>
  );
}
