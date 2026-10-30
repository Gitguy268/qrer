// Copyright (c) 2026 Lucas Van De Weerd. MIT.
// Qrer adapter for Liquid Glass Studio's MIT WebGL2 renderer.
export function createGlassLayer(surface, onStatus) {
  const canvas = document.getElementById('glassCanvas');
  const desktop = document.getElementById('desktop');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let renderer = null,
    gl = null,
    texture = null,
    request = 0,
    generation = 0,
    wallpaper = 'clouds',
    enabled = true;
  let backgroundDirty = true,
    angle = -Math.PI / 4;
  const themeColors = { clouds: '#2f6fc4', teal: '#008080' };
  function status(value) {
    document.documentElement.dataset.glassState = value;
    canvas.hidden = value !== 'active';
    onStatus(value);
  }
  function paintDesktop() {
    const width = innerWidth,
      height = innerHeight;
    desktop.width = width;
    desktop.height = height;
    const c = desktop.getContext('2d');
    backgroundDirty = true;
    if (wallpaper === 'teal') {
      c.fillStyle = '#008080';
      c.fillRect(0, 0, width, height);
      return;
    }
    // Original Win98-style sky. Glass needs detail behind it, or it has nothing to bend.
    const sky = c.createLinearGradient(0, 0, 0, height);
    sky.addColorStop(0, '#0b4fae');
    sky.addColorStop(0.6, '#3d86d6');
    sky.addColorStop(1, '#5f9de0');
    c.fillStyle = sky;
    c.fillRect(0, 0, width, height);
    let seed = 7;
    const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const clouds = Math.max(8, Math.round((width * height) / 40000));
    for (let k = 0; k < clouds; k++) {
      const cx = random() * width,
        cy = random() * (height + 60),
        size = 40 + random() * 110;
      for (let i = 0; i < 22; i++) {
        const x = cx + (random() - 0.5) * size * 3,
          y = cy + (random() - 0.6) * size * 0.9,
          r = size * (0.35 + random() * 0.5);
        const puff = c.createRadialGradient(x, y, 0, x, y, r);
        // A firm edge gives the glass an outline to bend; Win98's clouds had one too.
        puff.addColorStop(0, '#ffffffc0');
        puff.addColorStop(0.7, '#eef4ff80');
        puff.addColorStop(0.85, '#dfe9fa30');
        puff.addColorStop(1, '#ffffff00');
        c.fillStyle = puff;
        c.beginPath();
        c.arc(x, y, r, 0, Math.PI * 2);
        c.fill();
      }
    }
  }
  function destroy() {
    if (request) cancelAnimationFrame(request);
    request = 0;
    if (texture && gl) gl.deleteTexture(texture);
    texture = null;
    if (renderer) renderer.dispose();
    renderer = null;
    canvas.width = canvas.height = 1;
    canvas.dataset.frames = '0';
  }
  function draw() {
    request = 0;
    if (!enabled || document.hidden || !renderer || gl.isContextLost()) return;
    try {
      const ratio = Math.min(
        devicePixelRatio,
        1.25,
        Math.sqrt(1800000 / (innerWidth * innerHeight)),
      );
      const width = Math.round(innerWidth * ratio),
        height = Math.round(innerHeight * ratio);
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        renderer.resize(width, height);
        backgroundDirty = true;
      }
      if (backgroundDirty) {
        if (!texture) texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, desktop);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        backgroundDirty = false;
      }
      const rect = surface.getBoundingClientRect();
      const weights = Array.from({ length: 7 }, (_, i) => Math.exp((-i * i) / 18));
      const total = weights[0] + 2 * weights.slice(1).reduce((a, b) => a + b, 0);
      renderer.setUniforms({
        u_resolution: [width, height],
        u_dpr: ratio,
        u_mouse: [0, 0],
        u_mouseSpring: [
          (rect.x + rect.width / 2) * ratio,
          (innerHeight - rect.y - rect.height / 2) * ratio,
        ],
        u_shapeWidth: rect.width,
        u_shapeHeight: rect.height,
        u_shapeRadius: 2,
        u_shapeRoundness: 2,
        u_showShape1: 0,
        u_mergeRate: 0.001,
        u_blurRadius: 6,
        u_blurWeights: weights.map((w) => w / total),
      });
      renderer.render({
        background: {
          u_bgType: 3,
          u_bgTexture: texture,
          u_bgTextureRatio: innerWidth / innerHeight,
          u_bgTextureReady: 1,
          u_shadowExpand: 18,
          u_shadowFactor: 0.08,
          u_shadowPosition: [0, -4],
        },
        glass: {
          STEP: 9,
          u_tint: [0.8, 0.86, 0.95, 0.12],
          u_refThickness: 18,
          u_refDistance: 0.023,
          u_refFactor: 1.4,
          u_refDispersion: 2,
          u_refFresnelRange: 25,
          u_refFresnelHardness: 0.1,
          u_refFresnelFactor: 0.3,
          u_glareRange: 20,
          u_glareHardness: 0.1,
          u_glareFactor: 0.4,
          u_glareConvergence: 0.55,
          u_glareOppositeFactor: 0.6,
          u_glareAngle: angle,
          u_blurEdge: 1,
        },
      });
      canvas.dataset.frames = String(Number(canvas.dataset.frames || 0) + 1);
      status('active');
    } catch {
      destroy();
      status('fallback');
    }
  }
  function schedule() {
    if (!enabled || document.hidden || request || !renderer) return;
    request = requestAnimationFrame(draw);
  }
  async function initialize() {
    const token = ++generation;
    destroy();
    if (!enabled) {
      status('off');
      return;
    }
    status('fallback');
    try {
      const [{ MultiPassRenderer }, { default: shaders }] = await Promise.all([
        import('./vendor/liquid-glass-studio/renderer.js'),
        import('./vendor/liquid-glass-studio/shaders.js'),
      ]);
      if (token !== generation || !enabled) return;
      gl = canvas.getContext('webgl2');
      if (!gl || gl.isContextLost() || !gl.getExtension('EXT_color_buffer_float'))
        throw new Error('WebGL2 unavailable');
      renderer = new MultiPassRenderer(canvas, [
        {
          name: 'background',
          shader: { vertex: shaders.vertex, fragment: shaders.background },
        },
        {
          name: 'blurX',
          shader: { vertex: shaders.vertex, fragment: shaders.blurX },
          inputs: { u_prevPassTexture: 'background' },
        },
        {
          name: 'blurY',
          shader: { vertex: shaders.vertex, fragment: shaders.blurY },
          inputs: { u_prevPassTexture: 'blurX' },
        },
        {
          name: 'glass',
          shader: { vertex: shaders.vertex, fragment: shaders.glass },
          inputs: { u_bg: 'background', u_blurredBg: 'blurY' },
          outputToScreen: true,
        },
      ]);
      backgroundDirty = true;
      schedule();
    } catch {
      if (token === generation) {
        destroy();
        status('fallback');
      }
    }
  }
  const resize = () => {
    paintDesktop();
    schedule();
  };
  addEventListener('resize', resize);
  addEventListener('scroll', schedule, { passive: true });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && request) {
      cancelAnimationFrame(request);
      request = 0;
    } else schedule();
  });
  surface.addEventListener('pointermove', (event) => {
    if (motion.matches || !event.target.closest('.titlebar, .window-toolbar, .statusbar')) return;
    angle = -Math.PI / 4 + (event.clientX / innerWidth - 0.5) * 0.45;
    schedule();
  });
  motion.addEventListener('change', () => {
    angle = -Math.PI / 4;
    schedule();
  });
  new ResizeObserver(schedule).observe(surface);
  canvas.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    generation++;
    destroy();
    status(enabled ? 'fallback' : 'off');
  });
  canvas.addEventListener('webglcontextrestored', () => {
    if (enabled) initialize();
  });
  paintDesktop();
  return {
    refresh: schedule,
    update(preferences) {
      const changed = enabled !== preferences.glass;
      enabled = preferences.glass;
      wallpaper = preferences.wallpaper;
      paintDesktop();
      if (!enabled) {
        generation++;
        destroy();
        status('off');
      } else if (changed || !renderer) initialize();
      else schedule();
      document.querySelector('meta[name="theme-color"]').content = themeColors[wallpaper];
    },
  };
}
