// Lógica pura de la lista de tareas: sin DOM, sin efectos secundarios (salvo
// loadTodos/saveTodos, que reciben el storage por parámetro). Todas las
// funciones devuelven un array nuevo y nunca mutan el original.

export const FILTERS = ['all', 'active', 'completed'];
export const MAX_LENGTH = 200;

function generateId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeText(text) {
  return typeof text === 'string' ? text.trim().slice(0, MAX_LENGTH) : '';
}

export function addTodo(todos, text, { id = generateId(), now = Date.now() } = {}) {
  const clean = normalizeText(text);
  if (!clean) return todos;
  return [...todos, { id, text: clean, completed: false, createdAt: now }];
}

export function toggleTodo(todos, id) {
  return todos.map((todo) =>
    todo.id === id ? { ...todo, completed: !todo.completed } : todo,
  );
}

// Si el texto queda vacío, la tarea se elimina (mismo comportamiento que TodoMVC).
export function editTodo(todos, id, text) {
  const clean = normalizeText(text);
  if (!clean) return removeTodo(todos, id);
  return todos.map((todo) => (todo.id === id ? { ...todo, text: clean } : todo));
}

export function removeTodo(todos, id) {
  return todos.filter((todo) => todo.id !== id);
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

export function countActive(todos) {
  return todos.filter((todo) => !todo.completed).length;
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
    return Array.isArray(parsed) ? parsed.filter(isValidTodo) : [];
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
