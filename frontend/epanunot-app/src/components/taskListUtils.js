import { parseDate } from './datePickerUtils.js';

// Stable sorting retains insertion order within each group.
export function unfinishedFirst(items, isDone = (item) => item.done, completionOrder = []) {
  return [...items].sort((a, b) => Number(Boolean(isDone(a))) - Number(Boolean(isDone(b)))
    || (isDone(a) && isDone(b) ? completionOrder.indexOf(a.id) - completionOrder.indexOf(b.id) : 0));
}

export function validDeadline(value, today) {
  return Boolean(parseDate(value)) && value >= today;
}
