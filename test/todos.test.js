import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  addTodo,
  toggleTodo,
  editTodo,
  removeTodo,
  clearCompleted,
  filterTodos,
  countActive,
  loadTodos,
  saveTodos,
  MAX_LENGTH,
} from '../todos.js';

const sample = () => [
  {
    id: 'a',
    text: 'Comprar pan',
    completed: false,
    createdAt: 1,
    dueDate: '2026-11-10',
    priority: 'high',
  },
  { id: 'b', text: 'Estudiar', completed: true, createdAt: 2, dueDate: null, priority: 'medium' },
  {
    id: 'c',
    text: 'Llamar al banco',
    completed: false,
    createdAt: 3,
    dueDate: '2026-11-08',
    priority: 'low',
  },
];

function fakeStorage(initial = {}) {
  const data = { ...initial };
  return {
    getItem: (key) => (key in data ? data[key] : null),
    setItem: (key, value) => {
      data[key] = value;
    },
    data,
  };
}

test('addTodo agrega la tarea al final con el texto recortado', () => {
  const result = addTodo([], '  Regar las plantas  ', { id: 'x', now: 10 });
  assert.deepEqual(result, [
    {
      id: 'x',
      text: 'Regar las plantas',
      completed: false,
      createdAt: 10,
      dueDate: null,
      priority: 'medium',
    },
  ]);
});

test('addTodo ignora texto vacío o que no sea string', () => {
  const todos = sample();
  assert.equal(addTodo(todos, '   '), todos);
  assert.equal(addTodo(todos, ''), todos);
  assert.equal(addTodo(todos, null), todos);
});

test('addTodo limita el largo del texto', () => {
  const [todo] = addTodo([], 'a'.repeat(MAX_LENGTH + 50));
  assert.equal(todo.text.length, MAX_LENGTH);
});

test('addTodo genera ids distintos y no muta el array original', () => {
  const original = [];
  const one = addTodo(original, 'uno');
  const two = addTodo(one, 'dos');
  assert.equal(original.length, 0);
  assert.notEqual(two[0].id, two[1].id);
});

test('toggleTodo cambia solo la tarea indicada', () => {
  const result = toggleTodo(sample(), 'a');
  assert.equal(result[0].completed, true);
  assert.equal(result[1].completed, true);
  assert.equal(result[2].completed, false);
});

test('toggleTodo con un id inexistente no cambia nada', () => {
  assert.deepEqual(toggleTodo(sample(), 'zzz'), sample());
});

test('editTodo actualiza el texto recortado', () => {
  const result = editTodo(sample(), 'a', '  Comprar facturas ');
  assert.equal(result[0].text, 'Comprar facturas');
});

test('editTodo con texto vacío elimina la tarea', () => {
  const result = editTodo(sample(), 'a', '   ');
  assert.deepEqual(
    result.map((t) => t.id),
    ['b', 'c'],
  );
});

test('removeTodo elimina la tarea indicada', () => {
  assert.deepEqual(
    removeTodo(sample(), 'b').map((t) => t.id),
    ['a', 'c'],
  );
});

test('clearCompleted elimina solo las completadas', () => {
  assert.deepEqual(
    clearCompleted(sample()).map((t) => t.id),
    ['a', 'c'],
  );
});

test('filterTodos filtra por estado', () => {
  const todos = sample();
  assert.equal(filterTodos(todos, 'all').length, 3);
  assert.deepEqual(
    filterTodos(todos, 'active').map((t) => t.id),
    ['a', 'c'],
  );
  assert.deepEqual(
    filterTodos(todos, 'completed').map((t) => t.id),
    ['b'],
  );
});

test('filterTodos con un filtro desconocido devuelve todas', () => {
  assert.equal(filterTodos(sample(), 'otro').length, 3);
});

test('countActive cuenta las pendientes', () => {
  assert.equal(countActive(sample()), 2);
  assert.equal(countActive([]), 0);
});

test('saveTodos y loadTodos hacen un ida y vuelta', () => {
  const storage = fakeStorage();
  assert.equal(saveTodos(storage, 'k', sample()), true);
  assert.deepEqual(loadTodos(storage, 'k'), sample());
});

test('loadTodos devuelve [] si no hay nada guardado o no hay storage', () => {
  assert.deepEqual(loadTodos(fakeStorage(), 'k'), []);
  assert.deepEqual(loadTodos(null, 'k'), []);
});

test('loadTodos tolera JSON corrupto o con otra forma', () => {
  assert.deepEqual(loadTodos(fakeStorage({ k: '{no es json' }), 'k'), []);
  assert.deepEqual(loadTodos(fakeStorage({ k: '{"a":1}' }), 'k'), []);
});

test('loadTodos descarta entradas inválidas', () => {
  const raw = JSON.stringify([
    { id: 'a', text: 'ok', completed: false },
    { id: 1, text: 'id inválido', completed: false },
    null,
    'texto suelto',
  ]);
  const result = loadTodos(fakeStorage({ k: raw }), 'k');
  assert.deepEqual(
    result.map((t) => t.id),
    ['a'],
  );
});

test('saveTodos devuelve false si el storage falla', () => {
  const broken = {
    setItem() {
      throw new Error('cuota excedida');
    },
  };
  assert.equal(saveTodos(broken, 'k', sample()), false);
  assert.equal(saveTodos(null, 'k', sample()), false);
});
