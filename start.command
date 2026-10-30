#!/bin/sh
# Copyright (c) 2026 Lucas Van De Weerd. MIT.
cd "$(dirname "$0")" || exit 1
python3 - <<'PY'
from http.server import ThreadingHTTPServer
from serve import Handler
import errno
import webbrowser

for port in range(4317, 4327):
    try:
        server = ThreadingHTTPServer(('127.0.0.1', port), Handler)
        break
    except OSError as error:
        if error.errno != errno.EADDRINUSE:
            raise
else:
    raise SystemExit('Qrer could not find an available local port (4317–4326).')

url = f'http://127.0.0.1:{port}/'
print(f'Qrer: {url}\nKeep this window open. Press Control-C to stop.', flush=True)
webbrowser.open(url)
try:
    server.serve_forever()
except KeyboardInterrupt:
    pass
finally:
    server.server_close()
PY
