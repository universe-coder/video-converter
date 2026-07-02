'use strict';

/**
 * Простая i18n-система для рендерера (без сборщика и внешних зависимостей).
 *
 * Использование:
 *   i18n.init();                     // определить язык (сохранённый / системный)
 *   i18n.apply();                    // проставить статические строки по data-i18n
 *   i18n.t('convert');               // получить перевод строки
 *   i18n.t('status_result', { n });  // с подстановкой {n}
 *   i18n.setLang('en');              // сменить язык (сохраняется)
 *
 * Разметка:
 *   <span data-i18n="convert"></span>           → textContent
 *   <button data-i18n-title="remove"></button>  → title
 *   <input data-i18n-aria-label="lang"></input>  → aria-label
 */
(function () {
  const STORAGE_KEY = 'vc.lang';

  // Языки в порядке отображения в списке. name — самоназвание.
  const LANGS = [
    { code: 'ru', name: 'Русский' },
    { code: 'en', name: 'English' },
    { code: 'uk', name: 'Українська' },
    { code: 'de', name: 'Deutsch' },
    { code: 'fr', name: 'Français' },
    { code: 'es', name: 'Español' },
    { code: 'pt', name: 'Português' },
    { code: 'zh', name: '中文' },
  ];

  const translations = {
    ru: {
      app_subtitle: 'Конвертер видео для Windows и macOS',
      control_language: 'Язык',
      control_theme: 'Тема',
      theme_system: 'Системная',
      theme_light: 'Светлая',
      theme_dark: 'Тёмная',
      dropzone_aria: 'Добавить файлы',
      dropzone_title: 'Перетащите видео сюда',
      dropzone_sub: 'или нажмите, чтобы выбрать файлы',
      label_format: 'Формат',
      label_quality: 'Качество',
      quality_high: 'Высокое',
      quality_medium: 'Среднее',
      quality_low: 'Низкое (меньше размер)',
      label_resolution: 'Разрешение',
      resolution_original: 'Как в оригинале',
      label_output: 'Сохранять в',
      output_default: 'Рядом с оригиналом',
      choose_dir: 'Выбрать…',
      reset_dir: 'Сброс',
      clear: 'Очистить',
      cancel: 'Отменить',
      convert: 'Конвертировать',
      meta_reading: 'Чтение сведений…',
      meta_read_error: 'Не удалось прочитать файл',
      meta_media: 'Медиафайл',
      status_pending: 'В очереди',
      status_done: 'Готово',
      status_error: 'Ошибка',
      status_canceled: 'Отменено',
      action_show: 'Показать',
      action_remove: 'Убрать',
      status_converting: 'Конвертация…',
      status_cancel_pending: 'Отмена…',
      status_canceled_msg: 'Конвертация отменена',
      status_result_mixed: 'Готово: {done}, с ошибкой: {failed}',
      status_result_success: 'Успешно сконвертировано: {done}',
      error_unknown: 'Неизвестная ошибка',
      format_gif_desc: 'анимация',
      format_mp3_desc: 'только звук',
      format_m4a_desc: 'звук AAC',
      format_wav_desc: 'без сжатия',
      size_units: ['Б', 'КБ', 'МБ', 'ГБ', 'ТБ'],
      dialog_select_title: 'Выберите видео для конвертации',
      dialog_filter_media: 'Видео и аудио',
      dialog_filter_all: 'Все файлы',
      dialog_output_title: 'Папка для сохранения',
    },

    en: {
      app_subtitle: 'Video converter for Windows and macOS',
      control_language: 'Language',
      control_theme: 'Theme',
      theme_system: 'System',
      theme_light: 'Light',
      theme_dark: 'Dark',
      dropzone_aria: 'Add files',
      dropzone_title: 'Drop videos here',
      dropzone_sub: 'or click to choose files',
      label_format: 'Format',
      label_quality: 'Quality',
      quality_high: 'High',
      quality_medium: 'Medium',
      quality_low: 'Low (smaller size)',
      label_resolution: 'Resolution',
      resolution_original: 'Same as source',
      label_output: 'Save to',
      output_default: 'Next to the original',
      choose_dir: 'Choose…',
      reset_dir: 'Reset',
      clear: 'Clear',
      cancel: 'Cancel',
      convert: 'Convert',
      meta_reading: 'Reading details…',
      meta_read_error: 'Could not read the file',
      meta_media: 'Media file',
      status_pending: 'Queued',
      status_done: 'Done',
      status_error: 'Error',
      status_canceled: 'Canceled',
      action_show: 'Show',
      action_remove: 'Remove',
      status_converting: 'Converting…',
      status_cancel_pending: 'Canceling…',
      status_canceled_msg: 'Conversion canceled',
      status_result_mixed: 'Done: {done}, failed: {failed}',
      status_result_success: 'Successfully converted: {done}',
      error_unknown: 'Unknown error',
      format_gif_desc: 'animation',
      format_mp3_desc: 'audio only',
      format_m4a_desc: 'AAC audio',
      format_wav_desc: 'uncompressed',
      size_units: ['B', 'KB', 'MB', 'GB', 'TB'],
      dialog_select_title: 'Select videos to convert',
      dialog_filter_media: 'Video and audio',
      dialog_filter_all: 'All files',
      dialog_output_title: 'Destination folder',
    },

    uk: {
      app_subtitle: 'Конвертер відео для Windows і macOS',
      control_language: 'Мова',
      control_theme: 'Тема',
      theme_system: 'Системна',
      theme_light: 'Світла',
      theme_dark: 'Темна',
      dropzone_aria: 'Додати файли',
      dropzone_title: 'Перетягніть відео сюди',
      dropzone_sub: 'або натисніть, щоб вибрати файли',
      label_format: 'Формат',
      label_quality: 'Якість',
      quality_high: 'Висока',
      quality_medium: 'Середня',
      quality_low: 'Низька (менший розмір)',
      label_resolution: 'Роздільність',
      resolution_original: 'Як в оригіналі',
      label_output: 'Зберігати в',
      output_default: 'Поряд з оригіналом',
      choose_dir: 'Вибрати…',
      reset_dir: 'Скинути',
      clear: 'Очистити',
      cancel: 'Скасувати',
      convert: 'Конвертувати',
      meta_reading: 'Читання відомостей…',
      meta_read_error: 'Не вдалося прочитати файл',
      meta_media: 'Медіафайл',
      status_pending: 'У черзі',
      status_done: 'Готово',
      status_error: 'Помилка',
      status_canceled: 'Скасовано',
      action_show: 'Показати',
      action_remove: 'Прибрати',
      status_converting: 'Конвертація…',
      status_cancel_pending: 'Скасування…',
      status_canceled_msg: 'Конвертацію скасовано',
      status_result_mixed: 'Готово: {done}, з помилкою: {failed}',
      status_result_success: 'Успішно конвертовано: {done}',
      error_unknown: 'Невідома помилка',
      format_gif_desc: 'анімація',
      format_mp3_desc: 'лише звук',
      format_m4a_desc: 'звук AAC',
      format_wav_desc: 'без стиснення',
      size_units: ['Б', 'КБ', 'МБ', 'ГБ', 'ТБ'],
      dialog_select_title: 'Виберіть відео для конвертації',
      dialog_filter_media: 'Відео та аудіо',
      dialog_filter_all: 'Усі файли',
      dialog_output_title: 'Папка для збереження',
    },

    de: {
      app_subtitle: 'Video-Konverter für Windows und macOS',
      control_language: 'Sprache',
      control_theme: 'Design',
      theme_system: 'System',
      theme_light: 'Hell',
      theme_dark: 'Dunkel',
      dropzone_aria: 'Dateien hinzufügen',
      dropzone_title: 'Videos hierher ziehen',
      dropzone_sub: 'oder klicken, um Dateien auszuwählen',
      label_format: 'Format',
      label_quality: 'Qualität',
      quality_high: 'Hoch',
      quality_medium: 'Mittel',
      quality_low: 'Niedrig (kleinere Größe)',
      label_resolution: 'Auflösung',
      resolution_original: 'Wie im Original',
      label_output: 'Speichern in',
      output_default: 'Neben dem Original',
      choose_dir: 'Auswählen…',
      reset_dir: 'Zurücksetzen',
      clear: 'Leeren',
      cancel: 'Abbrechen',
      convert: 'Konvertieren',
      meta_reading: 'Details werden gelesen…',
      meta_read_error: 'Datei konnte nicht gelesen werden',
      meta_media: 'Mediendatei',
      status_pending: 'In Warteschlange',
      status_done: 'Fertig',
      status_error: 'Fehler',
      status_canceled: 'Abgebrochen',
      action_show: 'Anzeigen',
      action_remove: 'Entfernen',
      status_converting: 'Konvertierung…',
      status_cancel_pending: 'Wird abgebrochen…',
      status_canceled_msg: 'Konvertierung abgebrochen',
      status_result_mixed: 'Fertig: {done}, fehlgeschlagen: {failed}',
      status_result_success: 'Erfolgreich konvertiert: {done}',
      error_unknown: 'Unbekannter Fehler',
      format_gif_desc: 'Animation',
      format_mp3_desc: 'nur Audio',
      format_m4a_desc: 'AAC-Audio',
      format_wav_desc: 'unkomprimiert',
      size_units: ['B', 'KB', 'MB', 'GB', 'TB'],
      dialog_select_title: 'Videos zum Konvertieren auswählen',
      dialog_filter_media: 'Video und Audio',
      dialog_filter_all: 'Alle Dateien',
      dialog_output_title: 'Zielordner',
    },

    fr: {
      app_subtitle: 'Convertisseur vidéo pour Windows et macOS',
      control_language: 'Langue',
      control_theme: 'Thème',
      theme_system: 'Système',
      theme_light: 'Clair',
      theme_dark: 'Sombre',
      dropzone_aria: 'Ajouter des fichiers',
      dropzone_title: 'Déposez les vidéos ici',
      dropzone_sub: 'ou cliquez pour choisir des fichiers',
      label_format: 'Format',
      label_quality: 'Qualité',
      quality_high: 'Élevée',
      quality_medium: 'Moyenne',
      quality_low: 'Basse (taille réduite)',
      label_resolution: 'Résolution',
      resolution_original: "Comme l'original",
      label_output: 'Enregistrer dans',
      output_default: "À côté de l'original",
      choose_dir: 'Choisir…',
      reset_dir: 'Réinitialiser',
      clear: 'Effacer',
      cancel: 'Annuler',
      convert: 'Convertir',
      meta_reading: 'Lecture des informations…',
      meta_read_error: 'Impossible de lire le fichier',
      meta_media: 'Fichier multimédia',
      status_pending: "En file d'attente",
      status_done: 'Terminé',
      status_error: 'Erreur',
      status_canceled: 'Annulé',
      action_show: 'Afficher',
      action_remove: 'Retirer',
      status_converting: 'Conversion…',
      status_cancel_pending: 'Annulation…',
      status_canceled_msg: 'Conversion annulée',
      status_result_mixed: 'Terminé : {done}, en échec : {failed}',
      status_result_success: 'Converti avec succès : {done}',
      error_unknown: 'Erreur inconnue',
      format_gif_desc: 'animation',
      format_mp3_desc: 'audio uniquement',
      format_m4a_desc: 'audio AAC',
      format_wav_desc: 'non compressé',
      size_units: ['o', 'Ko', 'Mo', 'Go', 'To'],
      dialog_select_title: 'Sélectionnez les vidéos à convertir',
      dialog_filter_media: 'Vidéo et audio',
      dialog_filter_all: 'Tous les fichiers',
      dialog_output_title: 'Dossier de destination',
    },

    es: {
      app_subtitle: 'Conversor de vídeo para Windows y macOS',
      control_language: 'Idioma',
      control_theme: 'Tema',
      theme_system: 'Sistema',
      theme_light: 'Claro',
      theme_dark: 'Oscuro',
      dropzone_aria: 'Añadir archivos',
      dropzone_title: 'Arrastra los vídeos aquí',
      dropzone_sub: 'o haz clic para elegir archivos',
      label_format: 'Formato',
      label_quality: 'Calidad',
      quality_high: 'Alta',
      quality_medium: 'Media',
      quality_low: 'Baja (menor tamaño)',
      label_resolution: 'Resolución',
      resolution_original: 'Igual que el original',
      label_output: 'Guardar en',
      output_default: 'Junto al original',
      choose_dir: 'Elegir…',
      reset_dir: 'Restablecer',
      clear: 'Limpiar',
      cancel: 'Cancelar',
      convert: 'Convertir',
      meta_reading: 'Leyendo información…',
      meta_read_error: 'No se pudo leer el archivo',
      meta_media: 'Archivo multimedia',
      status_pending: 'En cola',
      status_done: 'Listo',
      status_error: 'Error',
      status_canceled: 'Cancelado',
      action_show: 'Mostrar',
      action_remove: 'Quitar',
      status_converting: 'Convirtiendo…',
      status_cancel_pending: 'Cancelando…',
      status_canceled_msg: 'Conversión cancelada',
      status_result_mixed: 'Listo: {done}, con error: {failed}',
      status_result_success: 'Convertido correctamente: {done}',
      error_unknown: 'Error desconocido',
      format_gif_desc: 'animación',
      format_mp3_desc: 'solo audio',
      format_m4a_desc: 'audio AAC',
      format_wav_desc: 'sin comprimir',
      size_units: ['B', 'KB', 'MB', 'GB', 'TB'],
      dialog_select_title: 'Selecciona los vídeos a convertir',
      dialog_filter_media: 'Vídeo y audio',
      dialog_filter_all: 'Todos los archivos',
      dialog_output_title: 'Carpeta de destino',
    },

    pt: {
      app_subtitle: 'Conversor de vídeo para Windows e macOS',
      control_language: 'Idioma',
      control_theme: 'Tema',
      theme_system: 'Sistema',
      theme_light: 'Claro',
      theme_dark: 'Escuro',
      dropzone_aria: 'Adicionar arquivos',
      dropzone_title: 'Arraste os vídeos aqui',
      dropzone_sub: 'ou clique para escolher arquivos',
      label_format: 'Formato',
      label_quality: 'Qualidade',
      quality_high: 'Alta',
      quality_medium: 'Média',
      quality_low: 'Baixa (menor tamanho)',
      label_resolution: 'Resolução',
      resolution_original: 'Igual ao original',
      label_output: 'Salvar em',
      output_default: 'Junto ao original',
      choose_dir: 'Escolher…',
      reset_dir: 'Redefinir',
      clear: 'Limpar',
      cancel: 'Cancelar',
      convert: 'Converter',
      meta_reading: 'Lendo informações…',
      meta_read_error: 'Não foi possível ler o arquivo',
      meta_media: 'Arquivo de mídia',
      status_pending: 'Na fila',
      status_done: 'Concluído',
      status_error: 'Erro',
      status_canceled: 'Cancelado',
      action_show: 'Mostrar',
      action_remove: 'Remover',
      status_converting: 'Convertendo…',
      status_cancel_pending: 'Cancelando…',
      status_canceled_msg: 'Conversão cancelada',
      status_result_mixed: 'Concluído: {done}, com erro: {failed}',
      status_result_success: 'Convertido com sucesso: {done}',
      error_unknown: 'Erro desconhecido',
      format_gif_desc: 'animação',
      format_mp3_desc: 'somente áudio',
      format_m4a_desc: 'áudio AAC',
      format_wav_desc: 'sem compressão',
      size_units: ['B', 'KB', 'MB', 'GB', 'TB'],
      dialog_select_title: 'Selecione os vídeos para converter',
      dialog_filter_media: 'Vídeo e áudio',
      dialog_filter_all: 'Todos os arquivos',
      dialog_output_title: 'Pasta de destino',
    },

    zh: {
      app_subtitle: '适用于 Windows 和 macOS 的视频转换器',
      control_language: '语言',
      control_theme: '主题',
      theme_system: '跟随系统',
      theme_light: '浅色',
      theme_dark: '深色',
      dropzone_aria: '添加文件',
      dropzone_title: '将视频拖到这里',
      dropzone_sub: '或点击选择文件',
      label_format: '格式',
      label_quality: '质量',
      quality_high: '高',
      quality_medium: '中',
      quality_low: '低（体积更小）',
      label_resolution: '分辨率',
      resolution_original: '与原始相同',
      label_output: '保存到',
      output_default: '与原文件相同位置',
      choose_dir: '选择…',
      reset_dir: '重置',
      clear: '清空',
      cancel: '取消',
      convert: '转换',
      meta_reading: '正在读取信息…',
      meta_read_error: '无法读取文件',
      meta_media: '媒体文件',
      status_pending: '排队中',
      status_done: '完成',
      status_error: '错误',
      status_canceled: '已取消',
      action_show: '显示',
      action_remove: '移除',
      status_converting: '转换中…',
      status_cancel_pending: '正在取消…',
      status_canceled_msg: '转换已取消',
      status_result_mixed: '完成：{done}，失败：{failed}',
      status_result_success: '成功转换：{done}',
      error_unknown: '未知错误',
      format_gif_desc: '动画',
      format_mp3_desc: '仅音频',
      format_m4a_desc: 'AAC 音频',
      format_wav_desc: '无压缩',
      size_units: ['B', 'KB', 'MB', 'GB', 'TB'],
      dialog_select_title: '选择要转换的视频',
      dialog_filter_media: '视频和音频',
      dialog_filter_all: '所有文件',
      dialog_output_title: '保存文件夹',
    },
  };

  let current = 'ru';

  function safeGet(key) {
    try {
      return localStorage.getItem(key);
    } catch (_) {
      return null;
    }
  }
  function safeSet(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch (_) {
      /* ignore */
    }
  }

  /** Определяет стартовый язык: сохранённый → системный → английский. */
  function detectLang() {
    const saved = safeGet(STORAGE_KEY);
    if (saved && translations[saved]) return saved;
    const nav = (navigator.language || navigator.userLanguage || 'en').slice(0, 2).toLowerCase();
    return translations[nav] ? nav : 'en';
  }

  function init() {
    current = detectLang();
    document.documentElement.setAttribute('lang', current);
    return current;
  }

  function getLang() {
    return current;
  }

  function setLang(code) {
    if (!translations[code]) return;
    current = code;
    safeSet(STORAGE_KEY, code);
    document.documentElement.setAttribute('lang', code);
  }

  /** Перевод строки с подстановкой {name}. Откат: en → сам ключ. */
  function t(key, params) {
    const dict = translations[current] || translations.en;
    let str = dict[key];
    if (str === undefined) str = translations.en[key];
    if (str === undefined) return key;
    if (typeof str !== 'string') return str;
    if (params) {
      str = str.replace(/\{(\w+)\}/g, (m, k) => (params[k] !== undefined ? params[k] : m));
    }
    return str;
  }

  /** Возвращает значение как есть (для нестроковых — например, массива единиц размера). */
  function tRaw(key) {
    const dict = translations[current] || translations.en;
    return dict[key] !== undefined ? dict[key] : translations.en[key];
  }

  /** Проставляет статические строки по data-i18n / data-i18n-title / data-i18n-aria-label. */
  function apply(root) {
    const scope = root || document;
    scope.querySelectorAll('[data-i18n]').forEach((el) => {
      el.textContent = t(el.getAttribute('data-i18n'));
    });
    scope.querySelectorAll('[data-i18n-title]').forEach((el) => {
      el.setAttribute('title', t(el.getAttribute('data-i18n-title')));
    });
    scope.querySelectorAll('[data-i18n-aria-label]').forEach((el) => {
      el.setAttribute('aria-label', t(el.getAttribute('data-i18n-aria-label')));
    });
  }

  window.i18n = { init, getLang, setLang, t, tRaw, apply, langs: LANGS };
})();
