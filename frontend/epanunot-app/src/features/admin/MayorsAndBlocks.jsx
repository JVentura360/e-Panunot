import styles from './AdminDashboard.module.css';

export default function MayorsAndBlocks({ mayors, blocks }) {
    return (
        <>
            <div className={styles.section}>
                <h3 className={styles.sectionTitle}>Mayors</h3>
                {mayors.length === 0 ? (
                <div className={styles.empty}>No mayors yet.</div>
                ) : (
                <div className={styles.tableWrap}>
                    <table className={styles.table}>
                    <thead>
                        <tr><th>Name</th><th>Email</th><th>Block</th></tr>
                    </thead>
                    <tbody>
                        {mayors.map((m) => (
                        <tr key={m.id}>
                            <td>{m.name}</td><td>{m.email}</td><td>{m.block}</td>
                        </tr>
                        ))}
                    </tbody>
                    </table>
                </div>
                )}
            </div>

            <div className={styles.section}>
                <h3 className={styles.sectionTitle}>Blocks</h3>
                {blocks.length === 0 ? (
                <div className={styles.empty}>No blocks yet.</div>
                ) : (
                <div className={styles.tableWrap}>
                    <table className={styles.table}>
                    <thead>
                        <tr><th>Block</th><th>Mayor</th><th>Members</th></tr>
                    </thead>
                    <tbody>
                        {blocks.map((b) => (
                        <tr key={b.id}>
                            <td>{b.name}</td><td>{b.mayor}</td><td>{b.members}</td>
                        </tr>
                        ))}
                    </tbody>
                    </table>
                </div>
                )}
            </div>
        </>
    );
}