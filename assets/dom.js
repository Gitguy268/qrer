// Copyright (c) 2026 Lucas Van De Weerd. MIT.
/** Fail at startup with a useful error when markup and a controller disagree. */
export function element(id) {
  const node = document.getElementById(id);
  if (!node) throw new Error(`Missing required Qrer element: #${id}`);
  return node;
}
export function setImage(node, source) {
  node.hidden = !source;
  if (source) node.src = source;
  else node.removeAttribute('src');
}
