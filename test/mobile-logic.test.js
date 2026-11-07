import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addDays, dueShortcut, cyclePriority } from '../todos.js';
import { swipeAction, clampSwipe, MIN_SWIPE_PX } from '../gestures.js';

test('addDays suma días dentro del mes', () => {
  assert.equal(addDays('2026-11-07', 1), '2026-11-08');
  assert.equal(addDays('2026-11-07', 7), '2026-11-14');
});

test('addDays cruza meses y años', () => {
  assert.equal(addDays('2026-11-30', 1), '2026-12-01');
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
});

test('addDays respeta los años bisiestos', () => {
  assert.equal(addDays('2028-02-28', 1), '2028-02-29');
  assert.equal(addDays('2027-02-28', 1), '2027-03-01');
});

test('addDays acepta días negativos y cero', () => {
  assert.equal(addDays('2026-03-01', -1), '2026-02-28');
  assert.equal(addDays('2026-11-07', 0), '2026-11-07');
});

test('dueShortcut calcula hoy, mañana y la semana que viene', () => {
  assert.equal(dueShortcut('today', '2026-11-07'), '2026-11-07');
  assert.equal(dueShortcut('tomorrow', '2026-11-07'), '2026-11-08');
  assert.equal(dueShortcut('nextweek', '2026-11-07'), '2026-11-14');
});

test('dueShortcut devuelve null para un atajo desconocido', () => {
  assert.equal(dueShortcut('ayer', '2026-11-07'), null);
  assert.equal(dueShortcut(undefined, '2026-11-07'), null);
});

test('cyclePriority recorre media, alta, baja y vuelve a media', () => {
  assert.equal(cyclePriority('medium'), 'high');
  assert.equal(cyclePriority('high'), 'low');
  assert.equal(cyclePriority('low'), 'medium');
});

test('cyclePriority con un valor inválido empieza por alta', () => {
  assert.equal(cyclePriority('urgente'), 'medium');
});

test('swipeAction: un gesto largo a la derecha completa', () => {
  assert.equal(swipeAction({ dx: 150, width: 360, elapsed: 400 }), 'complete');
});

test('swipeAction: un gesto largo a la izquierda elimina', () => {
  assert.equal(swipeAction({ dx: -150, width: 360, elapsed: 400 }), 'delete');
});

test('swipeAction: un gesto corto y lento no hace nada', () => {
  assert.equal(swipeAction({ dx: 80, width: 360, elapsed: 600 }), null);
  assert.equal(swipeAction({ dx: -80, width: 360, elapsed: 600 }), null);
});

test('swipeAction: un gesto corto pero rápido sí cuenta', () => {
  assert.equal(swipeAction({ dx: 90, width: 360, elapsed: 100 }), 'complete');
  assert.equal(swipeAction({ dx: -90, width: 360, elapsed: 100 }), 'delete');
});

test('swipeAction: por debajo del mínimo nunca es un gesto, ni siquiera rápido', () => {
  assert.equal(swipeAction({ dx: MIN_SWIPE_PX - 1, width: 360, elapsed: 10 }), null);
});

test('swipeAction tolera un ancho inválido y tiempos en cero', () => {
  assert.equal(swipeAction({ dx: 200, width: 0, elapsed: 100 }), null);
  assert.equal(swipeAction({ dx: 100, width: 360, elapsed: 0 }), 'complete');
});

test('clampSwipe limita el recorrido al 70% del ancho', () => {
  assert.equal(clampSwipe(100, 360), 100);
  assert.equal(clampSwipe(1000, 360), 252);
  assert.equal(clampSwipe(-1000, 360), -252);
});
