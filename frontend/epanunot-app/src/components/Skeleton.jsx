import styles from './Skeleton.module.css';

// Every skeleton announces itself once to screen readers; the shapes are decorative.
function Shell({ label, className = '', style, children }) {
  return (
    <div className={`${styles.shell} ${className}`} style={style} role="status" aria-busy="true">
      <span className={styles.srOnly}>{label}…</span>
      <div className={styles.visual} aria-hidden="true">{children}</div>
    </div>
  );
}

const Bar = ({ className = '' }) => <span className={`${styles.bar} ${className}`} />;

// Rows of title + line + short line. Task rows, announcements, notifications.
export default function SkeletonList({ rows = 4, label = 'Loading' }) {
  return (
    <Shell label={label} className={styles.list}>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className={styles.row}>
          <Bar className={styles.title} />
          <Bar className={styles.line} />
          <Bar className={styles.short} />
        </div>
      ))}
    </Shell>
  );
}

// Responsive grid of cards. Stat tiles, block cards, admin summaries.
export function SkeletonCards({ count = 3, label = 'Loading' }) {
  return (
    <Shell label={label} className={styles.cards}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className={styles.card}>
          <Bar className={styles.title} />
          <Bar className={styles.big} />
          <Bar className={styles.short} />
        </div>
      ))}
    </Shell>
  );
}

// Header row + body rows. Admin tables, member lists, ledgers.
export function SkeletonTable({ rows = 5, cols = 4, label = 'Loading' }) {
  return (
    <Shell label={label} className={styles.table} style={{ '--cols': cols }}>
      {Array.from({ length: rows + 1 }, (_, r) => (
        <div key={r} className={`${styles.tr} ${r === 0 ? styles.thead : ''}`}>
          {Array.from({ length: cols }, (_, c) => (
            <Bar key={c} className={c === 0 ? styles.cellWide : styles.cell} />
          ))}
        </div>
      ))}
    </Shell>
  );
}

// Label + input pairs and a submit button. Profile, Settings, subject load editor.
export function SkeletonForm({ fields = 4, label = 'Loading' }) {
  return (
    <Shell label={label} className={styles.form}>
      {Array.from({ length: fields }, (_, i) => (
        <div key={i} className={styles.field}>
          <Bar className={styles.fieldLabel} />
          <Bar className={styles.input} />
        </div>
      ))}
      <Bar className={styles.button} />
    </Shell>
  );
}

// Paragraph lines, last one shorter. Descriptions, announcement bodies, help text.
export function SkeletonText({ lines = 3, label = 'Loading' }) {
  return (
    <Shell label={label} className={styles.text}>
      {Array.from({ length: lines }, (_, i) => (
        <Bar key={i} className={i === lines - 1 ? styles.short : styles.line} />
      ))}
    </Shell>
  );
}