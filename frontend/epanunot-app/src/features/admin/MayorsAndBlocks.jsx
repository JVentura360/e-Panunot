import { useState } from 'react';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';
import styles from './AdminDashboard.module.css';

export default function MayorsAndBlocks({ mayors, blocks, onRemove }) {
    const [removing, setRemoving] = useState(null);

    return (
        <>
            {removing && (
                <ConfirmDialog
                    title="Remove this mayor?"
                    message={`${removing.name} will stop being the mayor of ${removing.block} and become a regular student in that block. The block keeps its members and tasks but has no mayor until a new application is approved.`}
                    confirmLabel="Remove mayor"
                    onCancel={() => setRemoving(null)}
                    onConfirm={async () => {
                        await onRemove(removing.blockId);
                        setRemoving(null);
                    }}
                />
            )}

            <div className={styles.section}>
                <h3 className={styles.sectionTitle}>Mayors</h3>
                {mayors.length === 0 ? (
                <div className={styles.empty}>No mayors yet.</div>
                ) : (
                <div className={styles.tableWrap}>
                    <table className={styles.table}>
                    <thead>
                        <tr><th>Name</th><th>Email</th><th>Block</th><th>Actions</th></tr>
                    </thead>
                    <tbody>
                        {mayors.map((m) => (
                        <tr key={m.id}>
                            <td>{m.name}</td><td>{m.email}</td><td>{m.block}</td>
                            <td>
                                <button
                                    type="button"
                                    className={`${styles.btn} ${styles.reject}`}
                                    onClick={() => setRemoving(m)}
                                    aria-label={`Remove ${m.name} as mayor of ${m.block}`}
                                >
                                    Remove
                                </button>
                            </td>
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
