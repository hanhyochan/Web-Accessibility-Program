import { useEffect, type RefObject } from 'react';

/** 부분 선택 시 checkbox indeterminate */
export function useIndeterminate(
  ref: RefObject<HTMLInputElement | null>,
  selected: number,
  total: number,
) {
  useEffect(() => {
    if (!ref.current) return;
    ref.current.indeterminate = selected > 0 && selected < total;
  }, [ref, selected, total]);
}
