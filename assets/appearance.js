// Copyright (c) 2026 Lucas Van De Weerd. MIT.
const wallpapers = ['clouds', 'teal'];
export function loadAppearance() {
  try {
    // Version 3 is the single Win98 look; older saved themes no longer exist.
    if (localStorage.getItem('qrer-ui-version') !== '3') {
      localStorage.setItem('qrer-ui-version', '3');
      localStorage.removeItem('qrer-appearance');
      localStorage.setItem('qrer-glass', 'true');
    }
    const saved = localStorage.getItem('qrer-wallpaper');
    return {
      wallpaper: wallpapers.includes(saved) ? saved : 'clouds',
      glass: localStorage.getItem('qrer-glass') !== 'false',
    };
  } catch {
    return { wallpaper: 'clouds', glass: true };
  }
}
export function saveAppearance(preferences) {
  document.documentElement.dataset.wallpaper = preferences.wallpaper;
  document.getElementById('glassToggle').checked = preferences.glass;
  try {
    localStorage.setItem('qrer-wallpaper', preferences.wallpaper);
    localStorage.setItem('qrer-glass', String(preferences.glass));
  } catch {
    /* Rendering and generation work without persistent storage. */
  }
}
