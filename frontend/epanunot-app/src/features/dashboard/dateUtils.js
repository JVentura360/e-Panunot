export const fmt = (d) => d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
export const daysLeft = (d) => {
  const due = new Date(d);
  const today = new Date();
  // Compare calendar dates, so a deadline earlier today is still due today.
  return Math.round((Date.UTC(due.getFullYear(), due.getMonth(), due.getDate()) -
    Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())) / 864e5);
};
