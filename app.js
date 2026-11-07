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
  MAX_LENGTH,
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

// Crea un elemento: el: el('button', { type: 'button', className: 'x' }, 'texto', otroNodo).
function el(tag, props = {}, ...children) {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...children);
  return node;
}

// "1 tarea" / "3 tareas".
function plural(count, one, many) {
  return `${count} ${count === 1 ? one : many}`;
}

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
  if (duplicates > 0) parts.push(plural(duplicates, 'ya estaba', 'ya estaban'));
  if (skipped > 0) parts.push(plural(skipped, 'no era válida', 'no eran válidas'));
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
  todayHeading.dateTime = todayString(now);
  todayHeading.replaceChildren(
    el('span', { className: 'day-line', textContent: `${weekday} ${now.getDate()}` }),
    el('span', { className: 'day-line', textContent: `de ${month}` }),
  );
}

function createBadge(className, text) {
  return el('span', { className: `badge ${className}`, textContent: text });
}

function renderMeta(todo, today) {
  const meta = el('div', { className: 'meta' });

  if (todo.dueDate) {
    const status = dueStatus(todo, today);
    const date = formatDate(todo.dueDate);
    if (status === 'overdue') meta.append(createBadge('due overdue', `Vencida el ${date}`));
    else if (status === 'today') meta.append(createBadge('due today', 'Vence hoy'));
    else meta.append(createBadge('due', `Vence ${date}`));
  }
  if (todo.priority === 'low') meta.append(createBadge('priority-low', 'Prioridad baja'));
  for (const tag of todo.tags) {
    meta.append(
      el('button', {
        type: 'button',
        className: 'badge tag',
        textContent: `#${tag}`,
        ariaLabel: `Filtrar por la etiqueta ${tag}`,
        onclick: () => toggleTag(tag),
      }),
    );
  }
  return meta;
}

function renderEditor(todo) {
  const text = el('input', {
    type: 'text',
    className: 'edit',
    value: formatTodoText(todo),
    maxLength: MAX_LENGTH,
    ariaLabel: 'Editar tarea (podés usar #etiquetas)',
  });
  const due = el('input', {
    type: 'date',
    value: todo.dueDate ?? '',
    ariaLabel: 'Fecha de vencimiento',
  });
  const priority = el(
    'select',
    { ariaLabel: 'Prioridad' },
    ...Object.entries(PRIORITY_LABELS).map(([value, label]) =>
      el('option', { value, textContent: label, selected: value === todo.priority }),
    ),
  );
  const save = el('button', { type: 'submit', className: 'primary-small', textContent: 'Guardar' });
  const cancel = el('button', { type: 'button', className: 'link-button', textContent: 'Cancelar' });
  const editor = el('form', { className: 'edit-form' }, text, due, priority, save, cancel);

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

  queueMicrotask(() => {
    text.focus();
    text.select();
  });
  return editor;
}

function renderItem(todo, today) {
  const item = el('li', { className: todo.completed ? 'todo completed' : 'todo' });
  item.dataset.id = todo.id;

  if (todo.priority === 'high') {
    item.append(
      el(
        'span',
        { className: 'priority-mark high' },
        el('span', { className: 'sr-only', textContent: 'Prioridad alta' }),
        el('span', { ariaHidden: 'true', textContent: '!!' }),
      ),
    );
  }

  item.append(
    el('input', {
      type: 'checkbox',
      checked: todo.completed,
      ariaLabel: `Marcar "${todo.text}" como completada`,
      onchange: () => {
        todos = toggleTodo(todos, todo.id);
        commit();
      },
    }),
  );

  if (editingId === todo.id) {
    item.append(renderEditor(todo));
    return item;
  }

  const text = el('span', {
    className: 'text',
    textContent: todo.text,
    ondblclick: () => {
      editingId = todo.id;
      render();
    },
  });
  const remove = el('button', {
    type: 'button',
    className: 'delete',
    textContent: '×',
    ariaLabel: `Eliminar "${todo.text}"`,
    onclick: () => removeWithUndo((t) => t.id === todo.id),
  });

  item.append(el('div', { className: 'content' }, text, renderMeta(todo, today)), remove);
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
      return el(
        'button',
        {
          type: 'button',
          className: tag === activeTag ? 'chip active' : 'chip',
          ariaPressed: String(tag === activeTag),
          onclick: () => toggleTag(tag),
        },
        `#${tag} `,
        el('span', { className: 'count', textContent: count }),
      );
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
    active === 0 ? 'Nada pendiente' : `${plural(active, 'tarea', 'tareas')} por hacer`;
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
