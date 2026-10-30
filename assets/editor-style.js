// Copyright (c) 2026 Lucas Van De Weerd. MIT.
import { element as $ } from './dom.js?v=2.7.0';
import { initialStyle, presets } from './model.js?v=2.7.0';
import { readLogo } from './qr.js?v=2.7.0';
import { readPicture } from './gif.js?v=2.7.0';
import { createStyleHistory } from './history.js?v=2.7.0';

export function createStyleEditor({ onChange }) {
  let style = initialStyle();
  let logoSequence = 0,
    photoSequence = 0;
  const styleHistory = createStyleHistory(style);
  function publishStyle(group = null) {
    styleHistory.record(style, group);
    historyButtons();
    onChange();
  }
  function historyButtons() {
    document
      .querySelectorAll('[data-history]')
      .forEach(
        (button) =>
          (button.disabled =
            button.dataset.history === 'undo' ? !styleHistory.canUndo : !styleHistory.canRedo),
      );
  }
  function restoreStyle(direction) {
    const restored = styleHistory.move(direction);
    if (!restored) return;
    logoSequence++;
    photoSequence++;
    style = restored;
    $('photoError').textContent = $('logoError').textContent = '';
    syncStyle();
    historyButtons();
    onChange();
  }
  document
    .querySelectorAll('[data-history]')
    .forEach((button) =>
      button.addEventListener('click', () =>
        restoreStyle(button.dataset.history === 'undo' ? -1 : 1),
      ),
    );
  document.addEventListener('keydown', (event) => {
    if (
      document.querySelector('dialog[open]') ||
      $('appWindow').hidden ||
      event.altKey ||
      event.isComposing
    )
      return;
    // Text fields retain the browser's native editing history.
    if (event.target.closest('input, textarea, select, [contenteditable]')) return;
    if (!(event.ctrlKey || event.metaKey)) return;
    const key = event.key.toLowerCase();
    if (key === 'z' || key === 'y') {
      event.preventDefault();
      restoreStyle(key === 'y' || event.shiftKey ? 1 : -1);
    }
  });
  function syncStyle() {
    const photo = style.mode === 'photo' || style.mode === 'art';
    $('codeLook').value = style.mode;
    $('panel-style').dataset.look = style.mode;
    $('photoOptions').hidden = !photo;
    ['photoColor', 'artRender', 'artDot', 'artContrast', 'artBrightness'].forEach(
      (key) => ($(key).value = style[key]),
    );
    $('photoThumb').hidden = !style.photo;
    if (style.photo) $('photoThumb').src = style.photo;
    else $('photoThumb').removeAttribute('src');
    $('photoRemove').disabled = !style.photo;
    $('photoStrength').value = style.photoStrength;
    $('photoStrengthValue').value = style.photoStrength + '%';
    [
      'modules',
      'corners',
      'eyes',
      'inkColor',
      'eyeColor',
      'paperColor',
      'inkHex',
      'eyeHex',
      'paperHex',
    ].forEach(
      (id) => ($(id).disabled = style.mode === 'photo' || (photo && !/Color|Hex/.test(id))),
    );
    $('logoBtn').disabled = photo;

    ['modules', 'corners', 'eyes', 'frame', 'logoShape'].forEach(
      (key) => ($(key).value = style[key]),
    );
    ['ink', 'eye', 'paper'].forEach((key) => {
      $(key + 'Color').value = style[key];
      $(key + 'Hex').value = style[key];
      $(key + 'Hex').removeAttribute('aria-invalid');
    });
    $('frameLabel').value = style.label;
    $('frameLabel').hidden = $('frameLabelTitle').hidden = style.frame === 'none';
    document.querySelectorAll('[data-preset]').forEach((button) => {
      const selected = button.dataset.preset === style.preset;
      button.setAttribute('aria-checked', String(selected));
      button.tabIndex = selected ? 0 : -1;
    });
    if (!style.preset) $('presets').querySelector('button').tabIndex = 0;
    $('logoScale').value = style.logoScale;
    $('logoScaleValue').value = style.logoScale + '%';
    $('logoPadding').value = style.logoPadding;
    $('logoPaddingValue').value = style.logoPadding;
    $('logoBacking').checked = style.logoBacking;
    $('logoClearSpace').checked = style.logoClear;
    $('logoOptions').disabled = !style.logo;
    $('logoClear').disabled = !style.logo;
    $('logoThumb').hidden = !style.logo;
    $('logoPlaceholder').hidden = !!style.logo;
    if (style.logo) $('logoThumb').src = style.logo;
    else $('logoThumb').removeAttribute('src');
  }
  function choosePreset(key) {
    Object.assign(style, presets[key], {
      preset: key,
      mode: ['classic', 'win97', 'ink'].includes(key) ? 'clean' : 'styled',
    });
    syncStyle();
    publishStyle();
  }
  Object.entries(presets).forEach(([key, preset]) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'preset-button';
    button.dataset.preset = key;
    button.setAttribute('role', 'radio');
    button.setAttribute('aria-label', preset.name);
    button.title = preset.name;
    const image = document.createElement('span');
    image.className = 'preset-image';
    new window.QRCodeStyling({
      width: 80,
      height: 80,
      type: 'canvas',
      data: 'qrer',
      margin: 5,
      qrOptions: { errorCorrectionLevel: 'M' },
      dotsOptions: { type: preset.modules, color: preset.ink },
      backgroundOptions: { color: preset.paper },
      cornersSquareOptions: { type: preset.corners, color: preset.ink },
      cornersDotOptions: { type: preset.eyes, color: preset.eye },
    }).append(image);
    const label = document.createElement('span');
    label.textContent = key === 'liquid' ? 'Liquid' : key === 'glass' ? 'Glass' : preset.name;
    button.append(image, label);
    button.addEventListener('click', () => choosePreset(key));
    $('presets').append(button);
  });
  $('presets').addEventListener('keydown', (event) => {
    const items = Array.from($('presets').children),
      index = items.indexOf(document.activeElement);
    if (index < 0 || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key))
      return;
    event.preventDefault();
    const next =
      items[
        (index + (['ArrowLeft', 'ArrowUp'].includes(event.key) ? -1 : 1) + items.length) %
          items.length
      ];
    next.click();
    next.focus();
  });
  ['modules', 'corners', 'eyes', 'frame'].forEach((key) =>
    $(key).addEventListener('change', () => {
      style[key] = $(key).value;
      if (key !== 'frame') style.mode = 'styled';
      style.preset = null;
      syncStyle();
      publishStyle();
    }),
  );
  $('frameLabel').addEventListener('input', () => {
    style.label = $('frameLabel').value;
    publishStyle('frameLabel');
  });
  ['ink', 'eye', 'paper'].forEach((key) => {
    $(key + 'Color').addEventListener('input', () => {
      style[key] = $(key + 'Color').value;
      style.preset = null;
      syncStyle();
      publishStyle(key + 'Color');
    });
    $(key + 'Hex').addEventListener('input', () => {
      const value = $(key + 'Hex').value.trim();
      const valid = /^#[\da-f]{6}$/i.test(value);
      $(key + 'Hex').setAttribute('aria-invalid', String(!valid));
      if (valid) {
        style[key] = value.toLowerCase();
        style.preset = null;
        $(key + 'Color').value = style[key];
        publishStyle(key + 'Hex');
      }
    });
    $(key + 'Hex').addEventListener('blur', () => {
      $(key + 'Hex').value = style[key];
      $(key + 'Hex').removeAttribute('aria-invalid');
    });
  });
  $('resetStyle').addEventListener('click', () => {
    logoSequence++;
    photoSequence++;
    style = initialStyle();
    $('logoFile').value = '';
    $('logoError').textContent = '';
    syncStyle();
    publishStyle();
  });
  $('logoBtn').addEventListener('click', () => $('logoFile').click());
  $('logoFile').addEventListener('change', async () => {
    const file = $('logoFile').files[0];
    if (!file) return;
    const sequence = ++logoSequence;
    $('logoError').textContent = '';
    try {
      const logo = await readLogo(file);
      if (sequence !== logoSequence) return;
      style.logo = logo;
      syncStyle();
      publishStyle();
    } catch (error) {
      if (sequence === logoSequence) $('logoError').textContent = error.message;
    } finally {
      $('logoFile').value = '';
    }
  });
  $('logoClear').addEventListener('click', () => {
    logoSequence++;
    style.logo = null;
    syncStyle();
    publishStyle();
  });
  $('logoShape').addEventListener('change', () => {
    style.logoShape = $('logoShape').value;
    publishStyle();
  });
  ['logoScale', 'logoPadding'].forEach((key) =>
    $(key).addEventListener('input', () => {
      style[key] = Number($(key).value);
      $(key + 'Value').value = style[key] + (key === 'logoScale' ? '%' : '');
      publishStyle(key);
    }),
  );
  $('logoBacking').addEventListener('change', () => {
    style.logoBacking = $('logoBacking').checked;
    publishStyle();
  });
  $('logoClearSpace').addEventListener('change', () => {
    style.logoClear = $('logoClearSpace').checked;
    publishStyle();
  });
  $('codeLook').addEventListener('change', () => {
    style.mode = $('codeLook').value;
    style.preset = null;
    if (style.mode === 'clean')
      Object.assign(style, {
        modules: 'square',
        corners: 'square',
        eyes: 'square',
      });
    if (style.mode === 'photo' || style.mode === 'art') {
      logoSequence++;
      Object.assign(style, {
        logo: null,
        ink: '#111111',
        eye: '#111111',
        paper: '#ffffff',
      });
    }
    syncStyle();
    publishStyle();
  });
  $('photoBtn').addEventListener('click', () => $('photoFile').click());
  $('photoFile').addEventListener('change', async () => {
    const file = $('photoFile').files[0];
    if (!file) return;
    const token = ++photoSequence;
    $('photoError').textContent = '';
    try {
      const image = await readPicture(file, readLogo);
      if (token !== photoSequence) return;
      style.photo = image;
      syncStyle();
      publishStyle();
    } catch (error) {
      if (token === photoSequence) $('photoError').textContent = error.message;
    } finally {
      $('photoFile').value = '';
    }
  });
  $('photoRemove').addEventListener('click', () => {
    photoSequence++;
    style.photo = null;
    syncStyle();
    publishStyle();
  });
  $('photoStrength').addEventListener('input', () => {
    style.photoStrength = Number($('photoStrength').value);
    $('photoStrengthValue').value = style.photoStrength + '%';
    publishStyle('photoStrength');
  });
  ['photoColor', 'artRender', 'artDot'].forEach((key) =>
    $(key).addEventListener('change', () => {
      style[key] = $(key).value;
      publishStyle();
    }),
  );
  ['artContrast', 'artBrightness'].forEach((key) =>
    $(key).addEventListener('input', () => {
      style[key] = Number($(key).value);
      publishStyle(key);
    }),
  );

  syncStyle();
  historyButtons();
  return { read: () => ({ ...style }) };
}
