// Copyright (c) 2026 Lucas Van De Weerd. MIT.
// Native HTML stays interactive above kwlck's independent refractive surfaces.
import { createLiquidGlass } from './vendor/liquid-glass-web/liquid-glass.js?v=2.7.0';
import { createGlass as createPortableGlass } from './vendor/portable-glass/liquid-glass.js?v=2.7.0';

export function createGlassControls() {
  const instances = new Map();
  const blink =
    /Chrome|Chromium|Edg\//.test(navigator.userAgent) &&
    !/iPhone|iPad|iPod/.test(navigator.userAgent);
  const portable = !blink && CSS.supports('filter', 'url("#glass")');
  let desktopImage = '';
  function paintScene(glass) {
    const element = glass.element,
      scene = glass.localScene;
    if (!scene) return;
    const rect = element.getBoundingClientRect();
    scene.style.backgroundImage = `url("${desktopImage}")`;
    scene.style.backgroundSize = `${innerWidth}px ${innerHeight}px`;
    scene.style.backgroundPosition = `${-rect.left}px ${-rect.top}px`;
  }
  function dispose(glass) {
    glass.sceneObserver?.disconnect();
    glass.portableGlass?.destroy();
    glass.element.removeAttribute('data-lg-scene');
    glass.destroy();
  }
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const transparency = matchMedia('(prefers-reduced-transparency: reduce)');
  let enabled = false,
    queued = 0;
  // Only chrome that sits over the wallpaper: over solid grey, glass has nothing to bend.
  const fixed =
    '.titlebar, .retro-window-controls button, .retro-taskbar, #startMenu > summary, #taskbarQrer';
  function clear() {
    for (const glass of instances.values()) dispose(glass);
    instances.clear();
    document.documentElement.dataset.glassComponents = '0';
  }
  function synchronize() {
    queued = 0;
    if (!enabled || document.hidden || transparency.matches) {
      clear();
      return;
    }
    // Encoding the wallpaper is costly; redo it only after it is repainted.
    if (portable && !desktopImage) desktopImage = document.getElementById('desktop').toDataURL();
    const targets = new Set(
      document.querySelectorAll(fixed + ', #startMenu[open] .retro-start-popup, dialog[open]'),
    );
    for (const [element, glass] of instances) {
      if (!targets.has(element)) {
        dispose(glass);
        instances.delete(element);
      }
    }
    for (const element of targets) {
      const isPanel = element.matches('dialog, .retro-start-popup');
      const isHeader = element.matches('.titlebar');
      const options = {
        radius: 0,
        refraction: isPanel ? 42 : isHeader ? 58 : 72,
        blur: isPanel ? 12 : 0,
        light: isPanel ? 45 : 70,
        pointer: !motion.matches,
        resolution: 1,
        mode: portable ? 'css' : 'auto',
      };
      try {
        if (instances.has(element)) instances.get(element).update(options);
        else {
          const glass = createLiquidGlass(element, options);
          instances.set(element, glass);
          if (portable) {
            // WebKit/Gecko can filter an element's own pixels. Refract an aligned
            // copy of Qrer's original backdrop, never a copy of QR or user content.
            const scene = document.createElement('span');
            scene.className = 'lg-local-scene';
            glass.layer.prepend(scene);
            glass.localScene = scene;
            element.dataset.lgScene = 'local';
            glass.portableGlass = createPortableGlass(scene, {
              fit: true,
              clip: true,
              radius: options.radius,
              refraction: isHeader ? 14 : 9,
              bezel: 0.75,
              chroma: 0.06,
              specular: 0,
              blur: isPanel ? 2 : 0,
              mapScale: 1,
            });
            glass.sceneObserver = new ResizeObserver(() => paintScene(glass));
            glass.sceneObserver.observe(element);
          }
        }
        const glass = instances.get(element);
        glass.portableGlass?.update({ radius: options.radius });
        paintScene(glass);
      } catch {
        // A failed component leaves its native control in the opaque theme.
        if (instances.has(element)) dispose(instances.get(element));
        instances.delete(element);
      }
    }
    document.documentElement.dataset.glassComponents = String(instances.size);
  }
  function schedule() {
    if (!queued) queued = requestAnimationFrame(synchronize);
  }
  // Observe state only, never the decorative children inserted by the renderer.
  const repainted = () => {
    desktopImage = '';
    schedule();
  };
  new MutationObserver(repainted).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-wallpaper'],
  });
  const stateObserver = new MutationObserver(schedule);
  for (const element of document.querySelectorAll('dialog, #startMenu')) {
    stateObserver.observe(element, { attributes: true, attributeFilter: ['open'] });
  }
  motion.addEventListener('change', schedule);
  transparency.addEventListener('change', schedule);
  document.addEventListener('visibilitychange', schedule);
  addEventListener('resize', repainted);
  addEventListener('scroll', schedule, { passive: true });
  return {
    refresh: schedule,
    setEnabled(value) {
      if (enabled === value) return;
      enabled = value;
      if (!enabled) {
        cancelAnimationFrame(queued);
        queued = 0;
        clear();
        document.documentElement.dataset.glassComponents = '0';
      } else schedule();
    },
  };
}
