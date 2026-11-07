import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  addTodo,
  editTodo,
  parseTags,
  formatTodoText,
  searchTodos,
  filterByTag,
  allTags,
  normalizeTodo,
} from '../todos.js';

const todo = (overrides) => ({
  id: 'x',
  text: 'Tarea',
  completed: false,
  createdAt: 1,
  dueDate: null,
  priority: 'medium',
  tags: [],
  ...overrides,
});
const ids = (todos) => todos.map((t) => t.id);

test('parseTags separa las etiquetas del texto', () => {
  assert.deepEqual(parseTags('Comprar pan #casa #Urgente'), {
    text: 'Comprar pan',
    tags: ['casa', 'urgente'],
  });
});

test('parseTags acepta etiquetas en cualquier posición y con acentos', () => {
  assert.deepEqual(parseTags('#estudio leer capítulo #matemática'), {
    text: 'leer capítulo',
    tags: ['estudio', 'matemática'],
  });
});

test('parseTags no toma como etiqueta un # pegado a una palabra', () => {
  assert.deepEqual(parseTags('Aprender C# hoy'), { text: 'Aprender C# hoy', tags: [] });
});

test('parseTags elimina duplicados y tolera valores no string', () => {
  assert.deepEqual(parseTags('a #x #X #x').tags, ['x']);
  assert.deepEqual(parseTags(null), { text: '', tags: [] });
});

test('addTodo guarda las etiquetas y deja el texto limpio', () => {
  const [created] = addTodo([], 'Regar plantas #casa', { id: 'p' });
  assert.equal(created.text, 'Regar plantas');
  assert.deepEqual(created.tags, ['casa']);
});

test('addTodo ignora un texto formado solo por etiquetas', () => {
  const original = [];
  assert.equal(addTodo(original, '#casa #trabajo'), original);
});

test('editTodo reemplaza las etiquetas por las del nuevo texto', () => {
  const todos = [todo({ text: 'Vieja', tags: ['casa'] })];
  const [edited] = editTodo(todos, 'x', 'Nueva #trabajo');
  assert.equal(edited.text, 'Nueva');
  assert.deepEqual(edited.tags, ['trabajo']);
});

test('formatTodoText devuelve el texto seguido de las etiquetas', () => {
  assert.equal(formatTodoText(todo({ text: 'Comprar pan', tags: ['casa', 'urgente'] })), 'Comprar pan #casa #urgente');
  assert.equal(formatTodoText(todo({ text: 'Solo texto' })), 'Solo texto');
});

test('formatTodoText y parseTags se pueden encadenar sin perder datos', () => {
  const original = todo({ text: 'Llamar al banco', tags: ['trámites', 'casa'] });
  const roundTrip = parseTags(formatTodoText(original));
  assert.equal(roundTrip.text, original.text);
  assert.deepEqual(roundTrip.tags, original.tags);
});

test('normalizeTodo limpia etiquetas inválidas de datos guardados', () => {
  const dirty = todo({ tags: [' Casa ', 'casa', 5, '', null] });
  assert.deepEqual(normalizeTodo(dirty).tags, ['casa']);
  assert.deepEqual(normalizeTodo(todo({ tags: 'casa' })).tags, []);
});

const list = () => [
  todo({ id: 'a', text: 'Comprar café', tags: ['casa'] }),
  todo({ id: 'b', text: 'Estudiar Matemática', tags: ['estudio'] }),
  todo({ id: 'c', text: 'Llamar al banco', tags: ['casa', 'trámites'] }),
];

test('searchTodos ignora mayúsculas y acentos', () => {
  assert.deepEqual(ids(searchTodos(list(), 'CAFE')), ['a']);
  assert.deepEqual(ids(searchTodos(list(), 'matematica')), ['b']);
});

test('searchTodos también busca en las etiquetas, con o sin #', () => {
  assert.deepEqual(ids(searchTodos(list(), '#tramites')), ['c']);
  assert.deepEqual(ids(searchTodos(list(), 'estudio')), ['b']);
});

test('searchTodos con búsqueda vacía devuelve todo', () => {
  const todos = list();
  assert.equal(searchTodos(todos, '   '), todos);
  assert.equal(searchTodos(todos, undefined), todos);
});

test('searchTodos sin coincidencias devuelve una lista vacía', () => {
  assert.deepEqual(searchTodos(list(), 'zzz'), []);
});

test('filterByTag filtra por etiqueta exacta y sin etiqueta devuelve todo', () => {
  assert.deepEqual(ids(filterByTag(list(), 'casa')), ['a', 'c']);
  assert.equal(filterByTag(list(), null).length, 3);
  assert.deepEqual(filterByTag(list(), 'cas'), []);
});

test('allTags cuenta y ordena de la más usada a la menos usada', () => {
  assert.deepEqual(allTags(list()), [
    { tag: 'casa', count: 2 },
    { tag: 'estudio', count: 1 },
    { tag: 'trámites', count: 1 },
  ]);
  assert.deepEqual(allTags([]), []);
});
