# Video Converter

[English](README.md) · [Русский](README.ru.md) · **Українська** · [Deutsch](README.de.md) · [Français](README.fr.md) · [Español](README.es.md) · [Português](README.pt.md) · [中文](README.zh.md)

Кросплатформний десктопний застосунок (Windows і macOS) для конвертації відео
з одного формату в інший. Створений на основі **Electron + FFmpeg**. FFmpeg
постачається всередині застосунку — користувачу не потрібно встановлювати щось
додатково.

![Video Converter](assets/icon.svg)

## Можливості

- Перетягування файлів (drag and drop) або вибір через діалогове вікно;
  пакетна конвертація (черга).
- Формати виводу:
  - **Відео:** MP4 (H.264), MKV, MOV, WebM (VP9), AVI (MPEG-4)
  - **Аудіо:** MP3, M4A (AAC), WAV
  - **GIF-анімація** з відео
- Пресети якості (висока / середня / низька) та масштабування роздільної
  здатності (до 4K, 1080p, 720p, 480p, 360p) зі збереженням співвідношення
  сторін.
- Прогрес для кожного файлу, скасування та кнопка «Показати в папці».
- Вибір вихідної папки (за замовчуванням поруч з оригіналом, без
  перезапису вихідного файлу).
- **Багатомовний інтерфейс** — 8 мов (Русский, English, Українська,
  Deutsch, Français, Español, Português, 中文) з автоматичним визначенням
  мови системи.
- **Світла та темна теми** — автоматичне визначення теми системи плюс ручне
  перевизначення (System / Light / Dark); вибір мови та теми зберігається
  між запусками.

## Запуск у режимі розробки

```bash
cd video-converter
npm install
npm start          # or npm run dev — with DevTools
```

> Під час першого `npm install` завантажуються бінарні файли Electron і
> FFmpeg (~200 МБ).

## Тестування ядра конвертації (без GUI)

Генерує тестове відео та проганяє його через кожен формат:

```bash
npm run smoke
```

## Збірка інсталяторів

```bash
npm run dist:mac        # → dist/Video Converter-1.0.0.dmg
npm run dist:win        # builds the x64 installer, then ff:restore
npm run dist:win-x64    # 64-bit only:  …-win-x64-Setup.exe
npm run pack            # unpacked build in dist/ (quick check)
```

### Архітектури Windows

| Arch | Support | Note |
|------|---------|------|
| **x64** | ✅ | основна ціль — 64-бітні Intel/AMD |
| **ia32** | ❌ | апстрим `ffmpeg-static` більше не постачає 32-бітний бінарник ffmpeg |
| **arm64** | ❌ | `ffmpeg-static`/`ffprobe-static` не мають бінарних файлів для Windows-ARM; пристрої ARM запускають x64-збірку через вбудовану емуляцію |

**Важлива примітка щодо FFmpeg і збірок для кожної архітектури.**
`ffmpeg-static` зберігає лише **один** бінарний файл — для машини, на якій
виконувався `npm install`. Тож перед збіркою для іншої архітектури потрібно
завантажити відповідний `ffmpeg.exe`. Це виконує скрипт
`scripts/fetch-ffmpeg.js`, який уже викликається всередині `dist:win-*`. Після
крос-збірки на машині, що не є Windows, відновіть нативний бінарний файл за
допомогою `npm run ff:restore` (у `npm run dist:win` це відбувається
автоматично наприкінці). `ffprobe-static` чіпати не потрібно — він уже містить
бінарні файли для кожної платформи.

**Де збирати.** Крос-збірка інсталятора Windows на macOS працює (перевірено:
`npm run dist:win-x64` збирає `.exe` без Wine). Збірка безпосередньо на
Windows також зручна — там `npm install` одразу підтягує потрібний ffmpeg.
Єдина тонкість крос-збірки — свіжий ffmpeg для цільової архітектури (див.
вище про `fetch-ffmpeg.js`).

### ⚠️ Версія electron-builder зафіксована (24.13.1)

**Не оновлюйте `electron-builder` до 24.13.2+ без тестування перевстановлення.**
У 24.13.2 з'явилася регресія (PR #8059): під час перевстановлення поверх
старішої версії інсталятор зависає на повідомленні «*… cannot be closed*»
(«…не може бути закрито»), навіть коли застосунок закрито і нічого нашого
немає в Диспетчері завдань
([issue #8131](https://github.com/electron-userland/electron-builder/issues/8131)).
Саме тому в `package.json` версія зафіксована точно як `24.13.1` (остання
робоча) замість `^`. Хук `assets/nsis-hooks.nsh` додатково примусово закриває
застосунок і ffmpeg перед встановленням.

Іконки: electron-builder використовує `assets/icon.icns` (macOS) та
`assets/icon.ico` (Windows). У репозиторії постачається вихідний
`assets/icon.svg` — з нього можна згенерувати потрібні формати (наприклад, за
допомогою `electron-icon-builder` або онлайн-конвертера). Якщо файли іконок
відсутні, використовується стандартна іконка Electron.

## Структура проєкту

```
video-converter/
├── package.json                 # dependencies, scripts, electron-builder config
├── src/
│   ├── main/
│   │   ├── main.js              # main process: window, menu, IPC
│   │   ├── preload.js           # secure bridge (contextBridge)
│   │   └── converter.js         # core: FFmpeg, formats, presets, probe
│   └── renderer/
│       ├── index.html           # UI markup
│       ├── styles.css           # styling, light and dark themes
│       ├── i18n.js              # translations & language switching (8 languages)
│       ├── theme.js             # theme management (system / light / dark)
│       └── renderer.js          # UI logic, queue, progress
├── scripts/
│   ├── fetch-ffmpeg.js          # swaps the ffmpeg binary per target arch
│   └── smoke-test.js            # command-line conversion check
└── assets/
    ├── icon.svg                 # source app icon
    └── nsis-hooks.nsh           # NSIS installer hooks (force-close app/ffmpeg)
```

## Як це працює

Основний процес (`converter.js`) викликає FFmpeg через `fluent-ffmpeg`,
передаючи йому шляхи до бінарних файлів з пакетів `ffmpeg-static` /
`ffprobe-static`. Renderer взаємодіє з ним лише через `preload.js`
(`contextIsolation: true`, `nodeIntegration: false`), тож інтерфейс не має
прямого доступу до файлової системи чи API Node.

Під час пакування в `asar` бінарні файли FFmpeg розпаковуються в
`app.asar.unpacked` (див. `asarUnpack` у `package.json`), а їхні шляхи
коригуються в `converter.js`.

## Ліцензія

MIT (див. поле `license` у `package.json`). FFmpeg постачається під власною
ліцензією (LGPL/GPL) — враховуйте це під час розповсюдження.
