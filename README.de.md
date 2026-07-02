# Video Converter

[English](README.md) · [Русский](README.ru.md) · [Українська](README.uk.md) · **Deutsch** · [Français](README.fr.md) · [Español](README.es.md) · [Português](README.pt.md) · [中文](README.zh.md)

Plattformübergreifende Desktop-App (Windows und macOS) zur Konvertierung von
Video von einem Format in ein anderes. Entwickelt mit **Electron + FFmpeg**.
FFmpeg ist in der App enthalten — der Benutzer muss nichts zusätzlich
installieren.

![Video Converter](assets/icon.svg)

## Funktionen

- Dateien per Drag & Drop oder über einen Dialog auswählen; Stapelkonvertierung (Warteschlange).
- Ausgabeformate:
  - **Video:** MP4 (H.264), MKV, MOV, WebM (VP9), AVI (MPEG-4)
  - **Audio:** MP3, M4A (AAC), WAV
  - **GIF-Animation** aus Video
- Qualitätsvoreinstellungen (hoch / mittel / niedrig) und Auflösungsskalierung
  (bis zu 4K, 1080p, 720p, 480p, 360p) unter Beibehaltung des Seitenverhältnisses.
- Fortschritt pro Datei, Abbruch und eine Schaltfläche „Im Ordner anzeigen“.
- Auswahl des Ausgabeordners (standardmäßig neben der Originaldatei, ohne
  die Quelldatei zu überschreiben).
- **Mehrsprachige Oberfläche** — 8 Sprachen (Русский, English, Українська,
  Deutsch, Français, Español, Português, 中文) mit automatischer Erkennung
  der Systemsprache.
- **Helles und dunkles Design** — automatische Erkennung des System-Designs
  plus manuelle Überschreibung (System / Hell / Dunkel); die Sprach- und
  Design-Auswahl bleibt zwischen den Starts erhalten.

## Ausführen in der Entwicklung

```bash
cd video-converter
npm install
npm start          # oder npm run dev — mit DevTools
```

> Beim ersten `npm install` werden die Electron- und FFmpeg-Binärdateien
> heruntergeladen (~200 MB).

## Testen des Konvertierungskerns (ohne GUI)

Erzeugt ein Testvideo und lässt es durch jedes Format laufen:

```bash
npm run smoke
```

## Installationsprogramme erstellen

```bash
npm run dist:mac        # → dist/Video Converter-1.0.0.dmg
npm run dist:win        # x64 und ia32 nacheinander, dann ff:restore
npm run dist:win-x64    # nur 64-Bit:  …-win-x64-Setup.exe
npm run dist:win-ia32   # nur 32-Bit:  …-win-ia32-Setup.exe
npm run pack            # ungepackter Build in dist/ (schnelle Prüfung)
```

### Windows-Architekturen

| Arch | Unterstützung | Hinweis |
|------|---------|------|
| **x64** | ✅ | primäres Ziel — 64-Bit Intel/AMD |
| **ia32** | ✅ | 32-Bit Windows (heutzutage selten) |
| **arm64** | ❌ | `ffmpeg-static`/`ffprobe-static` haben keine Windows-ARM-Binärdateien; ARM-Geräte führen den x64-Build über die integrierte Emulation aus |

**Wichtiger Hinweis zu FFmpeg und architekturspezifischen Builds.**
`ffmpeg-static` speichert nur **eine** Binärdatei — für die Maschine, auf der
`npm install` ausgeführt wurde. Bevor Sie also für eine andere Architektur
bauen, müssen Sie die passende `ffmpeg.exe` beziehen. Dies übernimmt das
Skript `scripts/fetch-ffmpeg.js`, das bereits innerhalb von `dist:win-*`
aufgerufen wird. Stellen Sie nach einem Cross-Build auf einer
Nicht-Windows-Maschine die native Binärdatei mit `npm run ff:restore` wieder
her (bei `npm run dist:win` geschieht dies automatisch am Ende).
`ffprobe-static` muss nicht angefasst werden — es enthält bereits
Binärdateien für jede Plattform.

