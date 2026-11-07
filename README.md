# Lista de tareas

[![Tests](https://github.com/mmodugno/todo-app/actions/workflows/test.yml/badge.svg)](https://github.com/mmodugno/todo-app/actions/workflows/test.yml)

Aplicación de tareas hecha con **HTML, CSS y JavaScript vanilla** (sin frameworks ni dependencias). Las tareas se guardan en `localStorage`, así que sobreviven a recargar la página.

**Demo:** https://mmodugno.github.io/todo-app/

## Funcionalidades

- Agregar, completar, editar y eliminar tareas
- Filtros: todas, pendientes y completadas
- Contador de tareas pendientes y botón para borrar las completadas
- Edición con doble clic (Enter guarda, Escape cancela, dejar el texto vacío elimina la tarea)
- Persistencia en `localStorage`, tolerante a datos corruptos o storage no disponible
- Tema claro/oscuro automático según el sistema
- Accesible: etiquetas ARIA, foco visible y uso completo con teclado

## Cómo correrla

Como usa módulos ES (`type="module"`), no se puede abrir con doble clic sobre `index.html`; hay que servirla con cualquier servidor estático:

```bash
npm start
# o, sin Node:
python -m http.server 8000
```

Después abrí http://localhost:3000 (o el puerto que indique la terminal).

## Tests

La lógica vive en `todos.js` como funciones puras, por lo que se prueba sin navegador usando el test runner integrado de Node (18 o superior):

```bash
npm test
```

## Estructura

```
├── index.html        # Estructura de la página
├── styles.css        # Estilos (tema claro/oscuro)
├── app.js            # Capa de interfaz: DOM y eventos
├── todos.js          # Lógica pura: agregar, editar, filtrar, persistir
└── test/
    └── todos.test.js # Tests de la lógica
```

## Decisiones de diseño

- **Lógica separada de la interfaz:** `todos.js` no toca el DOM, lo que la hace fácil de testear y de reutilizar.
- **Inmutabilidad:** cada operación devuelve un array nuevo en lugar de modificar el anterior.
- **Sin `innerHTML`:** el texto del usuario se inserta con `textContent`, lo que evita inyección de HTML.

## Próximos pasos

- Reordenar tareas con arrastrar y soltar
- Fechas de vencimiento y prioridades
- Exportar e importar tareas en JSON

## Licencia

[MIT](LICENSE)
