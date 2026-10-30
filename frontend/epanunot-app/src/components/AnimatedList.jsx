import { useLayoutEffect, useRef } from 'react';

export default function AnimatedList({ children, className }) {
  const listRef = useRef(null);
  const positions = useRef(new Map());
  useLayoutEffect(() => {
    const list = listRef.current;
    const rows = [...list.children];
    rows.forEach((row) => row.getAnimations().forEach((animation) => animation.cancel()));
    const origin = list.getBoundingClientRect().top;
    const next = new Map();
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    rows.forEach((row) => {
      const key = row.dataset.sortId;
      const top = row.getBoundingClientRect().top - origin;
      const previous = positions.current.get(key);
      next.set(key, top);
      if (!reducedMotion && previous !== undefined && Math.abs(previous - top) > 1) {
        row.animate([{ transform: `translateY(${previous - top}px)` }, { transform: 'translateY(0)' }],
          { duration: 280, easing: 'cubic-bezier(.2,.7,.2,1)' });
      }
    });
    positions.current = next;
  });
  return <ul ref={listRef} className={className}>{children}</ul>;
}
