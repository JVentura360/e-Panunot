import { useState } from 'react';
import styles from './BlockManagement.module.css';

const BLOCKMATES = [
  { id: 1, name: 'Charles Gonzales', subjects: ['Systems Integration and Architecture', 'Event-Driven Programming', 'Routing and Switching Essentials'] },
  { id: 2, name: 'Cyrah Manongdo', subjects: ['Systems Integration and Architecture', 'Event-Driven Programming', 'Routing and Switching Essentials'] },
  { id: 3, name: 'Jhomar Salazar', subjects: ['Systems Integration and Architecture', 'Event-Driven Programming', 'Routing and Switching Essentials'] },
  { id: 4, name: 'Jonel Ventura', subjects: ['Systems Integration and Architecture', 'Event-Driven Programming', 'Routing and Switching Essentials'] },
  { id: 5, name: 'Kyle Denzel Audrey', subjects: ['Systems Integration and Architecture', 'Event-Driven Programming', 'Routing and Switching Essentials'] },
  { id: 6, name: 'Zyrus Sibulangcao', subjects: ['Systems Integration and Architecture', 'Event-Driven Programming', 'Routing and Switching Essentials'] },
];

const SUBJECTS = [
  { id: 1, code: 'ITP09', name: 'Systems Integration and Architecture' },
  { id: 2, code: 'ITP10', name: 'Event-Driven Programming' },
  { id: 3, code: 'ITP11', name: 'Routing and Switching Essentials' },
];

const APPLICATIONS_INIT = [
  { id: 1, name: 'Juan Dela Cruz', block: 'BSIT 3-A' }
];

export default function BlockManagement({ onBack }) {
  const [applications, setApplications] = useState(APPLICATIONS_INIT);

  const removeApp = (id) => {
    setApplications(applications.filter((a) => a.id !== id));
  };

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className={styles.page}>
      <header className={styles.top}>
        <div>
          <h1>Block Management (31-ITE-04)</h1>
          <p>Manage your blockmates, applications, and subjects.</p>
        </div>
        <button className={styles.backBtn} onClick={onBack}>← Back</button>
      </header>

      <section className={styles.cards}>
        <button className={styles.card} onClick={() => scrollTo('blockmates')}>
          <svg className={styles.cardIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          <div className={styles.cardBody}>
            <strong>{BLOCKMATES.length}</strong>
            <span>Blockmates</span>
          </div>
        </button>

        <button className={styles.card} onClick={() => scrollTo('applications')}>
          <svg className={styles.cardIcon} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
            <path fillRule="evenodd" d="M4,8 L14,8 C15.1045695,8 16,8.8954305 16,10 L16,20 C16,21.1045695 15.1045695,22 14,22 L4,22 C2.8954305,22 2,21.1045695 2,20 L2,10 C2,8.8954305 2.8954305,8 4,8 Z M4,10 L4,20 L14,20 L14,10 L4,10 Z M17,19 L17,8 C17,7.44771525 16.5522847,7 16,7 L5,7 C5,5.8954305 5.8954305,5 7,5 L17,5 C18.1045695,5 19,5.8954305 19,7 L19,17 C19,18.1045695 18.1045695,19 17,19 Z M20,16 L20,5 C20,4.44771525 19.5522847,4 19,4 L8,4 C8,2.8954305 8.8954305,2 10,2 L20,2 C21.1045695,2 22,2.8954305 22,4 L22,14 C22,15.1045695 21.1045695,16 20,16 Z" />
          </svg>
          <div className={styles.cardBody}>
            <strong>{applications.length}</strong>
            <span>Applications</span>
          </div>
        </button>

        <button className={styles.card} onClick={() => scrollTo('subjects')}>
          <svg className={styles.cardIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 10.4V20M12 10.4C12 8.15979 12 7.03969 11.564 6.18404C11.1805 5.43139 10.5686 4.81947 9.81596 4.43597C8.96031 4 7.84021 4 5.6 4H4.6C4.03995 4 3.75992 4 3.54601 4.10899C3.35785 4.20487 3.20487 4.35785 3.10899 4.54601C3 4.75992 3 5.03995 3 5.6V16.4C3 16.9601 3 17.2401 3.10899 17.454C3.20487 17.6422 3.35785 17.7951 3.54601 17.891C3.75992 18 4.03995 18 4.6 18H7.54668C8.08687 18 8.35696 18 8.61814 18.0466C8.84995 18.0879 9.0761 18.1563 9.29191 18.2506C9.53504 18.3567 9.75977 18.5065 10.2092 18.8062L12 20M12 10.4C12 8.15979 12 7.03969 12.436 6.18404C12.8195 5.43139 13.4314 4.81947 14.184 4.43597C15.0397 4 16.1598 4 18.4 4H19.4C19.9601 4 20.2401 4 20.454 4.10899C20.6422 4.20487 20.7951 4.35785 20.891 4.54601C21 4.75992 21 5.03995 21 5.6V16.4C21 16.9601 21 17.2401 20.891 17.454C20.7951 17.6422 20.6422 17.7951 20.454 17.891C20.2401 18 19.9601 18 19.4 18H16.4533C15.9131 18 15.643 18 15.3819 18.0466C15.15 18.0879 14.9239 18.1563 14.7081 18.2506C14.465 18.3567 14.2402 18.5065 13.7908 18.8062L12 20" />
          </svg>
          <div className={styles.cardBody}>
            <strong>{SUBJECTS.length}</strong>
            <span>Subjects</span>
          </div>
        </button>
      </section>

      <section className={styles.section} id="blockmates">
        <h3>Blockmates</h3>
        <div className={styles.list}>
          {BLOCKMATES.map((m) => (
            <div className={styles.item} key={m.id}>
              <div className={styles.grow}>
                <div className={styles.name}>{m.name}</div>
                <div className={styles.meta}>{m.subjects.join(' · ')}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.section} id="applications">
        <h3>Applications</h3>
        {applications.length === 0 ? (
          <div className="empty">No pending applications.</div>
        ) : (
          <div className={styles.list}>
            {applications.map((a) => (
              <div className={styles.item} key={a.id}>
                <div className={styles.grow}>
                  <div className={styles.name}>{a.name}</div>
                  <div className={styles.meta}>{a.block}</div>
                </div>
                <button className={styles.rejectBtn} onClick={() => removeApp(a.id)}>Reject</button>
                <button className={styles.acceptBtn} onClick={() => removeApp(a.id)}>Accept</button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className={styles.section} id="subjects">
        <h3>Subjects</h3>
        <div className={styles.list}>
          {SUBJECTS.map((s) => (
            <div className={styles.item} key={s.id}>
              <div className={styles.grow}>
                <div className={styles.name}>{s.name}</div>
                <div className={styles.meta}>{s.code}</div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}