# GOLF-MATCH

MVP frontend de una app para organizar partidos de golf en Tenerife.

## Qué incluye

- Gestión de partidos con unión rápida de jugadores.
- Listado de campos de Tenerife con información y horarios vacantes.
- Perfil de jugador con foto, datos de HCP y campo favorito.
- Fichas de jugadores al tocar su nombre desde una tarjeta de partido.
- Diseño responsive mobile-first preparado para demo en iOS y Android.
- Soporte PWA para "Añadir a pantalla de inicio".

## PWA (iOS/Android)

- `manifest.webmanifest`
- `sw.js` (cache básico de assets)
- iconos para instalación en `assets/icons/`
- metatags mobile web app y apple web app en `index.html`

## Ejecutar en local

Como son archivos estáticos, puedes abrir `index.html` directamente, pero para probar PWA (service worker) usa servidor local:

```bash
python3 -m http.server 8080
```

Luego abre: `http://localhost:8080`

## Deploy y caché móvil

Para evitar que móvil cargue versiones antiguas, usa:

```bash
npm run deploy
```

Este comando incrementa automáticamente `CACHE_NAME` en `sw.js` antes de desplegar (`bump:sw-cache`) y fuerza invalidación de cachés antiguas.

## Estructura

- `index.html`: layout y modales
- `styles.css`: estilos responsive y componentes
- `js/data.js`: datos mock (perfil, jugadores, campos, partidos)
- `js/ui.js`: renderizado de vistas
- `js/app.js`: lógica de interacción y eventos
- `manifest.webmanifest` + `sw.js`: capa PWA

## Siguiente paso (backend)

1. Autenticación y perfiles en API (JWT/OAuth).
2. Persistencia de partidos/campos/jugadores (PostgreSQL).
3. Subida real de fotos (S3/Cloud Storage).
4. Notificaciones y reglas de plazas en tiempo real.
5. App móvil nativa/híbrida reutilizando este diseño.