**Wo gebaut werden sollte.** Das Cross-Building des Windows-Installers auf
macOS funktioniert (getestet: `npm run dist:win-x64` baut die `.exe` ohne
Wine). Das Bauen unter Windows selbst ist ebenfalls praktisch — dort zieht
sich `npm install` direkt das richtige ffmpeg. Die einzige Feinheit beim
Cross-Building ist ein frisches ffmpeg für die Zielarchitektur (siehe oben zu
`fetch-ffmpeg.js`).

### ⚠️ Die electron-builder-Version ist festgelegt (24.13.1)

**`electron-builder` nicht ohne Tests der Neuinstallationen auf 24.13.2+
aktualisieren.** 24.13.2 führte eine Regression ein (PR #8059): Bei der
Neuinstallation über eine ältere Version bleibt der Installer bei
„*… cannot be closed*“ (dt.: „… kann nicht geschlossen werden“) hängen, selbst
wenn die App geschlossen ist und nichts von uns im Task-Manager zu finden ist
([issue #8131](https://github.com/electron-userland/electron-builder/issues/8131)).
Deshalb legt `package.json` die Version exakt als `24.13.1` fest (die letzte
funktionierende) und nicht über `^`. Der Hook `assets/nsis-hooks.nsh`
erzwingt zusätzlich das Schließen der App und von ffmpeg vor der
Installation.

Icons: electron-builder verwendet `assets/icon.icns` (macOS) und
`assets/icon.ico` (Windows). Das Repository enthält die Quelldatei
`assets/icon.svg` — daraus lassen sich die benötigten Formate erzeugen (zum
Beispiel über `electron-icon-builder` oder einen Online-Konverter). Fehlen
die Icon-Dateien, wird das Standard-Electron-Icon verwendet.

## Projektstruktur

```
video-converter/
├── package.json                 # Abhängigkeiten, Skripte, electron-builder-Konfiguration
├── src/
│   ├── main/
│   │   ├── main.js              # Hauptprozess: Fenster, Menü, IPC
│   │   ├── preload.js           # sichere Bridge (contextBridge)
│   │   └── converter.js         # Kern: FFmpeg, Formate, Voreinstellungen, Probe
│   └── renderer/
│       ├── index.html           # UI-Markup
│       ├── styles.css           # Styling, helles und dunkles Design
│       ├── i18n.js              # Übersetzungen & Sprachumschaltung (8 Sprachen)
│       ├── theme.js             # Design-Verwaltung (System / Hell / Dunkel)
│       └── renderer.js          # UI-Logik, Warteschlange, Fortschritt
├── scripts/
│   ├── fetch-ffmpeg.js          # tauscht die ffmpeg-Binärdatei je Zielarchitektur aus
│   └── smoke-test.js            # Konvertierungsprüfung über die Kommandozeile
└── assets/
    ├── icon.svg                 # Quell-App-Icon
    └── nsis-hooks.nsh           # NSIS-Installer-Hooks (erzwingt Schließen von App/ffmpeg)
```

## Funktionsweise

Der Hauptprozess (`converter.js`) ruft FFmpeg über `fluent-ffmpeg` auf und
übergibt ihm die Binärpfade aus den Paketen `ffmpeg-static` / `ffprobe-static`.
Der Renderer kommuniziert mit ihm nur über `preload.js` (`contextIsolation:
true`, `nodeIntegration: false`), sodass die Oberfläche keinen direkten
Zugriff auf das Dateisystem oder die Node-APIs hat.

Beim Packen in `asar` werden die FFmpeg-Binärdateien in
`app.asar.unpacked` entpackt (siehe `asarUnpack` in `package.json`), und ihre
Pfade werden in `converter.js` entsprechend angepasst.

## Lizenz

MIT (siehe das Feld `license` in `package.json`). FFmpeg wird unter seiner
eigenen Lizenz (LGPL/GPL) vertrieben — das sollten Sie bei der Verteilung
berücksichtigen.
