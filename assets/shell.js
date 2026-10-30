// Copyright (c) 2026 Lucas Van De Weerd. MIT.
import { element as $ } from './dom.js?v=2.7.0';
import { loadAppearance, saveAppearance } from './appearance.js?v=2.7.0';
import { createGlassLayer } from './glass.js?v=2.7.0';
import { createGlassControls } from './glass-components.js?v=2.7.0';
import { initializeRetro } from './retro.js?v=2.7.0';

export function createShell() {
  let preferences = loadAppearance();
  const glassControls = createGlassControls();
  const glass = createGlassLayer($('appWindow'), (status) => {
    glassControls.setEnabled(status === 'active');
    $('glassStatus').textContent = status === 'fallback' ? 'Glass unavailable' : 'Liquid glass';
    $('glassToggle').title =
      status === 'fallback'
        ? 'Glass is unavailable on this browser. Opaque controls are in use.'
        : 'Liquid glass controls and window chrome';
  });
  function applyPreferences() {
    saveAppearance(preferences);
    glass.update(preferences);
  }
  applyPreferences();
  $('glassToggle').addEventListener('change', () => {
    preferences.glass = $('glassToggle').checked;
    applyPreferences();
  });
  function selectPanel(name, focus = false) {
    document.querySelectorAll('[data-panel]').forEach((button) => {
      const selected = button.dataset.panel === name;
      button.setAttribute('aria-selected', String(selected));
      button.tabIndex = selected ? 0 : -1;
      $('panel-' + button.dataset.panel).hidden = !selected;
      if (selected && focus) button.focus();
    });
  }
  document
    .querySelectorAll('[data-panel]')
    .forEach((button) => button.addEventListener('click', () => selectPanel(button.dataset.panel)));
  $('tab-content').parentElement.addEventListener('keydown', (event) => {
    const tabs = Array.from(document.querySelectorAll('[data-panel]'));
    const index = tabs.indexOf(document.activeElement);
    if (index < 0 || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const target =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? tabs.length - 1
          : (index + (event.key === 'ArrowLeft' ? -1 : 1) + tabs.length) % tabs.length;
    selectPanel(tabs[target].dataset.panel, true);
  });
  $('aboutBtn').addEventListener('click', () => $('aboutDialog').showModal());
  $('aboutClose').addEventListener('click', () => $('aboutDialog').close());
  $('aboutDialog').addEventListener('close', () => $('aboutBtn').focus({ preventScroll: true }));
  for (const dialog of document.querySelectorAll('dialog')) {
    dialog.addEventListener('click', (event) => {
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      if (
        event.clientX < rect.left ||
        event.clientX > rect.right ||
        event.clientY < rect.top ||
        event.clientY > rect.bottom
      )
        dialog.close();
    });
  }
  const menu = $('toolsMenu');
  menu.querySelectorAll('[data-action]').forEach((button) =>
    button.addEventListener('click', () => {
      menu.open = false;
      const action = button.dataset.action;
      if (action === 'appearance') {
        $('displayWallpaper').value = preferences.wallpaper;
        $('displayGlass').checked = preferences.glass;
        $('displayDialog').showModal();
      } else
        ({
          scan: $('scanBtn'),
          verify: $('verifyBtn'),
          png: $('dlPng'),
          svg: $('dlSvg'),
          gif: $('dlGif'),
          about: $('aboutBtn'),
        })[action]?.click();
    }),
  );
  document.addEventListener('click', (event) => {
    if (!menu.contains(event.target)) menu.open = false;
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && menu.open) {
      menu.open = false;
      menu.querySelector('summary').focus();
    }
  });
  $('displayClose').addEventListener('click', () => $('displayDialog').close());
  $('displayCancel').addEventListener('click', () => $('displayDialog').close());
  $('displayApply').addEventListener('click', () => {
    preferences = {
      wallpaper: $('displayWallpaper').value,
      glass: $('displayGlass').checked,
    };
    applyPreferences();
    $('displayDialog').close();
  });

  initializeRetro({
    selectPanel,
    display() {
      document.querySelector('[data-action="appearance"]').click();
    },
    moved() {
      glass.refresh();
      glassControls.refresh();
    },
  });

  return { selectPanel };
}
