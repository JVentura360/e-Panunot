import Modal from '../../components/Modal.jsx';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';
import { PLATFORMS } from '../../data/mockData';
import { useTasks } from '../../context/TaskContext.jsx';

export default function TaskDialogs({ editing, deleting, onCloseEdit, onCloseDelete }) {
  const { updateTask, removeTask } = useTasks();
  return (
    <>
      {editing && (
        <Modal
          title="Edit task"
          description="Change the title, deadline or platform. To change the subject, delete this task and assign it again."
          submitLabel="Save changes"
          fields={[
            { key: 'title', label: 'Task title', required: true },
            { key: 'due', label: 'Deadline date', type: 'date', required: true },
            { key: 'time', label: 'Deadline time', type: 'time', required: true },
            { key: 'platform', label: 'Platform or location', type: 'select', options: PLATFORMS },
          ]}
          initialValues={{ title: editing.title, due: editing.date, time: editing.time, platform: editing.platform || PLATFORMS[0] }}
          onSave={async (values) => {
            await updateTask(editing.id, { title: values.title, date: values.due, time: values.time, platform: values.platform });
            onCloseEdit();
          }}
          onClose={onCloseEdit}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title="Delete this task?"
          message={`"${deleting.title}" will be removed for everyone in your block, including their completion records.`}
          confirmLabel="Delete"
          onCancel={onCloseDelete}
          onConfirm={async () => {
            await removeTask(deleting.id);
            onCloseDelete();
          }}
        />
      )}
    </>
  );
}