import { test } from 'node:test';
import assert from 'node:assert/strict';
import { exportTodos, parseImport, mergeTodos, MAX_LENGTH } from '../todos.js';

const todo = (id, overrides = {}) => ({
  id,
  text: `Tarea ${id}`,
  completed: false,
  createdAt: 1,
  dueDate: null,
  priority: 'medium',
  tags: [],
  ...overrides,
});
const ids = (todos) => todos.map((t) => t.id);

test('exportTodos genera un JSON con versión, fecha y tareas', () => {
  const json = exportTodos([todo('a')], new Date('2026-11-07T12:00:00Z'));
  const data = JSON.parse(json);
  assert.equal(data.app, 'todo-app');
  assert.equal(data.version, 1);
  assert.equal(data.exportedAt, '2026-11-07T12:00:00.000Z');
  assert.deepEqual(data.todos, [todo('a')]);
});

test('lo exportado se puede importar sin perder datos', () => {
  const original = [
    todo('a', { dueDate: '2026-12-01', priority: 'high', tags: ['casa'] }),
    todo('b', { completed: true }),
  ];
  const result = parseImport(exportTodos(original));
  assert.equal(result.ok, true);
  assert.deepEqual(result.todos, original);
  assert.equal(result.skipped, 0);
});

test('parseImport acepta también una lista suelta', () => {
  const result = parseImport(JSON.stringify([todo('a')]));
  assert.equal(result.ok, true);
  assert.deepEqual(ids(result.todos), ['a']);
});

test('parseImport rechaza texto que no es JSON', () => {
  const result = parseImport('esto no es json');
  assert.equal(result.ok, false);
  assert.match(result.error, /JSON válido/);
});

test('parseImport rechaza JSON sin lista de tareas', () => {
  for (const text of ['{"foo":1}', '42', 'null', '"hola"']) {
    const result = parseImport(text);
    assert.equal(result.ok, false, text);
    assert.match(result.error, /lista de tareas/);
  }
});

test('parseImport rechaza una lista sin tareas válidas', () => {
  for (const text of ['[]', '[{"id":1}]', '[null,"x"]']) {
    const result = parseImport(text);
    assert.equal(result.ok, false, text);
    assert.match(result.error, /tareas válidas/);
  }
});

test('parseImport descarta entradas inválidas y cuenta cuántas salteó', () => {
  const raw = JSON.stringify([todo('a'), { id: 'b' }, null, todo('c', { text: '   ' })]);
  const result = parseImport(raw);
  assert.equal(result.ok, true);
  assert.deepEqual(ids(result.todos), ['a']);
  assert.equal(result.skipped, 3);
});

test('parseImport normaliza los campos de archivos viejos o editados a mano', () => {
  const raw = JSON.stringify([
    { id: 'a', text: '  Vieja  ', completed: false, priority: 'urgente', dueDate: '31/12' },
    { id: 'b', text: 'x'.repeat(MAX_LENGTH + 20), completed: true, tags: ['Casa', 'casa'] },
  ]);
  const { todos } = parseImport(raw);
  assert.equal(todos[0].text, 'Vieja');
  assert.equal(todos[0].priority, 'medium');
  assert.equal(todos[0].dueDate, null);
  assert.equal(todos[1].text.length, MAX_LENGTH);
  assert.deepEqual(todos[1].tags, ['casa']);
});

test('mergeTodos agrega las nuevas al final y saltea las que ya existen', () => {
  const current = [todo('a'), todo('b')];
  const incoming = [todo('b', { text: 'Otra versión' }), todo('c')];
  const result = mergeTodos(current, incoming);
  assert.deepEqual(ids(result.todos), ['a', 'b', 'c']);
  assert.deepEqual(ids(result.added), ['c']);
  assert.equal(result.duplicates, 1);
  assert.equal(result.todos[1].text, 'Tarea b', 'no pisa la tarea existente');
});

test('mergeTodos detecta ids repetidos dentro del mismo archivo', () => {
  const result = mergeTodos([], [todo('a'), todo('a'), todo('b')]);
  assert.deepEqual(ids(result.todos), ['a', 'b']);
  assert.equal(result.duplicates, 1);
});

test('mergeTodos no muta la lista actual', () => {
  const current = [todo('a')];
  mergeTodos(current, [todo('b')]);
  assert.deepEqual(ids(current), ['a']);
});
