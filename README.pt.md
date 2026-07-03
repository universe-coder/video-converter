# Video Converter

[English](README.md) · [Русский](README.ru.md) · [Українська](README.uk.md) · [Deutsch](README.de.md) · [Français](README.fr.md) · [Español](README.es.md) · **Português** · [中文](README.zh.md)

Aplicativo desktop multiplataforma (Windows e macOS) para converter vídeo de um
formato para outro. Construído com **Electron + FFmpeg**. O FFmpeg já vem
embutido no aplicativo — o usuário não precisa instalar nada extra.

![Video Converter](assets/icon.svg)

## Funcionalidades

- Arraste e solte arquivos ou selecione-os por uma caixa de diálogo; conversão em lote (fila).
- Formatos de saída:
  - **Vídeo:** MP4 (H.264), MKV, MOV, WebM (VP9), AVI (MPEG-4)
  - **Áudio:** MP3, M4A (AAC), WAV
  - **Animação GIF** a partir de vídeo
- Predefinições de qualidade (alta / média / baixa) e ajuste de resolução
  (até 4K, 1080p, 720p, 480p, 360p) preservando a proporção de tela.
- Progresso por arquivo, cancelamento e um botão “Mostrar na pasta”.
- Seleção da pasta de saída (por padrão, ao lado do arquivo original, sem
  sobrescrever o arquivo de origem).
- **Interface multilíngue** — 8 idiomas (Русский, English, Українська,
  Deutsch, Français, Español, Português, 中文) com detecção automática do
  idioma do sistema.
- **Temas claro e escuro** — detecção automática do tema do sistema, além de uma
  opção manual (Sistema / Claro / Escuro); as escolhas de idioma e tema persistem
  entre as execuções.

## Executando em desenvolvimento

```bash
cd video-converter
npm install
npm start          # ou npm run dev — com DevTools
```

> No primeiro `npm install`, os binários do Electron e do FFmpeg são baixados
> (~200 MB).

## Testando o núcleo de conversão (sem GUI)

Gera um vídeo de teste e o processa em todos os formatos:

```bash
npm run smoke
```

## Gerando os instaladores

```bash
npm run dist:mac        # → dist/Video Converter-1.0.0.dmg
npm run dist:win        # compila o instalador x64, depois ff:restore
npm run dist:win-x64    # somente 64 bits:  …-win-x64-Setup.exe
npm run pack            # build sem empacotar em dist/ (verificação rápida)
```

### Arquiteturas do Windows

| Arquitetura | Suporte | Observação |
|------|---------|------|
| **x64** | ✅ | alvo principal — Intel/AMD de 64 bits |
| **ia32** | ❌ | o `ffmpeg-static` upstream não fornece mais um binário ffmpeg de 32 bits |
| **arm64** | ❌ | `ffmpeg-static`/`ffprobe-static` não possuem binários para Windows-ARM; dispositivos ARM executam o build x64 por meio da emulação nativa |

**Observação importante sobre o FFmpeg e os builds por arquitetura.** O `ffmpeg-static` armazena apenas
**um** binário — o da máquina onde o `npm install` foi executado. Portanto, antes de gerar o build para
uma arquitetura diferente, é preciso buscar o `ffmpeg.exe` correspondente. Isso é
feito pelo script `scripts/fetch-ffmpeg.js`, que já é chamado dentro de
`dist:win-*`. Após um cross-build em uma máquina que não seja Windows, restaure o binário
nativo com `npm run ff:restore` (no `npm run dist:win` isso acontece
automaticamente ao final). O `ffprobe-static` não precisa de ajustes — ele já
contém binários para todas as plataformas.

**Onde compilar.** Gerar o instalador do Windows via cross-build no macOS funciona (testado:
`npm run dist:win-x64` gera o `.exe` sem o Wine). Compilar diretamente no Windows
também é conveniente — lá o `npm install` já baixa o ffmpeg correto
automaticamente. A única particularidade do cross-build é obter um ffmpeg atualizado para a arquitetura de destino
(veja acima sobre o `fetch-ffmpeg.js`).

### ⚠️ a versão do electron-builder está fixada (24.13.1)

**Não atualize o `electron-builder` para 24.13.2+ sem testar reinstalações.**
A versão 24.13.2 introduziu uma regressão (PR #8059): ao reinstalar sobre uma versão
mais antiga, o instalador trava com a mensagem “*… cannot be closed*” (… não pode ser fechado), mesmo quando o aplicativo
está fechado e nada relacionado a ele aparece no Gerenciador de Tarefas
([issue #8131](https://github.com/electron-userland/electron-builder/issues/8131)).
Por isso o `package.json` fixa a versão exatamente como `24.13.1` (a última
que funcionava) em vez de usar `^`. O hook `assets/nsis-hooks.nsh` também
força o encerramento do aplicativo e do ffmpeg antes da instalação.

Ícones: o electron-builder usa `assets/icon.icns` (macOS) e `assets/icon.ico`
(Windows). O repositório contém o arquivo-fonte `assets/icon.svg` — a partir dele você pode
gerar os formatos necessários (por exemplo, com `electron-icon-builder` ou um
conversor online). Se os arquivos de ícone estiverem ausentes, o ícone padrão do Electron é
utilizado.

## Estrutura do projeto

```
video-converter/
├── package.json                 # dependências, scripts, configuração do electron-builder
├── src/
│   ├── main/
│   │   ├── main.js              # processo principal: janela, menu, IPC
│   │   ├── preload.js           # ponte segura (contextBridge)
│   │   └── converter.js         # núcleo: FFmpeg, formatos, predefinições, probe
│   └── renderer/
│       ├── index.html           # marcação da interface
│       ├── styles.css           # estilização, temas claro e escuro
│       ├── i18n.js              # traduções e troca de idioma (8 idiomas)
│       ├── theme.js             # gerenciamento de tema (sistema / claro / escuro)
│       └── renderer.js          # lógica da interface, fila, progresso
├── scripts/
│   ├── fetch-ffmpeg.js          # substitui o binário do ffmpeg conforme a arquitetura de destino
│   └── smoke-test.js            # verificação de conversão via linha de comando
└── assets/
    ├── icon.svg                 # ícone-fonte do aplicativo
    └── nsis-hooks.nsh           # hooks do instalador NSIS (fecha à força o app/ffmpeg)
```

## Como funciona

O processo principal (`converter.js`) chama o FFmpeg por meio do `fluent-ffmpeg`, fornecendo
a ele os caminhos dos binários dos pacotes `ffmpeg-static` / `ffprobe-static`. O
renderer se comunica com ele somente através do `preload.js` (`contextIsolation: true`,
`nodeIntegration: false`), de modo que a interface não tem acesso direto ao sistema
de arquivos ou às APIs do Node.

Quando empacotado em `asar`, os binários do FFmpeg são extraídos para
`app.asar.unpacked` (veja `asarUnpack` em `package.json`), e seus caminhos são
ajustados em `converter.js`.

## Licença

MIT (veja o campo `license` em `package.json`). O FFmpeg é distribuído sob sua própria
licença (LGPL/GPL) — leve isso em conta ao distribuir o aplicativo.
