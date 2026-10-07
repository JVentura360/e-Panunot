// All fake data for the prototype lives here.
// Replace with API calls (Laravel) later.

// helpers
const daysFromNow = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
};

// auth login shortcut
// Roles are always lowercase: 'student' | 'mayor' | 'admin'
export const demoAccounts = [
  { name: 'Jonel Ventura', email: 'jonel.ventura@udd.edu.ph', role: 'student', block: '31-ITE-04' },
  { name: 'Cyrah manongdo', email: 'cyrah.manongdo@udd.edu.ph', role: 'mayor', block: '31-ITE-04' },
  { name: 'Admin Office', email: 'admin@udd.edu.ph', role: 'admin', block: '-' },
];

// admin 
export const mayorApplications = [
  { id: 1, name: 'Cyrah Manongdo', email: 'cyrah.manongdo@udd.edu.ph', block: '31-ITE-04', status: 'pending' },
  { id: 2, name: 'Christian Aldana', email: 'christian.aldana@udd.edu.ph', block: '31-ITE-04', status: 'pending' },
];

// dashboard data
export const PLATFORMS = ['StepS', 'GradeVision', 'Face-To-Face', 'NetAcad'];

export const mayorTasks = [
  { id: 1, title: 'Submit Capstone Proposal', due: daysFromNow(1), by: 'Mayor Cyrah', platform: 'StepS', done: false },
  { id: 2, title: 'Pay class shirt contribution', due: daysFromNow(4), by: 'Mayor Cyrah', platform: 'Face-To-Face', done: true },
  { id: 3, title: 'Lab Report 2: Data Structures', due: daysFromNow(7), by: 'Mayor Cyrah', platform: 'GradeVision', done: false },
];

export const announcements = [
  { id: 1, title: 'No classes on Friday', body: 'Faculty meeting all day. Online modules will be posted.' },
  { id: 2, title: 'Block meeting', body: 'Monday, 1 PM at Room 204. Attendance counts.' },
];

