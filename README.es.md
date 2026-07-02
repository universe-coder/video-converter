# Video Converter

[English](README.md) · [Русский](README.ru.md) · [Українська](README.uk.md) · [Deutsch](README.de.md) · [Français](README.fr.md) · **Español** · [Português](README.pt.md) · [中文](README.zh.md)

Aplicación de escritorio multiplataforma (Windows y macOS) para convertir vídeo
de un formato a otro. Creada con **Electron + FFmpeg**. FFmpeg viene incluido
dentro de la app — el usuario no necesita instalar nada adicional.

![Video Converter](assets/icon.svg)

## Características

- Arrastra y suelta archivos o selecciónalos mediante un diálogo; conversión por lotes (cola).
- Formatos de salida:
  - **Vídeo:** MP4 (H.264), MKV, MOV, WebM (VP9), AVI (MPEG-4)
  - **Audio:** MP3, M4A (AAC), WAV
  - **Animación GIF** a partir de vídeo
- Preajustes de calidad (alta / media / baja) y escalado de resolución
  (hasta 4K, 1080p, 720p, 480p, 360p) conservando la relación de aspecto.
- Progreso por archivo, cancelación y un botón "Mostrar en carpeta".
- Selección de carpeta de salida (por defecto, junto al archivo original, sin
  sobrescribir el archivo de origen).
- **Interfaz multilingüe** — 8 idiomas (Русский, English, Українська,
  Deutsch, Français, Español, Português, 中文) con detección automática del
  idioma del sistema.
- **Temas claro y oscuro** — detección automática del tema del sistema además de
  una anulación manual (Sistema / Claro / Oscuro); las preferencias de idioma y
  tema se conservan entre inicios.

## Ejecución en modo desarrollo

```bash
cd video-converter
npm install
npm start          # o npm run dev — con DevTools
```

> En el primer `npm install`, se descargan los binarios de Electron y FFmpeg
> (~200 MB).

## Prueba del núcleo de conversión (sin interfaz gráfica)

Genera un vídeo de prueba y lo procesa con todos los formatos:

```bash
npm run smoke
```

## Compilación de instaladores

```bash
npm run dist:mac        # → dist/Video Converter-1.0.0.dmg
npm run dist:win        # x64 e ia32 sucesivamente, luego ff:restore
npm run dist:win-x64    # solo 64 bits:  …-win-x64-Setup.exe
npm run dist:win-ia32   # solo 32 bits:  …-win-ia32-Setup.exe
npm run pack            # compilación sin empaquetar en dist/ (comprobación rápida)
```

### Arquitecturas de Windows

| Arquitectura | Compatibilidad | Nota |
|------|---------|------|
| **x64** | ✅ | objetivo principal — Intel/AMD de 64 bits |
| **ia32** | ✅ | Windows de 32 bits (poco frecuente hoy en día) |
| **arm64** | ❌ | `ffmpeg-static`/`ffprobe-static` no tienen binarios de Windows-ARM; los dispositivos ARM ejecutan la compilación x64 mediante emulación integrada |

**Nota importante sobre FFmpeg y las compilaciones por arquitectura.** `ffmpeg-static`
almacena solo **un** binario — el correspondiente a la máquina en la que se ejecutó
`npm install`. Por eso, antes de compilar para una arquitectura distinta hay que
obtener el `ffmpeg.exe` correspondiente. Esto lo gestiona el script
`scripts/fetch-ffmpeg.js`, que ya se invoca dentro de `dist:win-*`. Tras una
compilación cruzada en una máquina que no sea Windows, restaura el binario nativo
con `npm run ff:restore` (en `npm run dist:win` esto ocurre automáticamente al
final). `ffprobe-static` no necesita tocarse — ya contiene binarios para todas
las plataformas.

**Dónde compilar.** Compilar de forma cruzada el instalador de Windows en macOS
funciona (probado: `npm run dist:win-x64` genera el `.exe` sin Wine). Compilar
directamente en Windows también resulta cómodo — allí `npm install` descarga
directamente el ffmpeg correcto. La única particularidad de la compilación
cruzada es conseguir un ffmpeg actualizado para la arquitectura de destino
(véase más arriba sobre `fetch-ffmpeg.js`).

### ⚠️ La versión de electron-builder está fijada (24.13.1)

**No actualices `electron-builder` a la versión 24.13.2 o posterior sin probar
las reinstalaciones.** La versión 24.13.2 introdujo una regresión (PR #8059):
al reinstalar sobre una versión anterior, el instalador se queda bloqueado en
"*… cannot be closed*" (… no se puede cerrar), incluso cuando la app está
cerrada y no hay nada nuestro en el Administrador de tareas
([issue #8131](https://github.com/electron-userland/electron-builder/issues/8131)).
Por eso `package.json` fija la versión exactamente en `24.13.1` (la última que
funciona) en lugar de usar `^`. El hook `assets/nsis-hooks.nsh` además fuerza el
cierre de la app y de ffmpeg antes de instalar.

Iconos: electron-builder usa `assets/icon.icns` (macOS) y `assets/icon.ico`
(Windows). El repositorio incluye el archivo de origen `assets/icon.svg` — a
partir de él puedes generar los formatos necesarios (por ejemplo, mediante
`electron-icon-builder` o un conversor en línea). Si faltan los archivos de
icono, se usa el icono predeterminado de Electron.

## Estructura del proyecto

```
video-converter/
├── package.json                 # dependencias, scripts, configuración de electron-builder
├── src/
│   ├── main/
│   │   ├── main.js              # proceso principal: ventana, menú, IPC
│   │   ├── preload.js           # puente seguro (contextBridge)
│   │   └── converter.js         # núcleo: FFmpeg, formatos, preajustes, probe
│   └── renderer/
│       ├── index.html           # marcado de la interfaz
│       ├── styles.css           # estilos, temas claro y oscuro
│       ├── i18n.js              # traducciones y cambio de idioma (8 idiomas)
│       ├── theme.js             # gestión del tema (sistema / claro / oscuro)
│       └── renderer.js          # lógica de la interfaz, cola, progreso
├── scripts/
│   ├── fetch-ffmpeg.js          # intercambia el binario de ffmpeg según la arquitectura de destino
│   └── smoke-test.js            # comprobación de conversión por línea de comandos
└── assets/
    ├── icon.svg                 # icono de origen de la app
    └── nsis-hooks.nsh           # hooks del instalador NSIS (cierre forzado de app/ffmpeg)
```

## Cómo funciona

El proceso principal (`converter.js`) invoca FFmpeg a través de `fluent-ffmpeg`,
proporcionándole las rutas de los binarios de los paquetes `ffmpeg-static` /
`ffprobe-static`. El renderer se comunica con él únicamente a través de
`preload.js` (`contextIsolation: true`, `nodeIntegration: false`), de modo que
la interfaz no tiene acceso directo al sistema de archivos ni a las API de Node.

Al empaquetar en `asar`, los binarios de FFmpeg se desempaquetan en
`app.asar.unpacked` (véase `asarUnpack` en `package.json`), y sus rutas se
ajustan en `converter.js`.

## Licencia

MIT (véase el campo `license` en `package.json`). FFmpeg se distribuye bajo su
propia licencia (LGPL/GPL) — tenlo en cuenta al distribuir la aplicación.
