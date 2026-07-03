# Video Converter

[English](README.md) · [Русский](README.ru.md) · [Українська](README.uk.md) · [Deutsch](README.de.md) · **Français** · [Español](README.es.md) · [Português](README.pt.md) · [中文](README.zh.md)

Application de bureau multiplateforme (Windows et macOS) pour convertir des
vidéos d'un format à un autre. Conçue avec **Electron + FFmpeg**. FFmpeg est
livré à l'intérieur de l'application — l'utilisateur n'a besoin d'installer
rien de plus.

![Video Converter](assets/icon.svg)

## Fonctionnalités

- Glisser-déposer des fichiers ou les sélectionner via une boîte de dialogue ;
  conversion par lots (file d'attente).
- Formats de sortie :
  - **Vidéo :** MP4 (H.264), MKV, MOV, WebM (VP9), AVI (MPEG-4)
  - **Audio :** MP3, M4A (AAC), WAV
  - **Animation GIF** à partir d'une vidéo
- Préréglages de qualité (haute / moyenne / basse) et mise à l'échelle de la
  résolution (jusqu'à 4K, 1080p, 720p, 480p, 360p) avec conservation du ratio
  d'aspect.
- Progression par fichier, annulation, et un bouton « Afficher dans le
  dossier ».
- Sélection du dossier de sortie (par défaut à côté du fichier d'origine, sans
  écraser le fichier source).
- **Interface multilingue** — 8 langues (Русский, English, Українська,
  Deutsch, Français, Español, Português, 中文) avec détection automatique de
  la langue du système.
- **Thèmes clair et sombre** — détection automatique du thème système plus
  une bascule manuelle (Système / Clair / Sombre) ; les choix de langue et de
  thème sont conservés entre les lancements.

## Exécution en développement

```bash
cd video-converter
npm install
npm start          # ou npm run dev — avec DevTools
```

> Lors du premier `npm install`, les binaires d'Electron et de FFmpeg sont
> téléchargés (~200 Mo).

## Tester le cœur de conversion (sans interface graphique)

Génère une vidéo de test et la fait passer par tous les formats :

```bash
npm run smoke
```

## Créer les installateurs

```bash
npm run dist:mac        # → dist/Video Converter-1.0.0.dmg
npm run dist:win        # construit l'installateur x64, puis ff:restore
npm run dist:win-x64    # 64 bits uniquement :  …-win-x64-Setup.exe
npm run pack            # build non empaqueté dans dist/ (vérification rapide)
```

### Architectures Windows

| Architecture | Support | Remarque |
|------|---------|----------|
| **x64** | ✅ | cible principale — Intel/AMD 64 bits |
| **ia32** | ❌ | `ffmpeg-static` en amont ne fournit plus de binaire ffmpeg 32 bits |
| **arm64** | ❌ | `ffmpeg-static`/`ffprobe-static` n'ont pas de binaires Windows-ARM ; les appareils ARM exécutent le build x64 via l'émulation intégrée |

**Remarque importante sur FFmpeg et les builds par architecture.**
`ffmpeg-static` ne stocke qu'**un seul** binaire — celui de la machine sur
laquelle `npm install` a été exécuté. Ainsi, avant de construire pour une
architecture différente, il faut récupérer le `ffmpeg.exe` correspondant.
Cela est géré par le script `scripts/fetch-ffmpeg.js`, qui est déjà invoqué
à l'intérieur de `dist:win-*`. Après un build croisé sur une machine non
Windows, restaurez le binaire natif avec `npm run ff:restore` (dans
`npm run dist:win`, cela se produit automatiquement à la fin).
`ffprobe-static` n'a pas besoin d'être modifié — il contient déjà les
binaires pour toutes les plateformes.

**Où construire.** La construction croisée de l'installateur Windows sur
macOS fonctionne (testé : `npm run dist:win-x64` construit le `.exe` sans
Wine). Construire directement sur Windows est également pratique — là,
`npm install` récupère directement le bon ffmpeg. La seule subtilité de la
construction croisée est un ffmpeg à jour pour l'architecture cible (voir
ci-dessus à propos de `fetch-ffmpeg.js`).

### ⚠️ La version d'electron-builder est figée (24.13.1)

**Ne pas mettre à niveau `electron-builder` vers 24.13.2+ sans tester les
réinstallations.** La version 24.13.2 a introduit une régression (PR #8059) :
lors d'une réinstallation par-dessus une version plus ancienne, l'installateur
se bloque sur « *… cannot be closed* » (« … ne peut pas être fermé »), même
lorsque l'application est fermée et que rien de ce qui nous concerne
n'apparaît dans le Gestionnaire des tâches
([issue #8131](https://github.com/electron-userland/electron-builder/issues/8131)).
C'est pourquoi `package.json` fige la version exactement à `24.13.1` (la
dernière version fonctionnelle) plutôt que via `^`. Le hook
`assets/nsis-hooks.nsh` force en plus la fermeture de l'application et de
ffmpeg avant l'installation.

Icônes : electron-builder utilise `assets/icon.icns` (macOS) et
`assets/icon.ico` (Windows). Le dépôt fournit la source `assets/icon.svg` —
à partir de celle-ci, vous pouvez générer les formats nécessaires (par
exemple, via `electron-icon-builder` ou un convertisseur en ligne). Si les
fichiers d'icône sont manquants, l'icône par défaut d'Electron est utilisée.

## Structure du projet

```
video-converter/
├── package.json                 # dépendances, scripts, configuration electron-builder
├── src/
│   ├── main/
│   │   ├── main.js              # processus principal : fenêtre, menu, IPC
│   │   ├── preload.js           # pont sécurisé (contextBridge)
│   │   └── converter.js         # cœur : FFmpeg, formats, préréglages, probe
│   └── renderer/
│       ├── index.html           # balisage de l'interface
│       ├── styles.css           # style, thèmes clair et sombre
│       ├── i18n.js              # traductions et changement de langue (8 langues)
│       ├── theme.js             # gestion du thème (système / clair / sombre)
│       └── renderer.js          # logique de l'interface, file d'attente, progression
├── scripts/
│   ├── fetch-ffmpeg.js          # remplace le binaire ffmpeg selon l'architecture cible
│   └── smoke-test.js            # vérification de conversion en ligne de commande
└── assets/
    ├── icon.svg                 # icône source de l'application
    └── nsis-hooks.nsh           # hooks de l'installateur NSIS (fermeture forcée de l'app/ffmpeg)
```

## Fonctionnement

Le processus principal (`converter.js`) appelle FFmpeg via `fluent-ffmpeg`, en
lui fournissant les chemins des binaires issus des paquets `ffmpeg-static` /
`ffprobe-static`. Le renderer ne communique avec lui qu'à travers
`preload.js` (`contextIsolation: true`, `nodeIntegration: false`), de sorte
que l'interface n'a aucun accès direct au système de fichiers ni aux API
Node.

Lors de l'empaquetage dans `asar`, les binaires FFmpeg sont extraits dans
`app.asar.unpacked` (voir `asarUnpack` dans `package.json`), et leurs chemins
sont ajustés dans `converter.js`.

## Licence

MIT (voir le champ `license` dans `package.json`). FFmpeg est distribué sous
sa propre licence (LGPL/GPL) — à garder à l'esprit lors de la distribution.
