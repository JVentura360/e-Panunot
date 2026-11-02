import test from 'node:test';
import assert from 'node:assert/strict';
import { createSubjectTasks } from './subjectTaskCreation.js';
import { visibleClassTasks } from './taskVisibility.js';
import { readTasks, saveTasks } from './taskStorage.js';

const subjects = [1, 2, 3].map((id) => ({ id, code: `ITE30${id}`, name: `Subject ${id}` }));

test('classified irregular students without enrollment cannot see legacy generic tasks', () => {
  const tasks = [{ id: 'old', subject: 'All block subjects' }, { id: 'other', subject: 'Other' }, { id: 'blank' }];
  assert.deepEqual(visibleClassTasks({ 'block:4': tasks }, { block_id: 4, student_type: 'irregular' }, []), []);
});

test('All subjects creates three independent persisted tasks with distinct identities', () => {
  let id = 0;
  const tasks = createSubjectTasks({ title: 'Report', date: '2026-11-04', allSubjects: true }, subjects, () => `task-${++id}`);
  assert.equal(tasks.length, 3);
  assert.equal(new Set(tasks.map((task) => task.id)).size, 3);
  assert.deepEqual(tasks.map((task) => task.subjectId), [1, 2, 3]);
  const store = { 'block:4': tasks, 'completed:student': { [tasks[0].id]: true } };
  const storage = { value: null, getItem() { return this.value; }, setItem(key, value) { this.value = value; } };
  saveTasks(storage, store);
  const restored = readTasks(storage);
  assert.deepEqual(restored['block:4'].map((task) => task.id), tasks.map((task) => task.id));
  assert.equal(restored['block:4'].filter((task) => restored['completed:student'][task.id]).length, 1);
});

test('personal tasks stay single and empty class loads cannot create generic tasks', () => {
  assert.equal(createSubjectTasks({ title: 'Personal', personal: true }, subjects, () => 'one').length, 1);
  assert.throws(() => createSubjectTasks({ title: 'Class', allSubjects: true }, [], () => 'bad'));
  assert.equal(createSubjectTasks({ title: 'Class', subjectId: 2 }, subjects, () => 'single')[0].subjectId, 2);
});

test('classified irregular primary members see only their two subjects', () => {
  let id = 0;
  const tasks = createSubjectTasks({ title: 'Report', allSubjects: true }, subjects, () => `task-${++id}`);
  const visible = visibleClassTasks({ 'block:4': tasks }, { id: 1, block_id: 4, student_type: 'irregular' },
    [{ block_id: 4, subject_id: 1 }, { block_id: 4, subject_id: 2 }]);
  assert.equal(visible.length, 2);
});
