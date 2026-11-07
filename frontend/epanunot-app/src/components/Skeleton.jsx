import styles from './Skeleton.module.css';

// Placeholder rows shown while a list loads.
export default function SkeletonList({ rows = 4, label = 'Loading' }) {
  return (
    <div className={styles.list} role="status" aria-busy="true">
      <span className={styles.srOnly}>{label}…</span>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className={styles.row} aria-hidden="true">
          <span className={`${styles.bar} ${styles.title}`} />
          <span className={`${styles.bar} ${styles.line}`} />
          <span className={`${styles.bar} ${styles.short}`} />
        </div>
      ))}
    </div>
  );
}