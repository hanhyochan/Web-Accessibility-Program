import { useEffect, useRef, useState } from 'react';

/** 하단 액션이 뷰포트 밖이면 상단 프라이머리 표시 */
export function useOverflowAction(deps: unknown[] = []) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    const el = bottomRef.current;
    if (!el) {
      setShowTop(false);
      return;
    }
    const check = () => {
      setShowTop(el.getBoundingClientRect().bottom > window.innerHeight);
    };
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    window.addEventListener('resize', check);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', check);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { bottomRef, showTop };
}
