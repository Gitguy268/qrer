// Copyright (c) 2026 Lucas Van De Weerd. MIT.
// In-memory style history. Image strings are shared, never copied or persisted.
export function createStyleHistory(initial, limit = 30) {
  if (!Number.isInteger(limit) || limit < 2)
    throw new RangeError('History needs at least two states.');
  let entries = [{ ...initial }],
    cursor = 0,
    lastGroup = null,
    lastTime = 0;
  const equal = (a, b) =>
    Object.keys(a).length === Object.keys(b).length &&
    Object.keys(a).every((key) => a[key] === b[key]);
  return {
    get canUndo() {
      return cursor > 0;
    },
    get canRedo() {
      return cursor < entries.length - 1;
    },
    record(value, group = null, now = performance.now()) {
      if (equal(entries[cursor], value)) return;
      const merge =
        group &&
        group === lastGroup &&
        now - lastTime < 700 &&
        cursor === entries.length - 1 &&
        cursor > 0;
      entries = entries.slice(0, cursor + 1);
      if (merge) entries[cursor] = { ...value };
      else {
        entries.push({ ...value });
        if (entries.length > limit) entries.shift();
        cursor = entries.length - 1;
      }
      lastGroup = group;
      lastTime = now;
    },
    move(direction) {
      if (direction !== -1 && direction !== 1) return null;
      const next = cursor + direction;
      if (next < 0 || next >= entries.length) return null;
      cursor = next;
      lastGroup = null;
      return { ...entries[cursor] };
    },
  };
}
