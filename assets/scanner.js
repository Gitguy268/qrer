// Copyright (c) 2026 Lucas Van De Weerd. MIT.
let libraryPromise;
async function library() {
  if (!libraryPromise)
    libraryPromise = import('./vendor/qr-scanner/qr-scanner.min.js')
      .then((module) => module.default)
      .catch((error) => {
        libraryPromise = null;
        throw error;
      });
  return libraryPromise;
}
export async function decodeImage(source) {
  const Scanner = await library();
  const result = await Scanner.scanImage(source, {
    returnDetailedScanResult: true,
  });
  return result.data;
}
export function initializeScanner(onUse) {
  const $ = (id) => document.getElementById(id);
  const dialog = $('scanDialog'),
    video = $('scanVideo');
  let camera = null,
    sequence = 0,
    result = '',
    returnFocus = null;
  function showStatus(text) {
    $('scanStatus').textContent = text;
  }
  function stopCamera() {
    sequence++;
    if (camera) {
      const overlay = camera.$overlay;
      camera.pause(true);
      camera.destroy();
      overlay?.remove();
      camera = null;
    }
    if (video.srcObject) {
      video.srcObject.getTracks().forEach((track) => track.stop());
      video.srcObject = null;
    }
    video.hidden = true;
    $('scanCameraList').hidden = true;
    $('cameraStop').hidden = true;
    $('cameraStart').disabled = false;
  }
  function found(text) {
    stopCamera();
    result = text;
    $('scanResult').value = text;
    $('scanResultBox').hidden = false;
    $('scanUse').disabled = $('scanCopy').disabled = false;
    showStatus('QR code read.');
  }
  function clearResult() {
    result = '';
    $('scanResult').value = '';
    $('scanResultBox').hidden = true;
    $('scanUse').disabled = $('scanCopy').disabled = true;
  }
  async function scanFile(file) {
    if (!file) return;
    stopCamera();
    clearResult();
    const token = ++sequence;
    showStatus('Reading image…');
    if (file.size > 20 * 1024 * 1024) {
      showStatus('Choose an image smaller than 20 MB.');
      return;
    }
    try {
      const text = await decodeImage(file);
      if (token === sequence && dialog.open) found(text);
    } catch {
      if (token === sequence && dialog.open)
        showStatus('No readable QR code found. Try a clear image with the whole code visible.');
    }
  }
  $('scanBtn').addEventListener('click', () => {
    returnFocus = document.activeElement;
    clearResult();
    showStatus('Choose an image, drop one here, or start the camera.');
    dialog.showModal();
    $('scanFileBtn').focus();
  });
  $('scanClose').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => {
    stopCamera();
    clearResult();
    $('scanFile').value = '';
    returnFocus?.focus();
  });
  dialog.addEventListener('dragover', (event) => {
    event.preventDefault();
  });
  dialog.addEventListener('drop', (event) => {
    event.preventDefault();
    scanFile(event.dataTransfer.files[0]);
  });
  $('scanFileBtn').addEventListener('click', () => $('scanFile').click());
  $('scanFile').addEventListener('change', () => {
    scanFile($('scanFile').files[0]);
    $('scanFile').value = '';
  });
  $('cameraStart').addEventListener('click', async () => {
    stopCamera();
    clearResult();
    const token = ++sequence;
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      showStatus('Camera access requires HTTPS or localhost. You can still scan an image.');
      return;
    }
    $('cameraStart').disabled = true;
    $('cameraStop').hidden = false;
    showStatus('Waiting for camera permission…');
    try {
      const Scanner = await library();
      if (token !== sequence || !dialog.open) return;
      video.hidden = false;
      const instance = new Scanner(
        video,
        (data) => {
          if (token === sequence && dialog.open) found(data.data);
        },
        {
          returnDetailedScanResult: true,
          preferredCamera: 'environment',
          maxScansPerSecond: 8,
          highlightScanRegion: true,
          highlightCodeOutline: true,
        },
      );
      camera = instance;
      await instance.start();
      if (token !== sequence || !dialog.open) {
        instance.pause(true);
        instance.destroy();
        return;
      }
      showStatus('Point the camera at a QR code.');
      const devices = await Scanner.listCameras();
      if (token !== sequence || !dialog.open) return;
      const select = $('scanCamera');
      select.replaceChildren();
      devices.forEach((device, index) => {
        const option = document.createElement('option');
        option.value = device.id;
        option.textContent = device.label || `Camera ${index + 1}`;
        select.append(option);
      });
      const id = video.srcObject?.getVideoTracks()[0]?.getSettings().deviceId;
      if (id) select.value = id;
      $('scanCameraList').hidden = devices.length < 2;
    } catch {
      if (token === sequence && dialog.open) {
        stopCamera();
        showStatus(
          'The camera could not start. Allow camera access, check that it is available, or choose an image.',
        );
      }
    }
  });
  $('cameraStop').addEventListener('click', () => {
    stopCamera();
    showStatus('Camera stopped.');
  });
  $('scanCamera').addEventListener('change', async () => {
    const token = sequence;
    try {
      await camera?.setCamera($('scanCamera').value);
    } catch {
      if (token === sequence && dialog.open) {
        stopCamera();
        showStatus('This camera is unavailable. Choose an image or start again.');
      }
    }
  });
  $('scanUse').addEventListener('click', () => {
    if (!result) return;
    const value = result;
    dialog.close();
    onUse(value);
  });
  $('scanCopy').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(result);
      showStatus('Copied decoded content.');
    } catch {
      showStatus('Select the decoded content and copy it manually.');
    }
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      stopCamera();
      if (dialog.open) showStatus('Camera stopped while the app was hidden.');
    }
  });
  addEventListener('pagehide', stopCamera);
}
