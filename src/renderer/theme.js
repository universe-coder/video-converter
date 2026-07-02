'use strict';

/**
 * Управление темой оформления.
 *
 * Режимы (предпочтение пользователя): 'system' | 'light' | 'dark'.
 *  - system: тема следует за системной (prefers-color-scheme) и меняется на лету.
 *  - light / dark: принудительно выбранная тема.
 *
 * Выбранная тема сохраняется в localStorage. Атрибут data-theme на <html>
 * всегда содержит уже вычисленное значение ('light' | 'dark') — этим управляет CSS.
 *
 * Файл подключается в <head> синхронно и применяет тему ещё до первой
 * отрисовки, поэтому «мигания» тёмным фоном при светлой теме не будет.
 */
(function () {
  const STORAGE_KEY = 'vc.theme';
  const mql = window.matchMedia('(prefers-color-scheme: dark)');

  function safeGet() {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch (_) {
      return null;
    }
  }
  function safeSet(value) {
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch (_) {
      /* ignore */
    }
  }

  function normalize(v) {
    return v === 'light' || v === 'dark' || v === 'system' ? v : 'system';
  }

  let pref = normalize(safeGet());

  /** Вычисляет фактическую тему из предпочтения. */
  function resolve(p) {
    const pr = p || pref;
    if (pr === 'light' || pr === 'dark') return pr;
    return mql.matches ? 'dark' : 'light';
  }

  /** Проставляет вычисленную тему на <html>. */
  function applyResolved() {
    document.documentElement.setAttribute('data-theme', resolve());
  }

  /** Сообщает основному процессу тему для нативных диалогов и окна. */
  function syncNative() {
    try {
      if (window.api && typeof window.api.setNativeTheme === 'function') {
        window.api.setNativeTheme(pref);
      }
    } catch (_) {
      /* ignore */
    }
  }

  // Применяем сразу (мы в <head>, документ ещё не отрисован).
  applyResolved();

  function setPref(next) {
    pref = normalize(next);
    safeSet(pref);
    applyResolved();
    syncNative();
  }

  function getPref() {
    return pref;
  }

  // Реакция на смену системной темы — только в режиме «Системная».
  const onSystemChange = () => {
    if (pref === 'system') applyResolved();
  };
  if (typeof mql.addEventListener === 'function') {
    mql.addEventListener('change', onSystemChange);
  } else if (typeof mql.addListener === 'function') {
    mql.addListener(onSystemChange); // старый API
  }

  // Привязываем переключатель в шапке, когда DOM готов.
  function wireControl() {
    const sel = document.getElementById('themeSelect');
    if (sel) {
      sel.value = pref;
      sel.addEventListener('change', () => setPref(sel.value));
    }
    syncNative();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wireControl);
  } else {
    wireControl();
  }

  window.themeManager = { getPref, setPref, resolve };
})();
