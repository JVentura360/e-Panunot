// `icon` is a key into the icon map in Tutorial.jsx.
export const tutorialCards = {
  student: [
    { id: 'tasks', icon: 'tasks', title: 'Tasks and calendar',
      body: 'See what’s due for your block and your subjects. Deadlines show on the calendar, and your own to-dos stay yours.' },
    { id: 'updates', icon: 'bell', title: 'Announcements and alerts',
      body: 'Announcements land on your dashboard. The bell tells you about new tasks, replies and status changes.' },
    { id: 'concerns', icon: 'chat', title: 'Concerns',
      body: 'Have a question or a problem with a task? Send a concern and follow the replies in one place.' },
    { id: 'join', icon: 'join', title: 'Join your block',
      body: 'Not in a block yet? Open Join block and pick yours. Once your mayor approves you, everything shows up.' },
  ],
  mayor: [
    { id: 'assign', icon: 'assign', title: 'Assign tasks',
      body: 'Create tasks for your whole block or for one subject. Everyone is notified and reminded before the deadline.' },
    { id: 'announce', icon: 'megaphone', title: 'Post announcements',
      body: 'Share updates with your block. Attach one to a subject when it only matters to some classmates.' },
    { id: 'concerns', icon: 'chat', title: 'Handle concerns',
      body: 'Your classmates’ concerns reach you here. Reply, and mark them resolved when they’re sorted.' },
    { id: 'manage', icon: 'manage', title: 'Manage your block',
      body: 'Approve join requests, review members and set subject loads from Block Management.' },
  ],
};