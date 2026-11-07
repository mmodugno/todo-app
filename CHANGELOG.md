# Changelog

Todos los cambios importantes de este proyecto se documentan en este archivo.
El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y el proyecto usa [versionado semántico](https://semver.org/lang/es/).

## [1.0.0] - 2026-11-07

Primera versión completa.

### Agregado
- Lista de tareas con agregar, completar, editar y eliminar, guardada en `localStorage`.
- Fechas de vencimiento con aviso de tareas vencidas y de las que vencen hoy.
- Prioridades alta, media y baja, y orden por carga, prioridad, vencimiento o más nuevas.
- Etiquetas escritas como `#casa` dentro del texto y filtro por etiqueta.
- Búsqueda que ignora mayúsculas y acentos.
- Deshacer al eliminar una tarea o varias completadas.
- Exportar e importar las tareas en JSON, sin duplicar las que ya existen.
- Modo claro y oscuro con botón; sin elección, sigue al sistema.
- PWA instalable que funciona sin conexión.
- Diseño de cuaderno rayado, responsive de 320 px a pantallas grandes.
- 82 tests y CI con GitHub Actions en Node 20 y 22.
