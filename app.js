import {
  addTodo,
  toggleTodo,
  editTodo,
  updateTodo,
  takeTodos,
  restoreTodos,
  exportTodos,
  parseImport,
  mergeTodos,
  filterTodos,
  searchTodos,
  filterByTag,
  allTags,
  formatTodoText,
  sortTodos,
  countActive,
  dueStatus,
  todayString,
  loadTodos,
  saveTodos,
} from './todos.js';
import { resolveTheme, nextTheme, loadTheme, saveTheme } from './theme.js';

const STORAGE_KEY = 'todo-app:v1';
const EMPTY_MESSAGES = {
  all: 'No hay tareas todavía. Escribí la primera arriba.',
  active: 'No quedan tareas pendientes.',
  completed: 'Todavía no completaste ninguna tarea.',
};
const NO_MATCH_MESSAGE = 'Ninguna tarea coincide con la búsqueda.';
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
let query = '';
let activeTag = null;
let editingId = null;

const form = document.getElementById('todo-form');
const input = document.getElementById('new-todo');
const dueInput = document.getElementById('new-due');
const priorityInput = document.getElementById('new-priority');
const sortSelect = document.getElementById('sort');
const searchInput = document.getElementById('search');
const tagBar = document.getElementById('tags');
const list = document.getElementById('todo-list');
const empty = document.getElementById('empty');
const counter = document.getElementById('counter');
const clearButton = document.getElementById('clear-completed');
const filterButtons = document.querySelectorAll('[data-filter]');
const todayHeading = document.getElementById('today');
const exportButton = document.getElementById('export');
const importButton = document.getElementById('import');
const importFile = document.getElementById('import-file');
const toast = document.getElementById('toast');
const toastMessage = document.getElementById('toast-message');
const toastUndo = document.getElementById('toast-undo');

// ---------- Tema claro / oscuro ----------

const root = document.documentElement;
const themeToggle = document.getElementById('theme-toggle');
const systemDark = window.matchMedia('(prefers-color-scheme: dark)');

const themeColor = document.querySelector('meta[name="theme-color"]');

// Cambia el tema y pinta del mismo color la barra del navegador en el celular.
function applyTheme(theme) {
  root.dataset.theme = theme;
  themeColor.content = theme === 'dark' ? '#10143a' : '#fbfbf9';
}

themeToggle.addEventListener('click', () => {
  const theme = nextTheme(root.dataset.theme);
  applyTheme(theme);
  saveTheme(storage, theme);
});

// Si nunca elegiste un tema, la app acompaña los cambios del sistema.
systemDark.addEventListener('change', (event) => {
  if (loadTheme(storage) === null) applyTheme(resolveTheme(null, event.matches));
});

function commit() {
  saveTodos(storage, STORAGE_KEY, todos);
  render();
}

// ---------- Aviso con "Deshacer" ----------

const TOAST_MS = 7000;
let toastTimer = null;
let undoAction = null;

function hideToast() {
  clearTimeout(toastTimer);
  toast.hidden = true;
  undoAction = null;
}

function showToast(message, onUndo) {
  clearTimeout(toastTimer);
  toastMessage.textContent = message;
  undoAction = onUndo ?? null;
  toastUndo.hidden = !onUndo;
  toast.hidden = false;
  toastTimer = setTimeout(hideToast, TOAST_MS);
}

toastUndo.addEventListener('click', () => {
  const action = undoAction;
  hideToast();
  action?.();
});

// Elimina las tareas que cumplen la condición y ofrece deshacerlo.
function removeWithUndo(predicate) {
  const { remaining, removed } = takeTodos(todos, predicate);
  if (removed.length === 0) return;
  todos = remaining;
  commit();
  showToast(removed.length === 1 ? 'Tarea eliminada' : `${removed.length} tareas eliminadas`, () => {
    todos = restoreTodos(todos, removed);
    commit();
  });
}

// ---------- Exportar e importar ----------

function downloadFile(filename, content, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function importMessage({ added, duplicates, skipped }) {
  if (added === 0) return 'No hay tareas nuevas para importar';
  const parts = [added === 1 ? 'Se importó 1 tarea' : `Se importaron ${added} tareas`];
  if (duplicates > 0) parts.push(duplicates === 1 ? '1 ya estaba' : `${duplicates} ya estaban`);
  if (skipped > 0) parts.push(skipped === 1 ? '1 no era válida' : `${skipped} no eran válidas`);
  return parts.join(', ');
}

async function importFromFile(file) {
  let text;
  try {
    text = await file.text();
  } catch {
    showToast('No se pudo leer el archivo');
    return;
  }
  const parsed = parseImport(text);
  if (!parsed.ok) {
    showToast(`No se pudo importar: ${parsed.error}`);
    return;
  }
  const { todos: merged, added, duplicates } = mergeTodos(todos, parsed.todos);
  todos = merged;
  commit();
  const addedIds = new Set(added.map((todo) => todo.id));
  const message = importMessage({ added: added.length, duplicates, skipped: parsed.skipped });
  showToast(
    message,
    added.length === 0
      ? undefined
      : () => {
          todos = takeTodos(todos, (todo) => addedIds.has(todo.id)).remaining;
          commit();
        },
  );
}

exportButton.addEventListener('click', () => {
  downloadFile(`tareas-${todayString()}.json`, exportTodos(todos), 'application/json');
});

importButton.addEventListener('click', () => importFile.click());

importFile.addEventListener('change', async () => {
  const [file] = importFile.files;
  importFile.value = ''; // permite volver a elegir el mismo archivo
  if (file) await importFromFile(file);
});

function formatDate(isoDate) {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'short',
  });
}

