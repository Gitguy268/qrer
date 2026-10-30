// Copyright (c) 2026 Lucas Van De Weerd. MIT.
/** Latest-wins ownership for asynchronous work that cannot be cancelled. */
export function createRevision() {
  let revision = 0;
  return {
    begin() {
      const token = ++revision;
      return () => token === revision;
    },
    invalidate() {
      revision++;
    },
  };
}
