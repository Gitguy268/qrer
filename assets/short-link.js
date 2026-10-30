// Copyright (c) 2026 Lucas Van De Weerd. MIT.
// Adapter for p2r3/ha.mr (MIT), vendored unchanged. Loaded only when chosen.
let library = null,
  loading = null;

export function loadShortener() {
  if (!loading)
    loading = Promise.all([
      import('./vendor/ha-mr/compress.js'),
      import('./vendor/ha-mr/alphabets.js'),
    ])
      .then(([codec, alphabets]) => {
        library = { ...codec, alphabet: alphabets.outputAlphabetQR };
      })
      .catch((error) => {
        loading = null;
        throw error;
      });
  return loading;
}

export const shortenerReady = () => !!library;

// ha.mr writes percent escapes in lower case; compare them case-insensitively.
const normal = (link) => new URL(link).href.replace(/%[\da-f]{2}/gi, (code) => code.toUpperCase());

/** The QR form of a ha.mr link: upper case, so the code can use alphanumeric mode. */
export function shortLink(link) {
  const url = new URL(link);
  if (!['http:', 'https:'].includes(url.protocol))
    throw new Error('Only http and https links can be shortened.');
  if (url.username || url.password)
    throw new Error('Links with a user name or password cannot be shortened.');
  const code = library.compress(link, library.alphabet);
  if (normal(library.decompress(code, library.alphabet)) !== normal(link))
    throw new Error('ha.mr cannot shorten this link exactly. Untick Shorten via ha.mr.');
  return { payload: 'HTTPS://HA.MR/' + code };
}
