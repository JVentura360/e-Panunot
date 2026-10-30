// All fake data for the prototype lives here.
// Replace with API calls (Laravel) later.

// helpers
const daysFromNow = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
};
// 'YYYY-MM-DD' (local time), the format the shared task store uses
const dateKey = (n) => {
  const d = daysFromNow(n);
  const pad = (x) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

// auth login shortcut
// Roles are always lowercase: 'student' | 'mayor' | 'admin'
export const demoAccounts = [
  { name: 'Jonel Ventura', email: 'jonel.ventura@udd.edu.ph', role: 'student', block: '31-ITE-04' },
  { name: 'Cyrah Manongdo', email: 'cyrah.manongdo@udd.edu.ph', role: 'mayor', block: '31-ITE-04' },
  { name: 'Admin Office', email: 'admin@udd.edu.ph', role: 'admin', block: '-' },
];

// admin 
export const mayorApplications = [
  { id: 1, name: 'Cyrah Manongdo', email: 'cyrah.manongdo@udd.edu.ph', block: '31-ITE-04', status: 'pending' },
  { id: 2, name: 'Christian Aldana', email: 'christian.aldana@udd.edu.ph', block: '31-ITE-04', status: 'pending' },
];

// dashboard data
export const PLATFORMS = ['StepS', 'GradeVision', 'Face-To-Face', 'NetAcad'];

// Shared by Dashboard AND Calendar (see context/TaskContext.jsx).
// personal: false = assigned by the mayor, true = the student's own task.
export const initialTasks = [
  { id: 1, title: 'Submit Capstone Proposal', date: dateKey(1), by: 'Mayor Cyrah', platform: 'StepS', subject: '', done: false, personal: false },
  { id: 2, title: 'Pay class shirt contribution', date: dateKey(4), by: 'Mayor Cyrah', platform: 'Face-To-Face', subject: '', done: true, personal: false },
  { id: 3, title: 'Lab Report 2: Data Structures', date: dateKey(7), by: 'Mayor Cyrah', platform: 'GradeVision', subject: '', done: false, personal: false },
  { id: 'p1', title: 'Buy a blue book', date: dateKey(0), by: '', platform: '', subject: '', done: false, personal: true },
  { id: 'p2', title: 'Print readings for ENG 12', date: dateKey(0), by: '', platform: '', subject: '', done: true, personal: true },
];

export const announcements = [
  { id: 1, title: 'No classes on Friday', body: 'Faculty meeting all day. Online modules will be posted.' },
  { id: 2, title: 'Block meeting', body: 'Monday, 1 PM at Room 204. Attendance counts.' },
];