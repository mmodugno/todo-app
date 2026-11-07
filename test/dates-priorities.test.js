import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  addTodo,
  updateTodo,
  normalizeTodo,
  isValidDate,
  todayString,
  dueStatus,
  sortTodos,
  loadTodos,
} from '../todos.js';

const todo = (overrides) => ({
  id: 'x',
  text: 'Tarea',
  completed: false,
  createdAt: 1,
  dueDate: null,
  priority: 'medium',
  ...overrides,
});

test('isValidDate acepta fechas reales en formato AAAA-MM-DD', () => {
  assert.equal(isValidDate('2026-11-07'), true);
  assert.equal(isValidDate('2028-02-29'), true);
});

test('isValidDate rechaza fechas imposibles o con otro formato', () => {
  assert.equal(isValidDate('2026-02-30'), false);
  assert.equal(isValidDate('2026-13-01'), false);
  assert.equal(isValidDate('07/11/2026'), false);
  assert.equal(isValidDate(''), false);
  assert.equal(isValidDate(null), false);
});

test('todayString usa la fecha local con ceros a la izquierda', () => {
  assert.equal(todayString(new Date(2026, 0, 5, 23, 59)), '2026-01-05');
  assert.equal(todayString(new Date(2026, 10, 7, 0, 1)), '2026-11-07');
});

test('addTodo guarda fecha y prioridad si son válidas', () => {
  const [created] = addTodo([], 'Pagar luz', { dueDate: '2026-11-20', priority: 'high' });
  assert.equal(created.dueDate, '2026-11-20');
  assert.equal(created.priority, 'high');
});

test('addTodo ignora fecha y prioridad inválidas', () => {
  const [created] = addTodo([], 'Pagar luz', { dueDate: '', priority: 'urgentisima' });
  assert.equal(created.dueDate, null);
  assert.equal(created.priority, 'medium');
});

test('updateTodo cambia solo lo que se le pasa', () => {
  const todos = [todo({ dueDate: '2026-11-10', priority: 'low' })];
  const onlyPriority = updateTodo(todos, 'x', { priority: 'high' });
  assert.equal(onlyPriority[0].priority, 'high');
  assert.equal(onlyPriority[0].dueDate, '2026-11-10');
  const clearedDate = updateTodo(todos, 'x', { dueDate: null });
  assert.equal(clearedDate[0].dueDate, null);
  assert.equal(clearedDate[0].priority, 'low');
});

test('updateTodo no muta el original ni toca otras tareas', () => {
  const todos = [todo({ id: 'a' }), todo({ id: 'b' })];
  const result = updateTodo(todos, 'a', { priority: 'high' });
  assert.equal(todos[0].priority, 'medium');
  assert.equal(result[1], todos[1]);
});

test('normalizeTodo completa los campos nuevos en datos viejos', () => {
  const old = { id: 'a', text: 'vieja', completed: false, createdAt: 5 };
  assert.deepEqual(normalizeTodo(old), { ...old, dueDate: null, priority: 'medium', tags: [] });
});

test('loadTodos migra tareas guardadas sin fecha ni prioridad', () => {
  const storage = {
    getItem: () => JSON.stringify([{ id: 'a', text: 'vieja', completed: false }]),
  };
  const [loaded] = loadTodos(storage, 'k');
  assert.equal(loaded.priority, 'medium');
  assert.equal(loaded.dueDate, null);
});

test('dueStatus distingue vencida, para hoy y futura', () => {
  const today = '2026-11-07';
  assert.equal(dueStatus(todo({ dueDate: '2026-11-06' }), today), 'overdue');
  assert.equal(dueStatus(todo({ dueDate: '2026-11-07' }), today), 'today');
  assert.equal(dueStatus(todo({ dueDate: '2026-11-08' }), today), 'upcoming');
});

test('dueStatus es null sin fecha o si la tarea está completada', () => {
  assert.equal(dueStatus(todo(), '2026-11-07'), null);
  assert.equal(dueStatus(todo({ dueDate: '2026-11-01', completed: true }), '2026-11-07'), null);
});

const ids = (todos) => todos.map((t) => t.id);

test('sortTodos por prioridad: alta primero y desempata por fecha', () => {
  const todos = [
    todo({ id: 'low', priority: 'low' }),
    todo({ id: 'high-late', priority: 'high', dueDate: '2026-12-01' }),
    todo({ id: 'high-soon', priority: 'high', dueDate: '2026-11-10' }),
    todo({ id: 'medium', priority: 'medium' }),
  ];
  assert.deepEqual(ids(sortTodos(todos, 'priority')), ['high-soon', 'high-late', 'medium', 'low']);
});

test('sortTodos por vencimiento: las que no tienen fecha van al final', () => {
  const todos = [
    todo({ id: 'none' }),
    todo({ id: 'later', dueDate: '2026-12-01' }),
    todo({ id: 'sooner', dueDate: '2026-11-10' }),
  ];
  assert.deepEqual(ids(sortTodos(todos, 'due')), ['sooner', 'later', 'none']);
});

test('sortTodos newest muestra primero las más recientes', () => {
  const todos = [todo({ id: 'old', createdAt: 1 }), todo({ id: 'new', createdAt: 9 })];
  assert.deepEqual(ids(sortTodos(todos, 'newest')), ['new', 'old']);
});

test('sortTodos con el modo por defecto conserva el orden y no muta', () => {
  const todos = [todo({ id: 'b', priority: 'low' }), todo({ id: 'a', priority: 'high' })];
  assert.equal(sortTodos(todos, 'added'), todos);
  sortTodos(todos, 'priority');
  assert.deepEqual(ids(todos), ['b', 'a']);
});
