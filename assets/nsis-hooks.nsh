; Кастомный хук NSIS для electron-builder.
;
; Перед установкой принудительно закрывает приложение и его дочерние утилиты
; (ffmpeg/ffprobe), чтобы переустановка проходила без диалога «cannot be closed»
; и без необходимости закрывать приложение вручную.
;
; Основную же ошибку при переустановке вызывал баг electron-builder 24.13.2+
; (регрессия из PR #8059) — он исправлен понижением сборщика до 24.13.1
; в package.json. Этот хук остаётся как аккуратная подстраховка.

!macro customCheckAppRunning
  nsExec::Exec 'taskkill /F /T /IM "${APP_EXECUTABLE_FILENAME}"'
  Pop $0
  nsExec::Exec 'taskkill /F /IM "ffmpeg.exe"'
  Pop $0
  nsExec::Exec 'taskkill /F /IM "ffprobe.exe"'
  Pop $0
  ; Небольшая пауза, чтобы ОС успела освободить файлы перед удалением старой версии.
  Sleep 800
!macroend
