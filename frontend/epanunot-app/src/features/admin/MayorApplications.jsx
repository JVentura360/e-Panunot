import styles from './AdminDashboard.module.css';

export default function MayorApplications({ apps, onApprove, onReject }) {
    if (apps.length === 0) {
        return <div className={styles.empty}>No applications yet.</div>;
    }

    return (
        <div className={styles.list}>
        {apps.map((app) => (
            <div
            key={app.id}
            className={`${styles.row} ${
                app.status === 'approved' ? styles.rowApproved :
                app.status === 'rejected' ? styles.rowRejected : ''
            }`}
            >
            <div>
                <div className={styles.name}>{app.name}</div>
                <div className={styles.meta}>{app.email} · Applying for: {app.block}</div>
            </div>

            {app.status === 'pending' ? (
                <div className={styles.actions}>
                <button className={`${styles.btn} ${styles.accept}`} onClick={() => onApprove(app)}>
                    Accept
                </button>
                <button className={`${styles.btn} ${styles.reject}`} onClick={() => onReject(app.id)}>
                    Reject
                </button>
                </div>
            ) : (
                <span className={`${styles.tag} ${styles[app.status]}`}>{app.status}</span>
            )}
            </div>
        ))}
        </div>
    );
}
