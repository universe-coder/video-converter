# Video Converter

[English](README.md) · [Русский](README.ru.md) · [Українська](README.uk.md) · [Deutsch](README.de.md) · [Français](README.fr.md) · [Español](README.es.md) · [Português](README.pt.md) · **中文**

跨平台桌面应用（Windows 和 macOS），用于将视频从一种格式转换为另一种格式。基于 **Electron + FFmpeg** 构建。FFmpeg 内置于应用中——用户无需额外安装任何东西。

![Video Converter](assets/icon.svg)

## 功能特性

- 拖放文件或通过对话框选择文件；支持批量转换（队列）。
- 输出格式：
  - **视频：** MP4（H.264）、MKV、MOV、WebM（VP9）、AVI（MPEG-4）
  - **音频：** MP3、M4A（AAC）、WAV
  - 从视频生成 **GIF 动画**
- 质量预设（高 / 中 / 低）和分辨率缩放
  （最高支持 4K、1080p、720p、480p、360p），并保持宽高比。
- 逐文件显示进度、支持取消，以及“在文件夹中显示”按钮。
- 输出文件夹选择（默认在原文件旁边，不会
  覆盖源文件）。
- **多语言界面** —— 8 种语言（Русский, English, Українська,
  Deutsch, Français, Español, Português, 中文），并支持自动检测系统语言。
- **浅色和深色主题** —— 自动检测系统主题，同时支持手动
  覆盖（跟随系统 / 浅色 / 深色）；语言和主题选择会在
  启动之间保持不变。

## 开发环境下运行

```bash
cd video-converter
npm install
npm start          # 或 npm run dev —— 附带 DevTools
```

> 首次执行 `npm install` 时，会下载 Electron 和 FFmpeg 二进制文件
> （约 200 MB）。

## 测试转换核心（无图形界面）

生成一个测试视频，并让它经过每种格式的转换：

```bash
npm run smoke
```

## 构建安装包

```bash
npm run dist:mac        # → dist/Video Converter-1.0.0.dmg
npm run dist:win        # 依次构建 x64 和 ia32，然后执行 ff:restore
npm run dist:win-x64    # 仅 64 位：  …-win-x64-Setup.exe
npm run dist:win-ia32   # 仅 32 位：  …-win-ia32-Setup.exe
npm run pack            # 在 dist/ 中生成未打包的构建（快速检查）
```

### Windows 架构

| 架构 | 支持情况 | 说明 |
|------|---------|------|
| **x64** | ✅ | 主要目标平台——64 位 Intel/AMD |
| **ia32** | ✅ | 32 位 Windows（如今已很少见） |
| **arm64** | ❌ | `ffmpeg-static`/`ffprobe-static` 没有 Windows-ARM 二进制文件；ARM 设备通过内置模拟运行 x64 构建版本 |

**关于 FFmpeg 与分架构构建的重要说明。** `ffmpeg-static` 只存储
**一个**二进制文件——对应运行 `npm install` 的那台机器。因此在为
其他架构构建之前，需要获取匹配的 `ffmpeg.exe`。这一过程由
`scripts/fetch-ffmpeg.js` 脚本处理，该脚本已经在
`dist:win-*` 内部被调用。在非 Windows 机器上完成交叉构建后，请使用
`npm run ff:restore` 恢复原生二进制文件（在 `npm run dist:win` 中，
这一步会在最后自动完成）。`ffprobe-static` 无需处理——它已经
包含了适用于所有平台的二进制文件。

**在何处构建。** 在 macOS 上交叉构建 Windows 安装包是可行的（已测试：
`npm run dist:win-x64` 无需 Wine 即可构建出 `.exe`）。在 Windows
上直接构建同样方便——在那里 `npm install` 会直接拉取正确的 ffmpeg。
交叉构建唯一需要注意的细节是为目标架构获取新的 ffmpeg
（参见上文关于 `fetch-ffmpeg.js` 的说明）。

### ⚠️ electron-builder 版本已锁定（24.13.1）

**在未经重新安装测试之前，请勿将 `electron-builder` 升级到 24.13.2 及以上版本。**
24.13.2 引入了一个回归问题（PR #8059）：在覆盖旧版本重新安装时，
安装程序会卡在“*… cannot be closed*”（……无法关闭）提示上，即使应用
已经关闭，且任务管理器中也没有我们相关的进程
（[issue #8131](https://github.com/electron-userland/electron-builder/issues/8131)）。
因此 `package.json` 将版本精确锁定为 `24.13.1`（最后一个可正常
工作的版本），而不是使用 `^` 符号。`assets/nsis-hooks.nsh` 钩子
还会在安装前强制关闭应用和 ffmpeg。

图标：electron-builder 使用 `assets/icon.icns`（macOS）和 `assets/icon.ico`
（Windows）。仓库中提供了源文件 `assets/icon.svg`——你可以从中
生成所需的格式（例如通过 `electron-icon-builder` 或在线转换工具）。
如果缺少图标文件，则会使用 Electron 的默认图标。

## 项目结构

```
video-converter/
├── package.json                 # 依赖项、脚本、electron-builder 配置
├── src/
│   ├── main/
│   │   ├── main.js              # 主进程：窗口、菜单、IPC
│   │   ├── preload.js           # 安全桥接（contextBridge）
│   │   └── converter.js         # 核心：FFmpeg、格式、预设、探测
│   └── renderer/
│       ├── index.html           # UI 标记
│       ├── styles.css           # 样式，浅色和深色主题
│       ├── i18n.js              # 翻译与语言切换（8 种语言）
│       ├── theme.js             # 主题管理（跟随系统 / 浅色 / 深色）
│       └── renderer.js          # UI 逻辑、队列、进度
├── scripts/
│   ├── fetch-ffmpeg.js          # 按目标架构切换 ffmpeg 二进制文件
│   └── smoke-test.js            # 命令行转换检查
└── assets/
    ├── icon.svg                 # 应用源图标
    └── nsis-hooks.nsh           # NSIS 安装程序钩子（强制关闭应用/ffmpeg）
```

## 工作原理

主进程（`converter.js`）通过 `fluent-ffmpeg` 调用 FFmpeg，为其
提供来自 `ffmpeg-static` / `ffprobe-static` 包的二进制文件路径。
渲染进程仅通过 `preload.js` 与其通信（`contextIsolation: true`，
`nodeIntegration: false`），因此界面无法直接访问文件
系统或 Node API。

打包成 `asar` 时，FFmpeg 二进制文件会被解包到
`app.asar.unpacked` 中（参见 `package.json` 中的 `asarUnpack`），
其路径也会在 `converter.js` 中相应调整。

## 许可证

MIT（参见 `package.json` 中的 `license` 字段）。FFmpeg 依据其自身的
许可证发布（LGPL/GPL）——分发时请留意这一点。
