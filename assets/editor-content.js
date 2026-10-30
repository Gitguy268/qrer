// Copyright (c) 2026 Lucas Van De Weerd. MIT.
import { element as $ } from './dom.js?v=2.7.0';
import { encodeContent } from './content.js?v=2.7.0';
import { encodeMatrix } from './matrix.js?v=2.7.0';
import { loadShortener, shortenerReady, shortLink } from './short-link.js?v=2.7.0';

export function createContentEditor({ onChange }) {
  let kind = 'url';
  const drafts = { url: 'https://example.com', text: '' };
  function fields() {
    return {
      value: $('data').value,
      network: $('wifiName').value,
      password: $('wifiPassword').value,
      security: $('wifiSecurity').value,
      hidden: $('wifiHidden').checked,
      address: $('emailAddress').value,
      subject: $('emailSubject').value,
      message: $('emailBody').value,
    };
  }
  function selectKind(nextKind) {
    if (kind === 'url' || kind === 'text') drafts[kind] = $('data').value;
    kind = nextKind;
    $('contentType').value = kind;
    $('simpleFields').hidden = !['url', 'text'].includes(kind);
    $('wifiFields').hidden = kind !== 'wifi';
    $('emailFields').hidden = kind !== 'email';
    if (kind === 'url' || kind === 'text') $('data').value = drafts[kind];
    $('shortenFields').hidden = kind !== 'url';
    $('dataLabel').textContent = kind === 'text' ? 'Text' : 'Link';
    $('data').placeholder = kind === 'text' ? 'Enter text' : 'https://example.com';
    $('contentHelp').textContent =
      kind === 'text' ? 'Text and emoji are supported.' : 'Links without a scheme use https://.';
  }
  let shortenerFailed = false;
  function shorten(link) {
    if (!shortenerReady()) {
      if (shortenerFailed) return { error: 'ha.mr could not be loaded.' };
      loadShortener().then(onChange, () => {
        shortenerFailed = true;
        onChange();
      });
      return { error: 'Loading ha.mr…' };
    }
    try {
      const { payload } = shortLink(link);
      const version = (text) => {
        try {
          return encodeMatrix(text).version;
        } catch {
          return '–';
        }
      };
      return { payload, note: `QR version ${version(link)} → ${version(payload)}` };
    } catch (error) {
      return { error: error.message };
    }
  }
  function changed() {
    $('wifiPassword').disabled = $('wifiSecurity').value === 'nopass';
    $('passwordToggle').disabled = $('wifiPassword').disabled;
    onChange();
  }
  $('contentType').addEventListener('change', () => {
    selectKind($('contentType').value);
    changed();
  });
  document
    .querySelectorAll('#panel-content input, #panel-content textarea, #wifiSecurity')
    .forEach((input) => input.addEventListener('input', changed));
  $('clearContent').addEventListener('click', () => {
    const inputs =
      kind === 'wifi'
        ? ['wifiName', 'wifiPassword']
        : kind === 'email'
          ? ['emailAddress', 'emailSubject', 'emailBody']
          : ['data'];
    inputs.forEach((id) => ($(id).value = ''));
    $(inputs[0]).focus();
    onChange();
  });
  $('passwordToggle').addEventListener('click', () => {
    const reveal = $('wifiPassword').type === 'password';
    $('wifiPassword').type = reveal ? 'text' : 'password';
    $('passwordToggle').textContent = reveal ? 'Hide' : 'Show';
    $('passwordToggle').setAttribute('aria-pressed', String(reveal));
  });

  return {
    read() {
      let content = encodeContent(kind, fields());
      if (kind === 'url' && $('shortenLink').checked && content.payload)
        content = shorten(content.payload);
      const titles = {
        url: 'Link QR',
        text: 'Text QR',
        wifi: 'Wi-Fi QR',
        email: 'Email QR',
      };
      return { ...content, title: titles[kind] };
    },
    use(value) {
      selectKind(/^https?:\/\//i.test(value) ? 'url' : 'text');
      $('data').value = value;
      changed();
      $('data').focus();
    },
  };
}
