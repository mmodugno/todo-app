import {
  addTodo,
  toggleTodo,
  editTodo,
  updateTodo,
  removeTodo,
  clearCompleted,
  filterTodos,
  sortTodos,
  countActive,
  dueStatus,
  todayString,
  loadTodos,
  saveTodos,
} from './todos.js';

const STORAGE_KEY = 'todo-app:v1';
const EMPTY_MESSAGES = {
  all: 'Todavía no hay tareas. ¡Agregá la primera!',
  active: 'No tenés tareas pendientes.',
  completed: 'Todavía no completaste ninguna tarea.',
};
const PRIORITY_LABELS = { high: 'Alta', medium: 'Media', low: 'Baja' };

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
let sort = 'added';
let editingId = null;

const form = document.getElementById('todo-form');
const input = document.getElementById('new-todo');
const dueInput = document.getElementById('new-due');
const priorityInput = document.getElementById('new-priority');
const sortSelect = document.getElementById('sort');
const list = document.getElementById('todo-list');
const empty = document.getElementById('empty');
const counter = document.getElementById('counter');
const clearButton = document.getElementById('clear-completed');
const filterButtons = document.querySelectorAll('[data-filter]');

function commit() {
  saveTodos(storage, STORAGE_KEY, todos);
  render();
}

function formatDate(isoDate) {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'short',
  });
}

function createBadge(className, text) {
  const badge = document.createElement('span');
  badge.className = `badge ${className}`;
  badge.textContent = text;
  return badge;
}

function renderMeta(todo, today) {
  const meta = document.createElement('div');
  meta.className = 'meta';

  if (todo.dueDate) {
    const status = dueStatus(todo, today);
    const date = formatDate(todo.dueDate);
    if (status === 'overdue') meta.append(createBadge('due overdue', `Vencida · ${date}`));
    else if (status === 'today') meta.append(createBadge('due today', 'Vence hoy'));
    else meta.append(createBadge('due', `Vence ${date}`));
  }
  if (todo.priority !== 'medium') {
    meta.append(createBadge(`priority-${todo.priority}`, PRIORITY_LABELS[todo.priority]));
  }
  return meta;
}

function renderEditor(todo) {
  const editor = document.createElement('form');
  editor.className = 'edit-form';

  const text = document.createElement('input');
  text.type = 'text';
  text.className = 'edit';
  text.value = todo.text;
  text.maxLength = 200;
  text.setAttribute('aria-label', 'Editar tarea');

  const due = document.createElement('input');
  due.type = 'date';
  due.value = todo.dueDate ?? '';
  due.setAttribute('aria-label', 'Fecha de vencimiento');

  const priority = document.createElement('select');
  priority.setAttribute('aria-label', 'Prioridad');
  for (const [value, label] of Object.entries(PRIORITY_LABELS)) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    option.selected = value === todo.priority;
    priority.append(option);
  }

  const save = document.createElement('button');
  save.type = 'submit';
  save.className = 'primary-small';
  save.textContent = 'Guardar';

  const cancel = document.createElement('button');
  cancel.type = 'button';
  cancel.className = 'link-button';
  cancel.textContent = 'Cancelar';

  // Evita procesar dos veces el mismo cierre (por ejemplo submit y luego Escape).
  let finished = false;
  const finish = (shouldSave) => {
    if (finished) return;
    finished = true;
    if (shouldSave) {
      todos = editTodo(todos, todo.id, text.value);
      todos = updateTodo(todos, todo.id, {
        dueDate: due.value || null,
        priority: priority.value,
      });
    }
    editingId = null;
    commit();
  };

  editor.addEventListener('submit', (event) => {
    event.preventDefault();
    finish(true);
  });
  editor.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') finish(false);
  });
  cancel.addEventListener('click', () => finish(false));

  editor.append(text, due, priority, save, cancel);
  queueMicrotask(() => {
    text.focus();
    text.select();
  });
  return editor;
}

function renderItem(todo, today) {
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

  const content = document.createElement('div');
  content.className = 'content';

  const text = document.createElement('span');
  text.className = 'text';
  text.textContent = todo.text;
  text.addEventListener('dblclick', () => {
    editingId = todo.id;
    render();
  });
  content.append(text, renderMeta(todo, today));

  const remove = document.createElement('button');
  remove.type = 'button';
  remove.className = 'delete';
  remove.textContent = '×';
  remove.setAttribute('aria-label', `Eliminar "${todo.text}"`);
  remove.addEventListener('click', () => {
    todos = removeTodo(todos, todo.id);
    commit();
  });

  item.append(content, remove);
  return item;
}

function render() {
  const today = todayString();
  const visible = sortTodos(filterTodos(todos, filter), sort);
  list.replaceChildren(...visible.map((todo) => renderItem(todo, today)));

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
  todos = addTodo(todos, input.value, {
    dueDate: dueInput.value,
    priority: priorityInput.value,
  });
  input.value = '';
  dueInput.value = '';
  priorityInput.value = 'medium';
  commit();
});

for (const button of filterButtons) {
  button.addEventListener('click', () => {
    filter = button.dataset.filter;
    render();
  });
}

sortSelect.addEventListener('change', () => {
  sort = sortSelect.value;
  render();
});

clearButton.addEventListener('click', () => {
  todos = clearCompleted(todos);
  commit();
});

render();
