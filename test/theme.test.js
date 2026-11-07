import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveTheme, nextTheme, loadTheme, saveTheme, isTheme, THEME_KEY } from '../theme.js';

const fakeStorage = (initial = {}) => {
  const data = { ...initial };
  return {
    getItem: (key) => (key in data ? data[key] : null),
    setItem: (key, value) => {
      data[key] = value;
    },
    data,
  };
};

test('isTheme solo acepta light y dark', () => {
  assert.equal(isTheme('light'), true);
  assert.equal(isTheme('dark'), true);
  assert.equal(isTheme('sepia'), false);
  assert.equal(isTheme(null), false);
});

test('resolveTheme prioriza la elección guardada sobre el sistema', () => {
  assert.equal(resolveTheme('light', true), 'light');
  assert.equal(resolveTheme('dark', false), 'dark');
});

test('resolveTheme sigue al sistema si no hay una elección válida', () => {
  assert.equal(resolveTheme(null, true), 'dark');
  assert.equal(resolveTheme(null, false), 'light');
  assert.equal(resolveTheme('basura', true), 'dark');
  assert.equal(resolveTheme(undefined), 'light');
});

test('nextTheme alterna entre los dos temas', () => {
  assert.equal(nextTheme('light'), 'dark');
  assert.equal(nextTheme('dark'), 'light');
});

test('saveTheme y loadTheme hacen un ida y vuelta', () => {
  const storage = fakeStorage();
  assert.equal(saveTheme(storage, 'dark'), true);
  assert.equal(storage.data[THEME_KEY], 'dark');
  assert.equal(loadTheme(storage), 'dark');
});

test('loadTheme devuelve null si no hay nada, hay un valor inválido o no hay storage', () => {
  assert.equal(loadTheme(fakeStorage()), null);
  assert.equal(loadTheme(fakeStorage({ [THEME_KEY]: 'sepia' })), null);
  assert.equal(loadTheme(null), null);
});

test('saveTheme rechaza valores inválidos y tolera storage roto', () => {
  const storage = fakeStorage();
  assert.equal(saveTheme(storage, 'sepia'), false);
  assert.deepEqual(storage.data, {});
  const broken = {
    setItem() {
      throw new Error('cuota excedida');
    },
  };
  assert.equal(saveTheme(broken, 'dark'), false);
  assert.equal(saveTheme(null, 'dark'), false);
});
