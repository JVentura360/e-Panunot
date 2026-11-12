import { useEffect, useRef, useState } from 'react';
import { tutorialCards } from './tutorialCards.js';
import styles from './Tutorial.module.css';

const ICONS = {
  tasks: <><rect x="3" y="4" width="18" height="17" rx="3" /><path d="M8 2v4M16 2v4M3 10h18" /><path d="m9 15 2 2 4-4" /></>,
  bell: <><path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8" /><path d="M10 20a2 2 0 0 0 4 0" /></>,
  chat: <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" />,
  join: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" /><path d="M16 5a3.5 3.5 0 0 1 0 7M18 14.5c2 .7 3.5 2.4 3.5 5.5" /></>,
  assign: <><rect x="5" y="4" width="14" height="17" rx="3" /><path d="M9 4V3h6v1" /><path d="M12 9v7M8.5 12.5h7" /></>,
  megaphone: <><path d="M3 10v4h4l7 4V6L7 10z" /><path d="M17 9a4 4 0 0 1 0 6" /></>,
  manage: <><path d="M12 3l8 3v6c0 4.5-3.2 8-8 9-4.8-1-8-4.5-8-9V6z" /><path d="m9 12 2 2 4-4" /></>,
};

function Icon({ name }) {
  return (
    <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor"
      strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ICONS[name]}
    </svg>
  );
}

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export default function Tutorial({ role = 'student', onDone }) {
  const cards = tutorialCards[role] ?? tutorialCards.student;
  const [index, setIndex] = useState(0);
  const rootRef = useRef(null);
  const scrollerRef = useRef(null);
  const primaryRef = useRef(null);
  const frame = useRef(0);
  const last = index === cards.length - 1;

  // Lock page scroll, move focus in, and put it back when the overlay closes.
  useEffect(() => {
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    primaryRef.current?.focus();
    return () => {
      cancelAnimationFrame(frame.current);
      document.body.style.overflow = previousOverflow;
      if (previousFocus instanceof HTMLElement) previousFocus.focus();
    };
  }, []);

  // Swiping is native scroll-snap. We just read the position to know which card is showing.
  const onScroll = () => {
    if (frame.current) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = 0;
      const el = scrollerRef.current;
      if (el && el.clientWidth) setIndex(Math.round(el.scrollLeft / el.clientWidth));
    });
  };

  const goTo = (next) => {
    const el = scrollerRef.current;
    if (!el) return;
    const target = Math.max(0, Math.min(cards.length - 1, next));
    el.scrollTo({ left: target * el.clientWidth, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    setIndex(target);
  };

  const onKeyDown = (event) => {
    if (event.key === 'Escape') { event.preventDefault(); onDone(); return; }
    if (event.key === 'ArrowRight') { event.preventDefault(); goTo(index + 1); return; }
    if (event.key === 'ArrowLeft') { event.preventDefault(); goTo(index - 1); return; }
    if (event.key !== 'Tab') return;
    const nodes = [...rootRef.current.querySelectorAll('button:not([disabled])')];
    if (!nodes.length) return;
    const first = nodes[0];
    const final = nodes[nodes.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); final.focus(); }
    else if (!event.shiftKey && document.activeElement === final) { event.preventDefault(); first.focus(); }
  };

  return (
    <div ref={rootRef} className={styles.overlay} role="dialog" aria-modal="true"
      aria-label="How ePanunot works" onKeyDown={onKeyDown}>
      <div className={styles.top}>
        {!last && <button type="button" className={styles.skip} onClick={onDone}>Skip</button>}
      </div>

      <div ref={scrollerRef} className={styles.scroller} onScroll={onScroll}>
        {cards.map((card, i) => (
          <section key={card.id} className={styles.card} role="group" aria-roledescription="slide"
            aria-label={`${i + 1} of ${cards.length}`} aria-hidden={i !== index}>
            <div className={styles.icon}><Icon name={card.icon} /></div>
            <h2 className={styles.title}>{card.title}</h2>
            <p className={styles.body}>{card.body}</p>
          </section>
        ))}
      </div>

      <div className={styles.footer}>
        <div className={styles.dots}>
          {cards.map((card, i) => (
            <button key={card.id} type="button" className={styles.dot}
              aria-label={`Go to card ${i + 1}`} aria-current={i === index} onClick={() => goTo(i)} />
          ))}
        </div>
        <button ref={primaryRef} type="button" className={`btn ${styles.next}`}
          onClick={() => (last ? onDone() : goTo(index + 1))}>
          {last ? 'Get started' : 'Next'}
        </button>
      </div>
    </div>
  );
}