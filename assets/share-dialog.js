// Copyright (c) 2026 Lucas Van De Weerd. MIT.
import { element as $, setImage } from './dom.js?v=2.7.0';
import { shareCard, download } from './export.js?v=2.7.0';
import { createRevision } from './tasks.js?v=2.7.0';

export function createShareDialog({ getSpec }) {
  const dialog = $('shareDialog');
  const revision = createRevision();
  let spec = null,
    blob = null,
    previewURL = null,
    timer = 0;

  function clearPreview() {
    if (previewURL) URL.revokeObjectURL(previewURL);
    previewURL = null;
    blob = null;
    setImage($('storyPreview'), null);
  }

  function build() {
    const isCurrent = revision.begin();
    clearTimeout(timer);
    blob = null;
    $('storySave').disabled = $('storyShare').disabled = true;
    $('storyError').textContent = '';
    const caption = $('storyCaption').value;
    const cardSpec = spec;
    timer = setTimeout(async () => {
      try {
        const result = await shareCard(cardSpec, caption);
        if (!isCurrent() || !dialog.open) return;
        clearPreview();
        blob = result;
        previewURL = URL.createObjectURL(result);
        setImage($('storyPreview'), previewURL);
        $('storySave').disabled = $('storyShare').disabled = false;
      } catch {
        if (isCurrent() && dialog.open)
          $('storyError').textContent = 'The share card could not be created.';
      }
    }, 100);
  }

  $('shareBtn').addEventListener('click', () => {
    spec = getSpec();
    if (!spec) return;
    dialog.showModal();
    $('shareClose').focus();
    build();
  });
  $('shareClose').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => {
    revision.invalidate();
    clearTimeout(timer);
    clearPreview();
    spec = null;
    $('shareBtn').focus({ preventScroll: true });
  });
  $('storyCaption').addEventListener('input', build);
  $('storySave').addEventListener('click', () => {
    if (blob) download(blob, 'qrer-card.png');
  });
  $('storyShare').addEventListener('click', async () => {
    if (!blob) return;
    const file = new File([blob], 'qrer-card.png', { type: 'image/png' });
    try {
      if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file] });
      else download(blob, 'qrer-card.png');
    } catch (error) {
      if (error.name !== 'AbortError' && dialog.open)
        $('storyError').textContent = 'Sharing failed. Use Save PNG.';
    }
  });
}
