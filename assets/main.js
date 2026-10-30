// Copyright (c) 2026 Lucas Van De Weerd. MIT.
import { createShell } from './shell.js?v=2.7.0';
import { createContentEditor } from './editor-content.js?v=2.7.0';
import { createStyleEditor } from './editor-style.js?v=2.7.0';
import { createPreview } from './preview.js?v=2.7.0';
import { createExportControls } from './export-controls.js?v=2.7.0';
import { createShareDialog } from './share-dialog.js?v=2.7.0';
import { initializeScanner } from './scanner.js?v=2.7.0';

// Composition root: controllers own their state; this file only connects them.
const shell = createShell();
const content = createContentEditor({ onChange: refresh });
const style = createStyleEditor({ onChange: refresh });
const preview = createPreview({ onChange: () => exportControls.update() });
const exportControls = createExportControls({
  getSpec: preview.getSpec,
  isAnimated: preview.isAnimated,
});
createShareDialog({ getSpec: preview.getSpec });
initializeScanner((value) => {
  shell.selectPanel('content');
  content.use(value);
});

function refresh() {
  preview.update(content.read(), style.read());
}

addEventListener('pagehide', () => preview.cancel());
addEventListener('pageshow', (event) => {
  if (event.persisted) refresh();
});
refresh();
