// Copyright (c) 2026 Lucas Van De Weerd. MIT.
export function encodeContent(kind, fields) {
  const value = fields.value.trim();
  if (kind === 'url') {
    if (!value) return { error: 'Enter a link.' };
    const candidate = /^[a-z][a-z\d+.-]*:/i.test(value) ? value : 'https://' + value;
    try {
      const url = new URL(candidate);
      if (!['http:', 'https:'].includes(url.protocol) || !url.hostname) throw new Error();
      return { payload: candidate };
    } catch {
      return { error: 'Enter a valid http or https link.' };
    }
  }
  if (kind === 'text') return value ? { payload: fields.value } : { error: 'Enter some text.' };
  if (kind === 'wifi') {
    if (!fields.network.trim()) return { error: 'Enter the network name.' };
    if (fields.security !== 'nopass' && !fields.password)
      return { error: 'Enter the network password.' };
    const escape = (text) => text.replace(/[\\;,:"']/g, (match) => '\\' + match);
    const password = fields.security === 'nopass' ? '' : escape(fields.password);
    return {
      payload: `WIFI:T:${fields.security};S:${escape(fields.network)};P:${password};H:${fields.hidden};;`,
    };
  }
  if (kind === 'email') {
    const address = fields.address.trim();
    if (!/^[^\s@?&#]+@[^\s@?&#]+\.[^\s@?&#]+$/.test(address))
      return { error: 'Enter a valid email address.' };
    return {
      payload: `mailto:${address}?subject=${encodeURIComponent(fields.subject)}&body=${encodeURIComponent(fields.message)}`,
    };
  }
  return { error: 'Choose a content type.' };
}
