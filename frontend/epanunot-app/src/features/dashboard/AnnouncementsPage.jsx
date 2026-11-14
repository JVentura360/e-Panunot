import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import styles from './Dashboard.module.css';
import { useApiQuery } from '../../api/useApiQuery.js';
import { useOffline } from '../../offline/useOffline.js';
import AnnouncementCard from './AnnouncementCard.jsx';
import AnnouncementDialog from './AnnouncementDialog.jsx';
import AnnouncementDialogs from './AnnouncementDialogs.jsx';
import SkeletonList from '../../components/Skeleton.jsx';

export default function AnnouncementsPage({ user }) {
  const { online } = useOffline();
  const query = useApiQuery('/announcements', { enabled: online && Boolean(user.block_id) });
  const anns = useMemo(
    () => [...(query.data?.data ?? [])].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
    [query.data],
  );
  const [viewing, setViewing] = useState(null);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const isMayor = user.role === 'mayor';

  return (
    <div className={`${styles.page} ${styles.narrow}`}>
      <Link to="/" className={styles.textLink}>← Back to dashboard</Link>
      <div className={styles.sectionHead} style={{ marginTop: 16 }}>
        <h2>Announcements</h2>
        <span className={styles.count}>{anns.length}</span>
      </div>
      {!online ? <div className="empty">Announcements need an internet connection.</div>
        : query.isPending && user.block_id ? <SkeletonList rows={4} label="Loading announcements" />
        : anns.length ? (
          <div className={styles.board}>
            {anns.map((a) => (
              <AnnouncementCard key={a.id} announcement={a} isMayor={isMayor}
                onOpen={setViewing} onEdit={setEditing} onDelete={setDeleting} />
            ))}
          </div>
        ) : <div className="empty">No announcements yet.</div>}
      {viewing && <AnnouncementDialog announcement={viewing} onClose={() => setViewing(null)} />}
      <AnnouncementDialogs editing={editing} deleting={deleting}
        onCloseEdit={() => setEditing(null)} onCloseDelete={() => setDeleting(null)} />
    </div>
  );
}