// El encabezado es la fecha de hoy, como al empezar una hoja nueva del cuaderno.
function renderDate(now = new Date()) {
  const weekday = now.toLocaleDateString('es-AR', { weekday: 'long' });
  const month = now.toLocaleDateString('es-AR', { month: 'long' });
  const first = document.createElement('span');
  first.className = 'day-line';
  first.textContent = `${weekday} ${now.getDate()}`;
  const second = document.createElement('span');
  second.className = 'day-line';
  second.textContent = `de ${month}`;
  todayHeading.dateTime = todayString(now);
  todayHeading.replaceChildren(first, second);
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
    if (status === 'overdue') meta.append(createBadge('due overdue', `Vencida el ${date}`));
    else if (status === 'today') meta.append(createBadge('due today', 'Vence hoy'));
    else meta.append(createBadge('due', `Vence ${date}`));
  }
  if (todo.priority === 'low') meta.append(createBadge('priority-low', 'Prioridad baja'));
  for (const tag of todo.tags) {
    const badge = document.createElement('button');
    badge.type = 'button';
    badge.className = 'badge tag';
    badge.textContent = `#${tag}`;
    badge.setAttribute('aria-label', `Filtrar por la etiqueta ${tag}`);
    badge.addEventListener('click', () => toggleTag(tag));
    meta.append(badge);
  }
  return meta;
}

function renderEditor(todo) {
  const editor = document.createElement('form');
  editor.className = 'edit-form';

  const text = document.createElement('input');
  text.type = 'text';
  text.className = 'edit';
  text.value = formatTodoText(todo);
  text.maxLength = 200;
  text.setAttribute('aria-label', 'Editar tarea (podés usar #etiquetas)');

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

  if (todo.priority === 'high') {
    const mark = document.createElement('span');
    mark.className = 'priority-mark high';
    const hidden = document.createElement('span');
    hidden.className = 'sr-only';
    hidden.textContent = 'Prioridad alta';
    const symbol = document.createElement('span');
    symbol.setAttribute('aria-hidden', 'true');
    symbol.textContent = '!!';
    mark.append(hidden, symbol);
    item.append(mark);
  }

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
  remove.addEventListener('click', () => removeWithUndo((t) => t.id === todo.id));

  item.append(content, remove);
  return item;
}

function toggleTag(tag) {
  activeTag = activeTag === tag ? null : tag;
  render();
}

function renderTagBar(tags) {
  tagBar.hidden = tags.length === 0;
  tagBar.replaceChildren(
    ...tags.map(({ tag, count }) => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = tag === activeTag ? 'chip active' : 'chip';
      const total = document.createElement('span');
      total.className = 'count';
      total.textContent = count;
      chip.append(`#${tag} `, total);
      chip.setAttribute('aria-pressed', String(tag === activeTag));
      chip.addEventListener('click', () => toggleTag(tag));
      return chip;
    }),
  );
}

function render() {
  const today = todayString();
  renderDate();
  const tags = allTags(todos);
  // Si ya no quedan tareas con la etiqueta seleccionada, se quita el filtro.
  if (activeTag && !tags.some(({ tag }) => tag === activeTag)) activeTag = null;

  const matching = filterByTag(searchTodos(filterTodos(todos, filter), query), activeTag);
  const visible = sortTodos(matching, sort);
  list.replaceChildren(...visible.map((todo) => renderItem(todo, today)));
  renderTagBar(tags);

  empty.hidden = visible.length > 0;
  empty.textContent = query || activeTag ? NO_MATCH_MESSAGE : EMPTY_MESSAGES[filter];

  const active = countActive(todos);
  counter.textContent =
    active === 0 ? 'Nada pendiente' : active === 1 ? '1 tarea por hacer' : `${active} tareas por hacer`;
  clearButton.disabled = active === todos.length;
  exportButton.disabled = todos.length === 0;

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

searchInput.addEventListener('input', () => {
  query = searchInput.value;
  render();
});

sortSelect.addEventListener('change', () => {
  sort = sortSelect.value;
  render();
});

clearButton.addEventListener('click', () => removeWithUndo((t) => t.completed));

render();

// Permite instalar la app y usarla sin conexión.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      // Sin service worker la app funciona igual, solo que no abre sin conexión.
    });
  });
}
