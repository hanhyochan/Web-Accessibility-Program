/** 천 단위 쉼표 (예: 1234 → 1,234) */
export function formatCount(n: number): string {
  return Math.max(0, Math.floor(n)).toLocaleString('ko-KR');
}

/** 예: 1,234개 */
export function formatCountUnit(n: number, unit = '개'): string {
  return `${formatCount(n)}${unit}`;
}
