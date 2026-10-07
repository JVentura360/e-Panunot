// Sample data for the Concerns prototype. Swap for API calls later.

// Prototype shortcut: concerns owned by this id show up for ANY logged-in
// student. Remove once real auth provides user.id.
export const DEMO_STUDENT_ID = 'demo-student';

// TODO: replace with the subjects from the student's block.
export const SUBJECTS = [
'Systems Integration and Architecture',
'Event-Driven Programming',
'Routing and Switching Essentials',
'Other'
];

export const CATEGORIES = ['Academic', 'Schedule', 'Other'];

export const STATUS_LABEL = {
open: 'Open',
in_progress: 'In progress',
resolved: 'Resolved',
closed: 'Closed',
};
export const STATUS_KEYS = Object.keys(STATUS_LABEL);

const MAYOR = 'Cyrah Manongdo';

export const initialConcerns = [
{
    id: 'c-1',
    title: 'EDP Midterm Lab 3 Issue',
    subject: SUBJECTS[1],
    category: 'Academic',
    description:
    'Lab 3 is due on Oct 8, the same day as our proposal date for SIA. Can we ask the instructor to move it by a few days?',
    attachments: [],
    status: 'resolved',
    studentId: DEMO_STUDENT_ID,
    studentName: 'Jonel Ventura',
    createdAt: '2026-10-02T09:15:00+08:00',
    updatedAt: '2026-10-06T16:40:00+08:00',
    messages: [
    { id: 'm-1a', role: 'mayor', authorName: MAYOR, text: "Thanks for flagging this. I'll bring it up with the instructor today.", at: '2026-10-02T11:05:00+08:00' },
    { id: 'm-1b', role: 'student', authorName: 'Jonel Ventura', text: 'Thank you! Several of us are affected.', at: '2026-10-02T11:30:00+08:00' },
    { id: 'm-1c', role: 'mayor', authorName: MAYOR, text: 'Good news: Lab 3 is now due on Oct 14.', at: '2026-10-06T16:38:00+08:00' },
    { id: 'm-1d', role: 'system', text: 'Mayor marked this as resolved.', at: '2026-10-06T16:40:00+08:00' },
    ],
    unread: { student: true, mayor: false },
},
{
    id: 'c-2',
    title: 'CISCO 2 Grade Concern',
    subject: SUBJECTS[2],
    category: 'Academic',
    description:
    'The prelim grade for CISCO 2 has been released. May we possibly request for a breakdown of grades during the prelims?',
    attachments: ['grade-screenshot.jpg'],
    status: 'open',
    studentId: DEMO_STUDENT_ID,
    studentName: 'Jonel Ventura',
    createdAt: '2026-10-07T14:20:00+08:00',
    updatedAt: '2026-10-07T14:20:00+08:00',
    messages: [],
    unread: { student: false, mayor: true },
},
{
    id: 'c-3',
    title: 'SIA Prototype Presentation',
    subject: SUBJECTS[0],
    category: 'Schedule',
    description:
    'The scheduled prototype proposal for SIA is on October 8, 2026. Is it possible to reschedule it on a different day?',
    attachments: [],
    status: 'in_progress',
    studentId: DEMO_STUDENT_ID,
    studentName: 'Jonel Ventura',
    createdAt: '2026-10-03T10:00:00+08:00',
    updatedAt: '2026-10-05T09:12:00+08:00',
    messages: [
    { id: 'm-3a', role: 'system', text: 'Mayor marked this as in progress.', at: '2026-10-03T13:00:00+08:00' },
    { id: 'm-3b', role: 'mayor', authorName: MAYOR, text: 'I asked sir Kyle via Messenger. Will update as soon as he replies.', at: '2026-10-05T09:12:00+08:00' },
    ],
    unread: { student: false, mayor: false },
},
{
    id: 'c-4',
    title: 'Excusal from Classes',
    subject: SUBJECTS[4],
    category: 'Schedule',
    description: 'I will travel to and participate in the Enactus competition. Attached below is my excuse letter. Thank you!',
    attachments: ['excuse-letter.png'],
    status: 'closed',
    studentId: 'stu-2',
    studentName: 'Jhomar Salazar',
    createdAt: '2026-09-28T08:45:00+08:00',
    updatedAt: '2026-10-01T15:10:00+08:00',
    messages: [
    { id: 'm-4a', role: 'mayor', authorName: MAYOR, text: 'Forwarded to our instructors. Good luck with your competition!', at: '2026-09-28T10:00:00+08:00' },
    { id: 'm-4b', role: 'system', text: 'Mayor marked this as resolved.', at: '2026-09-30T12:00:00+08:00' },
    { id: 'm-4c', role: 'system', text: 'Student confirmed the fix and closed this concern.', at: '2026-10-01T15:10:00+08:00' },
    ],
    unread: { student: false, mayor: false },
},
{
    id: 'c-5',
    title: 'CISCO 2 Prelim Lab Exam Submission',
    subject: SUBJECTS[2],
    category: 'Schedule',
    description:
    'I have accidentally submitted a blank packet tracer file instead of the needed packet tracer activity file. May I request for a resubmission?',
    attachments: [],
    status: 'open',
    studentId: 'stu-3',
    studentName: 'Zyrus Sibulangcao',
    createdAt: '2026-10-08T07:30:00+08:00',
    updatedAt: '2026-10-08T07:30:00+08:00',
    messages: [],
    unread: { student: false, mayor: true },
},
{
    id: 'c-6',
    title: 'GradeVision Quiz Issue',
    subject: SUBJECTS[1],
    category: 'Academic',
    description: 'I have attempted to take the Midterm Quiz in GradeVision, but the answers are not saving. What can I do?',
    attachments: [],
    status: 'in_progress',
    studentId: 'stu-4',
    studentName: 'Kyle Andrey',
    createdAt: '2026-10-01T13:00:00+08:00',
    updatedAt: '2026-10-04T10:20:00+08:00',
    messages: [
    { id: 'm-6a', role: 'mayor', authorName: MAYOR, text: 'I have messaged ma\'am Chel regarding this matter. Will update you upon response.', at: '2026-10-04T10:20:00+08:00' },
    ],
    unread: { student: false, mayor: false },
},
];