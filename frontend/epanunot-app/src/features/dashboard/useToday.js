import { useEffect, useState } from 'react';

// Returns today's date and updates it at midnight and when a sleeping device wakes up.
export function useToday() {
  const [today, setToday] = useState(() => new Date());
  useEffect(() => {
    const now = new Date();
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const timer = setTimeout(() => setToday(new Date()), midnight.getTime() - now.getTime() + 100);
    const resume = () => {
      if (!document.hidden) setToday((previous) => (previous.toDateString() === new Date().toDateString() ? previous : new Date()));
    };
    document.addEventListener('visibilitychange', resume);
    return () => { clearTimeout(timer); document.removeEventListener('visibilitychange', resume); };
  }, [today]);
  return today;
}