// Lógica pura de la lista de tareas: sin DOM, sin efectos secundarios (salvo
// loadTodos/saveTodos, que reciben el storage por parámetro). Todas las
// funciones devuelven un array nuevo y nunca mutan el original.

export const FILTERS = ['all', 'active', 'completed'];
export const PRIORITIES = ['high', 'medium', 'low'];
export const SORTS = ['added', 'priority', 'due', 'newest'];
export const MAX_LENGTH = 200;

const PRIORITY_RANK = { high: 0, medium: 1, low: 2 };
const NO_DATE = '9999-12-31';

function generateId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeText(text) {
  return typeof text === 'string' ? text.trim().slice(0, MAX_LENGTH) : '';
}

// Fechas en formato ISO local (AAAA-MM-DD), el mismo que usa <input type="date">.
export function isValidDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function todayString(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function normalizeTags(tags) {
  if (!Array.isArray(tags)) return [];
  const clean = tags
    .filter((tag) => typeof tag === 'string')
    .map((tag) => tag.trim().toLowerCase())
    .filter(Boolean);
  return [...new Set(clean)];
}

// Separa las #etiquetas del texto: "Comprar pan #casa" -> { text: "Comprar pan", tags: ["casa"] }.
// Solo cuenta como etiqueta un # que esté al inicio o después de un espacio (así "C#" queda intacto).
export function parseTags(text) {
  const raw = typeof text === 'string' ? text : '';
  const found = [];
  const withoutTags = raw.replace(/(^|\s)#([\p{L}\p{N}_-]+)/gu, (_, space, tag) => {
    found.push(tag);
    return space;
  });
  return { text: withoutTags.replace(/\s+/g, ' ').trim(), tags: normalizeTags(found) };
}

// Texto tal como se edita: el título seguido de sus #etiquetas.
export function formatTodoText(todo) {
  return [todo.text, ...todo.tags.map((tag) => `#${tag}`)].join(' ');
}

// Completa los campos opcionales con valores por defecto y descarta los inválidos.
// Así los datos guardados por versiones anteriores siguen funcionando.
export function normalizeTodo(todo) {
  return {
    id: todo.id,
    text: todo.text,
    completed: todo.completed,
    createdAt: Number.isFinite(todo.createdAt) ? todo.createdAt : 0,
    dueDate: isValidDate(todo.dueDate) ? todo.dueDate : null,
    priority: PRIORITIES.includes(todo.priority) ? todo.priority : 'medium',
    tags: normalizeTags(todo.tags),
  };
}

export function addTodo(
  todos,
  text,
  { id = generateId(), now = Date.now(), dueDate = null, priority = 'medium' } = {},
) {
  const parsed = parseTags(text);
  const clean = normalizeText(parsed.text);
  if (!clean) return todos;
  return [
    ...todos,
    normalizeTodo({
      id,
      text: clean,
      completed: false,
      createdAt: now,
      dueDate,
      priority,
      tags: parsed.tags,
    }),
  ];
}

export function toggleTodo(todos, id) {
  return todos.map((todo) =>
    todo.id === id ? { ...todo, completed: !todo.completed } : todo,
  );
}

// Si el texto queda vacío, la tarea se elimina (mismo comportamiento que TodoMVC).
export function editTodo(todos, id, text) {
  const parsed = parseTags(text);
  const clean = normalizeText(parsed.text);
  if (!clean) return removeTodo(todos, id);
  return todos.map((todo) =>
    todo.id === id ? { ...todo, text: clean, tags: parsed.tags } : todo,
  );
}

// Cambia la fecha de vencimiento y/o la prioridad. Lo que no se pasa, no se toca.
export function updateTodo(todos, id, { dueDate, priority } = {}) {
  return todos.map((todo) => {
    if (todo.id !== id) return todo;
    return normalizeTodo({
      ...todo,
      ...(dueDate !== undefined && { dueDate }),
      ...(priority !== undefined && { priority }),
    });
  });
}

export function removeTodo(todos, id) {
  return todos.filter((todo) => todo.id !== id);
}

