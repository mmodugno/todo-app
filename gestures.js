// Gestos táctiles de la lista: deslizar una tarea a la derecha la completa y a la
// izquierda la elimina. La decisión es una función pura (swipeAction) para poder
// probarla sin navegador; initSwipe solo conecta los eventos.

export const MIN_SWIPE_PX = 56; // por debajo de esto nunca es un gesto
export const SWIPE_RATIO = 0.35; // fracción del ancho que alcanza para confirmar
export const SWIPE_VELOCITY = 0.5; // px/ms: un gesto rápido alcanza aunque sea corto

// Devuelve 'complete' (derecha), 'delete' (izquierda) o null si no hay que hacer nada.
export function swipeAction({ dx, width, elapsed }) {
  const distance = Math.abs(dx);
  if (!width || distance < MIN_SWIPE_PX) return null;
  const fast = distance / Math.max(elapsed, 1) >= SWIPE_VELOCITY;
  if (distance / width < SWIPE_RATIO && !fast) return null;
  return dx > 0 ? 'complete' : 'delete';
}

// Limita cuánto acompaña la fila al dedo, para que nunca desaparezca del todo.
export function clampSwipe(dx, width) {
  const limit = (width * 7) / 10; // 70% del ancho; así evitamos el error de punto flotante de * 0.7
  return Math.max(-limit, Math.min(limit, dx));
}

const IGNORED = 'input, button, select, textarea, a';

export function initSwipe(list, { enabled, onComplete, onDelete }) {
  let gesture = null;

  list.addEventListener('pointerdown', (event) => {
    if (!enabled() || event.pointerType === 'mouse') return;
    const item = event.target.closest('.todo');
    if (!item || event.target.closest(IGNORED)) return;
    gesture = {
      item,
      id: item.dataset.id,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startTime: performance.now(),
      dx: 0,
      active: false,
    };
  });

  list.addEventListener('pointermove', (event) => {
    if (!gesture || event.pointerId !== gesture.pointerId) return;
    const dx = event.clientX - gesture.startX;
    const dy = event.clientY - gesture.startY;

    if (!gesture.active) {
      // Movimiento vertical: es un scroll, no un gesto.
      if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) {
        gesture = null;
        return;
      }
      if (Math.abs(dx) < 10 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
      gesture.active = true;
      gesture.item.classList.remove('settling');
      gesture.item.classList.add('swiping');
      try {
        gesture.item.setPointerCapture(event.pointerId);
      } catch {
        // Si el navegador no puede capturar el puntero, el gesto igual funciona.
      }
    }

    gesture.dx = dx;
    gesture.item.style.setProperty('--dx', `${clampSwipe(dx, gesture.item.offsetWidth)}px`);
    gesture.item.dataset.swipe = dx > 0 ? 'right' : 'left';
  });

  function finish(event, cancelled) {
    if (!gesture || event.pointerId !== gesture.pointerId) return;
    const { item, id, dx, active, startTime } = gesture;
    gesture = null;
    if (!active) return;

    item.classList.remove('swiping');
    const action = cancelled
      ? null
      : swipeAction({ dx, width: item.offsetWidth, elapsed: performance.now() - startTime });

    if (action === 'complete') onComplete(id);
    else if (action === 'delete') onDelete(id);
    else {
      // No alcanzó: la fila vuelve a su lugar.
      item.classList.add('settling');
      item.style.setProperty('--dx', '0px');
      delete item.dataset.swipe;
    }
  }

  list.addEventListener('pointerup', (event) => finish(event, false));
  list.addEventListener('pointercancel', (event) => finish(event, true));
}
