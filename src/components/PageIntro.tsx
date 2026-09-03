import type { ReactNode } from 'react';

type Props = {
  title: ReactNode;
  description?: ReactNode;
  /** 상단 프라이머리 (부모가 showTop일 때만 넘김) */
  topAction?: ReactNode;
  className?: string;
};

/** 제목 + (선택) 상단 액션 + 설명 */
export default function PageIntro({ title, description, topAction, className }: Props) {
  return (
    <div className={className}>
      <div className="row between">
        <h2 className="title-xl">{title}</h2>
        {topAction}
      </div>
      {description != null &&
        (typeof description === 'string' || typeof description === 'number' ? (
          <p className="muted">{description}</p>
        ) : (
          description
        ))}
    </div>
  );
}
