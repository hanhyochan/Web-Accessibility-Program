import type { ReactNode } from 'react';

const STEPS = [
  { id: 1, label: '시작' },
  { id: 2, label: '설정' },
  { id: 3, label: '페이지' },
  { id: 4, label: '검사항목' },
  { id: 5, label: '검사' },
  { id: 6, label: '결과' },
] as const;

type Props = {
  active: 1 | 2 | 3 | 4 | 5 | 6;
  rightSlot?: ReactNode;
};

export default function StepHeader({ active, rightSlot }: Props) {
  return (
    <>
      <header className="topbar">
        <h1>웹접근성 검사기</h1>
        {rightSlot ?? <span className="muted">도움말</span>}
      </header>
      <nav className="steps" aria-label="진행 단계">
        {STEPS.map((s, i) => (
          <span key={s.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <span
              className={`step-item${s.id === active ? ' on' : ''}${s.id < active ? ' done' : ''}`}
            >
              <span className="step-dot" aria-hidden />
              {s.id} {s.label}
            </span>
            {i < STEPS.length - 1 && (
              <span className="step-sep" aria-hidden>
                —
              </span>
            )}
          </span>
        ))}
      </nav>
    </>
  );
}
