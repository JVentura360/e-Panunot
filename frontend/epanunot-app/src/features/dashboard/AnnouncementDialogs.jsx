import Modal from '../../components/Modal.jsx';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';
import { api } from '../../api/client.js';

export default function AnnouncementDialogs({ editing, deleting, onCloseEdit, onCloseDelete }) {
  return (
    <>
      {editing && (
        <Modal
          title="Edit Announcement"
          description="Update what your block sees."
          submitLabel="Save changes"
          fields={[
            { key: 'title', label: 'Title', required: true },
            { key: 'description', label: 'Message', type: 'textarea', required: true },
          ]}
          initialValues={{ title: editing.title, description: editing.description }}
          onSave={async (values) => {
            await api(`/announcements/${editing.id}`, { method: 'PUT', body: values });
            onCloseEdit();
          }}
          onClose={onCloseEdit}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title="Delete this announcement?"
          message={`"${deleting.title}" will be removed for everyone in your block.`}
          confirmLabel="Delete"
          onCancel={onCloseDelete}
          onConfirm={async () => {
            await api(`/announcements/${deleting.id}`, { method: 'DELETE' });
            onCloseDelete();
          }}
        />
      )}
    </>
  );
}