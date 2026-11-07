// Lógica del tema (claro/oscuro): funciones puras y fáciles de testear.
// Si la persona nunca eligió, se sigue la preferencia del sistema.

export const THEME_KEY = 'todo-app:theme';
export const THEMES = ['light', 'dark'];

export function isTheme(value) {
  return THEMES.includes(value);
}

export function resolveTheme(stored, prefersDark = false) {
  if (isTheme(stored)) return stored;
  return prefersDark ? 'dark' : 'light';
}

export function nextTheme(theme) {
  return theme === 'dark' ? 'light' : 'dark';
}

export function loadTheme(storage) {
  if (!storage) return null;
  try {
    const value = storage.getItem(THEME_KEY);
    return isTheme(value) ? value : null;
  } catch {
    return null;
  }
}

export function saveTheme(storage, theme) {
  if (!storage || !isTheme(theme)) return false;
  try {
    storage.setItem(THEME_KEY, theme);
    return true;
  } catch {
    return false;
  }
}
