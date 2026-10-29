import { useId, useLayoutEffect, useRef, useState } from 'react';
import { dateKey, monthDays, parseDate } from './datePickerUtils';
import styles from './DatePicker.module.css';

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTH_FORMAT = new Intl.DateTimeFormat('en-PH', { month: 'long', year: 'numeric' });
const DAY_FORMAT = new Intl.DateTimeFormat('en-PH', { dateStyle: 'full' });

export default function DatePicker({ value = '', onChange, onInput, className = '', ...props }) {
  const popupId = useId();
  const inputRef = useRef(null);
  const popupRef = useRef(null);
  const triggerRef = useRef(null);
  const [view, setView] = useState(() => parseDate(value) || new Date());
  const [open, setOpen] = useState(false);
  const [focusedKey, setFocusedKey] = useState(value || dateKey(new Date()));
  const todayKey = dateKey(new Date());
  const allowed = (key) => (!props.min || key >= props.min) && (!props.max || key <= props.max);

  useLayoutEffect(() => {
    if (!open) return;
    const panel = popupRef.current;
    const position = () => {
      const bounds = inputRef.current.getBoundingClientRect();
      const width = panel.offsetWidth;
      const height = panel.offsetHeight;
      const viewport = window.visualViewport;
      const viewportTop = viewport?.offsetTop || 0;
      const viewportBottom = viewportTop + (viewport?.height || window.innerHeight);
      const below = bounds.bottom + 8;
      const top = below + height <= viewportBottom - 12 ? below : bounds.top - height - 8;
      panel.style.left = `${Math.max(12, Math.min(bounds.left, window.innerWidth - width - 12))}px`;
      panel.style.top = `${Math.max(viewportTop + 12, Math.min(top, viewportBottom - height - 12))}px`;
    };
    position();
    const focusFrame = requestAnimationFrame(() => {
      const selected = panel.querySelector('[aria-selected="true"] button:not(:disabled)');
      const today = panel.querySelector('[aria-current="date"]:not(:disabled)');
      (selected || today || panel.querySelector('td button:not(:disabled)'))?.focus();
    });
    window.addEventListener('resize', position);
    window.addEventListener('scroll', position, true);
    window.visualViewport?.addEventListener('resize', position);
    return () => {
      cancelAnimationFrame(focusFrame);
      window.removeEventListener('resize', position);
      window.removeEventListener('scroll', position, true);
      window.visualViewport?.removeEventListener('resize', position);
    };
  }, [open]);

  const choose = (key) => {
    const input = inputRef.current;
    input.value = key;
    input.setCustomValidity('');
    const event = { target: input, currentTarget: input };
    onInput?.(event);
    onChange?.(event);
    popupRef.current.hidePopover();
    triggerRef.current.focus();
  };

  const moveFocus = (event, day) => {
    const jumps = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7, Home: -day.getDay(), End: 6 - day.getDay() };
    let target;
    if (event.key in jumps) target = new Date(day.getFullYear(), day.getMonth(), day.getDate() + jumps[event.key]);
    else if (event.key === 'PageUp' || event.key === 'PageDown') {
      const month = day.getMonth() + (event.key === 'PageUp' ? -1 : 1);
      const lastDay = new Date(day.getFullYear(), month + 1, 0).getDate();
      target = new Date(day.getFullYear(), month, Math.min(day.getDate(), lastDay));
    } else return;
    event.preventDefault();
    const key = dateKey(target);
    if (!allowed(key)) return;
    if (target.getMonth() !== view.getMonth() || target.getFullYear() !== view.getFullYear()) setView(target);
    requestAnimationFrame(() => popupRef.current?.querySelector(`[data-date="${key}"]`)?.focus());
  };

  const days = monthDays(view);
  const tabStop = days.some((day) => dateKey(day) === focusedKey && allowed(focusedKey))
    ? focusedKey : dateKey(days.find((day) => day.getMonth() === view.getMonth() && allowed(dateKey(day))) || days[0]);
  return <div className={styles.field}>
    <input {...props} ref={inputRef} type="date" value={value} onChange={onChange} onInput={onInput} className={`${className} ${styles.input}`} />
    <button ref={triggerRef} type="button" disabled={props.disabled} className={styles.trigger}
      aria-label="Choose date" aria-haspopup="dialog" aria-controls={popupId} aria-expanded={open}
      popoverTarget={popupId} onClick={() => setView(parseDate(value) || new Date())}>
      <svg className={styles.calendarIcon} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="3" width="18" height="19" rx="4" />
        <path d="M6 2v3M9 2v3M12 2v3M15 2v3M18 2v3M3 8h18" />
        <g fill="currentColor" stroke="none">
          {[11, 15, 19].map((y) => [7, 11, 15].map((x) => (
            <rect key={`${x}-${y}`} x={x} y={y} width="2" height="2" />
          )))}
        </g>
      </svg>
    </button>
    <div id={popupId} ref={popupRef} popover="auto" role="dialog" aria-label="Choose a date" className={styles.popup}
      onToggle={(event) => setOpen(event.newState === 'open')}>
      <div className={styles.heading}>
        <span aria-live="polite">{MONTH_FORMAT.format(view)}</span>
        <div className={styles.monthNav}>
          <button type="button" aria-label="Previous month" onClick={() => setView(new Date(view.getFullYear(), view.getMonth() - 1, 1))}>‹</button>
          <button type="button" aria-label="Next month" onClick={() => setView(new Date(view.getFullYear(), view.getMonth() + 1, 1))}>›</button>
        </div>
      </div>
      <table role="grid" aria-label={MONTH_FORMAT.format(view)} className={styles.grid}>
        <thead><tr>{WEEKDAYS.map((name) => <th key={name} scope="col">{name}</th>)}</tr></thead>
        <tbody>{Array.from({ length: 6 }, (_, row) => <tr key={row}>
          {days.slice(row * 7, row * 7 + 7).map((day) => {
            const key = dateKey(day);
            return <td key={key} aria-selected={key === value}>
              <button type="button" data-date={key} aria-label={DAY_FORMAT.format(day)} aria-current={key === todayKey ? 'date' : undefined}
                tabIndex={key === tabStop ? 0 : -1} onFocus={() => setFocusedKey(key)}
                disabled={!allowed(key)} className={`${styles.day} ${day.getMonth() !== view.getMonth() ? styles.outside : ''} ${key === value ? styles.selected : ''}`}
                onClick={() => choose(key)} onKeyDown={(event) => moveFocus(event, day)}>{day.getDate()}</button>
            </td>;
          })}
        </tr>)}</tbody>
      </table>
      <div className={styles.footer}>
        <button type="button" disabled={!value} onClick={() => choose('')}>Clear</button>
        <button type="button" disabled={!allowed(todayKey)} onClick={() => choose(todayKey)}>Today</button>
      </div>
    </div>
  </div>;
}