// Quita las tareas que cumplen la condición y devuelve también la posición que
// tenían, para poder deshacerlo con restoreTodos.
export function takeTodos(todos, predicate) {
  const remaining = [];
  const removed = [];
  todos.forEach((todo, index) => {
    if (predicate(todo)) removed.push({ todo, index });
    else remaining.push(todo);
  });
  return { remaining, removed };
}

// Vuelve a insertar las tareas quitadas en su posición original. Si la lista
// cambió mientras tanto, ajusta la posición y evita duplicar tareas.
export function restoreTodos(todos, removed) {
  const present = new Set(todos.map((todo) => todo.id));
  const result = [...todos];
  const ordered = [...removed].sort((a, b) => a.index - b.index);
  for (const { todo, index } of ordered) {
    if (present.has(todo.id)) continue;
    result.splice(Math.min(index, result.length), 0, todo);
  }
  return result;
}

export function clearCompleted(todos) {
  return todos.filter((todo) => !todo.completed);
}

export function filterTodos(todos, filter) {
  switch (filter) {
    case 'active':
      return todos.filter((todo) => !todo.completed);
    case 'completed':
      return todos.filter((todo) => todo.completed);
    default:
      return todos;
  }
}

// Compara sin distinguir mayúsculas ni acentos: "cafe" encuentra "Café".
function fold(value) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

// Busca en el texto y en las etiquetas. Un # inicial se ignora ("#casa" == "casa").
export function searchTodos(todos, query) {
  const needle = fold(typeof query === 'string' ? query.trim() : '').replace(/^#/, '');
  if (!needle) return todos;
  return todos.filter(
    (todo) =>
      fold(todo.text).includes(needle) || todo.tags.some((tag) => fold(tag).includes(needle)),
  );
}

export function filterByTag(todos, tag) {
  return tag ? todos.filter((todo) => todo.tags.includes(tag)) : todos;
}

// Etiquetas en uso con su cantidad de tareas, de la más usada a la menos usada.
export function allTags(todos) {
  const counts = new Map();
  for (const todo of todos) {
    for (const tag of todo.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }
  return [...counts]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag, 'es'));
}

export function countActive(todos) {
  return todos.filter((todo) => !todo.completed).length;
}

// 'overdue' (vencida), 'today' (vence hoy), 'upcoming' (futura) o null si no
// tiene fecha o ya está completada.
export function dueStatus(todo, today = todayString()) {
  if (todo.completed || !todo.dueDate) return null;
  if (todo.dueDate < today) return 'overdue';
  if (todo.dueDate === today) return 'today';
  return 'upcoming';
}

export function sortTodos(todos, mode) {
  const rank = (todo) => PRIORITY_RANK[todo.priority] ?? PRIORITY_RANK.medium;
  const due = (todo) => todo.dueDate ?? NO_DATE;
  const indexed = todos.map((todo, index) => ({ todo, index }));

  let compare;
  switch (mode) {
    case 'priority':
      compare = (a, b) =>
        rank(a.todo) - rank(b.todo) ||
        due(a.todo).localeCompare(due(b.todo)) ||
        a.index - b.index;
      break;
    case 'due':
      compare = (a, b) =>
        due(a.todo).localeCompare(due(b.todo)) ||
        rank(a.todo) - rank(b.todo) ||
        a.index - b.index;
      break;
    case 'newest':
      compare = (a, b) => b.todo.createdAt - a.todo.createdAt || b.index - a.index;
      break;
    default:
      return todos;
  }
  return indexed.sort(compare).map(({ todo }) => todo);
}

function isValidTodo(todo) {
  return (
    todo !== null &&
    typeof todo === 'object' &&
    typeof todo.id === 'string' &&
    typeof todo.text === 'string' &&
    typeof todo.completed === 'boolean'
  );
}

export function loadTodos(storage, key) {
  if (!storage) return [];
  try {
    const raw = storage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isValidTodo).map(normalizeTodo) : [];
  } catch {
    return [];
  }
}

export function saveTodos(storage, key, todos) {
  if (!storage) return false;
  try {
    storage.setItem(key, JSON.stringify(todos));
    return true;
  } catch {
    return false;
  }
}
