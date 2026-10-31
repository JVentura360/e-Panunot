import styles from './LoadingScreen.module.css';

export default function LoadingScreen({ message = 'Getting your workspace ready…' }) {
  return (
    <main className={styles.screen} aria-busy="true">
      <div className={styles.content} role="status" aria-live="polite">
        <div className={styles.notebook} aria-hidden="true">
          <span className={styles.binding} />
          {[0, 1, 2].map((line) => (
            <span key={line} className={styles.row} style={{ '--row': line }}>
              <span className={styles.checkbox} /><span className={styles.line} />
            </span>
          ))}
        </div>
        <div className={styles.brand}>e<span>Panunot</span></div>
        <p className={styles.message}>{message}</p>
        <span className={styles.track} aria-hidden="true"><span /></span>
      </div>
    </main>
  );
}
