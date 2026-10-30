import styles from './PlannerEmpty.module.css';

export default function PlannerEmpty({ children }) {
  return (
    <div className={styles.empty}>
      <span className={styles.paper} aria-hidden="true"><i /><i /><i /></span>
      <div>{children}</div>
    </div>
  );
}
