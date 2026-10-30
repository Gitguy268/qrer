// Copyright (c) 2026 Lucas Van De Weerd. MIT.
// Original desktop behavior; no OS files, remote content or persistent drafts.
export function initializeRetro({ selectPanel, display, moved }) {
  const $ = (id) => document.getElementById(id);
  const app = $('appWindow'),
    task = $('taskbarQrer'),
    floating = $('floatingExport');
  const tray = document.querySelector('.export-tray');
  const anchor = document.createComment('Docked export controls');
  tray.before(anchor);
  const menus = [
    ...document.querySelectorAll('#toolsMenu,#retroViewMenu,#retroHelpMenu,#startMenu'),
  ];
  let clockTimer = 0,
    floatOrigin = null,
    windowOrigin = null;
  function closeMenus() {
    menus.forEach((menu) => (menu.open = false));
  }
  function restore(focus = true) {
    app.hidden = false;
    task.hidden = false;
    document.body.dataset.windowState = 'open';
    task.setAttribute('aria-pressed', 'true');
    if (focus) document.querySelector('[role=tab][aria-selected=true]').focus();
  }
  function hide(closed = false) {
    dock();
    closeMenus();
    app.hidden = true;
    task.hidden = closed;
    document.body.dataset.windowState = closed ? 'closed' : 'minimized';
    task.setAttribute('aria-pressed', 'false');
    (closed ? $('startMenu').querySelector('summary') : task).focus();
  }
  function clampPosition(x, y) {
    const width = floating.offsetWidth,
      height = floating.offsetHeight;
    floating.style.left = Math.round(Math.max(4, Math.min(innerWidth - width - 4, x))) + 'px';
    floating.style.top =
      Math.round(Math.max(4, Math.min(innerHeight - Math.min(height, innerHeight - 48) - 40, y))) +
      'px';
  }
  function center() {
    clampPosition((innerWidth - floating.offsetWidth) / 2, Math.min(120, innerHeight / 5));
  }
  function dock(focus = false) {
    if (floating.hidden) return;
    anchor.after(tray);
    floating.hidden = true;
    $('floatMenuItem').textContent = 'Float export toolbar';
    if (focus) $('dlPng').focus();
  }
  function float() {
    if (!floating.hidden) {
      dock(true);
      return;
    }
    restore(false);
    $('floatingExportBody').append(tray);
    floating.hidden = false;
    $('floatMenuItem').textContent = 'Dock export toolbar';
    clampPosition(innerWidth - floating.offsetWidth - 35, innerHeight - floating.offsetHeight - 75);
    $('floatingDrag').focus();
  }
  const actions = {
    editor() {
      restore();
      selectPanel('content', true);
    },
    content() {
      restore(false);
      selectPanel('content', true);
    },
    style() {
      restore(false);
      selectPanel('style', true);
    },
    logo() {
      restore(false);
      selectPanel('logo', true);
    },
    scan() {
      restore(false);
      $('scanBtn').click();
    },
    display() {
      display();
    },
    about() {
      $('aboutBtn').click();
    },
    shortcuts() {
      $('shortcutsDialog').showModal();
      $('shortcutsClose').focus();
    },
    float,
  };
  document.querySelectorAll('[data-retro-action]').forEach((button) =>
    button.addEventListener('click', () => {
      const origin = button.closest('details')?.querySelector('summary') || button;
      const action = button.dataset.retroAction;
      closeMenus();
      actions[action]?.();
      const dialogId = {
        scan: 'scanDialog',
        display: 'displayDialog',
        about: 'aboutDialog',
        shortcuts: 'shortcutsDialog',
      }[action];
      if (dialogId && $(dialogId).open)
        $(dialogId).addEventListener(
          'close',
          () => {
            (origin.getClientRects().length ? origin : $('taskbarQrer')).focus({
              preventScroll: true,
            });
          },
          { once: true },
        );
    }),
  );
  $('windowMinimize').addEventListener('click', () => hide());
  $('windowClose').addEventListener('click', () => hide(true));
  $('windowMaximize').addEventListener('click', () => {
    const maximized = app.dataset.maximized !== 'true';
    app.dataset.maximized = String(maximized);
    app.style.translate = '';
    moved();
    $('windowMaximize').setAttribute(
      'aria-label',
      maximized ? 'Restore Qrer size' : 'Maximize Qrer',
    );
    $('windowMaximize').title = maximized ? 'Restore size' : 'Maximize';
  });
  task.addEventListener('click', () => (app.hidden ? restore() : hide()));
  $('dockExport').addEventListener('click', () => dock(true));
  $('shortcutsClose').addEventListener('click', () => $('shortcutsDialog').close());
  $('shortcutsDialog').addEventListener('close', () => {
    $('retroHelpMenu').querySelector('summary').focus({ preventScroll: true });
  });
  // Native details supply Enter/Space activation; arrow keys move among commands.
  for (const menu of menus) {
    const summary = menu.querySelector('summary');
    menu.addEventListener('toggle', () => {
      if (menu.open)
        menus.filter((other) => other !== menu).forEach((other) => (other.open = false));
    });
    menu.addEventListener('keydown', (event) => {
      if (!['ArrowDown', 'ArrowUp', 'Home', 'End', 'Escape'].includes(event.key)) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        menu.open = false;
        summary.focus();
        return;
      }
      event.preventDefault();
      menu.open = true;
      const commands = [...menu.querySelectorAll('button:not(:disabled):not([hidden]),a[href]')];
      const index = commands.indexOf(document.activeElement);
      const target =
        event.key === 'Home'
          ? 0
          : event.key === 'End'
            ? commands.length - 1
            : event.key === 'ArrowUp'
              ? (index - 1 + commands.length) % commands.length
              : (index + 1) % commands.length;
      commands[target]?.focus();
    });
  }
  document.addEventListener('click', (event) =>
    menus.forEach((menu) => {
      if (!menu.contains(event.target)) menu.open = false;
    }),
  );
  document.addEventListener('keydown', (event) => {
    if (
      !event.defaultPrevented &&
      event.key === 'Escape' &&
      !floating.hidden &&
      !document.querySelector('dialog[open]') &&
      !menus.some((menu) => menu.open)
    )
      dock(true);
  });
  const drag = $('floatingDrag');
  drag.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    const rect = floating.getBoundingClientRect();
    floatOrigin = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    drag.setPointerCapture(event.pointerId);
  });
  drag.addEventListener('pointermove', (event) => {
    if (floatOrigin) clampPosition(event.clientX - floatOrigin.x, event.clientY - floatOrigin.y);
  });
  drag.addEventListener('pointerup', () => {
    floatOrigin = null;
  });
  drag.addEventListener('lostpointercapture', () => {
    floatOrigin = null;
  });
  drag.addEventListener('keydown', (event) => {
    if (event.key === 'Home') {
      event.preventDefault();
      center();
      return;
    }
    const offsets = {
      ArrowLeft: [-10, 0],
      ArrowRight: [10, 0],
      ArrowUp: [0, -10],
      ArrowDown: [0, 10],
    };
    if (!offsets[event.key]) return;
    event.preventDefault();
    const rect = floating.getBoundingClientRect(),
      [x, y] = offsets[event.key];
    clampPosition(rect.left + x, rect.top + y);
  });
  // Win98 title-bar move. Optional: the window starts centred and can be maximized.
  const titlebar = app.querySelector('.titlebar');
  function moveWindow(x, y) {
    const rect = app.getBoundingClientRect(),
      [left, top] = (app.style.translate || '0px 0px').split(' ').map(parseFloat);
    // Keep the title bar reachable above the taskbar.
    const dx = Math.max(
      -rect.left + left - rect.width + 80,
      Math.min(innerWidth - 80 - rect.left + left, x),
    );
    const dy = Math.max(-rect.top + top, Math.min(innerHeight - 72 - rect.top + top, y));
    app.style.translate = `${Math.round(dx)}px ${Math.round(dy)}px`;
    moved();
  }
  titlebar.addEventListener('pointerdown', (event) => {
    if (
      event.button !== 0 ||
      app.dataset.maximized === 'true' ||
      innerWidth <= 660 ||
      event.target.closest('button, select, input, label')
    )
      return;
    const [left, top] = (app.style.translate || '0px 0px').split(' ').map(parseFloat);
    windowOrigin = { x: event.clientX - left, y: event.clientY - top };
    titlebar.setPointerCapture(event.pointerId);
  });
  titlebar.addEventListener('pointermove', (event) => {
    if (windowOrigin) moveWindow(event.clientX - windowOrigin.x, event.clientY - windowOrigin.y);
  });
  titlebar.addEventListener('lostpointercapture', () => {
    windowOrigin = null;
  });
  titlebar.addEventListener('dblclick', (event) => {
    if (!event.target.closest('button, select, input, label')) $('windowMaximize').click();
  });
  addEventListener('resize', () => {
    if (innerWidth <= 660) app.style.translate = '';
    else if (app.style.translate) moveWindow(...app.style.translate.split(' ').map(parseFloat));
    if (!floating.hidden) {
      const rect = floating.getBoundingClientRect();
      clampPosition(rect.left, rect.top);
    }
  });
  function clock() {
    clearTimeout(clockTimer);
    if (document.hidden) return;
    const now = new Date();
    $('retroClock').textContent = now.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
    $('retroClock').dateTime = now.toISOString();
    clockTimer = setTimeout(clock, 60000 - now.getSeconds() * 1000 - now.getMilliseconds());
  }
  document.addEventListener('visibilitychange', clock);
  clock();
}
