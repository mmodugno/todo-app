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
} from './todos.js';

const STORAGE_KEY = 'todo-app:v1';
const EMPTY_MESSAGES = {
  all: 'Todavía no hay tareas. ¡Agregá la primera!',
  active: 'No tenés tareas pendientes.',
  completed: 'Todavía no completaste ninguna tarea.',
};

// Algunos navegadores lanzan error solo por acceder a localStorage (modo privado).
function getStorage() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

const storage = getStorage();
let todos = loadTodos(storage, STORAGE_KEY);
let filter = 'all';
let editingId = null;

const form = document.getElementById('todo-form');
const input = document.getElementById('new-todo');
const list = document.getElementById('todo-list');
const empty = document.getElementById('empty');
const counter = document.getElementById('counter');
const clearButton = document.getElementById('clear-completed');
const filterButtons = document.querySelectorAll('[data-filter]');

function commit() {
  saveTodos(storage, STORAGE_KEY, todos);
  render();
}

function renderEditor(todo) {
  const editor = document.createElement('input');
  editor.type = 'text';
  editor.className = 'edit';
  editor.value = todo.text;
  editor.maxLength = 200;
  editor.setAttribute('aria-label', 'Editar tarea');

  // Evita guardar dos veces (Enter y luego blur al reemplazar el input).
  let finished = false;
  const finish = (save) => {
    if (finished) return;
    finished = true;
    if (save) todos = editTodo(todos, todo.id, editor.value);
    editingId = null;
    commit();
  };

  editor.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') finish(true);
    else if (event.key === 'Escape') finish(false);
  });
  editor.addEventListener('blur', () => finish(true));

  queueMicrotask(() => {
    editor.focus();
    editor.select();
  });
  return editor;
}

function renderItem(todo) {
  const item = document.createElement('li');
  item.className = todo.completed ? 'todo completed' : 'todo';
  item.dataset.id = todo.id;

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = todo.completed;
  checkbox.setAttribute('aria-label', `Marcar "${todo.text}" como completada`);
  checkbox.addEventListener('change', () => {
    todos = toggleTodo(todos, todo.id);
    commit();
  });
  item.append(checkbox);

  if (editingId === todo.id) {
    item.append(renderEditor(todo));
    return item;
  }

  const text = document.createElement('span');
  text.className = 'text';
  text.textContent = todo.text;
  text.addEventListener('dblclick', () => {
    editingId = todo.id;
    render();
  });

  const remove = document.createElement('button');
  remove.type = 'button';
  remove.className = 'delete';
  remove.textContent = '×';
  remove.setAttribute('aria-label', `Eliminar "${todo.text}"`);
  remove.addEventListener('click', () => {
    todos = removeTodo(todos, todo.id);
    commit();
  });

  item.append(text, remove);
  return item;
}

function render() {
  const visible = filterTodos(todos, filter);
  list.replaceChildren(...visible.map(renderItem));

  empty.hidden = visible.length > 0;
  empty.textContent = EMPTY_MESSAGES[filter];

  const active = countActive(todos);
  counter.textContent = active === 1 ? '1 tarea pendiente' : `${active} tareas pendientes`;
  clearButton.disabled = active === todos.length;

  for (const button of filterButtons) {
    const isActive = button.dataset.filter === filter;
    button.classList.toggle('active', isActive);
    button.setAttribute('aria-pressed', String(isActive));
  }
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  todos = addTodo(todos, input.value);
  input.value = '';
  commit();
});

for (const button of filterButtons) {
  button.addEventListener('click', () => {
    filter = button.dataset.filter;
    render();
  });
}

clearButton.addEventListener('click', () => {
  todos = clearCompleted(todos);
  commit();
});

render();
