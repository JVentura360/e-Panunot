import { useState } from 'react';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';
import BlockMembersDialog from './BlockMembersDialog.jsx';
import styles from './AdminDashboard.module.css';

export default function MayorsAndBlocks({ mayors, blocks, onRemove }) {
    const [removing, setRemoving] = useState(null);
    const [viewing, setViewing] = useState(null);

    return (
        <>
            {viewing && <BlockMembersDialog key={viewing.id} block={viewing} onClose={() => setViewing(null)} />}
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
                {mayors.length === 0 ? (
                <div className={styles.empty}>No mayors yet.</div>
                ) : (
                <div className={`${styles.tableWrap} ${styles.responsiveTableWrap}`}>
                    <table className={`${styles.table} ${styles.responsiveTable} ${styles.mayorTable}`} role="table" aria-label="Mayors">
                    <thead>
                        <tr><th>Name</th><th>Email</th><th>Block</th><th>Actions</th></tr>
                    </thead>
                    <tbody>
                        {mayors.map((m) => (
                        <tr key={m.id}>
                            <td data-label="Name"><div className={styles.cellValue}>{m.name}</div></td><td data-label="Email"><div className={styles.cellValue}>{m.email}</div></td><td data-label="Block"><div className={styles.cellValue}>{m.block}</div></td>
                            <td data-label="Actions">
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
                <div className={`${styles.tableWrap} ${styles.responsiveTableWrap}`}>
                    <table className={`${styles.table} ${styles.responsiveTable} ${styles.blockTable}`} role="table" aria-label="Blocks">
                    <thead>
                        <tr><th>Block</th><th>Mayor</th><th>Members</th><th>Actions</th></tr>
                    </thead>
                    <tbody>
                        {blocks.map((b) => (
                        <tr key={b.id}>
                            <td data-label="Block"><div className={styles.cellValue}>{b.name}</div></td><td data-label="Mayor"><div className={styles.cellValue}>{b.mayor}</div></td><td data-label="Members"><div className={styles.cellValue}>{b.members}<span className={styles.mobileOnly}> member{Number(b.members) === 1 ? '' : 's'}</span></div></td>
                            <td data-label="Actions"><button type="button" className="btn ghost" onClick={() => setViewing(b)} aria-label={`View members of ${b.name}`}>View</button></td>
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
