import { useEffect, useState } from 'react';
import { dailyQuote } from './dailyQuote.js';
import styles from './Dashboard.module.css';

export default function DailyQuote({ userId, heading = false }) {
  const [today, setToday] = useState(() => new Date());

  useEffect(() => {
    const now = new Date();
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const timer = setTimeout(() => setToday(new Date()), midnight.getTime() - now.getTime() + 100);
    // Sleeping devices can resume after the scheduled daily update.
    const resume = () => { if (!document.hidden) setToday(new Date()); };
    document.addEventListener('visibilitychange', resume);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', resume);
    };
  }, [today]);

  const text = dailyQuote(userId, today).text;
  return heading ? <h1>{text}</h1> : <p className={styles.dailyQuote}>{text}</p>;
}
