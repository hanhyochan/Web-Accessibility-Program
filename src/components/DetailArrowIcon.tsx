import detailArrow from '../assets/detail-arrow.png';

/** 결과 '자세히' — 사용자가 준 채움 화살표 PNG 그대로 */
export default function DetailArrowIcon() {
  return (
    <img
      className="detail-arrow"
      src={detailArrow}
      alt=""
      width={22}
      height={22}
      draggable={false}
    />
  );
}
