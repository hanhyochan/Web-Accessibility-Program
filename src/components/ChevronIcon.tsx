type Props = {
  mirrored?: boolean;
  size?: number;
};

/** 이전/다음 네비용 셰브론 */
export default function ChevronIcon({ mirrored = false, size = 30 }: Props) {
  return (
    <svg
      width={size}
      height={size}
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
