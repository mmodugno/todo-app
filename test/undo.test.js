import { test } from 'node:test';
import assert from 'node:assert/strict';
import { takeTodos, restoreTodos, addTodo } from '../todos.js';

const todo = (id, completed = false) => ({
  id,
  text: `Tarea ${id}`,
  completed,
  createdAt: 1,
  dueDate: null,
  priority: 'medium',
  tags: [],
});
const ids = (todos) => todos.map((t) => t.id);

test('takeTodos separa las tareas que cumplen la condición y recuerda su posición', () => {
  const todos = [todo('a'), todo('b', true), todo('c'), todo('d', true)];
  const { remaining, removed } = takeTodos(todos, (t) => t.completed);
  assert.deepEqual(ids(remaining), ['a', 'c']);
  assert.deepEqual(
    removed.map(({ todo: t, index }) => [t.id, index]),
    [
      ['b', 1],
      ['d', 3],
    ],
  );
});

test('takeTodos no muta el array original', () => {
  const todos = [todo('a'), todo('b')];
  takeTodos(todos, (t) => t.id === 'a');
  assert.deepEqual(ids(todos), ['a', 'b']);
});

test('takeTodos sin coincidencias devuelve todo en remaining', () => {
  const todos = [todo('a')];
  const { remaining, removed } = takeTodos(todos, () => false);
  assert.deepEqual(ids(remaining), ['a']);
  assert.deepEqual(removed, []);
});

test('restoreTodos devuelve una tarea a su lugar original', () => {
  const original = [todo('a'), todo('b'), todo('c')];
  const { remaining, removed } = takeTodos(original, (t) => t.id === 'b');
  assert.deepEqual(ids(restoreTodos(remaining, removed)), ['a', 'b', 'c']);
});

test('restoreTodos recompone varias tareas, incluso las del principio y del final', () => {
  const original = [todo('a', true), todo('b'), todo('c', true), todo('d'), todo('e', true)];
  const { remaining, removed } = takeTodos(original, (t) => t.completed);
  assert.deepEqual(ids(restoreTodos(remaining, removed)), ['a', 'b', 'c', 'd', 'e']);
});

test('restoreTodos respeta las tareas agregadas después de borrar', () => {
  const original = [todo('a'), todo('b'), todo('c')];
  const { remaining, removed } = takeTodos(original, (t) => t.id === 'a');
  const withNew = addTodo(remaining, 'Nueva', { id: 'n' });
  assert.deepEqual(ids(restoreTodos(withNew, removed)), ['a', 'b', 'c', 'n']);
});

test('restoreTodos ajusta la posición si la lista quedó más corta', () => {
  const removed = [{ todo: todo('z'), index: 10 }];
  assert.deepEqual(ids(restoreTodos([todo('a')], removed)), ['a', 'z']);
});

test('restoreTodos no duplica tareas que ya están en la lista', () => {
  const removed = [{ todo: todo('a'), index: 0 }];
  assert.deepEqual(ids(restoreTodos([todo('a')], removed)), ['a']);
});
