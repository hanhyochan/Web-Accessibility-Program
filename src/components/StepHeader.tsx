import { useNavigate } from 'react-router-dom';

const STEPS = [
  { id: 1, label: '설정' },
  { id: 2, label: '페이지' },
  { id: 3, label: '검사항목' },
  { id: 4, label: '검사' },
  { id: 5, label: '결과' },
] as const;

export type ProcessStep = 1 | 2 | 3 | 4 | 5;

type Props = {
  /** 프로세스 단계. 홈 화면이면 null */
  active: ProcessStep | null;
  onPrev?: () => void;
  onNext?: () => void;
  prevDisabled?: boolean;
  nextDisabled?: boolean;
};

function ChevronIcon({ mirrored = false }: { mirrored?: boolean }) {
  return (
    <svg
      width="30"
      height="30"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      style={mirrored ? { transform: 'scaleX(-1)' } : undefined}
    >
      <path
        d="M8 4 L18 12 L8 20"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function StepHeader({
  active,
  onPrev,
  onNext,
  prevDisabled,
  nextDisabled,
}: Props) {
  const navigate = useNavigate();
  const showNav = active !== null;

  return (
    <>
      <header className="topbar">
        <button
          type="button"
          className="brand-home"
          onClick={() => navigate('/')}
          aria-label="홈으로"
        >
          웹접근성 검사기
        </button>

        <nav className="steps-process" aria-label="진행 단계">
          {STEPS.map((s, i) => (
            <span key={s.id} className="step-wrap">
              <span
                className={`step-item${s.id === active ? ' on' : ''}${active !== null && s.id < active ? ' done' : ''}`}
              >
                <span className="step-dot" aria-hidden />
                {s.id}. {s.label}
              </span>
              {i < STEPS.length - 1 && <span className="step-sep" aria-hidden />}
            </span>
          ))}
        </nav>
      </header>

      {showNav && (
        <div className="step-nav">
          <button
            type="button"
            className="nav-arrow"
            aria-label="이전"
            disabled={prevDisabled || !onPrev}
            onClick={onPrev}
          >
            <ChevronIcon mirrored />
          </button>
          <button
            type="button"
            className="nav-arrow"
            aria-label="다음"
            disabled={nextDisabled || !onNext}
            onClick={onNext}
          >
            <ChevronIcon />
          </button>
        </div>
      )}
    </>
  );
}
