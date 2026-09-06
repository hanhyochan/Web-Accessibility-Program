import DetailArrowIcon from './DetailArrowIcon';

type Props = { show: boolean };

/** 하단이 뷰포트 밖일 때 오른쪽 아래 — 맨 위로 */
export default function ScrollTopButton({ show }: Props) {
  if (!show) return null;
  return (
    <div className="scroll-top-layer">
      <button
        type="button"
        className="scroll-top"
        aria-label="맨 위로"
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      >
        <span className="scroll-top-icon">
          <DetailArrowIcon />
        </span>
      </button>
    </div>
  );
}
